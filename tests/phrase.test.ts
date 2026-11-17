import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePhrase, tokenEnterFrames } from '../src/captions/phrase.ts';

test('plain words', () => {
  const t = parsePhrase('Build it once.');
  assert.deepEqual(
    t.map((x) => [x.text, x.emphasis]),
    [['Build', 'none'], ['it', 'none'], ['once.', 'none']],
  );
});

test('emphasis and signal spans, multi-word span', () => {
  const t = parsePhrase('on your *memory.* and **runs itself**');
  assert.deepEqual(
    t.map((x) => [x.text, x.emphasis]),
    [['on', 'none'], ['your', 'none'], ['memory.', 'emphasis'], ['and', 'none'], ['runs', 'signal'], ['itself', 'signal']],
  );
});

test('punctuation after a span is glued, not spaced', () => {
  const t = parsePhrase('sends **itself**.');
  assert.equal(t.length, 3);
  assert.equal(t[2]?.text, '.');
  assert.equal(t[2]?.glued, true);
  assert.equal(t[1]?.glued, false);
});

test('line breaks mark the first token of each new line', () => {
  const t = parsePhrase('Your business\nshouldn’t depend\non your *memory.*');
  assert.deepEqual(
    t.filter((x) => x.newLine).map((x) => x.text),
    ['shouldn’t', 'on'],
  );
});

test('unbalanced markup fails loudly', () => {
  assert.throws(() => parsePhrase('sends **itself'), /Unbalanced/);
  assert.throws(() => parsePhrase('a *b'), /Unbalanced/);
});

test('empty phrase fails', () => {
  assert.throws(() => parsePhrase('   '), /Empty/);
});

test('glued tokens enter with the word they attach to', () => {
  const t = parsePhrase('sends **itself**. Done');
  assert.deepEqual(tokenEnterFrames(t, 3), [0, 3, 3, 6]);
});
