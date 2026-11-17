/**
 * Node side of the narration engine (scripts/tts/narrate.py, Kokoro-82M, local).
 * Setup: `bash scripts/tts/setup.sh`. One request synthesises several takes with one model load.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { NARRATOR, type VoiceId, type VoiceSpec } from '../brand/voice.ts';
import type { NarrationSpec } from '../video/narration.ts';
import { scriptHash, type TimingLock } from '../video/timing.ts';
import { ROOT } from './paths.ts';

export const VENV_PYTHON = path.join(ROOT, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const ENGINE = path.join(ROOT, 'scripts/tts/narrate.py');

export type TakeWord = { text: string; start: number; end: number };
export type TakeLine = { id: string; text: string; file: string; duration: number; sourceStart: number; words: TakeWord[] };
export type Take = {
  sampleRate: number;
  voice: VoiceId;
  speed: number;
  seed: number;
  engine: { kokoro: string; misaki: string; torch: string; modelRevision: string };
  takeDuration: number;
  lines: TakeLine[];
  stats: {
    f0MedianHz: number | null;
    f0P10Hz: number | null;
    f0P90Hz: number | null;
    spectralCentroidHz: number;
    wordsPerSecondSpeaking: number | null;
    peak: number;
  };
  timing: { loadSeconds: number; synthSeconds: number };
};

export function narrationEngineReady(): boolean {
  return existsSync(VENV_PYTHON);
}

/** Synthesise `lines` once per voice. Takes land in `<outRoot>/<voice.label>/`. */
export async function synthesizeTakes(
  voices: readonly VoiceSpec[],
  lines: ReadonlyArray<{ id: string; text: string }>,
  outRoot: string,
): Promise<Map<string, Take & { dir: string }>> {
  if (!narrationEngineReady()) throw new Error('Narration engine not set up — run: bash scripts/tts/setup.sh');
  mkdirSync(outRoot, { recursive: true });
  const takes = voices.map((v) => ({ voice: v.voice, speed: v.speed, seed: v.seed, outDir: path.join(outRoot, v.label) }));
  const reqFile = path.join(outRoot, 'request.json');
  writeFileSync(reqFile, JSON.stringify({ lines, takes }, null, 2));
  await new Promise<void>((resolve, reject) => {
    const p = spawn(VENV_PYTHON, ['-I', ENGINE, '--request', reqFile], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.stdout.on('data', () => {});
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`narrate.py exited ${code}: ${err.slice(-800)}`))));
  });
  const out = new Map<string, Take & { dir: string }>();
  for (const v of voices) {
    const dir = path.join(outRoot, v.label);
    out.set(v.label, { ...(JSON.parse(readFileSync(path.join(dir, 'take.json'), 'utf8')) as Take), dir });
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// Narration sources: approved takes (immutable, committed) and the draft cache.
// ---------------------------------------------------------------------------------------

export const NARRATION_CACHE = path.join(ROOT, '.cache', 'narration');

/**
 * Cache key of a draft take: the script, the narrator recipe, the model revision and the
 * engine source. Same inputs → same key → the take is reused, never re-synthesised.
 */
export function narrationKey(lines: ReadonlyArray<{ id: string; text: string }>): string {
  if (!NARRATOR) throw new Error('No narrator chosen (src/brand/voice.ts)');
  const model = JSON.parse(readFileSync(path.join(ROOT, 'scripts/tts/model.json'), 'utf8')) as { revision: string };
  const engine = createHash('sha256').update(readFileSync(ENGINE)).digest('hex');
  const payload = JSON.stringify({ lines: lines.map((l) => [l.id, l.text]), voice: NARRATOR, model: model.revision, engine });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export type NarrationSource = { kind: 'approved' | 'draft'; dir: string; take: Take };

/** Where a video's narration audio lives (no synthesis). Throws if a draft is not cached yet. */
export function narrationSource(videoId: string, n: NarrationSpec): NarrationSource {
  if (n.take) {
    const [owner, take] = n.take.includes('/') ? (n.take.split('/') as [string, string]) : [videoId, n.take];
    const dir = path.join(ROOT, 'public', 'narration', owner, take);
    if (!existsSync(path.join(dir, 'take.json'))) throw new Error(`${videoId}: approved take ${n.take} not found at ${path.relative(ROOT, dir)}`);
    return { kind: 'approved', dir, take: JSON.parse(readFileSync(path.join(dir, 'take.json'), 'utf8')) as Take };
  }
  const dir = path.join(NARRATION_CACHE, narrationKey(n.lines));
  if (!existsSync(path.join(dir, 'take.json'))) throw new Error(`${videoId}: draft narration not synthesised yet — run npm run voice -- ${videoId}`);
  return { kind: 'draft', dir, take: JSON.parse(readFileSync(path.join(dir, 'take.json'), 'utf8')) as Take };
}

/** The draft take for a script: from the cache, or synthesised once with NARRATOR. */
export async function ensureDraft(n: NarrationSpec): Promise<{ source: NarrationSource; cached: boolean; seconds: number }> {
  const t0 = performance.now();
  const lines = n.lines.map(({ id, text }) => ({ id, text }));
  const dir = path.join(NARRATION_CACHE, narrationKey(lines));
  if (existsSync(path.join(dir, 'take.json'))) {
    return { source: { kind: 'draft', dir, take: JSON.parse(readFileSync(path.join(dir, 'take.json'), 'utf8')) as Take }, cached: true, seconds: 0 };
  }
  const tmp = `${dir}.tmp`;
  rmSync(tmp, { recursive: true, force: true });
  const takes = await synthesizeTakes([NARRATOR!], lines, tmp);
  const take = takes.get(NARRATOR!.label)!;
  // Keep only the take (not the request file), then publish atomically.
  renameSync(take.dir, dir);
  rmSync(tmp, { recursive: true, force: true });
  return { source: { kind: 'draft', dir, take: JSON.parse(readFileSync(path.join(dir, 'take.json'), 'utf8')) as Take }, cached: false, seconds: (performance.now() - t0) / 1000 };
}

/** Timing lock (content/timing/<id>.ts) from a take. */
export function timingLock(videoId: string, n: NarrationSpec, src: NarrationSource): TimingLock {
  const script = n.lines.map(({ id, text }) => ({ id, text }));
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  return {
    video: videoId,
    source: { kind: src.kind, path: path.relative(ROOT, src.dir) },
    voice: NARRATOR?.label ?? 'unknown',
    scriptHash: scriptHash(script),
    lines: src.take.lines.map((l) => ({
      id: l.id,
      text: l.text,
      duration: r3(l.duration),
      sourceStart: r3(l.sourceStart),
      words: l.words.map((w) => [w.text, r3(w.start), r3(w.end)] as [string, number, number]),
    })),
  };
}

export function writeTimingLock(lock: TimingLock): string {
  const file = path.join(ROOT, 'content', 'timing', `${lock.video}.ts`);
  mkdirSync(path.dirname(file), { recursive: true });
  const body = [
    `// GENERATED by \`npm run voice -- ${lock.video}\` from ${lock.source.path}. Do not edit:`,
    '// change the script in the content file and run the command again.',
    "import type { TimingLock } from '../../src/video/timing.ts';",
    '',
    `export const timing: TimingLock = ${JSON.stringify(lock, null, 2)};`,
    '',
  ].join('\n');
  const old = existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (old !== body) writeFileSync(file, body);
  return file;
}
