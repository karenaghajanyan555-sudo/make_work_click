/**
 * Freeze an audition take as an approved narration asset (immutable, hash-checked).
 *
 *   npm run approve-take -- <videoId> <auditionLabel>
 *     e.g. npm run approve-take -- v001-memory G-bella-nicole
 *   npm run approve-take -- <videoId> draft
 *     freezes the draft take made by `npm run voice` (the one in out/<id>/voice/draft.m4a)
 *
 * Copies out/<id>/voices/takes/<label>/ (the exact take the user heard) and the audition
 * .m4a into public/narration/<id>/take-NN/ (next free number) with approved.json listing
 * every file's sha256. Never overwrites: improvements become take-NN+1 beside it.
 * tests/narration-assets.test.ts fails if an approved file changes or the script drifts.
 * Then set `narration.take` in the video spec to the new take.
 * Atomic: the take is assembled in take-NN.part/ and renamed only when every file is copied,
 * verified against its source and listed in approved.json; an interrupted run leaves no take.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getVideo } from '../content/index.ts';
import { ROOT, videoOut } from '../src/pipeline/paths.ts';
import { NARRATION_CACHE, narrationKey, type Take } from '../src/pipeline/narration.ts';

const [id, label] = process.argv.slice(2);
if (!id || !label) {
  console.error('Usage: npm run approve-take -- <videoId> <auditionLabel>');
  process.exit(2);
}
const draft = label === 'draft';
const narration = draft ? getVideo(id).narration : undefined;
if (draft && !narration) {
  console.error(`${id} has no narration`);
  process.exit(1);
}
const src = draft ? path.join(NARRATION_CACHE, narrationKey(narration!.lines)) : path.join(videoOut(id), 'voices', 'takes', label);
const audition = draft ? path.join(videoOut(id), 'voice', 'draft.m4a') : path.join(videoOut(id), 'voices', `${label}.m4a`);
if (!existsSync(path.join(src, 'take.json'))) {
  console.error(`No take at ${path.relative(ROOT, src)} — run: npm run ${draft ? 'voice' : 'voices'} -- ${id}`);
  process.exit(1);
}
const take = JSON.parse(readFileSync(path.join(src, 'take.json'), 'utf8')) as Take;

const base = path.join(ROOT, 'public', 'narration', id);
mkdirSync(base, { recursive: true });
// Leftovers of an interrupted run are never a take.
for (const d of readdirSync(base)) if (/^take-\d{2}\.part$/.test(d)) rmSync(path.join(base, d), { recursive: true, force: true });
const used = readdirSync(base).filter((d) => /^take-\d{2}$/.test(d)).map((d) => Number(d.slice(5)));
const name = `take-${String(Math.max(0, ...used) + 1).padStart(2, '0')}`;
const dest = path.join(base, name);
const part = `${dest}.part`;
mkdirSync(part);

const files = ['take.json', 'take.wav', ...take.lines.map((l) => l.file)];
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const hashes: Record<string, string> = {};
const put = (from: string, to: string) => {
  copyFileSync(from, path.join(part, to));
  hashes[to] = sha(path.join(part, to));
  if (hashes[to] !== sha(from)) throw new Error(`copy of ${to} does not match its source`);
};
for (const f of files) put(path.join(src, f), f);
if (existsSync(audition)) put(audition, 'approved-audition.m4a');
const approved = {
  video: id,
  take: name,
  approvedOn: new Date().toISOString().slice(0, 10),
  source: draft ? `draft ${path.basename(src)} (npm run voice)` : `audition ${label}`,
  rule: 'Immutable. Never overwrite or re-synthesise; improvements go to a new take directory.',
  voice: take.voice,
  speed: take.speed,
  seed: take.seed,
  engine: take.engine,
  files: hashes,
};
writeFileSync(path.join(part, 'approved.json'), JSON.stringify(approved, null, 2) + '\n');
renameSync(part, dest);
console.log(`✓ ${path.relative(ROOT, dest)} (${Object.keys(hashes).length} files). Set narration.take = '${name}' in the spec, then run npm run voice -- ${id}.`);
