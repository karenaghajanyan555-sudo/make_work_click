/**
 * Voice step: get the narration take for a video and write its timing lock.
 *
 *   npm run voice -- <videoId>
 *     approved take (narration.take, own or "<video>/take-NN")  → used as is (never re-made)
 *     no take yet                                              → draft from the narration cache,
 *                                                                synthesised once with NARRATOR
 *     → content/timing/<id>.ts      word-level timing lock (commit it with the content file)
 *     → out/<id>/voice/draft.m4a    the draft take, to listen to and approve
 *
 * Unchanged script → cache hit, no synthesis. Approve a draft: npm run approve-take -- <id> draft
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { getVideo } from '../content/index.ts';
import { encodeAac, masterVoice, readWav, writeWav } from '../src/pipeline/audio.ts';
import { recordStep } from '../src/pipeline/cache.ts';
import { ensureDraft, narrationSource, timingLock, writeTimingLock, type NarrationSource } from '../src/pipeline/narration.ts';
import { ROOT, videoOut } from '../src/pipeline/paths.ts';

const id = process.argv[2];
if (!id || id.startsWith('--')) {
  console.error('Usage: npm run voice -- <videoId>');
  process.exit(2);
}
const t0 = performance.now();
const spec = getVideo(id);
const n = spec.narration;
if (!n) {
  console.log(`${id}: no narration — nothing to do`);
  process.exit(0);
}

let src: NarrationSource;
let cached = true;
if (n.take) {
  src = narrationSource(id, n);
  const drift = n.lines.filter((l, i) => src.take.lines[i]?.id !== l.id || src.take.lines[i]?.text !== l.text);
  if (drift.length || src.take.lines.length !== n.lines.length) {
    console.error(`✗ ${id}: the script differs from approved ${n.take} (${drift.map((l) => l.id).join(', ') || 'line count'}).`);
    console.error('  Approved takes are immutable: remove `take` to make a new draft, then approve it.');
    process.exit(1);
  }
} else {
  const r = await ensureDraft(n);
  src = r.source;
  cached = r.cached;
  console.log(r.cached ? `  draft take: cache hit (${path.relative(ROOT, src.dir)})` : `  draft take: synthesised in ${r.seconds.toFixed(1)} s → ${path.relative(ROOT, src.dir)}`);
}

const lockFile = writeTimingLock(timingLock(id, n, src));

// A listening copy of the draft (level-matched like the auditions).
let listen = '';
if (src.kind === 'draft') {
  const dir = path.join(videoOut(id), 'voice');
  mkdirSync(dir, { recursive: true });
  const m4a = path.join(dir, 'draft.m4a');
  if (!cached || !existsSync(m4a)) {
    const wav = path.join(dir, 'draft.wav');
    const mastered = await masterVoice(readWav(path.join(src.dir, 'take.wav')), -16, path.join(dir, 'work.wav'));
    writeWav(wav, mastered.pcm);
    await encodeAac(wav, m4a, { bitrateK: 192 });
  }
  listen = path.relative(ROOT, m4a);
}

const seconds = (performance.now() - t0) / 1000;
mkdirSync(videoOut(id), { recursive: true });
recordStep(id, 'voice', { key: path.basename(src.dir), seconds, cached, detail: `${src.kind} take, ${src.take.lines.length} lines` });
console.log(`✓ ${id}: ${src.kind} take, ${src.take.lines.length} lines, ${src.take.takeDuration.toFixed(2)} s spoken`);
console.log(`  timing lock → ${path.relative(ROOT, lockFile)}`);
if (listen) console.log(`  listen → ${listen}  (approve: npm run approve-take -- ${id} draft)`);
