/**
 * LAB ONLY — E4 lip-sync data. Reads ONE approved line read-only (v008 take-01 hook.wav + its
 * word timings in take.json; gold: never written, hash checked before and after) and writes
 * exp/E4-data.ts (generated, pure data) + out/lab/visual-quality/e4-sync.json (metrics).
 *
 * Three mouth tracks, all zero-dependency (no recogniser, no binary):
 *   env     A · loudness: jaw opening from the waveform (RMS, 40 ms window, fast attack / slow
 *           release). One shape family (a jaw flap); no lip closures, no rounding.
 *   g2v     B · word timing: each word's letters → Rhubarb-style visemes, spread over the take's
 *           word start/end (vowels weighted longer than consonants), parameters smoothed frame to
 *           frame (coarticulation), bilabial closures (M B P) forced shut.
 *   hybrid  C · (lab addition) B's shapes, A's amplitude: word ends trimmed to the voiced span,
 *           opening scaled by loudness, silence → rest. Closures still from the text.
 * Viseme letters follow Rhubarb's set: A closed (M B P) · B teeth (K S T …) · C open (EH AE) ·
 * D wide (AA) · E round (AO ER) · F pucker (UW OW W) · G F/V · H L · X rest.
 * The Rhubarb binary is NOT run here (owner: not yet); `--rhubarb=<json>` only reads its output.
 *
 *   node lab/visual-quality/e4-prep.ts [--rhubarb=<rhubarb.json>]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../src/pipeline/paths.ts';

const FPS = 30;
const TAKE = 'narration/v008-bookings-run-themselves/take-01';
const WAV = path.join(ROOT, 'public', TAKE, 'hook.wav');
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const before = sha(WAV);
const t0 = performance.now();

// --- waveform ---------------------------------------------------------------------------------
const buf = readFileSync(WAV);
if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.readUInt16LE(22) !== 1 || buf.readUInt16LE(34) !== 16) throw new Error('expected 16-bit mono PCM');
const rate = buf.readUInt32LE(24);
let off = 12;
let dataStart = 0;
let dataLen = 0;
while (off < buf.length) {
  const id = buf.toString('ascii', off, off + 4);
  const len = buf.readUInt32LE(off + 4);
  if (id === 'data') {
    dataStart = off + 8;
    dataLen = len;
    break;
  }
  off += 8 + len;
}
const n = dataLen / 2;
const sample = (i: number) => (i < 0 || i >= n ? 0 : buf.readInt16LE(dataStart + i * 2) / 32768);
const frames = Math.ceil((n / rate) * FPS);
const win = Math.round(0.04 * rate);
const rms: number[] = [];
for (let f = 0; f < frames; f++) {
  const c = Math.round(((f + 0.5) / FPS) * rate);
  let s = 0;
  for (let i = c - win / 2; i < c + win / 2; i++) s += sample(i) ** 2;
  rms.push(Math.sqrt(s / win));
}
const sorted = [...rms].sort((a, b) => a - b);
const ref = sorted[Math.floor(sorted.length * 0.95)]!;
const rel = rms.map((r) => r / ref); // 1 ≈ the loud vowels
const SILENT = 0.06; // rel below this = no voice (≈ −24 dB under the loud vowels)
const env: number[] = [];
let level = 0;
for (const r of rel) {
  const target = Math.min(1, Math.max(0, (r - 0.08) / 0.92));
  level = target > level ? level + (target - level) * 0.75 : level + (target - level) * 0.35;
  env.push(level);
}

// --- letters → visemes ----------------------------------------------------------------------
type Word = { text: string; start: number; end: number };
const take = JSON.parse(readFileSync(path.join(ROOT, 'public', TAKE, 'take.json'), 'utf8')) as { lines: Array<{ id: string; text: string; words: Word[] }> };
const line = take.lines.find((l) => l.id === 'hook')!;
const DIGRAPHS: Record<string, string> = { th: 'B', sh: 'B', ch: 'B', ng: 'B', oo: 'F', ee: 'B', ea: 'C', ou: 'F', ow: 'F', ai: 'C', ay: 'C', ie: 'C', ge: 'B' };
const LETTER: Record<string, string> = { a: 'D', e: 'C', i: 'C', o: 'E', u: 'F', y: 'C', m: 'A', b: 'A', p: 'A', f: 'G', v: 'G', l: 'H', w: 'F', q: 'F', r: 'E' };
/** Relative duration of a unit: vowels carry the syllable, stops are short. */
const WEIGHT: Record<string, number> = { A: 1, B: 0.8, G: 0.9, H: 0.9, C: 1.8, D: 1.8, E: 1.8, F: 1.6, X: 1 };
function units(word: string): string[] {
  const w = word.toLowerCase().replace(/[^a-z]/g, '').replace(/e$/, (m, i: number) => (i > 1 ? '' : m));
  const out: string[] = [];
  for (let i = 0; i < w.length; ) {
    const d = DIGRAPHS[w.slice(i, i + 2)];
    if (d) {
      if (out[out.length - 1] !== d) out.push(d);
      i += 2;
      continue;
    }
    const v = LETTER[w[i]!] ?? 'B';
    if (out[out.length - 1] !== v) out.push(v); // doubled letters are one sound
    i++;
  }
  return out.length ? out : ['B'];
}
/** Spread a word's units over [a, b) seconds by weight → per-frame letters. */
function spread(track: string[], u: string[], a: number, b: number): void {
  const total = u.reduce((s, x) => s + WEIGHT[x]!, 0);
  for (let f = Math.max(0, Math.floor(a * FPS)); f < Math.ceil(b * FPS) && f < frames; f++) {
    const k = (((f + 0.5) / FPS - a) / (b - a)) * total;
    let acc = 0;
    let pick = u[u.length - 1]!;
    for (const x of u) {
      acc += WEIGHT[x]!;
      if (k < acc) {
        pick = x;
        break;
      }
    }
    track[f] = pick;
  }
}
const g2vLetters: string[] = Array.from({ length: frames }, () => 'X');
for (const w of line.words) spread(g2vLetters, units(w.text), w.start, w.end);
// Hybrid: the same units, each word trimmed to its voiced span (the take's last word end is padded).
const hybLetters: string[] = Array.from({ length: frames }, () => 'X');
for (const w of line.words) {
  let last = Math.floor(w.start * FPS);
  for (let f = Math.floor(w.start * FPS); f < Math.ceil(w.end * FPS) && f < frames; f++) if (rel[f]! >= SILENT) last = f;
  spread(hybLetters, units(w.text), w.start, Math.max(w.start + 2 / FPS, (last + 1) / FPS));
}

// --- mouth parameters -----------------------------------------------------------------------
/** o open · w width · r round · t upper teeth · g tongue · p lips pressed (all 0..1). */
type P = { o: number; w: number; r: number; t: number; g: number; p: number };
const VIS: Record<string, P> = {
  X: { o: 0.0, w: 0.5, r: 0.0, t: 0, g: 0, p: 0 },
  A: { o: 0.0, w: 0.44, r: 0.1, t: 0, g: 0, p: 1 },
  B: { o: 0.2, w: 0.66, r: 0.0, t: 1, g: 0, p: 0 },
  C: { o: 0.46, w: 0.62, r: 0.1, t: 0.6, g: 0, p: 0 },
  D: { o: 0.86, w: 0.58, r: 0.15, t: 0.5, g: 0.3, p: 0 },
  E: { o: 0.52, w: 0.46, r: 0.55, t: 0.2, g: 0, p: 0 },
  F: { o: 0.26, w: 0.3, r: 1.0, t: 0, g: 0, p: 0 },
  G: { o: 0.1, w: 0.56, r: 0.0, t: 1, g: 0, p: 0 },
  H: { o: 0.42, w: 0.56, r: 0.1, t: 0.6, g: 1, p: 0 },
};
const KEYS = ['o', 'w', 'r', 't', 'g', 'p'] as const;
const mixP = (a: P, b: P, k: number): P => Object.fromEntries(KEYS.map((x) => [x, a[x] + (b[x] - a[x]) * k])) as P;
/** Frame-to-frame smoothing toward each target; closures snap (a lip press is never half-done). */
function smooth(targets: P[], letters: string[]): P[] {
  const out: P[] = [];
  let cur = VIS.X!;
  targets.forEach((tg, f) => {
    cur = letters[f] === 'A' ? mixP(cur, tg, 0.85) : mixP(cur, tg, tg.o > cur.o ? 0.62 : 0.5);
    if (letters[f] === 'A' && (letters[f - 1] === 'A' || letters[f + 1] !== 'A')) cur = { ...tg }; // ≥ 1 truly shut frame
    out.push(cur);
  });
  return out;
}
const envTrack: P[] = env.map((e) => ({ o: Math.min(0.82, e * 0.82), w: 0.5 + 0.12 * e, r: 0.1, t: e > 0.3 ? 0.5 : 0, g: 0, p: 0 }));
const g2vTrack = smooth(g2vLetters.map((l) => VIS[l]!), g2vLetters);
const hybTargets = hybLetters.map((l, f) => {
  const v = VIS[l]!;
  if (l === 'A' || l === 'X') return v;
  if (rel[f]! < SILENT) return VIS.X!;
  const amp = Math.min(1.12, 0.45 + 0.75 * env[f]!);
  return { ...v, o: v.o * amp };
});
const hybTrack = smooth(hybTargets, hybLetters);

// --- Rhubarb (optional, output file only) -----------------------------------------------------
type Cue = { start: number; end: number; value: string };
const arg = (k: string) => process.argv.find((x) => x.startsWith(`--${k}=`))?.slice(k.length + 3);
const rhubarb = arg('rhubarb')
  ? Array.from({ length: frames }, (_, f) => (JSON.parse(readFileSync(arg('rhubarb')!, 'utf8')) as { mouthCues: Cue[] }).mouthCues.find((c) => (f + 0.5) / FPS >= c.start && (f + 0.5) / FPS < c.end)?.value ?? 'X')
  : null;
const prepMs = performance.now() - t0;

// --- synchronisation metrics (M; definitions in docs/quality/EXPERIMENT-RESULTS.md § E4) -----------
function pearson(a: number[], b: number[]): number {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i]! - ma) * (b[i]! - mb);
    da += (a[i]! - ma) ** 2;
    db += (b[i]! - mb) ** 2;
  }
  return num / Math.sqrt(da * db || 1);
}
/** Bilabial events = runs of 'A' inside words in the text track (exact for the letters, not the audio). */
const closures: Array<[number, number]> = [];
for (let f = 0; f < frames; f++) if (g2vLetters[f] === 'A' && g2vLetters[f - 1] !== 'A') {
  let e = f;
  while (g2vLetters[e + 1] === 'A') e++;
  closures.push([f, e]);
}
function metrics(track: P[]) {
  const o = track.map((p) => p.o);
  const lags: Record<string, number> = {};
  for (let lag = -4; lag <= 4; lag++) {
    // positive lag = the mouth moves `lag` frames after the sound
    const a: number[] = [], b: number[] = [];
    for (let f = 0; f < frames; f++) if (f - lag >= 0 && f - lag < frames) {
      a.push(o[f]!);
      b.push(Math.min(1, rel[f - lag]!));
    }
    lags[lag] = Number(pearson(a, b).toFixed(3));
  }
  const best = Object.entries(lags).sort((x, y) => y[1] - x[1])[0]!;
  const shut = closures.filter(([a, b]) => o.slice(Math.max(0, a - 1), b + 2).some((x) => x < 0.04)).length;
  const silent = rel.map((r, f) => [r, f] as const).filter(([r]) => r < SILENT);
  const rest = silent.filter(([, f]) => o[f]! < 0.08).length;
  let reversals = 0;
  for (let f = 2; f < frames; f++) if ((o[f]! - o[f - 1]!) * (o[f - 1]! - o[f - 2]!) < -1e-4) reversals++;
  const shapes = new Set(track.map((p) => `${Math.round(p.r * 2)}${Math.round(p.t)}${Math.round(p.g)}${Math.round(p.p)}`)).size;
  return {
    corrAtLag0: lags['0'],
    bestLagFrames: Number(best[0]),
    corrByLag: lags,
    closuresShut: `${shut}/${closures.length}`,
    restInSilence: `${rest}/${silent.length}`,
    reversalsPerSecond: Number(((reversals / frames) * FPS).toFixed(1)),
    meanAbsDelta: Number((o.slice(1).reduce((s, x, i) => s + Math.abs(x - o[i]!), 0) / (frames - 1)).toFixed(3)),
    distinctShapes: shapes,
  };
}
// How far the take's word starts sit from the audio's own onsets (frames; + = audio later).
const onsets = line.words.map((w) => {
  const f0 = Math.floor(w.start * FPS);
  let f = Math.max(0, f0 - 3);
  // onset = first frame whose RMS rises ≥ 25 % over the previous one, or the first voiced frame after silence
  while (f < Math.min(frames - 1, f0 + 6) && !(rel[f]! >= SILENT && (rel[f - 1] ?? 0) < SILENT) && !(rel[f]! > (rel[f - 1] ?? 0) * 1.25 && rel[f]! > 0.15)) f++;
  return { word: w.text, takeStartFrame: Number((w.start * FPS).toFixed(1)), audioOnsetFrame: f, deltaFrames: Number((f - w.start * FPS).toFixed(1)) };
});

const after = sha(WAV);
if (before !== after) throw new Error('approved take changed — this must never happen');
const r3 = (p: P) => KEYS.map((k) => Number(p[k].toFixed(3)));
const out = path.join(ROOT, 'lab/visual-quality/exp/E4-data.ts');
writeFileSync(
  out,
  `/** GENERATED by lab/visual-quality/e4-prep.ts — do not edit. Source (read-only, gold): public/${TAKE}/hook.wav sha256 ${after}.\n *  Tracks: per frame [open, width, round, teeth, tongue, press]. */\n` +
    `export const E4 = ${JSON.stringify({ fps: FPS, frames, src: `${TAKE}/hook.wav`, text: line.text, words: line.words, env: env.map((x) => Number(x.toFixed(3))), rel: rel.map((x) => Number(Math.min(1.5, x).toFixed(3))), g2v: g2vLetters.join(''), hyb: hybLetters.join(''), tracks: { env: envTrack.map(r3), g2v: g2vTrack.map(r3), hybrid: hybTrack.map(r3) }, rhubarb: rhubarb ? rhubarb.join('') : null })} as const;\n`,
);
const report = {
  at: new Date().toISOString(),
  source: { file: `public/${TAKE}/hook.wav`, sha256: after, unchangedAfterRead: true, rate, seconds: Number((n / rate).toFixed(3)), frames },
  prepMs: Math.round(prepMs),
  closures: closures.map(([a, b]) => ({ frames: `${a}–${b}`, letters: line.words.find((w) => a / FPS >= w.start - 1 / FPS && a / FPS < w.end)?.text })),
  wordOnsets: onsets,
  env: metrics(envTrack),
  g2v: metrics(g2vTrack),
  hybrid: metrics(hybTrack),
};
mkdirSync(path.join(ROOT, 'out/lab/visual-quality'), { recursive: true });
writeFileSync(path.join(ROOT, 'out/lab/visual-quality/e4-sync.json'), JSON.stringify(report, null, 2));
console.log(`hook.wav ${rate} Hz, ${(n / rate).toFixed(3)} s, ${frames} frames · sha256 unchanged ${after.slice(0, 12)}… · prep ${Math.round(prepMs)} ms`);
console.log(`g2v     ${g2vLetters.join('')}`);
console.log(`hybrid  ${hybLetters.join('')}`);
for (const k of ['env', 'g2v', 'hybrid'] as const) console.log(k.padEnd(7), JSON.stringify({ ...report[k], corrByLag: undefined }));
console.log('onsets ', onsets.map((o) => `${o.word} ${o.deltaFrames >= 0 ? '+' : ''}${o.deltaFrames}`).join(' · '));
console.log(`→ ${path.relative(ROOT, out)} + out/lab/visual-quality/e4-sync.json`);
