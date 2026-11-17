import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIDEOS } from '../content/index.ts';
import { PUBLISH_LIMITS, postText, validatePublish, type PublishSpec } from '../src/video/publish.ts';
import { validateSpec } from '../src/video/spec.ts';
import { computeTimeline } from '../src/video/timeline.ts';

const v001 = VIDEOS.find((v) => v.id === 'v001-memory')!;
const ok: PublishSpec = { coverAt: 1, title: 'A title', caption: 'Body.', hashtags: ['#one', '#two'] };

test('publish: v001 copy is valid and its cover frame exists', () => {
  const p = v001.publish!;
  const tl = computeTimeline(v001, 30);
  assert.deepEqual(validatePublish(p, tl.totalFrames / 30), []);
  assert.ok(Math.round(p.coverAt * 30) < tl.totalFrames);
});

test('publish: post text is the caption, a blank line, then the hashtags', () => {
  assert.equal(postText(ok), 'Body.\n\n#one #two');
  assert.equal(postText({ ...ok, hashtags: [] }), 'Body.');
});

test('publish: validation catches links, long titles, bad tags and a cover outside the video', () => {
  const errs = (p: Partial<PublishSpec>) => validatePublish({ ...ok, ...p }, 10);
  assert.deepEqual(errs({}), []);
  assert.ok(errs({ caption: 'Try it: https://example.com' }).some((e) => e.includes('links')));
  assert.ok(errs({ caption: 'Get it at toolname.io' }).some((e) => e.includes('links')));
  assert.ok(errs({ title: 'x'.repeat(PUBLISH_LIMITS.titleChars + 1) }).some((e) => e.includes('characters')));
  assert.ok(errs({ title: 'a <b>' }).some((e) => e.includes('<')));
  assert.ok(errs({ hashtags: ['automation'] }).some((e) => e.includes('"#"')));
  assert.ok(errs({ hashtags: ['#a', '#A'] }).some((e) => e.includes('repeated')));
  assert.ok(errs({ hashtags: ['#a', '#b', '#c', '#d', '#e', '#f'] }).some((e) => e.includes('max')));
  assert.ok(errs({ coverAt: 10 }).some((e) => e.includes('coverAt')));
  assert.ok(errs({ caption: 'é'.repeat(2600) }).some((e) => e.includes('bytes')), 'limit is bytes, not characters');
});

test('publish: a final video must carry its post copy', () => {
  const { publish: _, ...rest } = v001;
  assert.ok(validateSpec({ ...rest, status: 'final' }).some((e) => e.includes('publish')));
});
