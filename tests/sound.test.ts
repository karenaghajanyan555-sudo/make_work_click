import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIDEOS } from '../content/index.ts';
import { convolve, duckGain, fft, midi, resample, reverbImpulse, rng } from '../src/pipeline/sound/fx.ts';
import { cueSeconds, resolveTime, sfxEvents, validateScore, type ScoreSpec } from '../src/sound/score.ts';
import { computeTimeline } from '../src/video/timeline.ts';

const v001 = VIDEOS.find((v) => v.id === 'v001-memory')!;
const timeline = computeTimeline(v001, 30);
const cues = cueSeconds(timeline);
const total = timeline.totalFrames / 30;

test('score: cue times and bar/beat times resolve', () => {
  const s = { bpm: 96, anchor: 'a' };
  const c = { a: 2, b: 5 };
  assert.equal(resolveTime({ cue: 'b', offset: -0.25 }, c, s), 4.75);
  assert.equal(resolveTime({ bar: 1, beat: 1 }, c, s), 2);
  assert.equal(resolveTime({ bar: 2, beat: 3 }, c, s), 2 + 6 * 0.625); // 96 BPM: 0.625 s per beat
  assert.throws(() => resolveTime({ cue: 'nope' }, c, s), /unknown cue/);
});

test('score: the v001 score is valid against its timeline', () => {
  assert.ok(v001.score);
  assert.deepEqual(validateScore(v001.score, cues, total), []);
});

test('score: validation catches unknown cues, hot notes and a fade past the end', () => {
  const s = v001.score!;
  const broken: ScoreSpec = {
    ...s,
    anchor: 'nope.cue',
    notes: [{ ...s.notes[0]!, at: { cue: 'missing' } }, { ...s.notes[0]!, vel: 3 }],
    fadeOut: { from: total, to: total + 2 },
  };
  const e = validateScore(broken, cues, total);
  assert.ok(e.some((x) => x.includes('anchor')));
  assert.ok(e.some((x) => x.includes('missing')));
  assert.ok(e.some((x) => x.includes('vel')));
  assert.ok(e.some((x) => x.includes('fadeOut')));
});

test('sfx: v001 gets one sound per meaningful moment, in order, inside the video', () => {
  const ev = sfxEvents(v001, timeline);
  const count = (id: string) => ev.filter((e) => e.id === id).length;
  const hook = v001.scenes.find((s) => s.type === 'chaosToSystem')!;
  const run = v001.scenes.find((s) => s.type === 'flowRun')!;
  if (hook.type !== 'chaosToSystem' || run.type !== 'flowRun') throw new Error('fixture');
  const wait = run.props.details.find((d) => d?.kind === 'wait');
  assert.equal(count('flip'), hook.props.flow.length);
  assert.equal(count('click'), 2, 'hook click + end-card click');
  assert.equal(count('sent'), 2, 'welcome email + follow-up');
  assert.equal(count('day'), wait?.kind === 'wait' ? wait.sendDay - wait.startDay : 0);
  assert.equal(count('check'), run.props.flow.length);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i]!.t >= ev[i - 1]!.t);
  for (const e of ev) assert.ok(e.t >= 0 && e.t < total, `${e.id} at ${e.t}`);
});

test('fx: FFT round-trips and convolution matches the direct sum', () => {
  const r = rng(1);
  const re = Float64Array.from({ length: 64 }, () => r() - 0.5);
  const im = new Float64Array(64);
  const orig = re.slice();
  fft(re, im);
  fft(re, im, true);
  for (let i = 0; i < 64; i++) assert.ok(Math.abs(re[i]! - orig[i]!) < 1e-12 && Math.abs(im[i]!) < 1e-12);
  assert.throws(() => fft(new Float64Array(6), new Float64Array(6)), /power of two/);

  const x = Float32Array.from([1, -2, 0.5, 3]);
  const h = Float32Array.from([0.5, 0.25, -1]);
  const y = convolve(x, h);
  assert.equal(y.length, x.length + h.length - 1);
  for (let n = 0; n < y.length; n++) {
    let d = 0;
    for (let k = 0; k < h.length; k++) d += (x[n - k] ?? 0) * h[k]!;
    assert.ok(Math.abs(y[n]! - d) < 1e-6, `y[${n}]`);
  }
});

test('fx: resampling shifts pitch by the ratio', () => {
  const sr = 48000;
  const sine = Float32Array.from({ length: sr }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / sr));
  const crossings = (x: Float32Array) => {
    let c = 0;
    for (let i = 1; i < x.length; i++) if (x[i - 1]! < 0 && x[i]! >= 0) c++;
    return c;
  };
  const up = resample(sine, 2 ** (7 / 12)); // a fifth up
  const seconds = up.length / sr;
  assert.ok(Math.abs(crossings(up) / seconds - 440 * 2 ** (7 / 12)) < 2);
  assert.ok(Math.abs(up.length - sine.length / 2 ** (7 / 12)) < 3);
  assert.equal(resample(sine, 1), sine);
});

test('fx: ducking leaves quiet passages alone and cuts by the full depth under speech', () => {
  const sr = 1000;
  const o = { thresholdDb: -42, depthDb: 6, attackMs: 70, releaseMs: 420 };
  const quiet = duckGain(new Float32Array(2000).fill(-80), sr, o);
  assert.equal(quiet.at(-1), 1);
  const speech = duckGain(new Float32Array(2000).fill(-20), sr, o);
  assert.ok(Math.abs(20 * Math.log10(speech.at(-1)!) + 6) < 0.01);
  assert.ok(speech[10]! > speech[500]!, 'attack is smoothed, not instant');
});

test('fx: note names, seeded noise and the reverb impulse are deterministic', () => {
  assert.deepEqual(['C4', 'A4', 'F#2', 'Bb2', 'D5'].map(midi), [60, 69, 42, 46, 74]);
  assert.throws(() => midi('H2'));
  const a = rng(7), b = rng(7);
  for (let i = 0; i < 100; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
  const o = { seconds: 1.2, rt60: 0.9, preDelayMs: 8, brightHz: 9000, darkHz: 2500, seed: 23 };
  const ir = reverbImpulse(48000, o);
  assert.deepEqual(ir.l, reverbImpulse(48000, o).l);
  const energy = (x: Float32Array, from: number, to: number) => x.subarray(from, to).reduce((s, v) => s + v * v, 0);
  const q = Math.floor(ir.l.length / 4);
  assert.ok(energy(ir.l, 3 * q, 4 * q) < energy(ir.l, 0, q) / 100, 'decays by > 20 dB');
  assert.notDeepEqual(ir.l, ir.r, 'decorrelated channels');
});
