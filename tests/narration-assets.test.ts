/**
 * Approved narration takes are immutable ("gold"). These tests fail if a frozen file is
 * changed, added or removed, if the script drifts from what was recorded, or if the take
 * no longer fits its planned times. To change narration: record a new take
 * (npm run voices → npm run approve-take), never edit take-NN in place.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { VIDEOS } from '../content/index.ts';
import { ROOT } from '../src/pipeline/paths.ts';
import { placeNarration } from '../src/video/narration.ts';

type Approved = { video: string; take: string; files: Record<string, string> };
type TakeManifest = { lines: Array<{ id: string; text: string; duration: number; file: string }> };

const withTakes = VIDEOS.filter((v) => v.narration?.take);
/** A take is `take-NN` (the video's own) or `<video>/take-NN` (reused, identical script). */
const takeDir = (v: (typeof VIDEOS)[number]) => {
  const t = v.narration!.take!;
  const [owner, take] = t.includes('/') ? (t.split('/') as [string, string]) : [v.id, t];
  return { owner, take, dir: path.join(ROOT, 'public', 'narration', owner, take) };
};

test('every approved take is byte-identical to what was approved', () => {
  for (const v of withTakes) {
    const { owner, take, dir } = takeDir(v);
    assert.ok(existsSync(path.join(dir, 'approved.json')), `${v.id}: ${dir} has no approved.json`);
    const approved = JSON.parse(readFileSync(path.join(dir, 'approved.json'), 'utf8')) as Approved;
    assert.equal(approved.video, owner);
    assert.equal(approved.take, take);
    const onDisk = readdirSync(dir).filter((f) => f !== 'approved.json').sort();
    assert.deepEqual(onDisk, Object.keys(approved.files).sort(), `${v.id}: files added or removed`);
    for (const [f, sha] of Object.entries(approved.files)) {
      const got = createHash('sha256').update(readFileSync(path.join(dir, f))).digest('hex');
      assert.equal(got, sha, `${v.id}/${approved.take}/${f} changed — approved takes are immutable`);
    }
  }
});

test('the spoken script matches the approved take, line for line', () => {
  for (const v of withTakes) {
    const { dir } = takeDir(v);
    const take = JSON.parse(readFileSync(path.join(dir, 'take.json'), 'utf8')) as TakeManifest;
    assert.deepEqual(
      take.lines.map((l) => [l.id, l.text]),
      v.narration!.lines.map((l) => [l.id, l.text]),
      `${v.id}: script differs from ${v.narration!.take} — record a new take instead of editing text`,
    );
  }
});

test('approved takes fit their planned times without overlaps or shifts', () => {
  for (const v of withTakes) {
    const { dir } = takeDir(v);
    const take = JSON.parse(readFileSync(path.join(dir, 'take.json'), 'utf8')) as TakeManifest;
    const durations = Object.fromEntries(take.lines.map((l) => [l.id, l.duration]));
    assert.deepEqual(placeNarration(v.narration!, durations, Infinity).problems, [], v.id);
  }
});
