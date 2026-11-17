/**
 * Final mix for a video: narration (approved take) + original score + cue-driven effects,
 * mastered to the delivery target. Offline, deterministic, Node only (docs/SOUND.md).
 *
 *   voice  take lines → 48 kHz → high-pass → compressor → −16 LUFS (centre)
 *   music  score → sampler → room reverb → fade-out → level → ducked under the voice
 *   sfx    cue map (src/sound/score.ts) → sampler/procedural → short reverb
 *   master sum → linked look-ahead limiter → −14 LUFS integrated (iterated)
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { composeScore } from '../../sound/compose.ts';
import { cueSeconds, resolveTime, sfxEvents, beatSeconds, validateScore, type ScoreSpec, type SfxEvent } from '../../sound/score.ts';
import { placeNarration } from '../../video/narration.ts';
import type { VideoSpec } from '../../video/spec.ts';
import { computeTimeline } from '../../video/timeline.ts';
import { measureLoudness, readWav, VOICE_CHAIN, writeWav, type Loudness } from '../audio.ts';
import { compress, highpass, limiterGain } from '../dsp.ts';
import { ff } from '../ffmpeg.ts';
import { narrationSource } from '../narration.ts';
import { convolve, duckGain, envelopeDb, midi, reverbImpulse, rng } from './fx.ts';
import { buildSound } from './sfx.ts';
import { addAt, Sampler, silence, SR, type Stereo } from './sampler.ts';

/** Mix targets. Levels are project decisions (docs/SOUND.md), not platform facts. */
export const MIX = {
  targetLufs: -14,
  /** Sample-peak ceiling; true peak after AAC is checked by QA (≤ −1 dBTP). */
  ceilingDb: -1.5,
  voiceLufs: -16,
  /** Music stem alone, before ducking: ~9 dB under the voice in the gaps, ~15 dB while she speaks. */
  musicLufs: -25,
  duck: { thresholdDb: -42, depthDb: 6, attackMs: 70, releaseMs: 420 },
  musicReverb: { send: 0.34, ir: { seconds: 2.6, rt60: 2.2, preDelayMs: 22, brightHz: 7000, darkHz: 1400, seed: 11 } },
  sfxReverb: { send: 0.2, ir: { seconds: 1.2, rt60: 0.9, preDelayMs: 8, brightHz: 9000, darkHz: 2500, seed: 23 } },
  edgeFadeMs: 15,
} as const;

export type MixReport = {
  durationSeconds: number;
  stems: { voice: Loudness; music: Loudness; sfx: Loudness };
  master: Loudness & { iterations: number; masterGainDb: number };
  sfxEvents: SfxEvent[];
  notes: number;
};

const interleave = (s: Stereo): Float32Array => {
  const out = new Float32Array(s.l.length * 2);
  for (let i = 0; i < s.l.length; i++) { out[2 * i] = s.l[i]!; out[2 * i + 1] = s.r[i]!; }
  return out;
};
const writeStereo = (file: string, s: Stereo) => writeWav(file, { sampleRate: SR, channels: 2, samples: interleave(s) });
const scale = (s: Stereo, db: number): Stereo => {
  const g = 10 ** (db / 20);
  return { l: s.l.map((v) => v * g), r: s.r.map((v) => v * g) };
};
async function loudnessOf(s: Stereo, file: string): Promise<Loudness> {
  writeStereo(file, s);
  return measureLoudness(file);
}

function reverb(dry: Stereo, o: (typeof MIX)['musicReverb'] | (typeof MIX)['sfxReverb']): Stereo {
  const ir = reverbImpulse(SR, o.ir);
  const wl = convolve(dry.l, ir.l), wr = convolve(dry.r, ir.r);
  const l = new Float32Array(dry.l.length), r = new Float32Array(dry.r.length);
  for (let i = 0; i < l.length; i++) { l[i] = dry.l[i]! + wl[i]! * o.send; r[i] = dry.r[i]! + wr[i]! * o.send; }
  return { l, r };
}

async function voiceStem(spec: VideoSpec, total: number, work: string): Promise<Float32Array> {
  const n = spec.narration;
  if (!n) return new Float32Array(Math.round(total * SR));
  // Approved take (committed) or the draft from the narration cache (npm run voice).
  const { dir, take } = narrationSource(spec.id, n);
  const { placed, problems } = placeNarration(n, Object.fromEntries(take.lines.map((l) => [l.id, l.duration])), total);
  if (problems.length) throw new Error(`narration placement: ${problems.join('; ')}`);
  const mono = new Float32Array(Math.round(total * SR));
  for (const p of placed) {
    const line = take.lines.find((l) => l.id === p.id)!;
    const tmp = path.join(work, `voice-${p.id}.wav`);
    const r = await ff('ffmpeg', ['-hide_banner', '-y', '-v', 'error', '-i', path.join(dir, line.file), '-af', 'aresample=48000:filter_size=64:cutoff=0.97', '-c:a', 'pcm_s16le', tmp]);
    if (r.code !== 0) throw new Error(`resample ${p.id}: ${r.stderr.slice(-300)}`);
    const w = readWav(tmp);
    const start = Math.round(p.start * SR);
    for (let i = 0; i < w.samples.length && start + i < mono.length; i++) mono[start + i]! += w.samples[i]!;
  }
  const hp = highpass(mono, SR, VOICE_CHAIN.highpassHz);
  const raw = await loudnessOf({ l: hp, r: hp }, path.join(work, 'voice-raw.wav'));
  const c = VOICE_CHAIN.compressor;
  const comp = compress(hp, SR, { thresholdDb: raw.integratedLufs - 3.01 + c.thresholdAboveLufs, ratio: c.ratio, kneeDb: c.kneeDb, attackMs: c.attackMs, releaseMs: c.releaseMs });
  const lc = await loudnessOf({ l: comp, r: comp }, path.join(work, 'voice-comp.wav'));
  const g = 10 ** ((MIX.voiceLufs - lc.integratedLufs) / 20);
  return comp.map((v) => v * g);
}

function musicDry(sampler: Sampler, score: ScoreSpec, cues: Record<string, number>, total: number): { bus: Stereo; notes: number } {
  const bus = silence(total);
  const rand = rng(2026);
  let count = 0;
  for (const n of score.notes) {
    let t = resolveTime(n.at, cues, score);
    let vel = n.vel;
    if (n.humanize) {
      t += (rand() - 0.5) * 0.014;
      vel += (rand() - 0.5) * 2.4;
    }
    const hold = n.beats === undefined ? undefined : n.beats * beatSeconds(score.bpm);
    // Chords roll slightly low → high (a pianist's hand), panned by register.
    [...n.notes].sort((a, b) => midi(a) - midi(b)).forEach((note, k) => {
      const m = midi(note);
      const pan = n.inst === 'piano' ? Math.max(-0.45, Math.min(0.45, (m - 62) / 40)) : n.inst === 'vibes' ? 0.18 : -0.2;
      addAt(bus, sampler.note(n.inst, note, vel, hold), t + k * 0.008, 0, pan);
      count++;
    });
  }
  // Fade to silence at the end (cosine).
  const a = Math.round(score.fadeOut.from * SR), b = Math.min(bus.l.length, Math.round(score.fadeOut.to * SR));
  for (let i = a; i < bus.l.length; i++) {
    const k = i >= b ? 0 : 0.5 * (1 + Math.cos((Math.PI * (i - a)) / (b - a)));
    bus.l[i] = bus.l[i]! * k;
    bus.r[i] = bus.r[i]! * k;
  }
  return { bus, notes: count };
}

/** The video's score: hand-written (spec.score) or composed from its plan (spec.audio.compose). */
export function scoreOf(spec: VideoSpec, cues: Readonly<Record<string, number>>, total: number): ScoreSpec | null {
  if (spec.score) return spec.score;
  if (spec.audio?.compose) return composeScore(spec.audio.compose, cues, total);
  return null;
}

export async function renderMix(spec: VideoSpec, workDir: string): Promise<{ mix: Stereo; stems: { voice: Stereo; music: Stereo; sfx: Stereo }; report: MixReport }> {
  mkdirSync(workDir, { recursive: true });
  const timeline = computeTimeline(spec, 30);
  const total = timeline.totalFrames / timeline.fps;
  const cues = cueSeconds(timeline);
  const score = scoreOf(spec, cues, total);
  if (score) {
    const errs = validateScore(score, cues, total);
    if (errs.length) throw new Error(`${spec.id}: score: ${errs.join('; ')}`);
  }
  const sampler = new Sampler();

  const vMono = await voiceStem(spec, total, workDir);
  const voice: Stereo = { l: vMono, r: vMono.slice() };

  const { bus, notes } = score ? musicDry(sampler, score, cues, total) : { bus: silence(total), notes: 0 };
  let music = reverb(bus, MIX.musicReverb);
  if (score) {
    const ml = await loudnessOf(music, path.join(workDir, 'music-raw.wav'));
    music = scale(music, MIX.musicLufs - ml.integratedLufs);
  }
  const key = envelopeDb(vMono, SR, 5, 120);
  const duck = duckGain(key, SR, MIX.duck);
  music = { l: music.l.map((v, i) => v * duck[i]!), r: music.r.map((v, i) => v * duck[i]!) };

  const events = sfxEvents(spec, timeline);
  const sfxDry = silence(total);
  for (const e of events) {
    const b = buildSound(sampler, e);
    addAt(sfxDry, b.s, e.t - b.lead);
  }
  const sfx = reverb(sfxDry, MIX.sfxReverb);

  const sum: Stereo = silence(total);
  for (let i = 0; i < sum.l.length; i++) {
    sum.l[i] = voice.l[i]! + music.l[i]! + sfx.l[i]!;
    sum.r[i] = voice.r[i]! + music.r[i]! + sfx.r[i]!;
  }

  // Master: gain → linked limiter → measure; iterate onto the target.
  let gainDb = 0;
  let out = sum;
  let loud: Loudness = await loudnessOf(sum, path.join(workDir, 'master.wav'));
  gainDb = MIX.targetLufs - loud.integratedLufs;
  let iterations = 0;
  while (iterations < 6) {
    iterations++;
    const pre = scale(sum, gainDb);
    const peak = new Float32Array(pre.l.length);
    for (let i = 0; i < peak.length; i++) peak[i] = Math.max(Math.abs(pre.l[i]!), Math.abs(pre.r[i]!));
    const g = limiterGain(peak, SR, { ceilingDb: MIX.ceilingDb, attackMs: 1.5, releaseMs: 80 });
    out = { l: pre.l.map((v, i) => v * g[i]!), r: pre.r.map((v, i) => v * g[i]!) };
    const fade = Math.round((MIX.edgeFadeMs / 1000) * SR);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      out.l[i] = out.l[i]! * k; out.r[i] = out.r[i]! * k;
      const j = out.l.length - 1 - i;
      out.l[j] = out.l[j]! * k; out.r[j] = out.r[j]! * k;
    }
    loud = await loudnessOf(out, path.join(workDir, 'master.wav'));
    const miss = MIX.targetLufs - loud.integratedLufs;
    if (Math.abs(miss) < 0.1) break;
    gainDb += miss;
  }

  const stems = { voice, music, sfx };
  const report: MixReport = {
    durationSeconds: total,
    stems: {
      voice: await loudnessOf(voice, path.join(workDir, 'stem-voice.wav')),
      music: await loudnessOf(music, path.join(workDir, 'stem-music.wav')),
      sfx: await loudnessOf(sfx, path.join(workDir, 'stem-sfx.wav')),
    },
    master: { ...loud, iterations, masterGainDb: gainDb },
    sfxEvents: events,
    notes,
  };
  return { mix: out, stems, report };
}

export { writeStereo };
