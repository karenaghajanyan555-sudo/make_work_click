/**
 * Environment check. Run on any new machine (and at the start of a session):
 *
 *   npm run doctor             fast checks
 *   npm run doctor -- --render also renders one smoke frame (proves Chrome works)
 *
 * Exit code 1 if anything required is missing. Never installs anything itself —
 * `npm run setup` does that.
 */
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VIDEOS } from '../content/index.ts';
import { validateSpec } from '../src/video/spec.ts';
import { ROOT } from '../src/pipeline/paths.ts';

type Row = { item: string; ok: boolean | 'warn'; detail: string };
const rows: Row[] = [];
const add = (item: string, ok: boolean | 'warn', detail: string) => rows.push({ item, ok, detail });

// Node: native TypeScript type-stripping needs >= 22.18 (scripts run .ts directly).
const [maj = 0, min = 0] = process.versions.node.split('.').map(Number);
add('node', maj > 22 || (maj === 22 && min >= 18), `v${process.versions.node} (need >= 22.18)`);

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
const remotionPkg = path.join(ROOT, 'node_modules/remotion/package.json');
if (!existsSync(remotionPkg)) {
  add('dependencies', false, 'node_modules missing — run: npm run setup');
} else {
  const installed = (JSON.parse(readFileSync(remotionPkg, 'utf8')) as { version: string }).version;
  add('dependencies', installed === pkg.dependencies.remotion, `remotion ${installed} (pinned ${pkg.dependencies.remotion})`);
}

const chromeDir = path.join(ROOT, 'node_modules/.remotion/chrome-headless-shell');
add('chrome-headless-shell', existsSync(chromeDir) && readdirSync(chromeDir).length > 0, existsSync(chromeDir) ? 'present' : 'missing — run: npm run setup');

try {
  const { ff } = await import('../src/pipeline/ffmpeg.ts');
  const v = await ff('ffmpeg', ['-version']);
  const p = await ff('ffprobe', ['-version']);
  add('ffmpeg (bundled)', v.code === 0 && p.code === 0, v.stdout.toString().split('\n')[0] ?? '');
} catch (e) {
  add('ffmpeg (bundled)', false, `unavailable: ${(e as Error).message}`);
}

const fonts = ['Geist-Variable.ttf', 'GeistMono-Variable.ttf', 'InstrumentSerif-Regular.ttf', 'InstrumentSerif-Italic.ttf'];
const missingFonts = fonts.filter((f) => !existsSync(path.join(ROOT, 'public/fonts', f)));
add('brand fonts', missingFonts.length === 0, missingFonts.length ? `missing: ${missingFonts.join(', ')}` : `${fonts.length} faces + OFL licences`);

const specErrors = VIDEOS.flatMap((v) => validateSpec(v).map((e) => `${v.id}: ${e}`));
add('content specs', specErrors.length === 0, specErrors.length ? specErrors.join('; ') : `${VIDEOS.length} valid (${VIDEOS.map((v) => v.id).join(', ')})`);

const freeGb = os.freemem() / 1024 ** 3;
const totalGb = os.totalmem() / 1024 ** 3;
add('memory', freeGb >= 2 ? true : 'warn', `${freeGb.toFixed(1)} GB free of ${totalGb.toFixed(1)} GB — renders need ~1.5–2 GB at concurrency 2`);
add('cpu', true, `${os.cpus().length} cores`);
add('profiler', process.platform === 'linux' ? true : 'warn', process.platform === 'linux' ? 'scripts/profile-render.ts available' : 'profile-render reads /proc (Linux only)');

// Narration engine (Kokoro). Optional: rendering uses committed narration takes; only
// synthesising new narration needs it. Setup: npm run setup:voice.
const venvPython = path.join(ROOT, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
{
  const model = JSON.parse(readFileSync(path.join(ROOT, 'scripts/tts/model.json'), 'utf8')) as { revision: string; files: Array<{ path: string }> };
  const dir = path.join(ROOT, '.cache', 'kokoro', model.revision);
  const missing = model.files.filter((f) => !existsSync(path.join(dir, f.path))).map((f) => f.path);
  const ok = existsSync(venvPython) && missing.length === 0;
  add('narration engine (Kokoro, optional)', ok ? true : 'warn',
    ok ? `.venv + model ${model.revision.slice(0, 7)}` : `not ready (${existsSync(venvPython) ? `missing ${missing.length} model files` : 'no .venv'}) — npm run setup:voice`);
}

if (process.argv.includes('--render')) {
  try {
    const { openSession, renderStills } = await import('../src/pipeline/remotion.ts');
    const s = await openSession(false);
    const dir = path.join(ROOT, 'out', '.doctor');
    try {
      const [file] = await renderStills(s, 'smoke', [30], dir);
      add('render (smoke still)', !!file && existsSync(file), file ? 'rendered via headless Chrome' : 'no output');
    } finally {
      await s.close();
      rmSync(dir, { recursive: true, force: true });
    }
  } catch (e) {
    add('render (smoke still)', false, (e as Error).message.split('\n')[0] ?? 'failed');
  }
}

const mark = (ok: Row['ok']) => (ok === true ? 'ok  ' : ok === 'warn' ? 'warn' : 'FAIL');
for (const r of rows) console.log(`${mark(r.ok)}  ${r.item.padEnd(26)} ${r.detail}`);
const failed = rows.filter((r) => r.ok === false);
console.log(failed.length ? `\n${failed.length} required item(s) missing.` : '\nEnvironment ready.');
process.exit(failed.length ? 1 : 0);
