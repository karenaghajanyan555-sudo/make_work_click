/**
 * The narrator is one brand identity across every video (docs/SOUND.md).
 * Changing NARRATOR is a brand decision: record it in docs/DECISIONS.md, never silently.
 */

/** A Kokoro voice id, or a weighted mix of voice ids (weights are normalised). */
export type VoiceId = string | { mix: Array<[string, number]> };

export type VoiceSpec = {
  /** Short label used in file names and reports. */
  label: string;
  voice: VoiceId;
  /** Kokoro speed multiplier (1 = model default). */
  speed: number;
  /** Seed for Kokoro's decoder noise → reproducible takes on the same machine. */
  seed: number;
};

/**
 * The approved narrator — picked by the user 2026-11-16 from audition round 2 ("this is it,
 * always keep this version, it is gold"): af_bella 60 % + af_nicole 40 %, speed 1.0, seed 7.
 * Reproduces take-01 byte-for-byte on the reference machine (docs/DECISIONS.md D18).
 */
export const NARRATOR: VoiceSpec | null = {
  label: 'bella-nicole-v1',
  voice: { mix: [['af_bella', 0.6], ['af_nicole', 0.4]] },
  speed: 1.0,
  seed: 7,
};

/**
 * Challengers for the next audition (empty = none running). `npm run voices` always
 * includes NARRATOR first as the reference. History of rounds 1–2: DECISIONS D14, D17.
 */
export const NARRATOR_CANDIDATES: readonly VoiceSpec[] = [];
