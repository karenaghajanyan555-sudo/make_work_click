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
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const used = readdirSync(base).filter((d) => /^take-\d{2}$/.test(d)).map((d) => Number(d.slice(5)));
const name = `take-${String(Math.max(0, ...used) + 1).padStart(2, '0')}`;
const dest = path.join(base, name);
mkdirSync(dest);

const files = ['take.json', 'take.wav', ...take.lines.map((l) => l.file)];
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const hashes: Record<string, string> = {};
for (const f of files) {
  copyFileSync(path.join(src, f), path.join(dest, f));
  hashes[f] = sha(path.join(dest, f));
}
if (existsSync(audition)) {
  copyFileSync(audition, path.join(dest, 'approved-audition.m4a'));
  hashes['approved-audition.m4a'] = sha(path.join(dest, 'approved-audition.m4a'));
}
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
writeFileSync(path.join(dest, 'approved.json'), JSON.stringify(approved, null, 2) + '\n');
console.log(`✓ ${path.relative(ROOT, dest)} (${Object.keys(hashes).length} files). Set narration.take = '${name}' in the spec, then run npm run voice -- ${id}.`);
