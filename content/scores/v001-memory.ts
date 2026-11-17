import type { ScoreNote, ScoreSpec } from '../../src/sound/score.ts';

/**
 * Original score for v001 — composed in-repo (docs/SOUND.md), played on CC0 recordings
 * (VCSL Steinway B, soft-mallet vibraphone, hand chimes). D major, 96 BPM.
 *
 * Shape:  unresolved, searching (by memory) → the click resolves it (bar 1 = hook.click)
 *         → a light broken-chord pulse while the system runs (D – A/C♯ – Bm7 – Gmaj7)
 *         → the vibraphone figure on "come back" → the pulse stops, one held chord while
 *         the to-dos tick off → Asus4 → the end-card click lands home on D(add9).
 */

const pulse = (bar: number, notes: string[], fromEighth = 0): ScoreNote[] =>
  notes.flatMap((n, k) => (k < fromEighth ? [] : [{ at: { bar, beat: 1 + k * 0.5 }, inst: 'piano' as const, notes: [n], vel: -25, beats: 1.25, humanize: true }]));

export const v001MemoryScore: ScoreSpec = {
  bpm: 96,
  anchor: 'hook.click',
  fadeOut: { from: 19.9, to: 21.0 },
  notes: [
    // 1 — By memory: low open fifth, then a descending line that never lands.
    { at: { cue: 'hook.start', offset: 0.1 }, inst: 'piano', notes: ['B1', 'F#2'], vel: -12 },
    { at: { cue: 'hook.start', offset: 1.25 }, inst: 'piano', notes: ['F#5'], vel: -23 },
    { at: { cue: 'hook.start', offset: 2.2 }, inst: 'piano', notes: ['E5'], vel: -23 },
    { at: { cue: 'hook.gather', offset: 0.2 }, inst: 'piano', notes: ['A2', 'E3'], vel: -17 },
    { at: { cue: 'hook.start', offset: 3.05 }, inst: 'piano', notes: ['D5'], vel: -22 },
    { at: { cue: 'hook.start', offset: 3.75 }, inst: 'piano', notes: ['C#5'], vel: -21 },

    // 2 — The click: home chord.
    { at: { bar: 1, beat: 1 }, inst: 'piano', notes: ['D2', 'A2', 'F#3', 'A3', 'E4', 'D5'], vel: -10 },
    ...pulse(1, ['D4', 'A4', 'E5', 'A4', 'F#4', 'A4', 'E5', 'A4'], 2),

    // 3 — Welcome: A/C♯.
    { at: { bar: 2, beat: 1 }, inst: 'piano', notes: ['C#2'], vel: -14 },
    { at: { bar: 2, beat: 1 }, inst: 'piano', notes: ['A3', 'E4'], vel: -21 },
    ...pulse(2, ['E4', 'A4', 'C#5', 'A4', 'E4', 'A4', 'E5', 'A4']),

    // 4 — Follow-up: Bm7.
    { at: { bar: 3, beat: 1 }, inst: 'piano', notes: ['B1'], vel: -13 },
    { at: { bar: 3, beat: 1 }, inst: 'piano', notes: ['F#3', 'A3'], vel: -21 },
    ...pulse(3, ['D4', 'F#4', 'B4', 'F#4', 'D4', 'A4', 'B4', 'F#4']),

    // 5 — Return: Gmaj7, and the figure on "come back".
    { at: { bar: 4, beat: 1 }, inst: 'piano', notes: ['G1'], vel: -13 },
    { at: { bar: 4, beat: 1 }, inst: 'piano', notes: ['D3', 'B3'], vel: -21 },
    ...pulse(4, ['D4', 'G4', 'B4', 'G4', 'F#4', 'G4', 'D5', 'G4']),
    { at: { cue: 'run.done3', offset: -0.08 }, inst: 'vibes', notes: ['A4'], vel: -3 },
    { at: { cue: 'run.done3', offset: 0.24 }, inst: 'vibes', notes: ['D5'], vel: -3 },

    // 6 — Remembered: the pulse stops; one held chord while the to-dos tick off.
    { at: { bar: 5, beat: 1 }, inst: 'piano', notes: ['F#1', 'A3', 'D4', 'F#4'], vel: -16 },
    { at: { bar: 6, beat: 1 }, inst: 'piano', notes: ['A2', 'D4', 'E4'], vel: -19 },

    // 7 — End card click: home, with the vibraphone and a chime on top.
    { at: { cue: 'end.click' }, inst: 'piano', notes: ['D2', 'A2', 'F#3', 'E4', 'A4'], vel: -9 },
    { at: { cue: 'end.click', offset: 0.02 }, inst: 'vibes', notes: ['D5'], vel: -6 },
    { at: { cue: 'end.click', offset: 0.05 }, inst: 'chime', notes: ['D5'], vel: -14 },
  ],
};
