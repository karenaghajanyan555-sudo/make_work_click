/**
 * Score composer (pure): turns a short plan — a harmonic preset and which section starts
 * at which cue — into an original ScoreSpec. A new video gets music that follows its own
 * story without writing notes by hand; a hand-written score (content/scores/) still wins
 * when a video deserves one (v001).
 *
 * Sections, each starting at a cue and running to the next:
 *   intro  unresolved: a low open fifth and a slow falling line (the problem)
 *   pulse  broken-chord eighths through the progression, one chord per bar (the system runs)
 *   lift   pulse + a two-note vibraphone figure at its start (a high point)
 *   hold   the pulse stops; one held chord, a suspended one a bar later (the resolution)
 *   home   the home chord with vibraphone and chime on the cue (the final click)
 * Bar 1 sits on `anchor` (usually the first click), where the home voicing lands.
 * Every note stays within ±3 semitones of a recorded sample (tests check it).
 */
import type { ScoreNote, ScoreSpec } from './score.ts';

type Chord = { bass: string; mid: string[]; pulse: string[] };
export type HarmonyPreset = {
  bpm: number;
  /** One chord per bar, cycled. */
  progression: Chord[];
  /** Full voicing struck on bar 1 (the anchor). */
  arrival: string[];
  intro: { fifth: string[]; line: string[] };
  hold: [string[], string[]];
  home: { piano: string[]; vibes: string; chime: string };
  lift: [string, string];
};

export const HARMONY = {
  /** D major, 96 BPM: warm and clear (the v001 palette). */
  clarity: {
    bpm: 96,
    progression: [
      { bass: 'D2', mid: ['A3', 'E4'], pulse: ['D4', 'A4', 'E5', 'A4', 'F#4', 'A4', 'E5', 'A4'] },
      { bass: 'C#2', mid: ['A3', 'E4'], pulse: ['E4', 'A4', 'C#5', 'A4', 'E4', 'A4', 'E5', 'A4'] },
      { bass: 'B1', mid: ['F#3', 'A3'], pulse: ['D4', 'F#4', 'B4', 'F#4', 'D4', 'A4', 'B4', 'F#4'] },
      { bass: 'G1', mid: ['D3', 'B3'], pulse: ['D4', 'G4', 'B4', 'G4', 'F#4', 'G4', 'D5', 'G4'] },
    ],
    arrival: ['D2', 'A2', 'F#3', 'A3', 'E4', 'D5'],
    intro: { fifth: ['B1', 'F#2'], line: ['F#5', 'E5', 'D5', 'C#5'] },
    hold: [['F#1', 'A3', 'D4', 'F#4'], ['A2', 'D4', 'E4']],
    home: { piano: ['D2', 'A2', 'F#3', 'E4', 'A4'], vibes: 'D5', chime: 'D5' },
    lift: ['A4', 'D5'],
  },
  /** A minor → C, 90 BPM: cooler, focused, a little cinematic. */
  focus: {
    bpm: 90,
    progression: [
      { bass: 'A1', mid: ['E3', 'C4'], pulse: ['A3', 'E4', 'B4', 'E4', 'C4', 'E4', 'B4', 'E4'] },
      { bass: 'F1', mid: ['C3', 'A3'], pulse: ['F3', 'C4', 'E4', 'C4', 'A3', 'C4', 'G4', 'C4'] },
      { bass: 'C2', mid: ['G3', 'E4'], pulse: ['C4', 'G4', 'D5', 'G4', 'E4', 'G4', 'D5', 'G4'] },
      { bass: 'B1', mid: ['D3', 'G3'], pulse: ['D4', 'G4', 'B4', 'G4', 'D4', 'G4', 'A4', 'G4'] },
    ],
    arrival: ['A1', 'E2', 'C3', 'E3', 'B3', 'C4'],
    intro: { fifth: ['A1', 'E2'], line: ['E5', 'D5', 'C5', 'B4'] },
    hold: [['F1', 'A3', 'C4', 'E4'], ['G2', 'C4', 'D4']],
    home: { piano: ['C2', 'G2', 'E3', 'D4', 'G4'], vibes: 'C5', chime: 'G5' },
    lift: ['G4', 'C5'],
  },
} satisfies Record<string, HarmonyPreset>;

export type HarmonyName = keyof typeof HARMONY;
export type SectionStyle = 'intro' | 'pulse' | 'lift' | 'hold' | 'home';

export type ComposePlan = {
  harmony: HarmonyName;
  /** Cue that is bar 1 (the music lands here). */
  anchor: string;
  /** In time order; each runs until the next one starts. */
  sections: Array<{ at: string; style: SectionStyle }>;
  /** Seconds of fade at the very end. Default 1.1. */
  fadeOut?: number;
};

const PULSE_VEL = -25;

/** Compose the score. `cues` are video seconds (cueSeconds(timeline)). */
export function composeScore(plan: ComposePlan, cues: Readonly<Record<string, number>>, totalSeconds: number): ScoreSpec {
  const h: HarmonyPreset = HARMONY[plan.harmony];
  const beat = 60 / h.bpm;
  const bar = beat * 4;
  const anchor = cues[plan.anchor];
  if (anchor === undefined) throw new Error(`compose: unknown anchor cue "${plan.anchor}"`);
  const notes: ScoreNote[] = [];
  const at = (cue: string, offset = 0) => ({ cue, offset });
  const chordOf = (b: number) => h.progression[(((b - 1) % h.progression.length) + h.progression.length) % h.progression.length]!;

  plan.sections.forEach((sec, i) => {
    const start = cues[sec.at];
    if (start === undefined) throw new Error(`compose: unknown section cue "${sec.at}"`);
    const nextCue = plan.sections[i + 1]?.at;
    const end = nextCue === undefined ? totalSeconds : (cues[nextCue] ?? totalSeconds);
    switch (sec.style) {
      case 'intro': {
        notes.push({ at: at(sec.at, 0.1), inst: 'piano', notes: h.intro.fifth, vel: -12 });
        const span = Math.max(0.6, end - start - 0.4);
        h.intro.line.forEach((n, k) => {
          const t = 0.9 + (k * (span - 0.9)) / Math.max(1, h.intro.line.length - 1);
          if (t < end - start - 0.15) notes.push({ at: at(sec.at, t), inst: 'piano', notes: [n], vel: -23 + k * 0.5 });
        });
        break;
      }
      case 'pulse':
      case 'lift': {
        if (sec.style === 'lift') {
          notes.push({ at: at(sec.at, -0.08), inst: 'vibes', notes: [h.lift[0]], vel: -3 });
          notes.push({ at: at(sec.at, 0.24), inst: 'vibes', notes: [h.lift[1]], vel: -3 });
        }
        const firstBar = Math.ceil((start - anchor) / bar - 0.02) + 1;
        const barStart = (b: number) => anchor + (b - 1) * bar;
        // Entering mid-bar: mark the change on the cue itself.
        if (barStart(firstBar) - start > 0.3) {
          const c = chordOf(firstBar - 1);
          notes.push({ at: at(sec.at), inst: 'piano', notes: [c.bass], vel: -14 }, { at: at(sec.at), inst: 'piano', notes: c.mid, vel: -21 });
        }
        for (let b = firstBar; barStart(b) < end - 0.25; b++) {
          const c = chordOf(b);
          const arrival = b === 1;
          if (arrival) notes.push({ at: { bar: 1, beat: 1 }, inst: 'piano', notes: h.arrival, vel: -10 });
          else notes.push({ at: { bar: b, beat: 1 }, inst: 'piano', notes: [c.bass], vel: -14 }, { at: { bar: b, beat: 1 }, inst: 'piano', notes: c.mid, vel: -21 });
          c.pulse.forEach((n, k) => {
            const t = barStart(b) + k * (beat / 2);
            if ((arrival && k < 2) || t > end - 0.12) return;
            notes.push({ at: { bar: b, beat: 1 + k * 0.5 }, inst: 'piano', notes: [n], vel: PULSE_VEL, beats: 1.25, humanize: true });
          });
        }
        break;
      }
      case 'hold':
        notes.push({ at: at(sec.at), inst: 'piano', notes: h.hold[0], vel: -16 });
        if (end - start > bar + 0.4) notes.push({ at: at(sec.at, bar), inst: 'piano', notes: h.hold[1], vel: -19 });
        break;
      case 'home':
        notes.push(
          { at: at(sec.at), inst: 'piano', notes: h.home.piano, vel: -9 },
          { at: at(sec.at, 0.02), inst: 'vibes', notes: [h.home.vibes], vel: -6 },
          { at: at(sec.at, 0.05), inst: 'chime', notes: [h.home.chime], vel: -14 },
        );
        break;
    }
  });

  const fade = plan.fadeOut ?? 1.1;
  return { bpm: h.bpm, anchor: plan.anchor, notes, fadeOut: { from: Math.max(0, totalSeconds - fade), to: totalSeconds } };
}
