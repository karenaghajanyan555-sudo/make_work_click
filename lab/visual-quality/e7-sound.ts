/**
 * LAB ONLY — E7 sound design (audit A10: one palette of pitched percussion; no weight on the turn,
 * no material foley, no air, no room tone). Five A/B pairs, each laid on a lab clip that already
 * exists, timed from the same motion functions the picture uses:
 *   click  e2-toggle-current   A production `click`            B + a saturated low "weight" layer
 *   tear   e2r-tear-dom        A production `flip` on the rip   B procedural paper foley (tug, rip, settle)
 *   whip   e3-whip-svg         A silence (no decorative sound)  B velocity-driven air + landing, panned with the card
 *   demo   e5-demo-cursor      A production `check` per row     B + dry foley for the person (mouse, key) + room tone
 *   room   e4-mouth-hybrid     A narration on digital silence   B + procedural room tone
 * Grammar under test (J): dry foley = the person; pitched tone = the system (mirrors lime).
 * Nothing here is wired into src/: production modules are imported read-only; output goes to
 * out/lab/visual-quality/{audio,clips}/ and e7-results.json. Every WAV is synthesised twice and
 * compared byte for byte (determinism).
 *
 *   npm run profile -- lab-vq-E7 -- node lab/visual-quality/e7-sound.ts
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { measureLoudness, masterVoice, readWav, writeWav, type Loudness } from '../../src/pipeline/audio.ts';
import { ff } from '../../src/pipeline/ffmpeg.ts';
import { ROOT } from '../../src/pipeline/paths.ts';
import { convolve, fft, reverbImpulse, rng } from '../../src/pipeline/sound/fx.ts';
import { MIX } from '../../src/pipeline/sound/mix.ts';
import { addAt, Sampler, silence, SR, type Stereo } from '../../src/pipeline/sound/sampler.ts';
import { buildSound } from '../../src/pipeline/sound/sfx.ts';
import { ease, lerp, progress } from '../../src/remotion/lib/anim.ts';

const OUT = path.join(ROOT, 'out/lab/visual-quality');
const AUDIO = path.join(OUT, 'audio');
mkdirSync(AUDIO, { recursive: true });
const FPS = 30;
/** Same make-up gain on A and B for audition only (SFX stems are mixed ~10 dB under the voice). */
const AUDITION_DB = 8;

// ---------------------------------------------------------------------------------------------
// Small DSP (lab): filters, noise, events

type Kind = 'lp' | 'hp' | 'bp';
/** RBJ biquad, one pass (bp = constant 0 dB peak). */
function biquad(x: Float32Array, kind: Kind, f0: number, q: number): Float32Array {
  const w = (2 * Math.PI * f0) / SR, cw = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0: number, b1: number, b2: number;
  if (kind === 'lp') [b0, b1, b2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2];
  else if (kind === 'hp') [b0, b1, b2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
  else [b0, b1, b2] = [al, 0, -al];
  const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i]! + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]!; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
const white = (n: number, seed: number) => {
  const r = rng(seed);
  return Float32Array.from({ length: n }, () => r() * 2 - 1);
};
/** Pink noise (Paul Kellet's economy filter), unit-ish RMS. */
function pink(n: number, seed: number): Float32Array {
  const r = rng(seed);
  const y = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    y[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
  }
  return y;
}
const peakOf = (x: Float32Array) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const normPeak = (x: Float32Array, db: number) => {
  const g = 10 ** (db / 20) / (peakOf(x) || 1);
  return x.map((v) => v * g);
};
const mono = (x: Float32Array): Stereo => ({ l: x, r: x.slice() });
const gainS = (s: Stereo, db: number): Stereo => ({ l: s.l.map((v) => v * 10 ** (db / 20)), r: s.r.map((v) => v * 10 ** (db / 20)) });
function room(dry: Stereo): Stereo {
  // The production SFX room (MIX.sfxReverb), so A and B sit in the same space.
  const o = MIX.sfxReverb;
  const ir = reverbImpulse(SR, o.ir);
  const wl = convolve(dry.l, ir.l), wr = convolve(dry.r, ir.r);
  const l = new Float32Array(dry.l.length), r = new Float32Array(dry.r.length);
  for (let i = 0; i < l.length; i++) { l[i] = dry.l[i]! + wl[i]! * o.send; r[i] = dry.r[i]! + wr[i]! * o.send; }
  return { l, r };
}
/** A short noise "tick": `ms` long, high-passed, exponential decay. */
function tick(ms: number, hp: number, seed: number, decayMs: number): Float32Array {
  const n = Math.round((ms / 1000) * SR);
  const x = white(n, seed).map((v, i) => v * Math.exp(-i / ((decayMs / 1000) * SR)));
  return biquad(x, 'hp', hp, 0.7);
}
/** A damped sine (resonant body). */
function ping(hz: number, decayMs: number, seconds: number, phase = 0): Float32Array {
  const n = Math.round(seconds * SR);
  return Float32Array.from({ length: n }, (_, i) => Math.sin(phase + (2 * Math.PI * hz * i) / SR) * Math.exp(-i / ((decayMs / 1000) * SR)) * Math.min(1, i / 24));
}
const addMono = (dst: Float32Array, src: Float32Array, t: number, g = 1) => {
  const s = Math.round(t * SR);
  for (let i = 0; i < src.length && s + i < dst.length; i++) if (s + i >= 0) dst[s + i]! += src[i]! * g;
};
const panTo = (x: Float32Array, pan: Float32Array | number): Stereo => {
  const l = new Float32Array(x.length), r = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const p = typeof pan === 'number' ? pan : pan[i]!;
    const a = ((p + 1) * Math.PI) / 4;
    l[i] = x[i]! * Math.cos(a) * Math.SQRT2;
    r[i] = x[i]! * Math.sin(a) * Math.SQRT2;
  }
  return { l, r };
};

// ---------------------------------------------------------------------------------------------
// The five procedural layers

/** Low "weight" under the brand click: a falling 105 → 52 Hz body, saturated so its harmonics
 *  (≈ 110–320 Hz) survive small speakers while the fundamental is felt on headphones. */
function clickWeight(): Float32Array {
  const n = Math.round(0.26 * SR);
  const y = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 52 + (105 - 52) * Math.exp(-t / 0.028);
    ph += (2 * Math.PI * f) / SR;
    const amp = (1 - Math.exp(-t / 0.0015)) * Math.exp(-t / 0.07);
    y[i] = Math.tanh(Math.sin(ph) * 2.4) * amp;
  }
  return normPeak(biquad(y, 'lp', 900, 0.7), -15);
}

/** Paper foley on the E2R tear timeline (pull → rip that resists then gives → drift → hold). */
function paperTear(seconds: number): Stereo {
  const n = Math.round(seconds * SR);
  const f = (s: number) => Math.round(s * FPS);
  const rip = (fr: number) => progress(fr, f(0.55), f(0.9), ease.snap);
  const drift = (fr: number) => progress(fr, f(1.45), f(1.0), ease.glide);
  // Speeds per sample (fractional frames), normalised to their peaks.
  const speed = new Float32Array(n), dspeed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const fr = (i / SR) * FPS;
    speed[i] = Math.max(0, rip(fr + 0.25) - rip(fr - 0.25));
    dspeed[i] = Math.max(0, drift(fr + 0.25) - drift(fr - 0.25));
  }
  const sp = peakOf(speed) || 1, dp = peakOf(dspeed) || 1;
  for (let i = 0; i < n; i++) { speed[i] = speed[i]! / sp; dspeed[i] = dspeed[i]! / dp; }
  // Rough fibre: a slow seeded modulation (≈ 35 Hz) so the hiss is grainy, not a steady jet.
  const grainR = rng(71);
  const grain = new Float32Array(n);
  let g = 0.5, target = 0.5;
  for (let i = 0; i < n; i++) {
    if (i % Math.round(SR / 35) === 0) target = 0.25 + grainR() * 0.75;
    g += (target - g) * 0.004;
    grain[i] = g;
  }
  const hissL = biquad(biquad(white(n, 11), 'bp', 3200, 0.8), 'hp', 900, 0.7);
  const hissR = biquad(biquad(white(n, 12), 'bp', 3000, 0.8), 'hp', 900, 0.7);
  const body = biquad(white(n, 13), 'lp', 650, 0.8);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const s = speed[i]! ** 0.8 * grain[i]!;
    L[i] = hissL[i]! * s * 0.55 + body[i]! * speed[i]! * 0.35 + hissL[i]! * dspeed[i]! * 0.06;
    R[i] = hissR[i]! * s * 0.55 + body[i]! * speed[i]! * 0.35 + hissR[i]! * dspeed[i]! * 0.06;
  }
  // Fibre snaps: a Poisson stream whose rate follows the rip speed.
  const ev = rng(5);
  let t = 0.5;
  while (t < 1.6) {
    const i = Math.round(t * SR);
    const s = speed[Math.min(n - 1, i)]!;
    const rate = 12 + 300 * s;
    t += -Math.log(1 - ev() * 0.999) / rate;
    if (s < 0.03) continue;
    const k = tick(2 + ev() * 3, 1400 + ev() * 2200, Math.floor(ev() * 1e6), 0.7 + ev() * 1.2);
    const a = (0.25 + ev() * 0.75) * s ** 0.5 * 0.9;
    const pan = (ev() - 0.5) * 0.5;
    addMono(L, k, t, a * (1 - pan));
    addMono(R, k, t, a * (1 + pan));
  }
  // The tug before the rip: two small crinkles (clusters of quiet ticks).
  for (const [c, seed] of [[0.39, 31], [0.5, 32]] as const) {
    const cr = rng(seed);
    for (let k = 0; k < 9; k++) {
      const tk = tick(1.5 + cr() * 2, 1800, Math.floor(cr() * 1e6), 0.6);
      const at = c + cr() * 0.06;
      addMono(L, tk, at, 0.18 + cr() * 0.12);
      addMono(R, tk, at, 0.18 + cr() * 0.12);
    }
  }
  const pk = Math.max(peakOf(L), peakOf(R));
  const gn = 10 ** (-13 / 20) / pk;
  return { l: L.map((v) => v * gn), r: R.map((v) => v * gn) };
}

/** Air for the whip: noise through a bandpass whose centre and level follow the card speed, panned
 *  with the moving card; a soft wood landing when each card settles. Same function as the picture. */
const CARD_W = 760;
function whipX(t: number): { a: number; b: number } {
  const centre = (1080 - CARD_W) / 2;
  const arrive = progress(t, 0, 0.5 * FPS, ease.snap);
  const swap = progress(t, 1.35 * FPS, 0.5 * FPS, ease.snap);
  return { a: lerp(-1300, centre, arrive) + swap * 1500, b: lerp(-1300, centre, swap) };
}
function whoosh(seconds: number, sampler: Sampler): Stereo {
  const n = Math.round(seconds * SR);
  const src = pink(n, 41);
  const y = new Float32Array(n), pan = new Float32Array(n);
  const spd = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const fr = (i / SR) * FPS;
    const p = whipX(fr + 0.25), q = whipX(fr - 0.25);
    const va = Math.abs(p.a - q.a), vb = Math.abs(p.b - q.b);
    spd[i] = va + vb;
    // pan from the speed-weighted card centre (−1 left … +1 right)
    const xa = p.a + CARD_W / 2, xb = p.b + CARD_W / 2;
    pan[i] = va + vb > 1e-6 ? Math.max(-0.8, Math.min(0.8, ((xa * va + xb * vb) / (va + vb) - 540) / 700)) : 0;
  }
  const top = peakOf(spd) || 1;
  // Chamberlin state-variable bandpass with a moving centre (stable below SR/6).
  let low = 0, band = 0;
  for (let i = 0; i < n; i++) {
    const s = spd[i]! / top;
    const fc = 260 + 2300 * s ** 1.2;
    const fq = 2 * Math.sin((Math.PI * fc) / SR);
    const high = src[i]! - low - 0.9 * band;
    band += fq * high;
    low += fq * band;
    y[i] = band * s ** 1.6;
  }
  const air = panTo(normPeak(y, -14), pan);
  const out = silence(seconds);
  addAt(out, air, 0);
  // Landings: the arrival (0.5 s) and the swap (1.85 s) settle → the library's soft woodblock.
  addAt(out, sampler.hit('wood_pp_2', -27, -5), 0.47, 0, 0);
  addAt(out, sampler.hit('wood_pp_1', -27, -3), 1.82, 0, 0);
  return out;
}

/** The person's hands: a mouse button (press + release) and a key (bottom-out + top-out). Dry, unpitched. */
function mouseClick(): Float32Array {
  const y = new Float32Array(Math.round(0.14 * SR));
  addMono(y, tick(1.4, 2200, 101, 0.5), 0, 1);
  addMono(y, ping(3100, 7, 0.03), 0, 0.35);
  addMono(y, tick(1.2, 2600, 102, 0.4), 0.072, 0.5);
  addMono(y, ping(3600, 5, 0.03), 0.072, 0.18);
  return normPeak(y, -22);
}
function keyTap(): Float32Array {
  const y = new Float32Array(Math.round(0.18 * SR));
  addMono(y, ping(170, 16, 0.08), 0, 0.9);
  addMono(y, biquad(tick(5, 300, 103, 1.6), 'lp', 4200, 0.7), 0, 0.8);
  addMono(y, tick(1.2, 2400, 104, 0.4), 0.004, 0.45);
  addMono(y, biquad(tick(3, 800, 105, 1), 'lp', 5000, 0.7), 0.095, 0.35);
  return normPeak(y, -20);
}
/** Room tone: pink noise, 90 Hz–5 kHz, a slow seeded breathe of ±1 dB; `db` = RMS level. */
function roomTone(seconds: number, db: number): Stereo {
  const n = Math.round(seconds * SR);
  const shape = (x: Float32Array) => biquad(biquad(x, 'hp', 90, 0.7), 'lp', 5000, 0.7);
  const l = shape(pink(n, 61)), r = shape(pink(n, 62));
  let e = 0;
  for (let i = 0; i < n; i++) e += (l[i]! ** 2 + r[i]! ** 2) / 2;
  const g = 10 ** (db / 20) / Math.sqrt(e / n);
  for (let i = 0; i < n; i++) {
    const breathe = 10 ** ((Math.sin((2 * Math.PI * 0.11 * i) / SR) * 1) / 20);
    const fade = Math.min(1, i / (0.3 * SR)) * Math.min(1, (n - i) / (0.3 * SR));
    l[i] = l[i]! * g * breathe * fade;
    r[i] = r[i]! * g * breathe * fade;
  }
  return { l, r };
}

// ---------------------------------------------------------------------------------------------
// Scenes: A (production library) vs B (with the procedural layers)

const sampler = new Sampler();
const dur = (frames: number) => frames / FPS;
const at = (s: Stereo, src: Stereo, t: number, db = 0) => {
  addAt(s, src, t, db);
  return s;
};
type Scene = { id: string; clip: string; frames: number; build: (v: 'a' | 'b') => Promise<Stereo> | Stereo; note: string };
const T5 = { click1: 1.25, type: 1.45, click2: 2.45, rows: 3.25, rowGap: 0.28 };
const SCENES: Scene[] = [
  {
    id: 'click', clip: 'e2-toggle-current', frames: 60, note: 'brand switch at 0.50 s',
    build: (v) => {
      const s = silence(dur(60));
      at(s, buildSound(sampler, { id: 'click', variant: 0 }).s, 0.5);
      if (v === 'b') at(s, mono(clickWeight()), 0.5);
      return room(s);
    },
  },
  {
    id: 'tear', clip: 'e2r-tear-dom', frames: 90, note: 'rip 0.55–1.45 s (ease.snap), drift 1.45–2.45 s',
    build: (v) => {
      if (v === 'a') return room(at(silence(dur(90)), buildSound(sampler, { id: 'flip', variant: 0 }).s, 0.55));
      return room(paperTear(dur(90)));
    },
  },
  {
    id: 'whip', clip: 'e3-whip-svg', frames: 75, note: 'arrive 0–0.5 s, swap 1.35–1.85 s',
    build: (v) => (v === 'a' ? silence(dur(75)) : room(whoosh(dur(75), sampler))),
  },
  {
    id: 'demo', clip: 'e5-demo-cursor', frames: 150, note: 'clicks 1.25 / 2.45 s, key 1.45 s, rows from 3.25 s every 0.28 s',
    build: (v) => {
      const s = silence(dur(150));
      for (let k = 0; k < 4; k++) at(s, buildSound(sampler, { id: 'check', variant: k }).s, T5.rows + k * T5.rowGap);
      if (v === 'b') {
        at(s, mono(mouseClick()), T5.click1);
        at(s, mono(keyTap()), T5.type);
        at(s, mono(mouseClick()), T5.click2);
      }
      const wet = room(s);
      if (v === 'b') addAt(wet, roomTone(dur(150), -60), 0);
      return wet;
    },
  },
  {
    id: 'room', clip: 'e4-mouth-hybrid', frames: 120, note: 'v008 hook (read-only) from 0.40 s, voice chain → −16 LUFS',
    build: async (v) => {
      const src = path.join(ROOT, 'public/narration/v008-bookings-run-themselves/take-01/hook.wav');
      const tmp = path.join(AUDIO, 'hook-48k.wav');
      const r = await ff('ffmpeg', ['-hide_banner', '-y', '-v', 'error', '-i', src, '-af', 'aresample=48000:filter_size=64:cutoff=0.97', '-c:a', 'pcm_s16le', tmp]);
      if (r.code !== 0) throw new Error(r.stderr.slice(-300));
      const w = readWav(tmp);
      const voice = await masterVoice({ sampleRate: SR, channels: 1, samples: w.samples }, MIX.voiceLufs, path.join(AUDIO, 'voice-work.wav'));
      const s = silence(dur(120));
      const n = voice.pcm.samples.length / 2;
      const v2: Stereo = { l: new Float32Array(n), r: new Float32Array(n) };
      for (let i = 0; i < n; i++) { v2.l[i] = voice.pcm.samples[2 * i]!; v2.r[i] = voice.pcm.samples[2 * i + 1]!; }
      at(s, v2, 12 / FPS);
      if (v === 'b') addAt(s, roomTone(dur(120), -58), 0);
      return s;
    },
  },
];

// ---------------------------------------------------------------------------------------------

const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const interleave = (s: Stereo) => {
  const x = new Float32Array(s.l.length * 2);
  for (let i = 0; i < s.l.length; i++) { x[2 * i] = s.l[i]!; x[2 * i + 1] = s.r[i]!; }
  return x;
};
const write = (file: string, s: Stereo) => writeWav(file, { sampleRate: SR, channels: 2, samples: interleave(s) });
/** Share of energy in a band (FFT of the whole stem, both channels summed). */
function bandShare(s: Stereo, lo: number, hi: number): number {
  let size = 1;
  while (size < s.l.length) size *= 2;
  const re = new Float64Array(size), im = new Float64Array(size);
  for (let i = 0; i < s.l.length; i++) re[i] = (s.l[i]! + s.r[i]!) / 2;
  fft(re, im);
  let band = 0, all = 0;
  for (let k = 1; k < size / 2; k++) {
    const p = re[k]! ** 2 + im[k]! ** 2;
    const hz = (k * SR) / size;
    all += p;
    if (hz >= lo && hz < hi) band += p;
  }
  return all ? band / all : 0;
}
const fmt = (l: Loudness) => ({ lufs: Number.isFinite(l.integratedLufs) ? l.integratedLufs : null, tp: Number.isFinite(l.truePeakDbtp) ? l.truePeakDbtp : null });

const results: Record<string, unknown> = {};
for (const sc of SCENES) {
  const row: Record<string, unknown> = { clip: sc.clip, note: sc.note };
  for (const v of ['a', 'b'] as const) {
    const t0 = performance.now();
    const s = await sc.build(v);
    const ms = Math.round(performance.now() - t0);
    const f1 = path.join(AUDIO, `e7-${sc.id}-${v}.wav`);
    write(f1, s);
    const f2 = path.join(AUDIO, `e7-${sc.id}-${v}.det.wav`);
    write(f2, await sc.build(v));
    const deterministic = sha(f1) === sha(f2);
    const stem = fmt(await measureLoudness(f1));
    const aud = gainS(s, AUDITION_DB);
    const fa = path.join(AUDIO, `e7-${sc.id}-${v}.audition.wav`);
    write(fa, sc.id === 'room' ? s : aud);
    const clipIn = path.join(OUT, 'clips', `${sc.clip}.mp4`);
    let muxed: ReturnType<typeof fmt> | null = null;
    const clipOut = path.join(OUT, 'clips', `e7-${sc.id}-${v}.mp4`);
    if (existsSync(clipIn)) {
      const r = await ff('ffmpeg', ['-hide_banner', '-y', '-v', 'error', '-i', clipIn, '-i', fa, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'libfdk_aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', clipOut]);
      if (r.code !== 0) throw new Error(`mux ${sc.id}: ${r.stderr.slice(-300)}`);
      muxed = fmt(await measureLoudness(clipOut));
    }
    row[v] = {
      synthMs: ms,
      deterministic,
      stem,
      auditionDb: sc.id === 'room' ? 0 : AUDITION_DB,
      muxed,
      clip: existsSync(clipOut) ? path.relative(ROOT, clipOut) : null,
      lowShare: Number(bandShare(s, 20, 150).toFixed(3)),
      phoneBandShare: Number(bandShare(s, 150, 400).toFixed(3)),
    };
    console.log(`${sc.id}-${v}: ${ms} ms · det ${deterministic ? 'identical' : 'DIFFERENT'} · stem ${JSON.stringify(stem)} · muxed ${JSON.stringify(muxed)}`);
  }
  results[sc.id] = row;
}
writeFileSync(path.join(OUT, 'e7-results.json'), JSON.stringify({ at: new Date().toISOString(), auditionDb: AUDITION_DB, scenes: results }, null, 2));
console.log('→ out/lab/visual-quality/e7-results.json');
