/**
 * The sound-effect library (SoundEffect): every id in src/sound/effects.ts, built from the
 * CC0 recordings (assets/sound/) plus the one procedural layer in the click. Levels are
 * per-effect trims measured in context (docs/SOUND.md § Sound effects).
 *
 * `lead` is how long a sound starts *before* its cue (a swell lands on the cue).
 */
import type { SfxEvent, SfxId } from '../../sound/effects.ts';
import { rng } from './fx.ts';
import { addAt, SR, type Sampler, type Stereo } from './sampler.ts';

export type BuiltSound = { s: Stereo; lead: number };

/** The brand switch: a dry wooden tick, a short low "thock" body, a tiny snap. */
function click(sampler: Sampler, variant: number): Stereo {
  const tick = sampler.hit('claves_soft_2', -12, variant === 0 ? 3 : 1);
  const n = Math.round(0.12 * SR);
  const body = new Float32Array(n);
  const rand = rng(97 + variant);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = 155 * Math.pow(72 / 155, Math.min(1, t / 0.05));
    phase += (2 * Math.PI * f) / SR;
    const amp = (1 - Math.exp(-t / 0.0012)) * Math.exp(-t / 0.042);
    const snap = (rand() * 2 - 1) * Math.exp(-t / 0.0016) * 0.35;
    body[i] = Math.sin(phase) * amp * 0.3 + snap * 0.12;
  }
  const out: Stereo = { l: new Float32Array(Math.max(n, tick.l.length)), r: new Float32Array(Math.max(n, tick.l.length)) };
  addAt(out, tick, 0);
  addAt(out, { l: body, r: body }, 0);
  return out;
}

/** Two notes, the second slightly later (a gentle "arrived"). */
function pair(a: Stereo, b: Stereo, gap: number): Stereo {
  const n = Math.max(a.l.length, b.l.length + Math.round(gap * SR));
  const out: Stereo = { l: new Float32Array(n), r: new Float32Array(n) };
  addAt(out, a, 0);
  addAt(out, b, gap);
  return out;
}

/** A recorded note played backwards with a rising envelope: lands exactly at its end. */
function swell(sampler: Sampler, seconds: number): BuiltSound {
  const src = sampler.note('chime', 'D5', -17);
  const n = Math.min(src.l.length, Math.round(seconds * SR));
  const l = new Float32Array(n), r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = (i / n) ** 1.6; // ease in: felt more than heard until the very end
    l[i] = src.l[n - 1 - i]! * k;
    r[i] = src.r[n - 1 - i]! * k;
  }
  return { s: { l, r }, lead: n / SR };
}

const BUILD: Record<SfxId, (sampler: Sampler, variant: number) => BuiltSound> = {
  click: (s, v) => ({ s: click(s, v), lead: 0 }),
  flip: (s, v) => ({ s: s.hit('claves_soft_1', -23, [0, 2, -1, 3][v % 4]!), lead: 0 }),
  day: (s, v) => ({ s: s.hit(`wood_pp_${(v % 3) + 1}`, -20.5, -3), lead: 0 }),
  check: (s, v) => ({ s: s.hit('claves_soft_2', -21, [5, 7, 9, 12, 14][v % 5]!), lead: 0 }),
  // Per-note trims: the two chime recordings differ by ~9 dB in peak after RMS normalisation (measured).
  sent: (s, v) => ({ s: v % 2 === 0 ? s.note('chime', 'D5', -13, 1.1) : s.note('chime', 'F#5', -5, 1.1), lead: 0 }),
  notify: (s, v) =>
    v === 1
      ? { s: pair(s.note('vibes', 'C5', -15, 0.6), s.note('vibes', 'E5', -18, 0.8), 0.07), lead: 0 }
      : { s: s.note('vibes', 'A4', -22, 0.5), lead: 0 },
  tick: (s, v) => ({ s: v === 9 ? s.hit('claves_soft_2', -20, 7) : s.hit(`wood_pp_${(v % 3) + 1}`, -24, [0, 2, 4, 5, 7, 9][v % 6]!), lead: 0 }),
  open: (s) => ({ s: s.hit('wood_pp_2', -23, -5), lead: 0 }),
  swell: (s) => swell(s, 0.9),
};

export function buildSound(sampler: Sampler, e: Pick<SfxEvent, 'id' | 'variant'>): BuiltSound {
  return BUILD[e.id](sampler, e.variant);
}
