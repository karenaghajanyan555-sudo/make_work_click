/**
 * Sampler over the vendored CC0 recordings (assets/sound/). Each sample is level-normalised
 * on load (VCSL velocity layers vary by > 10 dB between notes), then pitched to the target
 * note from the nearest recorded one (VCSL piano/vibes are whole-tone sampled: ≤ ±2 st).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Instrument } from '../../sound/score.ts';
import { readWav } from '../audio.ts';
import { ROOT } from '../paths.ts';
import { midi, resample } from './fx.ts';

export type Stereo = { l: Float32Array; r: Float32Array };
export const SR = 48000;

type Entry = { id: string; instrument: string; note?: string };
type Loaded = { id: string; midi: number | null; buf: Stereo };

/** Normalisation reference: RMS of the first 300 ms. */
const REF_DB = -20;

function load(id: string): Stereo {
  const p = readWav(path.join(ROOT, 'assets/sound/vcsl', `${id}.wav`));
  if (p.sampleRate !== SR) throw new Error(`${id}: expected ${SR} Hz`);
  const n = p.samples.length / p.channels;
  const l = new Float32Array(n), r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    l[i] = p.samples[i * p.channels]!;
    r[i] = p.samples[i * p.channels + (p.channels > 1 ? 1 : 0)]!;
  }
  const w = Math.min(n, Math.round(0.3 * SR));
  let e = 0;
  for (let i = 0; i < w; i++) e += (l[i]! * l[i]! + r[i]! * r[i]!) / 2;
  const g = 10 ** ((REF_DB - 10 * Math.log10(e / w + 1e-12)) / 20);
  for (let i = 0; i < n; i++) { l[i] = l[i]! * g; r[i] = r[i]! * g; }
  return { l, r };
}

export class Sampler {
  private byInst = new Map<string, Loaded[]>();
  private byId = new Map<string, Loaded>();

  constructor() {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, 'assets/sound/manifest.json'), 'utf8')) as { samples: Entry[] };
    for (const s of manifest.samples) {
      const loaded: Loaded = { id: s.id, midi: s.note ? midi(s.note) : null, buf: load(s.id) };
      this.byId.set(s.id, loaded);
      const list = this.byInst.get(s.instrument) ?? [];
      list.push(loaded);
      this.byInst.set(s.instrument, list);
    }
  }

  /** A pitched note; `holdSeconds` adds a 0.35 s release from that point. */
  note(inst: Instrument, note: string, velDb: number, holdSeconds?: number): Stereo {
    const target = midi(note);
    const list = this.byInst.get(inst);
    if (!list?.length) throw new Error(`no samples for ${inst}`);
    let best = list[0]!;
    for (const s of list) if (Math.abs((s.midi ?? 0) - target) < Math.abs((best.midi ?? 0) - target)) best = s;
    const shift = target - (best.midi ?? target);
    if (Math.abs(shift) > 3) throw new Error(`${inst} ${note}: nearest sample is ${shift} semitones away`);
    return shape(pitch(best.buf, shift), velDb, holdSeconds);
  }

  /** An unpitched hit (claves, woodblock) by sample id, optionally pitched by semitones. */
  hit(id: string, velDb: number, semitones = 0, holdSeconds?: number): Stereo {
    const s = this.byId.get(id);
    if (!s) throw new Error(`no sample ${id}`);
    return shape(pitch(s.buf, semitones), velDb, holdSeconds);
  }
}

function pitch(b: Stereo, semitones: number): Stereo {
  const ratio = 2 ** (semitones / 12);
  return { l: resample(b.l, ratio), r: resample(b.r, ratio) };
}

function shape(b: Stereo, velDb: number, holdSeconds?: number): Stereo {
  const g = 10 ** (velDb / 20);
  const n = holdSeconds === undefined ? b.l.length : Math.min(b.l.length, Math.round((holdSeconds + 0.35) * SR));
  const rel = Math.round(0.35 * SR);
  const l = new Float32Array(n), r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const k = holdSeconds === undefined ? 1 : i < n - rel ? 1 : 0.5 * (1 + Math.cos((Math.PI * (i - (n - rel))) / rel));
    l[i] = b.l[i]! * g * k;
    r[i] = b.r[i]! * g * k;
  }
  return { l, r };
}

/** Add `src` into `dst` at time t (seconds), with gain and pan (−1 left … 1 right, equal power). */
export function addAt(dst: Stereo, src: Stereo, t: number, gainDb = 0, pan = 0): void {
  const start = Math.round(t * SR);
  const g = 10 ** (gainDb / 20);
  const a = ((pan + 1) * Math.PI) / 4;
  const gl = g * Math.cos(a) * Math.SQRT2, gr = g * Math.sin(a) * Math.SQRT2;
  for (let i = 0; i < src.l.length; i++) {
    const k = start + i;
    if (k < 0) continue;
    if (k >= dst.l.length) break;
    dst.l[k]! += src.l[i]! * gl;
    dst.r[k]! += src.r[i]! * gr;
  }
}

export function silence(seconds: number): Stereo {
  const n = Math.round(seconds * SR);
  return { l: new Float32Array(n), r: new Float32Array(n) };
}
