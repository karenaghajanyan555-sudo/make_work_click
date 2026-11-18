/**
 * QA gate for one video. Builds it (render → mix → deliver; unless --no-render), runs
 * technical, audio and visual checks on the upload file, a determinism check, and writes
 * review sheets + a report.
 *
 *   npm run qa -- <videoId> [--no-render]
 *
 * Output: out/<id>/qa/{report.md, report.json, sheet.png, sheet-cues.png, sheet-safezone.png}
 * Exit code 1 if any check fails. Creative review (docs/QA.md) is done from the sheets.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { getVideo } from '../content/index.ts';
import { FORMATS } from '../src/brand/format.ts';
import { validateSpec } from '../src/video/spec.ts';
import { computeTimeline } from '../src/video/timeline.ts';
import { deliveryPath, mixPath, ROOT, videoOut } from '../src/pipeline/paths.ts';
import { narrationSource } from '../src/pipeline/narration.ts';
import { captionWindows } from '../src/video/narration.ts';
import { openSession, renderStills } from '../src/pipeline/remotion.ts';
import { measureLoudness, readWav } from '../src/pipeline/audio.ts';
import { ff } from '../src/pipeline/ffmpeg.ts';
import { assetChecks, audioLagMs, captionChecks, decodeCheck, emptySceneCheck, motionProfile, QA_AUDIO, sha256, staticThreshold, technicalChecks, visualChecks, type Check } from '../src/pipeline/qa.ts';
import { frameLabel, sheetFromImages, sheetFromVideo } from '../src/pipeline/sheet.ts';

const id = process.argv[2];
if (!id || id.startsWith('--')) {
  console.error('Usage: npm run qa -- <videoId> [--no-render]');
  process.exit(2);
}
const noRender = process.argv.includes('--no-render');
const spec = getVideo(id);
const format = FORMATS[spec.format];
const timeline = computeTimeline(spec, format.fps);
const dir = videoOut(id);
const qaDir = path.join(dir, 'qa');
const video = deliveryPath(id);
const expectAudio = Boolean(spec.narration || spec.score || spec.audio?.compose);
mkdirSync(qaDir, { recursive: true });

const checks: Check[] = [];
const specErrors = validateSpec(spec);
checks.push({ id: 'spec.valid', status: specErrors.length ? 'fail' : 'pass', detail: specErrors.join('; ') || 'content spec valid' });

const metrics: Record<string, number | string> = {};
if (!noRender || !existsSync(video)) {
  const t0 = performance.now();
  const r = spawnSync(process.execPath, ['scripts/make.ts', id, '--no-qa'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
  metrics.buildSeconds = Number(((performance.now() - t0) / 1000).toFixed(1));
}
const uploadSha = createHash('sha256').update(readFileSync(video)).digest('hex');
const total = timeline.totalFrames / format.fps;
// Captions on screen: timing and overlap (fail), reading time (warn).
checks.push(...(spec.narration && spec.captions?.enabled !== false ? captionChecks(captionWindows(spec.narration, total), total) : [{ id: 'captions.timing', status: 'skip' as const, detail: 'no captions' }]));
// Source files the build read are still present.
{
  const files: Array<{ file: string; role: string }> = [];
  if (spec.narration) {
    const src = narrationSource(id, spec.narration);
    files.push({ file: path.join(src.dir, 'take.wav'), role: 'narration' }, ...src.take.lines.map((l) => ({ file: path.join(src.dir, l.file), role: 'narration line' })));
  }
  if (expectAudio) files.push({ file: mixPath(id), role: 'mix' });
  for (const d of ['public/fonts', 'public/textures']) {
    const abs = path.join(ROOT, d);
    const list = existsSync(abs) ? readdirSync(abs).filter((f) => statSync(path.join(abs, f)).isFile()) : [];
    files.push(...(list.length ? list.map((f) => ({ file: path.join(abs, f), role: d.split('/')[1]! })) : [{ file: abs, role: `${d} (empty)` }]));
  }
  checks.push(assetChecks(files, existsSync));
}
const session = await openSession(false);
try {
  checks.push(await decodeCheck(video, ff));

  checks.push(
    ...(await technicalChecks(video, {
      width: format.width,
      height: format.height,
      fps: format.fps,
      durationInFrames: timeline.totalFrames,
      expectAudio,
    })),
  );
  if (expectAudio) {
    const loud = await measureLoudness(video);
    const okI = Math.abs(loud.integratedLufs - QA_AUDIO.targetLufs) <= QA_AUDIO.toleranceLu;
    checks.push({ id: 'audio.loudness', status: okI ? 'pass' : 'fail', detail: `${loud.integratedLufs} LUFS integrated (target ${QA_AUDIO.targetLufs} ± ${QA_AUDIO.toleranceLu}), LRA ${loud.lra} LU` });
    checks.push({ id: 'audio.truePeak', status: loud.truePeakDbtp <= QA_AUDIO.maxTruePeakDbtp ? 'pass' : 'fail', detail: `${loud.truePeakDbtp} dBTP (≤ ${QA_AUDIO.maxTruePeakDbtp})` });
    // Sync: decoded upload audio vs the mix, cross-correlated at the first click.
    const dec = path.join(qaDir, 'audio-decoded.wav');
    await ff('ffmpeg', ['-hide_banner', '-y', '-v', 'error', '-i', video, '-vn', '-c:a', 'pcm_s16le', dec]);
    const mono = (p: { samples: Float32Array; channels: number }) => p.samples.filter((_, i) => i % p.channels === 0);
    const ref = mono(readWav(mixPath(id)));
    const test = mono(readWav(dec));
    const clickFrame = Object.entries(timeline.cues).find(([k]) => k.endsWith('.click'))?.[1] ?? 0;
    const at = Math.max(0, Math.round((clickFrame / format.fps - 0.15) * 48000));
    const lag = audioLagMs(ref, test, at, Math.round(0.5 * 48000), 4800, 48000);
    checks.push({ id: 'audio.sync', status: Math.abs(lag) <= QA_AUDIO.maxLagMs ? 'pass' : 'fail', detail: `upload audio vs mix at the first click: ${lag.toFixed(2)} ms (≤ ${QA_AUDIO.maxLagMs} ms)` });
    rmSync(dec, { force: true });
    metrics.audioLufs = loud.integratedLufs;
  }
  const motion = await motionProfile(video);
  checks.push(...visualChecks(motion, format.fps));
  checks.push(emptySceneCheck(motion.stds, timeline.entries.map((e) => ({ id: e.scene.id, from: e.from, frames: e.durationInFrames }))));

  // Determinism: the same frame rendered twice must be byte-identical.
  const probeFrame = timeline.cues[Object.keys(timeline.cues).find((k) => k.endsWith('.click')) ?? ''] ?? Math.floor(timeline.totalFrames / 2);
  const detDir = path.join(qaDir, 'determinism');
  const [a] = await renderStills(session, id, [probeFrame], detDir, { videoId: id, debug: false }, 'a');
  const [b] = await renderStills(session, id, [probeFrame], detDir, { videoId: id, debug: false }, 'b');
  const same = sha256(a!) === sha256(b!);
  checks.push({ id: 'render.deterministic', status: same ? 'pass' : 'fail', detail: `frame ${probeFrame} rendered twice: ${same ? 'identical' : 'DIFFERENT'}` });
  rmSync(detDir, { recursive: true, force: true });

  // Review sheets: even sampling, every cue point, and safe-zone overlay at the cues.
  const every = Array.from({ length: Math.floor(timeline.totalFrames / (format.fps / 2)) }, (_, i) => i * (format.fps / 2));
  await sheetFromVideo(video, every, format.fps, path.join(qaDir, 'sheet.png'), 300, 7);
  const cueFrames = [...new Set(Object.values(timeline.cues).map((f) => Math.min(f, timeline.totalFrames - 1)))].sort((x, y) => x - y);
  await sheetFromVideo(video, cueFrames, format.fps, path.join(qaDir, 'sheet-cues.png'), 300, 7);
  const safeDir = path.join(qaDir, 'safezone');
  const safeFiles = await renderStills(session, id, cueFrames, safeDir, { videoId: id, debug: true });
  await sheetFromImages(safeFiles.map((file, i) => ({ file, label: frameLabel(cueFrames[i]!, format.fps) })), path.join(qaDir, 'sheet-safezone.png'), 300, 7);
  rmSync(safeDir, { recursive: true, force: true });
  metrics.motionNoiseFloor = Number(staticThreshold(motion).floor.toFixed(3));
} finally {
  await session.close();
}

const failed = checks.filter((c) => c.status === 'fail');
const icon = { pass: 'PASS', fail: 'FAIL', warn: 'WARN', skip: 'SKIP' } as const;
const md = [
  `# QA — ${spec.id} (${spec.status})`,
  '',
  `Result: **${failed.length ? 'FAIL' : 'PASS'}** · ${new Date().toISOString()}`,
  '',
  '| Check | Status | Detail |',
  '|---|---|---|',
  ...checks.map((c) => `| ${c.id} | ${icon[c.status]} | ${c.detail.replace(/\|/g, '/')} |`),
  '',
  `Metrics: ${Object.entries(metrics).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`,
  '',
  'Review sheets (creative QA, docs/QA.md): `sheet.png` (every 0.5s), `sheet-cues.png` (every cue), `sheet-safezone.png` (cues with safe-zone overlay).',
  '',
].join('\n');
writeFileSync(path.join(qaDir, 'report.md'), md);
writeFileSync(path.join(qaDir, 'report.json'), JSON.stringify({ id, upload: { file: path.relative(ROOT, video), sha256: uploadSha }, checks, metrics, cues: timeline.cues }, null, 2) + '\n');
console.log(md);
process.exit(failed.length ? 1 : 0);
