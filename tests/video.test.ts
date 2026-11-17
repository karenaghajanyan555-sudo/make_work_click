import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIDEOS } from '../content/index.ts';
import { computeLayout, isInsideSafe } from '../src/brand/format.ts';
import { sampleCamera } from '../src/video/camera.ts';
import { validateSpec, type VideoSpec } from '../src/video/spec.ts';
import { chapterAt, computeTimeline, toFrames } from '../src/video/timeline.ts';

const base = VIDEOS[0]!;

test('every registered video spec is valid', () => {
  for (const spec of VIDEOS) assert.deepEqual(validateSpec(spec), [], spec.id);
});

test('specs are JSON-compatible (no functions or classes)', () => {
  for (const spec of VIDEOS) assert.deepEqual(JSON.parse(JSON.stringify(spec)), spec);
});

test('video ids are unique', () => {
  assert.equal(new Set(VIDEOS.map((v) => v.id)).size, VIDEOS.length);
});

test('validation catches broken content', () => {
  const scene = base.scenes[0]!;
  if (scene.type !== 'chaosToSystem') throw new Error('fixture: first scene must be chaosToSystem');
  const broken: VideoSpec = {
    ...base,
    id: 'bad id',
    scenes: [
      { ...scene, chapters: [{ cue: 'nope', label: 'x' }], props: { ...scene.props, flow: scene.props.flow.slice(0, 1) } },
    ],
  };
  const errors = validateSpec(broken).join('\n');
  assert.match(errors, /letters, digits and dashes/);
  assert.match(errors, /chapter cue "nope"/);
  assert.match(errors, /flow needs 2-4 steps/);
});

test('timeline: single scene', () => {
  const tl = computeTimeline({ ...base, scenes: [base.scenes[0]!] }, 30);
  assert.equal(tl.totalFrames, toFrames(base.scenes[0]!.duration, 30));
  assert.equal(tl.entries[0]!.from, 0);
  assert.equal(tl.cues['hook.start'], 0);
  assert.equal(tl.chapters.length, 2);
});

test('timeline: v001 is 21.0 s, continuity cuts do not overlap', () => {
  const tl = computeTimeline(base, 30);
  assert.equal(tl.totalFrames, 630);
  assert.deepEqual(tl.entries.map((e) => e.from), [0, 171, 531]);
  assert.ok(tl.entries.slice(1).every((e) => e.transitionIn?.type === 'cut'));
});

test('timeline: focus-pull overlaps scenes by 4 frames, cuts do not overlap', () => {
  const s = base.scenes[0]!;
  const spec: VideoSpec = {
    ...base,
    scenes: [
      { ...s, id: 'a', duration: 2, transitionOut: undefined },
      { ...s, id: 'b', duration: 3, transitionOut: { type: 'cut' } },
      { ...s, id: 'c', duration: 1 },
    ],
  };
  const tl = computeTimeline(spec, 30);
  assert.deepEqual(tl.entries.map((e) => e.from), [0, 56, 146]);
  assert.equal(tl.totalFrames, 176);
  assert.equal(tl.entries[1]!.transitionIn?.type, 'focusPull');
  assert.equal(tl.entries[2]!.transitionIn?.type, 'cut');
  assert.equal(tl.cues['b.start'], 56);
});

test('chapterAt picks the latest chapter at or before the frame', () => {
  const ch = [{ frame: 0, label: 'A' }, { frame: 100, label: 'B' }];
  assert.equal(chapterAt(ch, 99)?.label, 'A');
  assert.equal(chapterAt(ch, 100)?.label, 'B');
  assert.equal(chapterAt([], 5), null);
});

test('layout: safe zone for 1080x1920 matches Meta fractions', () => {
  const l = computeLayout(1080, 1920);
  assert.deepEqual([l.safe.top, l.safe.bottom, l.safe.left, l.safe.right], [269, 1248, 65, 1015]);
  assert.equal(l.u, 1);
  assert.ok(isInsideSafe(l, { x: 88, y: 300, width: 904, height: 900 }));
  assert.ok(!isInsideSafe(l, { x: 88, y: 1200, width: 100, height: 100 }));
});

test('layout scales with width', () => {
  const l = computeLayout(720, 1280);
  assert.equal(l.u, 720 / 1080);
  assert.equal(l.gutter, Math.round(88 * (720 / 1080)));
});

test('camera: holds before first key, eases between keys, holds after last', () => {
  const keys = [
    { t: 0, zoom: 1, x: 0, y: 0 },
    { t: 2, zoom: 1.1, x: 10, y: 0 },
  ];
  assert.deepEqual(sampleCamera(keys, -1), { zoom: 1, x: 0, y: 0 });
  const mid = sampleCamera(keys, 1);
  assert.ok(Math.abs(mid.zoom - 1.05) < 1e-9);
  assert.deepEqual(sampleCamera(keys, 5), { zoom: 1.1, x: 10, y: 0 });
  const early = sampleCamera(keys, 0.5);
  assert.ok(early.zoom < 1.025, 'in-out easing is slow at the start');
});

test('chaosToSystem: critical layout sits inside the safe zone', async () => {
  const { CHAOS_TO_SYSTEM_LAYOUT: L, chaosToSystemWindow } = await import('../src/video/scenes/chaosToSystem.ts');
  const { type } = await import('../src/brand/tokens.ts');
  const layout = computeLayout(1080, 1920);
  const headline = { x: layout.gutter, y: L.headlineTop, width: layout.column.width, height: L.headlineLines * type.display.size * type.display.leading };
  const caption = { x: layout.gutter, y: L.captionTop, width: layout.column.width, height: L.captionLines * type.title.size * type.title.leading };
  assert.ok(isInsideSafe(layout, headline), 'headline');
  assert.ok(isInsideSafe(layout, caption), 'caption');
  for (const steps of [2, 3, 4]) {
    const w = chaosToSystemWindow(steps);
    // Window body (all nodes) must be readable above the bottom overlay; allow the frame edge to sit on the line.
    const lastNodeBottom = w.y + w.height - L.flow.bodyPad;
    assert.ok(isInsideSafe(layout, { x: w.x, y: w.y, width: w.width, height: lastNodeBottom - w.y }), `window with ${steps} steps`);
  }
  // Caption must clear the window.
  assert.ok(L.captionTop + L.captionLines * type.title.size * type.title.leading < L.window.top, 'caption overlaps window');
});
