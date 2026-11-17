import { Easing, interpolate } from 'remotion';

/**
 * Motion language (docs/BRAND.md § Motion): confident, precise, unhurried.
 * Fast departure, long soft settle, no bounce. Every animation uses one of these.
 */
export const ease = {
  /** Entrances, reveals: quick start, long settle. */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** Exits: gentle start, quick finish. */
  in: Easing.bezier(0.55, 0, 0.75, 0.3),
  /** Camera and state changes. */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** Magnetic travel: hesitant start, decisive arrival — the "snap into place". */
  snap: Easing.bezier(0.7, 0, 0.12, 1),
  linear: (t: number) => t,
} as const;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0→1 over [start, start+duration] frames, clamped, eased. */
export function progress(frame: number, start: number, duration: number, easing: (t: number) => number = ease.out): number {
  if (duration <= 0) return frame >= start ? 1 : 0;
  return interpolate(frame, [start, start + duration], [0, 1], { ...clamp, easing });
}

/** Exact at both ends (t=0 → a, t=1 → b): an opacity that settles at 0.9999999 makes Chrome
 * composite the element on its own layer (different text anti-aliasing — visible at cuts). */
export function lerp(a: number, b: number, t: number): number {
  return (1 - t) * a + t * b;
}

/** Fraction of `t` inside [a, b], clamped (for sub-phases of a 0..1 progress). */
export function sub(t: number, a: number, b: number): number {
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

type Rgba = [number, number, number, number];

function parseColor(c: string): Rgba {
  if (c.startsWith('#')) {
    const h = c.slice(1);
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (!m || !m[1]) throw new Error(`Unsupported colour: ${c}`);
  const p = m[1].split(',').map((x) => Number(x.trim()));
  return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 1];
}

/** Linear blend of two colours (hex or rgb/rgba). */
export function mixColor(a: string, b: string, t: number): string {
  const x = parseColor(a);
  const y = parseColor(b);
  const k = Math.min(1, Math.max(0, t));
  const r = (i: number) => Math.round(lerp(x[i]!, y[i]!, k));
  return `rgba(${r(0)},${r(1)},${r(2)},${lerp(x[3], y[3], k).toFixed(3)})`;
}
