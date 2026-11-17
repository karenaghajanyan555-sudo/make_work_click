import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIDEOS } from '../content/index.ts';
import { CAPTION_BAND, computeLayout } from '../src/brand/format.ts';
import { captionWindows } from '../src/video/narration.ts';
import { CHAOS_TO_SYSTEM_LAYOUT } from '../src/video/scenes/chaosToSystem.ts';
import { END_CARD_LAYOUT, endCardCuePoints, validateEndCard } from '../src/video/scenes/endCard.ts';
import {
  FLOW_RUN_LAYOUT,
  checkAt,
  detailCloseAt,
  detailOpenAt,
  flowRunCuePoints,
  flowRunWindow,
  flowRunWindowTopAtZoom,
  focusScroll,
  scheduleHops,
  validateFlowRun,
  type FlowRunProps,
} from '../src/video/scenes/flowRun.ts';
import type { SceneSpec } from '../src/video/spec.ts';
import { computeTimeline } from '../src/video/timeline.ts';

const v001 = VIDEOS.find((v) => v.id === 'v001-memory')!;
const scene = <T extends SceneSpec['type']>(type: T) => v001.scenes.find((s): s is Extract<SceneSpec, { type: T }> => s.type === type)!;
const run = scene('flowRun');
const end = scene('endCard');
const layout = computeLayout(1080, 1920);

test('flowRun: v001 cues are ordered and inside the scene', () => {
  const c = flowRunCuePoints(run.props);
  const order = ['start', 'push', 'trigger', 'arrive1', 'done1', 'arrive2', 'done2', 'arrive3', 'done3', 'loop', 'resolve', 'converge', 'formed'];
  for (let i = 1; i < order.length; i++) assert.ok(c[order[i]!]! >= c[order[i - 1]!]!, `${order[i - 1]} ≤ ${order[i]}`);
  for (const [k, t] of Object.entries(c)) assert.ok(t >= 0 && t <= run.duration, `${k} at ${t}`);
  for (let k = 1; k < run.props.flow.length; k++) assert.ok(c[`check${k}`]! > c[`check${k - 1}`]!, 'checks land top to bottom');
});

test('flowRun: each detail opens after its step arrives and closes after its result reads', () => {
  const b = run.props.beats;
  b.steps.forEach((s, j) => {
    const i = j + 1;
    assert.ok(detailOpenAt(b, i) > s.arrive);
    assert.ok(detailCloseAt(b, i) >= s.done + 0.3, `step ${i}`);
  });
});

test('flowRun: the schedule playhead slows down and lands before the follow-up sends', () => {
  const i = run.props.details.findIndex((d) => d?.kind === 'wait');
  const d = run.props.details[i];
  assert.ok(d?.kind === 'wait');
  const hops = scheduleHops(run.props.beats, i, d);
  assert.equal(hops.length, d.sendDay - d.startDay);
  for (let k = 1; k < hops.length; k++) {
    assert.ok(hops[k]![1] - hops[k]![0] > hops[k - 1]![1] - hops[k - 1]![0], 'each hop longer than the last');
    assert.ok(hops[k]![0] >= hops[k - 1]![1], 'hops do not overlap');
  }
  assert.ok(hops.at(-1)![1] <= run.props.beats.steps[i - 1]!.done - 0.15);
});

test('flowRun: validation catches broken props', () => {
  const p = run.props;
  const bad = (patch: Partial<FlowRunProps>) => validateFlowRun({ ...p, ...patch });
  assert.deepEqual(validateFlowRun(p), []);
  assert.ok(bad({ flow: [p.flow[1]!, ...p.flow.slice(1)] }).some((e) => e.includes('trigger')));
  assert.ok(bad({ details: p.details.slice(1) }).some((e) => e.includes('one entry per flow step')));
  assert.ok(bad({ resolved: p.resolved.slice(1) }).some((e) => e.includes('resolved')));
  assert.ok(bad({ beats: { ...p.beats, trigger: p.beats.push - 1 } }).some((e) => e.includes('out of order')));
  assert.ok(bad({ beats: { ...p.beats, converge: checkAt(p.beats, p.flow.length - 1) } }).some((e) => e.includes('converge')));
  const tight = p.beats.steps.map((s, j) => (j === 0 ? { ...s, done: s.arrive + 0.5 } : s));
  assert.ok(bad({ beats: { ...p.beats, steps: tight } }).some((e) => e.includes('0.8 s')));
});

test('flowRun layout: at focus zoom the window clears the caption band and the visible canvas stays in the safe zone', () => {
  const z = FLOW_RUN_LAYOUT.zoom.focus;
  const cy = layout.safe.cy; // the camera pivots on the live-area centre (CameraRig)
  assert.ok(flowRunWindowTopAtZoom(z, cy) >= CAPTION_BAND.bottom, 'window top below the caption band');
  const w = flowRunWindow(4);
  const visibleBottom = w.y + CHAOS_TO_SYSTEM_LAYOUT.flow.headerHeight + FLOW_RUN_LAYOUT.visibleCanvas;
  assert.ok(cy + (visibleBottom - cy) * z <= layout.safe.bottom, 'visible canvas inside the safe bottom');
});

test('flowRun layout: auto-scroll keeps every expanded step inside the visible canvas', () => {
  const m = CHAOS_TO_SYSTEM_LAYOUT.flow;
  for (const [kind, h] of Object.entries(FLOW_RUN_LAYOUT.detailHeight)) {
    for (let i = 1; i < 4; i++) {
      const s = focusScroll(i, h);
      const top = m.bodyPad + i * (m.nodeHeight + m.nodeGap) - s;
      const bottom = top + m.nodeHeight + h;
      assert.ok(s >= 0 && top >= 0, `${kind} step ${i}: node top visible`);
      assert.ok(bottom <= FLOW_RUN_LAYOUT.visibleCanvas + 1e-9, `${kind} step ${i}: detail bottom visible`);
    }
  }
});

test('endCard: v001 is valid, cues are its beats, the lockup sits in the safe zone', () => {
  assert.deepEqual(validateEndCard(end.props, end.duration), []);
  const c = endCardCuePoints(end.props);
  assert.ok(c.click! <= c.wordmark! && c.wordmark! <= c.cta!);
  const L = END_CARD_LAYOUT;
  assert.ok(L.switchCy - L.switchHeight / 2 >= layout.safe.top);
  assert.ok(L.ctaTop < layout.safe.bottom);
  assert.ok(L.switchCx === layout.safe.cx, 'lockup centred');
});

test('endCard: validation catches unordered beats, an empty CTA and a CTA cut short', () => {
  assert.ok(validateEndCard({ cta: ' ' }, 3).some((e) => e.includes('empty')));
  assert.ok(validateEndCard({ cta: 'x', beats: { click: 1, wordmark: 0.5 } }, 3).some((e) => e.includes('ordered')));
  assert.ok(validateEndCard({ cta: 'x', beats: { cta: 2.5 } }, 3).some((e) => e.includes('1.2 s')));
});

test('captions: v001 windows are ordered, never overlap, and lead their spoken line', () => {
  const total = computeTimeline(v001, 30).totalFrames / 30;
  const n = v001.narration!;
  const w = captionWindows(n, total);
  assert.deepEqual(w.map((c) => c.id), n.lines.filter((l) => l.caption !== undefined).map((l) => l.id));
  for (const c of w) {
    const line = n.lines.find((l) => l.id === c.id)!;
    assert.ok(c.at <= line.at && line.at - c.at < 0.05, `${c.id} enters with its line`);
    assert.ok(c.out - c.at >= 1.5, `${c.id} stays ≥ 1.5 s`);
    assert.ok(c.out <= total);
  }
  for (let i = 1; i < w.length; i++) assert.ok(w[i]!.at >= w[i - 1]!.out, `${w[i - 1]!.id} leaves before ${w[i]!.id}`);
});

test('captions: the last captioned line leaves before the video ends', () => {
  const w = captionWindows({ lines: [{ id: 'a', text: 'A b c.', caption: 'A b c.', at: 1 }] }, 4);
  assert.deepEqual(w, [{ id: 'a', markup: 'A b c.', at: 0.98, out: 3.6 }]);
});
