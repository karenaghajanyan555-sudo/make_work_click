/**
 * Offline DSP on mono Float32 PCM (the bundled ffmpeg has no compressor/limiter/afade).
 * Pure functions, deterministic, tested (tests/audio.test.ts). Offline = we see the whole
 * buffer, so the limiter is look-ahead by construction and never overshoots its ceiling.
 */

export const dbToGain = (db: number) => 10 ** (db / 20);
export const gainToDb = (g: number) => 20 * Math.log10(Math.max(g, 1e-12));

export function peakDb(x: Float32Array): number {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]!));
  return gainToDb(p);
}

export function applyGain(x: Float32Array, db: number): Float32Array {
  const g = dbToGain(db);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i]! * g;
  return out;
}

/** 2nd-order Butterworth high-pass (RBJ biquad). */
export function highpass(x: Float32Array, sampleRate: number, hz: number): Float32Array {
  const w0 = (2 * Math.PI * hz) / sampleRate;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const a0 = 1 + alpha;
  const b0 = (1 + cos) / 2 / a0, b1 = -(1 + cos) / a0, b2 = (1 + cos) / 2 / a0;
  const a1 = (-2 * cos) / a0, a2 = (1 - alpha) / a0;
  const out = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i]!;
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return out;
}

export type CompressorOptions = { thresholdDb: number; ratio: number; kneeDb: number; attackMs: number; releaseMs: number };

/**
 * Feed-forward compressor, soft knee, gain smoothed in the log domain
 * (Giannoulis, Massberg & Reiss, JAES 2012). No make-up gain: level is set afterwards.
 */
export function compress(x: Float32Array, sampleRate: number, o: CompressorOptions): Float32Array {
  const aA = Math.exp(-1 / ((o.attackMs / 1000) * sampleRate));
  const aR = Math.exp(-1 / ((o.releaseMs / 1000) * sampleRate));
  const T = o.thresholdDb, R = o.ratio, W = o.kneeDb;
  const out = new Float32Array(x.length);
  let g = 0; // smoothed gain reduction, dB (≤ 0)
  for (let i = 0; i < x.length; i++) {
    const xd = gainToDb(Math.abs(x[i]!));
    const over = xd - T;
    let yd: number;
    if (2 * over < -W) yd = xd;
    else if (2 * Math.abs(over) <= W) yd = xd + ((1 / R - 1) * (over + W / 2) ** 2) / (2 * W);
    else yd = T + over / R;
    const gr = yd - xd;
    const a = gr < g ? aA : aR;
    g = a * g + (1 - a) * gr;
    out[i] = x[i]! * dbToGain(g);
  }
  return out;
}

/**
 * Brickwall look-ahead limiter gain curve (offline) for a peak signal |x| (or max of
 * channels for linked stereo). Applying it never lets the peak exceed `ceilingDb`;
 * it ramps down ahead of a peak (`attackMs`) and recovers after it (`releaseMs`).
 */
export function limiterGain(peak: Float32Array, sampleRate: number, o: { ceilingDb: number; attackMs: number; releaseMs: number }): Float32Array {
  const c = dbToGain(o.ceilingDb);
  const n = peak.length;
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) g[i] = peak[i]! > c ? c / peak[i]! : 1;
  const r = Math.exp(-1 / ((o.releaseMs / 1000) * sampleRate));
  const at = Math.exp(-1 / ((o.attackMs / 1000) * sampleRate));
  for (let i = 1; i < n; i++) g[i] = Math.min(g[i]!, 1 - (1 - g[i - 1]!) * r);
  for (let i = n - 2; i >= 0; i--) g[i] = Math.min(g[i]!, 1 - (1 - g[i + 1]!) * at);
  return g;
}

/** Mono brickwall limiter (see limiterGain). */
export function limit(x: Float32Array, sampleRate: number, o: { ceilingDb: number; attackMs: number; releaseMs: number }): Float32Array {
  const g = limiterGain(Float32Array.from(x, Math.abs), sampleRate, o);
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i]! * g[i]!;
  return out;
}

/** Duplicate mono to interleaved stereo at unity (no pan-law −3 dB). */
export function monoToStereo(x: Float32Array): Float32Array {
  const out = new Float32Array(x.length * 2);
  for (let i = 0; i < x.length; i++) out[2 * i] = out[2 * i + 1] = x[i]!;
  return out;
}
