/**
 * LAB ONLY (Phase 3 visual quality): renders the experiment compositions through their own entry
 * (lab/visual-quality/index.ts) into out/lab/visual-quality/. Touches no production composition,
 * cache key (src/pipeline/cache.ts RENDER_INPUTS), segment or mix.
 *
 *   node lab/visual-quality/render.ts [--only=E2|<id>[,<id>]] [--stills-only] [--concurrency=1]
 *   node lab/visual-quality/render.ts --mem [--only=…]   per-experiment peak memory only
 *   Peak memory of a whole run: npm run profile -- lab-vq-E2 -- node lab/visual-quality/render.ts --only=E2
 *
 * Per composition: stills (timed), the determinism check (detFrame rendered twice in two
 * fresh tabs, sha256 compared), then the clip (timed, ms/frame). Results merge into
 * out/lab/visual-quality/results.json. Every composition also records the peak PSS of this
 * process tree (Node + Chrome) while it renders, sampled every 250 ms (same method as
 * scripts/profile-render.ts). `--mem` renders only a ≤ 30-frame slice around detFrame per
 * composition (no stills/det/clip) and stores `mem` without touching the other fields.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderFrames, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { RENDER } from '../../src/pipeline/settings.ts';
import { ROOT } from '../../src/pipeline/paths.ts';
import { EXPERIMENTS } from './manifest.ts';

const OUT = path.join(ROOT, 'out/lab/visual-quality');
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const only = arg('only')?.split(',');
const stillsOnly = process.argv.includes('--stills-only');
const memOnly = process.argv.includes('--mem');
const concurrency = Number(arg('concurrency') ?? 1);
const chosen = EXPERIMENTS.filter((e) => !only || only.includes(e.group) || only.includes(e.id));
if (chosen.length === 0) throw new Error(`Nothing matches --only=${only?.join(',')}`);

mkdirSync(path.join(OUT, 'stills'), { recursive: true });
mkdirSync(path.join(OUT, 'clips'), { recursive: true });
mkdirSync(path.join(OUT, 'det'), { recursive: true });
const resultsFile = path.join(OUT, 'results.json');
type Result = {
  id: string;
  at: string;
  concurrency: number;
  stills: Array<{ frame: number; ms: number; file: string }>;
  deterministic: boolean | null;
  detSha: string[];
  clip?: { file: string; frames: number; seconds: number; msPerFrame: number; bytes: number };
  /** Peak process-tree PSS while this composition rendered (MB), and the tree before it started. */
  peakPssMb?: number;
  mem?: { frames: string; peakPssMb: number; baselinePssMb: number; msPerFrame: number; at: string };
  error?: string;
};
const results: Record<string, Result> = existsSync(resultsFile) ? JSON.parse(readFileSync(resultsFile, 'utf8')) : {};
const save = () => writeFileSync(resultsFile, JSON.stringify(results, null, 2));

const LAB = path.join(ROOT, 'lab/visual-quality');
// Lab public dir: symlinks to the production asset folders (read-only use) + the lab plates.
// Nothing is written into ROOT/public (public/textures and public/fonts are render cache inputs).
const PLATES = path.join(OUT, 'plates');
const PUBLIC = path.join(OUT, 'public');
mkdirSync(PLATES, { recursive: true });
mkdirSync(PUBLIC, { recursive: true });
for (const [name, target] of [['fonts', path.join(ROOT, 'public/fonts')], ['textures', path.join(ROOT, 'public/textures')], ['narration', path.join(ROOT, 'public/narration')], ['plates', PLATES]] as const) {
  if (!existsSync(path.join(PUBLIC, name))) symlinkSync(target, path.join(PUBLIC, name));
}
const t0 = performance.now();
const serveUrl = await bundle({
  entryPoint: path.join(LAB, 'index.ts'),
  rootDir: ROOT,
  publicDir: PUBLIC,
  enableCaching: true,
  // The lab packages (lab/visual-quality/node_modules) carry their own copy of `remotion`
  // (a regular dependency of @remotion/*). Two copies break Remotion's contexts, so every
  // import of remotion / react / react-dom resolves to the root copies.
  webpackOverride: (c) => ({
    ...c,
    resolve: {
      ...c.resolve,
      alias: {
        ...(c.resolve?.alias as Record<string, string> | undefined),
        remotion: path.join(ROOT, 'node_modules/remotion'),
        react: path.join(ROOT, 'node_modules/react'),
        'react-dom': path.join(ROOT, 'node_modules/react-dom'),
      },
    },
  }),
});
const chromiumOptions = { gl: RENDER.gl } as const;
const browser = await openBrowser('chrome', { chromiumOptions });
console.log(`bundled in ${((performance.now() - t0) / 1000).toFixed(1)} s · gl=${RENDER.gl} · concurrency ${concurrency}`);

const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');

// Process-tree PSS (this Node process + Chrome and its helpers), as scripts/profile-render.ts.
function treePssKb(root: number): number {
  const kids = new Map<number, number[]>();
  for (const entry of readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const stat = readFileSync(`/proc/${entry}/stat`, 'utf8');
      const ppid = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1]);
      kids.set(ppid, [...(kids.get(ppid) ?? []), Number(entry)]);
    } catch {
      // exited
    }
  }
  let kb = 0;
  const stack = [root];
  while (stack.length) {
    const pid = stack.pop()!;
    try {
      kb += Number(/^Pss:\s+(\d+)/m.exec(readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8'))?.[1] ?? 0);
    } catch {
      // exited
    }
    stack.push(...(kids.get(pid) ?? []));
  }
  return kb;
}
function memSampler() {
  const baseline = treePssKb(process.pid);
  let peak = baseline;
  const timer = setInterval(() => (peak = Math.max(peak, treePssKb(process.pid))), 250);
  return { baselineMb: Math.round(baseline / 1024), stop: () => (clearInterval(timer), Math.round(Math.max(peak, treePssKb(process.pid)) / 1024)) };
}

try {
  for (const e of chosen) {
    if (memOnly) {
      if (e.plate) continue; // plates are one-off pre-renders; their cost is in `clip`
      const prev = results[e.id] ?? { id: e.id, at: new Date().toISOString(), concurrency, stills: [], deterministic: null, detSha: [] };
      try {
        const composition = await selectComposition({ serveUrl, id: e.id, puppeteerInstance: browser, chromiumOptions });
        const a = Math.max(0, Math.min(e.frames - 30, e.detFrame - 15));
        const b = Math.min(e.frames - 1, a + 29);
        const m = memSampler();
        const s = performance.now();
        await renderFrames({ serveUrl, composition, inputProps: {}, outputDir: path.join(tmpdir(), `lab-vq-mem-${e.id}`), imageFormat: 'jpeg', jpegQuality: RENDER.jpegQuality, frameRange: [a, b], concurrency, puppeteerInstance: browser, chromiumOptions, onStart: () => undefined, onFrameUpdate: () => undefined });
        const ms = performance.now() - s;
        rmSync(path.join(tmpdir(), `lab-vq-mem-${e.id}`), { recursive: true, force: true });
        prev.mem = { frames: `${a}–${b}`, peakPssMb: m.stop(), baselinePssMb: m.baselineMb, msPerFrame: Math.round(ms / (b - a + 1)), at: new Date().toISOString() };
        console.log(`  ${e.id} mem: peak ${prev.mem.peakPssMb} MB (tree before ${prev.mem.baselinePssMb} MB), ${prev.mem.msPerFrame} ms/frame over ${prev.mem.frames}`);
      } catch (err) {
        console.log(`  ${e.id} mem ERROR ${String(err instanceof Error ? err.message : err).slice(0, 300)}`);
      }
      results[e.id] = prev;
      save();
      continue;
    }
    const r: Result = { id: e.id, at: new Date().toISOString(), concurrency, stills: [], deterministic: null, detSha: [], ...(results[e.id]?.mem ? { mem: results[e.id]!.mem } : {}) };
    results[e.id] = r;
    const mem = memSampler();
    try {
      const composition = await selectComposition({ serveUrl, id: e.id, puppeteerInstance: browser, chromiumOptions });
      if (e.plate) {
        // Pre-render: transparent PNG(s) into plates/, timed (the one-off cost), then the det check.
        const s = performance.now();
        if (e.plate === 'still') {
          await renderStill({ serveUrl, composition, frame: 0, output: path.join(PLATES, `${e.id}.png`), imageFormat: 'png', puppeteerInstance: browser, chromiumOptions, overwrite: true });
        } else {
          const dir = path.join(PLATES, e.id);
          rmSync(dir, { recursive: true, force: true });
          mkdirSync(dir, { recursive: true });
          await renderFrames({ serveUrl, composition, inputProps: {}, outputDir: dir, imageFormat: 'png', concurrency, puppeteerInstance: browser, chromiumOptions, onStart: () => undefined, onFrameUpdate: () => undefined });
          // element-NN.png → f-NNN.png (frame number, 3 digits)
          for (const file of readdirSync(dir)) {
            const m = /^element-(\d+)\.png$/.exec(file);
            if (m) renameSync(path.join(dir, file), path.join(dir, `f-${m[1]!.padStart(3, '0')}.png`));
          }
        }
        const seconds = (performance.now() - s) / 1000;
        r.clip = { file: path.relative(ROOT, e.plate === 'still' ? path.join(PLATES, `${e.id}.png`) : path.join(PLATES, e.id)), frames: e.frames, seconds: Number(seconds.toFixed(1)), msPerFrame: Math.round((seconds * 1000) / e.frames), bytes: 0 };
        console.log(`  ${e.id} plate: ${e.frames} frame(s) in ${seconds.toFixed(1)} s (${r.clip.msPerFrame} ms/frame)`);
      }
      for (const frame of e.stills) {
        const file = path.join(OUT, 'stills', `${e.id}-f${String(frame).padStart(3, '0')}.png`);
        const s = performance.now();
        await renderStill({ serveUrl, composition, frame, output: file, imageFormat: 'png', puppeteerInstance: browser, chromiumOptions, overwrite: true });
        const ms = Math.round(performance.now() - s);
        r.stills.push({ frame, ms, file: path.relative(ROOT, file) });
        console.log(`  ${e.id} still f${frame}: ${ms} ms`);
      }
      // Determinism: the same frame twice, each in a fresh tab, compared byte for byte.
      for (const k of [1, 2]) {
        const file = path.join(OUT, 'det', `${e.id}-f${e.detFrame}-${k}.png`);
        await renderStill({ serveUrl, composition, frame: e.detFrame, output: file, imageFormat: 'png', puppeteerInstance: browser, chromiumOptions, overwrite: true });
        r.detSha.push(sha(file));
      }
      r.deterministic = r.detSha[0] === r.detSha[1];
      console.log(`  ${e.id} determinism f${e.detFrame}: ${r.deterministic ? 'identical' : 'DIFFERENT'}`);
      if (!stillsOnly && e.frames > 1 && !e.plate) {
        const file = path.join(OUT, 'clips', `${e.id}.mp4`);
        const s = performance.now();
        await renderMedia({
          serveUrl,
          composition,
          codec: 'h264',
          crf: 18,
          pixelFormat: 'yuv420p',
          colorSpace: RENDER.colorSpace,
          imageFormat: 'jpeg',
          jpegQuality: RENDER.jpegQuality,
          concurrency,
          puppeteerInstance: browser,
          chromiumOptions,
          outputLocation: file,
          overwrite: true,
          muted: !e.audio,
        });
        const seconds = (performance.now() - s) / 1000;
        r.clip = { file: path.relative(ROOT, file), frames: e.frames, seconds: Number(seconds.toFixed(1)), msPerFrame: Math.round((seconds * 1000) / e.frames), bytes: readFileSync(file).length };
        console.log(`  ${e.id} clip: ${e.frames} frames in ${seconds.toFixed(1)} s (${r.clip.msPerFrame} ms/frame)`);
      }
    } catch (err) {
      r.error = String(err instanceof Error ? err.message : err).slice(0, 600);
      console.log(`  ${e.id} ERROR ${r.error}`);
    }
    r.peakPssMb = mem.stop();
    save();
  }
} finally {
  await browser.close({ silent: true });
}
console.log(`done in ${((performance.now() - t0) / 1000).toFixed(1)} s → ${path.relative(ROOT, resultsFile)}`);
