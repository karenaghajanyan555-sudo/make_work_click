/**
 * The engine's pure core: narration-driven timing, the scene library contract, the score
 * composer, presets/transitions, and segment planning (what re-renders when what changes).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIDEOS } from '../content/index.ts';
import { computeLayout, CAPTION_BAND } from '../src/brand/format.ts';
import { PRESETS } from '../src/brand/presets.ts';
import { planSegments } from '../src/pipeline/segments.ts';
import { composeScore, HARMONY } from '../src/sound/compose.ts';
import { SFX } from '../src/sound/effects.ts';
import { cueSeconds, sfxEvents, validateScore } from '../src/sound/score.ts';
import { midi } from '../src/pipeline/sound/fx.ts';
import { defineVideo, type AuthoredVideo } from '../src/video/define.ts';
import { captionWindows } from '../src/video/narration.ts';
import { SCENE_MODELS } from '../src/video/scenes/registry.ts';
import { DATA_LAYOUT, formatValue, NOTIFICATIONS_LAYOUT, PRODUCT_ZONE, timelineHeight, dashboardHeight } from '../src/video/scenes/product.ts';
import { validateSpec, type SceneSpec, type VideoSpec } from '../src/video/spec.ts';
import { computeTimeline, TRANSITIONS } from '../src/video/timeline.ts';
import { estimateLock, fnv1a, scriptHash, wordOffset, type TimingLock } from '../src/video/timing.ts';

const v002 = VIDEOS.find((v) => v.id === 'v002-meetings')!;
const library = VIDEOS.find((v) => v.id === 'library')!;

// ---------- timing ----------
const lock: TimingLock = {
  video: 't',
  source: { kind: 'draft', path: 'x' },
  voice: 'v',
  scriptHash: scriptHash([
    { id: 'a', text: 'Hello there, friend.' },
    { id: 'b', text: 'It works anyway.' },
  ]),
  lines: [
    { id: 'a', text: 'Hello there, friend.', duration: 1.5, sourceStart: 0.2, words: [['Hello', 0.05, 0.4], ['there', 0.4, 0.8], ['friend', 0.85, 1.4]] },
    { id: 'b', text: 'It works anyway.', duration: 1.2, sourceStart: 2.0, words: [['It', 0.05, 0.2], ['works', 0.2, 0.6], ['anyway', 0.65, 1.1]] },
  ],
};

const authored = (over: Partial<AuthoredVideo> = {}): AuthoredVideo => ({
  id: 't',
  title: 't',
  series: 'T',
  format: 'vertical',
  theme: 'ink',
  status: 'draft',
  narration: {
    lines: [
      { id: 'a', text: 'Hello there, friend.', caption: 'Hello there,|*friend.*' },
      { id: 'b', text: 'It works anyway.', pause: 0.5 },
    ],
  },
  scenes: [
    { id: 's1', type: 'statement', say: ['a'], transitionOut: { type: 'cut' }, props: { text: 'One', beats: { support: { line: 'a', word: 'friend' } } } },
    { id: 's2', type: 'statement', say: ['b'], props: { text: 'Two', beats: { text: { line: 'b', word: 'anyway', edge: 'end', offset: -0.1 } } } },
  ],
  ...over,
});

test('timing: fnv1a and script hashes are stable', () => {
  assert.equal(fnv1a(''), '811c9dc5');
  assert.equal(fnv1a('a'), 'e40c292c');
  assert.notEqual(scriptHash([{ id: 'a', text: 'x' }]), scriptHash([{ id: 'a', text: 'y' }]));
});

test('timing: word references resolve case- and punctuation-insensitively', () => {
  const l = lock.lines[0]!;
  assert.equal(wordOffset(l, { word: 'FRIEND' }), 0.85);
  assert.equal(wordOffset(l, { word: 'there,', edge: 'end' }), 0.8);
  assert.equal(wordOffset(l, {}), 0);
  assert.equal(wordOffset(l, { edge: 'end' }), 1.5);
  assert.throws(() => wordOffset(l, { word: 'nope' }), /not spoken/);
});

test('defineVideo: lines follow the take rhythm plus pauses; scenes and beats follow the voice', () => {
  const v = defineVideo(authored(), lock);
  assert.equal(v.timingIssues, undefined);
  const [a, b] = v.narration!.lines;
  assert.equal(a!.at, 0.25); // AUTO_TIMING.lead
  assert.equal(b!.at, 0.25 + (2.0 - 0.2) + 0.5); // source gap + pause
  // Split caption: phrase 2 enters on its first spoken word ("friend" at +0.85).
  assert.deepEqual(a!.phrases, [{ markup: 'Hello there,', at: 0.25 }, { markup: '*friend.*', at: 1.1 }]);
  // Scene 2 starts 0.35 s before line b; scene 1 lasts until then (cut: no overlap).
  const [s1, s2] = v.scenes;
  assert.ok(Math.abs(s1!.duration - (b!.at - 0.35)) < 1 / 30 + 1e-9);
  // Last scene holds 0.7 s after the last word.
  assert.ok(Math.abs(s1!.duration + s2!.duration - (b!.at + 1.2 + 0.7)) < 2 / 30);
  // Beats: scene-local seconds of the spoken words.
  assert.equal((s1!.props as { beats: { support: number } }).beats.support, 0.25 + 0.85);
  const s2Start = s1!.duration;
  assert.ok(Math.abs((s2!.props as { beats: { text: number } }).beats.text - (b!.at + 1.1 - 0.1 - s2Start)) < 1e-6);
});

test('defineVideo: a changed script flags the stale lock; no lock estimates for storyboarding', () => {
  const stale = defineVideo(authored({ narration: { lines: [{ id: 'a', text: 'Changed.' }, { id: 'b', text: 'It works anyway.' }] } }), lock);
  assert.ok(stale.timingIssues?.some((e) => e.includes('stale')));
  const none = defineVideo(authored());
  assert.ok(none.timingIssues?.some((e) => e.includes('no timing lock')));
  assert.ok(none.scenes.every((s) => s.duration > 0), 'still previewable');
  assert.ok(validateSpec(none).some((e) => e.includes('npm run voice')));
});

test('defineVideo: explicit times are kept untouched (v001 style)', () => {
  const v = defineVideo(
    authored({
      narration: { lines: [{ id: 'a', text: 'Hello there, friend.', at: 1 }, { id: 'b', text: 'It works anyway.', at: 4 }] },
      scenes: [{ id: 's', type: 'statement', duration: 6, props: { text: 'x' } }],
    }),
  );
  assert.equal(v.timingIssues, undefined);
  assert.deepEqual(v.narration!.lines.map((l) => l.at), [1, 4]);
  assert.equal(v.scenes[0]!.duration, 6);
});

test('estimated timing is monotonic and covers every word', () => {
  const e = estimateLock('x', [{ id: 'a', text: 'One two three.' }, { id: 'b', text: 'Four.' }]);
  assert.equal(e.lines[0]!.words.length, 3);
  assert.ok(e.lines[1]!.sourceStart > e.lines[0]!.sourceStart + e.lines[0]!.duration);
});

test('split captions: one window per phrase, never overlapping', () => {
  const v = defineVideo(authored(), lock);
  const w = captionWindows(v.narration!, 10);
  assert.deepEqual(w.map((c) => c.id), ['a.0', 'a.1']);
  assert.ok(w[0]!.out <= w[1]!.at);
});

// ---------- scene library ----------
test('scene library: every type has a model with a name, story and minimum duration', () => {
  const names = Object.values(SCENE_MODELS).map((m) => m.name);
  assert.equal(new Set(names).size, names.length, 'names unique');
  for (const n of ['HookScene', 'ProblemScene', 'StatementScene', 'DashboardScene', 'WorkflowScene', 'AutomationScene', 'NotificationScene', 'TimelineScene', 'ComparisonScene', 'DataScene', 'PayoffScene', 'BrandOutroScene']) {
    assert.ok(names.includes(n), n);
  }
  for (const m of Object.values(SCENE_MODELS)) assert.ok(m.minDuration > 0 && m.story.length > 10);
});

test('scene library: the library video uses every new type and validates', () => {
  assert.deepEqual(validateSpec(library), []);
  const types = new Set(library.scenes.map((s) => s.type));
  for (const t of ['hook', 'statement', 'problem', 'comparison', 'dashboard', 'notifications', 'timeline', 'data', 'payoff', 'endCard'] as const) assert.ok(types.has(t), t);
});

test('scene library: product layouts stay below the caption band and inside the safe zone', () => {
  const safe = computeLayout(1080, 1920).safe;
  assert.ok(PRODUCT_ZONE.top >= CAPTION_BAND.bottom);
  assert.ok(PRODUCT_ZONE.bottom <= safe.bottom);
  assert.ok(PRODUCT_ZONE.x >= 0 && PRODUCT_ZONE.x + PRODUCT_ZONE.width <= 1080);
  assert.ok(PRODUCT_ZONE.top + dashboardHeight(4) <= PRODUCT_ZONE.bottom);
  assert.ok(PRODUCT_ZONE.top + timelineHeight(5) <= PRODUCT_ZONE.bottom);
  assert.ok(DATA_LAYOUT.chartTop + DATA_LAYOUT.chartHeight <= safe.bottom);
  assert.ok(NOTIFICATIONS_LAYOUT.top >= CAPTION_BAND.bottom);
});

test('scene library: validation catches broken content', () => {
  const m = SCENE_MODELS;
  assert.ok(m.problem.validate({ items: [{ text: 'x' }] }, 3).some((e) => e.includes('items')));
  assert.ok(m.dashboard.validate({ workspace: { name: 'a', initials: 'A', breadcrumb: 'b' }, metrics: [], listTitle: 'x', rows: [] }, 3).length >= 2);
  assert.ok(m.notifications.validate({ items: [{ app: 'a', icon: 'mail', title: 't', body: 'b', time: '1' }], expand: { index: 3, rows: [{ label: 'a', text: 'b' }] } }, 3).some((e) => e.includes('index')));
  assert.ok(m.data.validate({ metrics: [{ label: 'a', value: 1 }], chart: { kind: 'bar', title: 't', labels: ['a'], values: [1, 2] } }, 3).some((e) => e.includes('labels')));
  assert.ok(m.comparison.validate({ before: { label: 'a', items: ['x'] }, after: { label: 'b', items: ['y'] }, beats: { before: 2, click: 1 } }, 4).some((e) => e.includes('before')));
});

test('scene library: sounds only name cues the scene has', () => {
  for (const v of VIDEOS) {
    for (const s of v.scenes) {
      const model = SCENE_MODELS[s.type] as (typeof SCENE_MODELS)[SceneSpec['type']];
      const cues = model.cues(s.props as never, s.duration);
      for (const snd of model.sounds(s.props as never, cues)) assert.ok(snd.cue in cues, `${v.id}/${s.id}: ${snd.cue}`);
      for (const snd of s.sounds ?? []) assert.ok(snd.cue in cues, `${v.id}/${s.id}: extra sound on missing cue ${snd.cue}`);
      for (const snd of [...model.sounds(s.props as never, cues), ...(s.sounds ?? [])]) assert.ok(snd.id in SFX);
    }
  }
});

test('formatValue is deterministic', () => {
  assert.deepEqual([formatValue(1234), formatValue(93.6, 'pct'), formatValue(1500, 'money'), formatValue(3.46, 'hours'), formatValue(12, 'minutes')], ['1,234', '94%', '$1,500', '3.5 h', '12 min']);
});

// ---------- presets + transitions ----------
test('presets keep the brand: same easing world, bounded camera and tempo', () => {
  for (const p of Object.values(PRESETS)) {
    assert.ok(p.motion.tempo >= 0.8 && p.motion.tempo <= 1.25, p.name);
    assert.ok(p.motion.camera >= 0 && p.motion.camera <= 2, p.name);
    assert.ok(p.world.vignette > 0.4 && p.world.vignette < 0.8, p.name);
    assert.ok(p.transition.type in TRANSITIONS);
  }
  assert.equal(PRESETS.editorial.transition.type, 'focusPull', 'editorial = the v001 look');
});

test('transitions: overlaps are short and the timeline subtracts them', () => {
  for (const [k, t] of Object.entries(TRANSITIONS)) {
    assert.ok(t.overlap <= 0.5, k);
    assert.ok(t.overlap <= Math.max(t.in, t.out) + 1e-9, k);
  }
  const tl = computeTimeline(library, 30);
  for (let i = 1; i < tl.entries.length; i++) {
    const prev = tl.entries[i - 1]!;
    const overlap = prev.from + prev.durationInFrames - tl.entries[i]!.from;
    assert.equal(overlap, Math.round(TRANSITIONS[prev.transitionOut!.type].overlap * 30), prev.scene.id);
  }
});

// ---------- score composer ----------
test('composer: v002 score is valid, anchored, and every note is playable', () => {
  const tl = computeTimeline(v002, 30);
  const cues = cueSeconds(tl);
  const total = tl.totalFrames / 30;
  const score = composeScore(v002.audio!.compose!, cues, total);
  assert.deepEqual(validateScore(score, cues, total), []);
  assert.ok(score.notes.length > 30);
  assert.equal(score.fadeOut.to, total);
  const range = { piano: [27, 81], vibes: [62, 79], chime: [66, 81] } as const;
  for (const n of score.notes) for (const note of n.notes) {
    const m = midi(note);
    assert.ok(m >= range[n.inst][0] && m <= range[n.inst][1], `${n.inst} ${note}`);
  }
});

test('composer: every harmony preset stays within the sampled range', () => {
  for (const [name, h] of Object.entries(HARMONY)) {
    const all = [...h.progression.flatMap((c) => [c.bass, ...c.mid, ...c.pulse]), ...h.arrival, ...h.intro.fifth, ...h.intro.line, ...h.hold.flat(), ...h.home.piano];
    for (const n of all) assert.ok(midi(n) >= 27 && midi(n) <= 81, `${name} ${n}`);
  }
});

test('effects: v002 gets its sounds from the scene library, in order', () => {
  const ev = sfxEvents(v002, computeTimeline(v002, 30));
  const ids = new Set(ev.map((e) => e.id));
  for (const id of ['tick', 'notify', 'open', 'check', 'sent', 'click'] as const) assert.ok(ids.has(id), id);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i]!.t >= ev[i - 1]!.t);
});

// ---------- segments ----------
test('segments: one per scene, contiguous, covering every frame', () => {
  for (const v of [VIDEOS[0]!, v002]) {
    const tl = computeTimeline(v, 30);
    const segs = planSegments(v, tl, 'code');
    assert.equal(segs.length, v.scenes.length);
    assert.equal(segs[0]!.from, 0);
    assert.equal(segs.at(-1)!.to, tl.totalFrames - 1);
    for (let i = 1; i < segs.length; i++) assert.equal(segs[i]!.from, segs[i - 1]!.to + 1);
  }
});

test('segments: editing one scene changes only the segments that show it', () => {
  const base = v002;
  const tl = computeTimeline(base, 30);
  const before = planSegments(base, tl, 'code').map((s) => s.key);
  const k = base.scenes.findIndex((s) => s.id === 'tracked');
  const edited: VideoSpec = {
    ...base,
    scenes: base.scenes.map((s, i) => (i === k && s.type === 'data' ? { ...s, props: { ...s.props, note: 'Changed note' } } : s)),
  };
  const after = planSegments(edited, computeTimeline(edited, 30), 'code').map((s) => s.key);
  const changed = before.map((key, i) => (key !== after[i] ? i : -1)).filter((i) => i >= 0);
  assert.ok(changed.includes(k));
  assert.ok(changed.every((i) => Math.abs(i - k) <= 1), `only the scene and a neighbour sharing a hand-off: ${changed}`);
  assert.ok(changed.length < before.length);
  // Code changes invalidate everything.
  const recoded = planSegments(base, tl, 'other-code').map((s) => s.key);
  assert.ok(recoded.every((key, i) => key !== before[i]));
});
