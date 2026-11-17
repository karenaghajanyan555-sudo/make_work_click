import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { audioLagMs, hasBox, staticThreshold, topLevelBoxes, visualChecks, type MotionProfile } from '../src/pipeline/qa.ts';

const status = (checks: ReturnType<typeof visualChecks>, id: string) => checks.find((c) => c.id === id)?.status;

function profile(n: number, diff: (i: number) => number, mean = 40, std = 20): MotionProfile {
  return {
    means: Array.from({ length: n }, () => mean),
    stds: Array.from({ length: n }, () => std),
    diffs: Array.from({ length: n }, (_, i) => (i === 0 ? 0 : diff(i))),
  };
}

test('pacing: lively video passes, long freeze fails, medium freeze warns', () => {
  // noise floor 0.3; action 1.5
  const lively = profile(300, (i) => (i % 10 < 2 ? 0.3 : 1.5));
  assert.equal(status(visualChecks(lively, 30), 'pacing.static'), 'pass');
  const frozen = profile(300, (i) => (i > 100 && i < 175 ? 0.3 : 1.5)); // 2.5 s static
  assert.equal(status(visualChecks(frozen, 30), 'pacing.static'), 'fail');
  const held = profile(300, (i) => (i > 100 && i < 145 ? 0.3 : 1.5)); // ~1.45 s static
  assert.equal(status(visualChecks(held, 30), 'pacing.static'), 'warn');
});

test('pacing threshold follows the noise floor', () => {
  const p = profile(200, (i) => (i % 4 === 0 ? 0.5 : 2));
  const { floor, threshold } = staticThreshold(p);
  assert.equal(floor, 0.5);
  assert.ok(Math.abs(threshold - 0.58) < 1e-9);
});

test('hook: blank first frame fails, content passes', () => {
  const p = profile(60, () => 1);
  assert.equal(status(visualChecks(p, 30), 'hook.firstFrame'), 'pass');
  p.stds[0] = 1;
  assert.equal(status(visualChecks(p, 30), 'hook.firstFrame'), 'fail');
});

test('black stretches are detected', () => {
  const p = profile(60, () => 1);
  for (let i = 10; i < 20; i++) {
    p.means[i] = 1;
    p.stds[i] = 0.5;
  }
  assert.equal(status(visualChecks(p, 30), 'visual.black'), 'fail');
});

test('faststart: box order is read from the file', () => {
  const box = (kind: string, size: number) => {
    const b = Buffer.alloc(size);
    b.writeUInt32BE(size, 0);
    b.write(kind, 4, 'latin1');
    return b;
  };
  const dir = mkdtempSync(path.join(os.tmpdir(), 'mwc-qa-'));
  const file = path.join(dir, 'a.mp4');
  writeFileSync(file, Buffer.concat([box('ftyp', 16), box('moov', 32), box('mdat', 64)]));
  assert.deepEqual(topLevelBoxes(file), ['ftyp', 'moov', 'mdat']);
});

test('edit lists: hasBox looks inside moov only', () => {
  const box = (kind: string, body: Buffer = Buffer.alloc(0)) => {
    const b = Buffer.alloc(8);
    b.writeUInt32BE(8 + body.length, 0);
    b.write(kind, 4, 'latin1');
    return Buffer.concat([b, body]);
  };
  const dir = mkdtempSync(path.join(os.tmpdir(), 'mwc-qa-'));
  const withEdts = path.join(dir, 'e.mp4');
  writeFileSync(withEdts, Buffer.concat([box('ftyp'), box('moov', box('trak', box('edts'))), box('mdat')]));
  assert.equal(hasBox(withEdts, 'edts'), true);
  const without = path.join(dir, 'n.mp4');
  writeFileSync(without, Buffer.concat([box('ftyp'), box('moov', box('trak')), box('mdat', Buffer.from('edts'))]));
  assert.equal(hasBox(without, 'edts'), false, 'mdat payload is not metadata');
});

test('sync: cross-correlation finds the lag in both directions', () => {
  const sr = 48000;
  let seed = 3;
  const noise = Float32Array.from({ length: sr }, () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5);
  const shift = (x: Float32Array, n: number) => Float32Array.from(x, (_, i) => x[i - n] ?? 0);
  assert.equal(audioLagMs(noise, noise, 20000, 4096, 200, sr), 0);
  assert.equal(audioLagMs(noise, shift(noise, 96), 20000, 4096, 200, sr), 2); // test 96 samples late
  assert.equal(audioLagMs(noise, shift(noise, -48), 20000, 4096, 200, sr), -1);
});
