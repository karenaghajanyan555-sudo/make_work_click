/**
 * Build a video's final audio mix (narration + score + effects), mastered.
 *
 *   npm run mix -- <videoId>
 *     → public/generated/<id>/mix.wav   (Studio preview + delivery mux; gitignored, rebuilt)
 *     → out/<id>/mix/{stems/*.wav, report.json, report.md}
 */
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getVideo } from '../content/index.ts';
import { MIX_INPUTS, recordStep, sha256, treeHash, upToDate } from '../src/pipeline/cache.ts';
import { narrationSource } from '../src/pipeline/narration.ts';
import { mixPath, ROOT, videoOut } from '../src/pipeline/paths.ts';
import { MIX, renderMix, writeStereo } from '../src/pipeline/sound/mix.ts';

const id = process.argv[2];
if (!id || id.startsWith('--')) {
  console.error('Usage: npm run mix -- <videoId>');
  process.exit(2);
}
const started = performance.now();
const spec = getVideo(id);
const voiceDir = spec.narration ? path.relative(ROOT, narrationSource(id, spec.narration).dir) : null;
const key = sha256(JSON.stringify({ spec, code: treeHash(MIX_INPUTS), voice: voiceDir ? treeHash([voiceDir]) : null }));
if (!process.argv.includes('--force') && upToDate(id, 'mix', key, mixPath(id))) {
  recordStep(id, 'mix', { key, seconds: 0, cached: true });
  console.log(`✓ ${path.relative(ROOT, mixPath(id))}  unchanged (cached)`);
  process.exit(0);
}
const outDir = path.join(videoOut(id), 'mix');
const work = path.join(outDir, 'work');
const { mix, stems, report } = await renderMix(spec, work);

const pub = path.join(ROOT, 'public', 'generated', id);
mkdirSync(pub, { recursive: true });
// Written beside, then renamed: an interrupted write never leaves a truncated mix.wav that a later run could take for current.
writeStereo(path.join(pub, 'mix.part.wav'), mix);
renameSync(path.join(pub, 'mix.part.wav'), path.join(pub, 'mix.wav'));
mkdirSync(path.join(outDir, 'stems'), { recursive: true });
for (const [name, s] of Object.entries(stems)) writeStereo(path.join(outDir, 'stems', `${name}.wav`), s);

const seconds = (performance.now() - started) / 1000;
recordStep(id, 'mix', { key, seconds, cached: false, detail: `${report.master.integratedLufs} LUFS, ${report.sfxEvents.length} effects, ${report.notes} notes` });
writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ ...report, seconds }, null, 2));
const f = (x: number) => x.toFixed(1);
writeFileSync(
  path.join(outDir, 'report.md'),
  [
    `# Mix — ${id}`,
    '',
    `Target ${MIX.targetLufs} LUFS integrated, sample-peak ceiling ${MIX.ceilingDb} dBFS (true peak after AAC: QA).`,
    '',
    '| Stem | Integrated | True peak | LRA |',
    '|---|---|---|---|',
    ...(['voice', 'music', 'sfx'] as const).map((k) => `| ${k} | ${f(report.stems[k].integratedLufs)} LUFS | ${f(report.stems[k].truePeakDbtp)} dBTP | ${f(report.stems[k].lra)} LU |`),
    `| **master** | **${f(report.master.integratedLufs)} LUFS** | **${f(report.master.truePeakDbtp)} dBTP** | ${f(report.master.lra)} LU |`,
    '',
    `${report.notes} notes, ${report.sfxEvents.length} effects: ${report.sfxEvents.map((e) => `${e.id}@${e.t.toFixed(2)}s`).join(', ')}.`,
    `Built in ${seconds.toFixed(1)} s.`,
    '',
  ].join('\n'),
);
console.log(`✓ ${path.relative(ROOT, path.join(pub, 'mix.wav'))}  master ${f(report.master.integratedLufs)} LUFS, TP ${f(report.master.truePeakDbtp)} dBTP  (${seconds.toFixed(1)} s)`);
