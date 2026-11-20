/**
 * Creative diversity check (D46, docs/QA.md § Gate 2c).
 *
 *   npm run diversity -- <videoId> [--stage storyboard|render]   one record vs the previous five
 *                                                                 → out/<id>/qa/diversity.md|json
 *   npm run diversity -- --all                                    every record, one line each
 *
 * Reads content/creative/<id>.ts and, when the video has a spec, the spec itself (scene sequence,
 * composition, pacing, motion, sound). Exit 1 on FAIL. Writes nothing else; renders nothing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { VIDEOS } from '../content/index.ts';
import { RECORDS } from '../content/creative/index.ts';
import { evaluate, report, type Stage } from '../src/creative/diversity.ts';
import type { VideoSpec } from '../src/video/spec.ts';
import { videoOut } from '../src/pipeline/paths.ts';

const args = process.argv.slice(2);
const specs = new Map<string, VideoSpec>(VIDEOS.map((v) => [v.id, v]));
const stageAt = args.indexOf('--stage');
const stageArg = stageAt === -1 ? undefined : args[stageAt + 1];
const stage: Stage = stageArg === 'render' ? 'render' : 'storyboard';

if (args.includes('--all')) {
  for (const r of [...RECORDS].sort((a, b) => a.seq - b.seq)) {
    const e = evaluate(r, RECORDS, { stage, specs });
    const max = e.comparisons.reduce((m, c) => Math.max(m, c.score ?? 0), 0);
    console.log(`${String(r.seq).padStart(3)} ${r.id.padEnd(34)} ${r.status.padEnd(8)} ${e.verdict.padEnd(5)} max similarity ${e.comparisons.length ? max.toFixed(2) : '—'}${e.comparisons[0] ? ` (previous ${e.comparisons[0].other}: ${e.comparisons[0].score?.toFixed(2) ?? '—'})` : ''}`);
  }
  process.exit(0);
}

const id = args.find((a, i) => !a.startsWith('--') && !(stageAt !== -1 && i === stageAt + 1));
if (!id) {
  console.error('Usage: npm run diversity -- <videoId> [--stage storyboard|render]  |  --all');
  process.exit(2);
}
const record = RECORDS.find((r) => r.id === id);
if (!record) {
  console.error(`No creative record for "${id}" (content/creative/${id}.ts). npm run new-video scaffolds one; docs/storyboards/_template.md explains it.`);
  process.exit(1);
}
const e = evaluate(record, RECORDS, { stage, specs });
const md = report(e, record);
const dir = path.join(videoOut(id), 'qa');
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, 'diversity.md'), md);
writeFileSync(path.join(dir, 'diversity.json'), JSON.stringify(e, null, 2) + '\n');
console.log(md);
console.log(`→ ${path.relative(process.cwd(), path.join(dir, 'diversity.md'))}`);
process.exit(e.verdict === 'FAIL' ? 1 : 0);
