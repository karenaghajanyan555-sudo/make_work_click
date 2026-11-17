import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NARRATOR, NARRATOR_CANDIDATES } from '../src/brand/voice.ts';
import { applyGain, compress, dbToGain, highpass, limit, monoToStereo, peakDb } from '../src/pipeline/dsp.ts';
import { captionWordCount, placeNarration, validateNarration, type NarrationSpec } from '../src/video/narration.ts';

const SR = 24000;
const sine = (hz: number, seconds: number, amp: number) =>
  Float32Array.from({ length: Math.round(SR * seconds) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / SR));
const rmsDb = (x: Float32Array) => 20 * Math.log10(Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length));

// ---------- narration model ----------

const narration: NarrationSpec = {
  lines: [
    { id: 'a', text: 'One line.', at: 0.2 },
    { id: 'b', text: 'Two line.', caption: 'Two *line.*', at: 2 },
  ],
};

test('valid narration passes; ordering, ids and caption rules are enforced', () => {
  assert.deepEqual(validateNarration(narration), []);
  const bad: NarrationSpec = {
    lines: [
      { id: 'a', text: 'x', at: 1 },
      { id: 'a', text: '', at: 0.5, caption: 'one two three four five six seven eight' },
      { id: 'Up', text: 'y', at: 2, caption: '*one* **two**' },
    ],
  };
  const errors = validateNarration(bad).join('\n');
  for (const needle of ['duplicate id', 'empty text', 'time order', '8 words', 'emphasis spans', 'lowercase']) {
    assert.match(errors, new RegExp(needle), needle);
  }
});

test('caption word count ignores glued punctuation', () => {
  assert.equal(captionWordCount('Let the system\n**remember**.'), 4);
});

test('placement reports overlaps, and shift mode pushes lines back by the minimum gap', () => {
  const tight = placeNarration(narration, { a: 1.9, b: 1 }, 10);
  assert.match(tight.problems.join(), /gap/);
  const shifted = placeNarration(narration, { a: 1.9, b: 1 }, 10, { shift: true });
  assert.equal(shifted.placed[1]!.start, 0.2 + 1.9 + 0.2);
  assert.match(shifted.problems.join(), /shifted/);
  assert.deepEqual(placeNarration(narration, { a: 1, b: 1 }, 10).problems, []);
  assert.match(placeNarration(narration, { a: 1, b: 1 }, 2.5).problems.join(), /ends after the video/);
});

test('every registered video narration is valid', async () => {
  const { VIDEOS } = await import('../content/index.ts');
  for (const v of VIDEOS) if (v.narration) assert.deepEqual(validateNarration(v.narration), [], v.id);
});

test('narrator: the approved voice (or the audition list) is well formed', () => {
  const voices = NARRATOR ? [NARRATOR] : NARRATOR_CANDIDATES;
  assert.ok(voices.length > 0);
  assert.equal(new Set(voices.map((v) => v.label)).size, voices.length);
  for (const v of voices) {
    assert.ok(v.speed >= 0.8 && v.speed <= 1.1, `${v.label}: speed`);
    assert.ok(Number.isInteger(v.seed));
  }
});

// ---------- DSP ----------

test('limiter never exceeds its ceiling and leaves quiet audio untouched', () => {
  const x = sine(220, 0.5, 0.95);
  x[6000] = 1.0; // a spike
  const y = limit(x, SR, { ceilingDb: -6, attackMs: 1.5, releaseMs: 60 });
  assert.ok(peakDb(y) <= -6 + 1e-6, `peak ${peakDb(y)}`);
  const quiet = sine(220, 0.2, 0.1);
  assert.deepEqual(limit(quiet, SR, { ceilingDb: -6, attackMs: 1.5, releaseMs: 60 }), quiet);
});

test('high-pass removes rumble and keeps the voice band', () => {
  const low = highpass(sine(20, 1, 0.5), SR, 70);
  const mid = highpass(sine(1000, 1, 0.5), SR, 70);
  assert.ok(rmsDb(low.subarray(SR / 2)) < rmsDb(sine(20, 1, 0.5)) - 15);
  assert.ok(Math.abs(rmsDb(mid.subarray(SR / 2)) - rmsDb(sine(1000, 1, 0.5))) < 0.1);
});

test('compressor reduces loud passages more than quiet ones (smaller crest)', () => {
  const x = new Float32Array([...sine(200, 0.5, 0.05), ...sine(200, 0.5, 0.8)]);
  const y = compress(x, SR, { thresholdDb: -20, ratio: 3, kneeDb: 6, attackMs: 4, releaseMs: 120 });
  const quietDelta = rmsDb(y.subarray(2000, SR / 2)) - rmsDb(x.subarray(2000, SR / 2));
  const loudDelta = rmsDb(y.subarray(SR / 2 + 2400)) - rmsDb(x.subarray(SR / 2 + 2400));
  assert.ok(Math.abs(quietDelta) < 0.2, `quiet ${quietDelta}`);
  assert.ok(loudDelta < -5, `loud ${loudDelta}`);
});

test('gain and mono→stereo are exact (no pan-law loss)', () => {
  assert.ok(Math.abs(applyGain(new Float32Array([0.5]), 6)[0]! - 0.5 * dbToGain(6)) < 1e-6);
  assert.deepEqual(Array.from(monoToStereo(new Float32Array([0.25, -0.5]))), [0.25, 0.25, -0.5, -0.5]);
});
