import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIDEOS } from '../content/index.ts';
import { computeLayout, isInsideSafe } from '../src/brand/format.ts';
import { sampleCamera, sampleCameraSmooth } from '../src/video/camera.ts';
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

test('flow step icon: opt-in override, unknown names rejected, default unchanged', async () => {
  const { validateChaosToSystem } = await import('../src/video/scenes/chaosToSystem.ts');
  const scene = base.scenes[0]!;
  if (scene.type !== 'chaosToSystem') throw new Error('fixture: first scene must be chaosToSystem');
  const withIcon = (icon: unknown) => ({ ...scene.props, flow: scene.props.flow.map((s, i) => (i === 1 ? { ...s, icon } : s)) }) as typeof scene.props;
  assert.deepEqual(validateChaosToSystem(scene.props), []);
  assert.deepEqual(validateChaosToSystem(withIcon('card')), []);
  assert.deepEqual(validateChaosToSystem(withIcon('contact')), []);
  assert.match(validateChaosToSystem(withIcon('coin')).join('\n'), /flow step 1: icon "coin"/);
  // Earlier videos never set it: their steps keep the kind's icon (v008: card; v009: card + contact).
  for (const v of VIDEOS.filter((v) => !v.id.startsWith('v008') && !v.id.startsWith('v009')))
    for (const s of v.scenes) if (s.type === 'chaosToSystem' || s.type === 'flowRun') assert.ok(s.props.flow.every((st) => st.icon === undefined), v.id);
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

test('smooth camera: exact at keys, never overshoots, no speed jump at a key, rests at the ends', () => {
  const keys = [
    { t: 0, zoom: 1, x: 0, y: 0 },
    { t: 1, zoom: 1.02, x: 4, y: 6 },
    { t: 2, zoom: 1.05, x: -4, y: 6, ease: 'linear' as const },
    { t: 3, zoom: 1.05, x: -4, y: 6 },
    { t: 4, zoom: 1.0, x: 0, y: 0 },
  ];
  for (const k of keys) assert.ok(Math.abs(sampleCameraSmooth(keys, k.t).zoom - k.zoom) < 1e-12);
  const dt = 1 / 3000;
  const speed = (t: number) => (sampleCameraSmooth(keys, t + dt).zoom - sampleCameraSmooth(keys, t - dt).zoom) / (2 * dt);
  for (let t = 0; t <= 4; t += 0.01) {
    const z = sampleCameraSmooth(keys, t).zoom;
    assert.ok(z >= 1 - 1e-12 && z <= 1.05 + 1e-12, `no overshoot at ${t}`);
  }
  // Through a monotone key (t = 1) the camera keeps moving: no stop, no jump in speed.
  assert.ok(speed(1) > 0.01);
  assert.ok(Math.abs(speed(1 - 0.002) - speed(1 + 0.002)) < 0.002);
  // The per-segment ease of sampleCamera stops at every key; the smooth path does not.
  assert.ok((sampleCamera(keys, 1).zoom - sampleCamera(keys, 1 - dt).zoom) / dt < speed(1) / 5);
  // Holds where the keys hold, rests at both ends.
  assert.ok(Math.abs(sampleCameraSmooth(keys, 2.5).zoom - 1.05) < 1e-12);
  assert.ok(Math.abs(speed(0.001)) < 0.01 && Math.abs(speed(3.999)) < 0.01);
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
