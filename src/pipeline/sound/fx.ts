/**
 * Offline audio effects on Float32 PCM (pure, deterministic): FFT convolution, a
 * procedural reverb impulse response, cubic resampling (pitch), envelope follower and
 * ducking. The bundled ffmpeg has no reverb/sidechain, so these live here.
 */

/** In-place iterative radix-2 complex FFT. `inverse` scales by 1/N. */
export function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length;
  if (n & (n - 1)) throw new Error('fft size must be a power of two');
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const xr = re[b]! * cr - im[b]! * ci;
        const xi = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - xr; im[b] = im[a]! - xi;
        re[a] = re[a]! + xr; im[a] = im[a]! + xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] = re[i]! / n; im[i] = im[i]! / n; }
}

/** Linear convolution via one large FFT. Output length x + h − 1. */
export function convolve(x: Float32Array, h: Float32Array): Float32Array {
  const len = x.length + h.length - 1;
  let n = 1;
  while (n < len) n <<= 1;
  const ar = new Float64Array(n), ai = new Float64Array(n);
  const br = new Float64Array(n), bi = new Float64Array(n);
  ar.set(x);
  br.set(h);
  fft(ar, ai);
  fft(br, bi);
  for (let i = 0; i < n; i++) {
    const r = ar[i]! * br[i]! - ai[i]! * bi[i]!;
    ai[i] = ar[i]! * bi[i]! + ai[i]! * br[i]!;
    ar[i] = r;
  }
  fft(ar, ai, true);
  return Float32Array.from(ar.subarray(0, len));
}

/** Seeded PRNG (mulberry32) → uniform [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ReverbOptions = { seconds: number; rt60: number; preDelayMs: number; brightHz: number; darkHz: number; seed: number };

/**
 * Stereo room impulse: a few early reflections, then a decorrelated noise tail decaying
 * at `rt60` and darkening over time (one-pole low-pass sweeping brightHz → darkHz).
 * Energy-normalised per channel.
 */
export function reverbImpulse(sampleRate: number, o: ReverbOptions): { l: Float32Array; r: Float32Array } {
  const n = Math.round(o.seconds * sampleRate);
  const pre = Math.round((o.preDelayMs / 1000) * sampleRate);
  const make = (seed: number) => {
    const rand = rng(seed);
    const h = new Float32Array(n);
    const decay = Math.log(1000) / (o.rt60 * sampleRate); // −60 dB at rt60
    let lp = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / (n - pre);
      const fc = o.brightHz * Math.pow(o.darkHz / o.brightHz, t);
      const a = Math.exp((-2 * Math.PI * fc) / sampleRate);
      lp = (1 - a) * (rand() * 2 - 1) + a * lp;
      const fadeIn = Math.min(1, (i - pre) / (0.012 * sampleRate)); // soft onset, no click
      h[i] = lp * Math.exp(-decay * (i - pre)) * fadeIn;
    }
    // Early reflections (ms, gain).
    for (const [ms, g] of [[7, 0.45], [13, -0.35], [21, 0.3], [29, -0.22], [37, 0.18], [52, 0.12]] as const) {
      const k = pre + Math.round(((ms * (0.9 + 0.2 * rand())) / 1000) * sampleRate);
      if (k < n) h[k]! += g * 0.02;
    }
    let e = 0;
    for (let i = 0; i < n; i++) e += h[i]! * h[i]!;
    const norm = 1 / Math.sqrt(e || 1);
    for (let i = 0; i < n; i++) h[i] = h[i]! * norm;
    return h;
  };
  return { l: make(o.seed), r: make(o.seed + 7919) };
}

/** Resample by `ratio` (>1 = higher pitch, shorter) with 4-point Hermite interpolation. */
export function resample(x: Float32Array, ratio: number): Float32Array {
  if (Math.abs(ratio - 1) < 1e-9) return x;
  const n = Math.floor((x.length - 3) / ratio);
  const out = new Float32Array(Math.max(0, n));
  for (let i = 0; i < n; i++) {
    const p = i * ratio + 1;
    const k = Math.floor(p);
    const f = p - k;
    const y0 = x[k - 1]!, y1 = x[k]!, y2 = x[k + 1]!, y3 = x[k + 2]!;
    const c1 = 0.5 * (y2 - y0);
    const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    out[i] = ((c3 * f + c2) * f + c1) * f + y1;
  }
  return out;
}

/** RMS envelope (dBFS) with separate attack/release smoothing. */
export function envelopeDb(x: Float32Array, sampleRate: number, attackMs: number, releaseMs: number): Float32Array {
  const aA = Math.exp(-1 / ((attackMs / 1000) * sampleRate));
  const aR = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));
  const out = new Float32Array(x.length);
  let e = 0;
  for (let i = 0; i < x.length; i++) {
    const p = x[i]! * x[i]!;
    const a = p > e ? aA : aR;
    e = a * e + (1 - a) * p;
    out[i] = 10 * Math.log10(e + 1e-12);
  }
  return out;
}

/**
 * Ducking gain (linear) from a key envelope: full `depthDb` cut when the key is above
 * `thresholdDb`, eased in over a 10 dB knee; smoothed so the bed breathes, never pumps.
 */
export function duckGain(keyDb: Float32Array, sampleRate: number, o: { thresholdDb: number; depthDb: number; attackMs: number; releaseMs: number }): Float32Array {
  const aA = Math.exp(-1 / ((o.attackMs / 1000) * sampleRate));
  const aR = Math.exp(-1 / ((o.releaseMs / 1000) * sampleRate));
  const out = new Float32Array(keyDb.length);
  let g = 0;
  for (let i = 0; i < keyDb.length; i++) {
    const over = Math.min(1, Math.max(0, (keyDb[i]! - o.thresholdDb + 10) / 10));
    const target = -o.depthDb * over;
    const a = target < g ? aA : aR;
    g = a * g + (1 - a) * target;
    out[i] = 10 ** (g / 20);
  }
  return out;
}

/** Note name ("F#4", "Bb2") → MIDI number. */
export function midi(note: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!m) throw new Error(`bad note "${note}"`);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1] as 'C'];
  return 12 * (Number(m[3]) + 1) + base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
