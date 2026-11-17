/**
 * Sound model (pure, JSON-compatible): an original score per video (content/scores/<id>.ts)
 * and the generic sound-effect map driven by scene cues. Rendering: src/pipeline/sound/.
 * Rules: docs/SOUND.md.
 */
import { sceneModel } from '../video/scenes/registry.ts';
import { sceneCuePoints, type VideoSpec } from '../video/spec.ts';
import type { Timeline } from '../video/timeline.ts';
import type { SfxEvent } from './effects.ts';

export type { SfxEvent, SfxId } from './effects.ts';

export type Instrument = 'piano' | 'vibes' | 'chime';

/** A time on the video: a timeline cue (+ offset s), or a bar/beat on the score grid. */
export type ScoreTime = { cue: string; offset?: number } | { bar: number; beat: number };

export type ScoreNote = {
  at: ScoreTime;
  inst: Instrument;
  /** One or more note names, struck together (e.g. ["D2", "A2"]). */
  notes: string[];
  /** Level in dB relative to the instrument's normalised sample (≤ 0). */
  vel: number;
  /** How long it is held before its release (beats). Default: rings out. */
  beats?: number;
  /** Small seeded timing/level variation, so repeated figures never sound mechanical. */
  humanize?: boolean;
};

export type ScoreSpec = {
  bpm: number;
  /** Cue that is bar 1, beat 1 of the grid (the music "lands" there). */
  anchor: string;
  notes: ScoreNote[];
  /** Video seconds over which the music fades to silence at the end. */
  fadeOut: { from: number; to: number };
};


/** Seconds per beat. */
export const beatSeconds = (bpm: number) => 60 / bpm;

export function cueSeconds(timeline: Timeline): Record<string, number> {
  return Object.fromEntries(Object.entries(timeline.cues).map(([k, f]) => [k, f / timeline.fps]));
}

export function resolveTime(t: ScoreTime, cues: Readonly<Record<string, number>>, score: Pick<ScoreSpec, 'bpm' | 'anchor'>): number {
  if ('cue' in t) {
    const c = cues[t.cue];
    if (c === undefined) throw new Error(`score: unknown cue "${t.cue}"`);
    return c + (t.offset ?? 0);
  }
  const anchor = cues[score.anchor];
  if (anchor === undefined) throw new Error(`score: unknown anchor cue "${score.anchor}"`);
  return anchor + ((t.bar - 1) * 4 + (t.beat - 1)) * beatSeconds(score.bpm);
}

export function validateScore(score: ScoreSpec, cues: Readonly<Record<string, number>>, totalSeconds: number): string[] {
  const errors: string[] = [];
  if (!(score.bpm >= 40 && score.bpm <= 200)) errors.push('bpm out of range');
  if (cues[score.anchor] === undefined) errors.push(`anchor cue "${score.anchor}" does not exist`);
  score.notes.forEach((n, i) => {
    try {
      const t = resolveTime(n.at, cues, score);
      if (t < 0 || t > totalSeconds) errors.push(`note ${i} at ${t.toFixed(2)}s is outside the video`);
    } catch (e) {
      errors.push(`note ${i}: ${(e as Error).message}`);
    }
    if (n.vel > 0) errors.push(`note ${i}: vel must be ≤ 0 dB`);
  });
  if (!(score.fadeOut.from < score.fadeOut.to && score.fadeOut.to <= totalSeconds + 1e-9)) errors.push('fadeOut must end within the video');
  return errors;
}

/**
 * Sound effects for a whole video: each scene model names which of its cues make which
 * sound (SceneModel.sounds), so a new video built from library scenes gets its effects for
 * free. Clicks are numbered across the video (the first click of a video sounds brighter).
 */
export function sfxEvents(spec: VideoSpec, timeline: Timeline): SfxEvent[] {
  if (spec.audio?.sfx === false) return [];
  const s = cueSeconds(timeline);
  const out: SfxEvent[] = [];
  let clicks = 0;
  for (const scene of spec.scenes) {
    const local = sceneCuePoints(scene);
    for (const snd of [...sceneModel(scene).sounds(scene.props as never, local), ...(scene.sounds ?? [])]) {
      const t = s[`${scene.id}.${snd.cue}`];
      if (t === undefined) continue;
      out.push({ t, id: snd.id, variant: snd.id === 'click' ? clicks++ : (snd.variant ?? 0) });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
