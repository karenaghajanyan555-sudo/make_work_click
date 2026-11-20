/**
 * The production pipeline for one video, end to end, redoing only what changed.
 *
 *   npm run make -- <videoId> [--force] [--no-qa]
 *   npm run build -- <videoId>          (= make --no-qa)
 *   npm run make -- <videoId> --creative-override "<reason>"   exceptional: passed to render's
 *                                       creative gate (D46, docs/QA.md § Gate 2c)
 *
 *   1. voice    take (approved, or cached draft) → timing lock   scripts/voice.ts
 *   2. render   per-scene segments (cached) → picture master      scripts/render.ts
 *   3. mix      voice + score + effects → mastered mix (cached)   scripts/mix.ts
 *   4. deliver  master + mix → upload file (cached)               scripts/deliver.ts
 *   5. qa       technical, audio, visual checks + sheets          scripts/qa.ts --no-render
 *
 * Steps run one after another (never in parallel: RAM), each in a fresh process so a
 * regenerated timing lock is picked up. --force rebuilds every step and segment.
 * Timings and cache hits: out/<id>/build.json.
 */
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { getVideo } from '../content/index.ts';
import { readManifest } from '../src/pipeline/cache.ts';
import { videoOut } from '../src/pipeline/paths.ts';

const overrideAt = process.argv.indexOf('--creative-override');
const override = overrideAt !== -1 ? ['--creative-override', process.argv[overrideAt + 1] ?? ''] : [];
const id = process.argv.slice(2).find((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--creative-override');
if (!id) {
  console.error('Usage: npm run make -- <videoId> [--force] [--no-qa]');
  process.exit(2);
}
const force = process.argv.includes('--force');
const spec = getVideo(id);
const hasAudio = Boolean(spec.narration || spec.score || spec.audio?.compose);
if (force) rmSync(path.join(videoOut(id), 'segments'), { recursive: true, force: true });

const steps: Array<[string, string[]]> = [
  ...(spec.narration ? ([['voice', ['scripts/voice.ts', id]]] as Array<[string, string[]]>) : []),
  ['render', ['scripts/render.ts', id, ...override]],
  ...(hasAudio ? ([['mix', ['scripts/mix.ts', id, ...(force ? ['--force'] : [])]]] as Array<[string, string[]]>) : []),
  ['deliver', ['scripts/deliver.ts', id, ...(force ? ['--force'] : [])]],
  ...(process.argv.includes('--no-qa') ? [] : ([['qa', ['scripts/qa.ts', id, '--no-render']]] as Array<[string, string[]]>)),
];

const t0 = performance.now();
for (const [name, args] of steps) {
  console.log(`\n▸ ${name}`);
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`✗ ${name} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}
const total = (performance.now() - t0) / 1000;
const m = readManifest(id);
console.log(`\n✓ ${id} made in ${total.toFixed(1)} s`);
for (const [name, rec] of Object.entries(m.steps)) console.log(`  ${name.padEnd(8)} ${rec.cached ? 'cached ' : `${rec.seconds.toFixed(1).padStart(6)} s`}  ${rec.detail ?? ''}`);
