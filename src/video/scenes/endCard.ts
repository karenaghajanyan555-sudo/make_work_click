/**
 * Scene type "endCard" — the brand lockup every video ends on (pure model).
 *
 * The hero switch (already on screen, off — handed over by the previous scene or
 * appearing on its own) clicks on: the brand signature. The MAKE WORK CLICK wordmark
 * sets beneath it, then one CTA line. Holds still so it reads and loops cleanly.
 */

export type EndCardBeats = {
  /** The hero switch clicks on. */
  click: number;
  /** Wordmark starts setting. */
  wordmark: number;
  /** CTA line starts entering. */
  cta: number;
};

export type EndCardProps = {
  /** CTA phrase markup (src/captions/phrase.ts), e.g. "Follow for more *systems* like this." */
  cta: string;
  /** True when the previous scene hands over the switch already in place (no entrance). */
  switchHandedOver?: boolean;
  /** The click sends a wide shockwave and the lockup settles in on a slow push. */
  burst?: boolean;
  /**
   * Premium motion (opt-in, v003+): the click blooms in soft light (neutral bloom, tight lime
   * core) instead of a flash + shockwave, the wordmark rises into focus word by word on a
   * gentle curve instead of popping out of a mask, and the lockup holds still (no push on type).
   */
  smooth?: boolean;
  /**
   * Affiliate videos only (D42): the "Ad" tag under the CTA, entering with it and held to the
   * end. Set by defineVideo from `spec.affiliate` (src/video/affiliate.ts); never hand-written.
   */
  disclosure?: { label: string; text: string };
  beats?: Partial<EndCardBeats>;
};

/** House rule (judgement): the disclosure stays on screen long enough to be read (~12 words). */
export const DISCLOSURE_READ_SECONDS = 2.4;
/**
 * The tag enters this long after the CTA starts: with the CTA's later words (where the partner
 * is named; words set ~0.1 s apart), not before the message itself has started to read.
 */
export const DISCLOSURE_DELAY = 0.45;

/** When the ad tag starts entering (scene seconds). */
export const disclosureAt = (b: EndCardBeats) => b.cta + DISCLOSURE_DELAY;

export const END_CARD_DEFAULT_BEATS: EndCardBeats = { click: 0.15, wordmark: 0.4, cta: 0.95 };

/**
 * Lockup composition (base units, centred). Shared with scenes that hand the switch over
 * (flowRun converges onto `switchCx/switchCy` at `switchHeight`).
 */
export const END_CARD_LAYOUT = {
  switchHeight: 116,
  switchCx: 540,
  switchCy: 600,
  wordmarkTop: 720,
  ruleTop: 842,
  ctaTop: 880,
  ctaLines: 2,
  /** The ad disclosure (affiliate videos): under a two-line CTA, ≤ 2 lines, above the safe bottom (1248). */
  disclosureTop: 1052,
  disclosureLines: 2,
} as const;

export function endCardBeats(props: EndCardProps): EndCardBeats {
  return { ...END_CARD_DEFAULT_BEATS, ...props.beats };
}

export function endCardCuePoints(props: EndCardProps): Record<string, number> {
  const b = endCardBeats(props);
  return { start: 0, click: b.click, wordmark: b.wordmark, cta: b.cta };
}

export function validateEndCard(props: EndCardProps, duration: number): string[] {
  const errors: string[] = [];
  const b = endCardBeats(props);
  if (!props.cta.trim()) errors.push('cta is empty');
  if (!(b.click >= 0 && b.click <= b.wordmark && b.wordmark <= b.cta)) errors.push('beats must be ordered: click ≤ wordmark ≤ cta');
  if (b.cta + 1.2 > duration) errors.push(`the CTA needs ≥ 1.2 s on screen (enters ${b.cta}s, scene ends ${duration}s)`);
  if (props.disclosure) {
    if (!props.disclosure.label.trim() || !props.disclosure.text.trim()) errors.push('disclosure: label and text are required');
    if (disclosureAt(b) + DISCLOSURE_READ_SECONDS > duration + 1e-9) errors.push(`the ad disclosure needs ≥ ${DISCLOSURE_READ_SECONDS} s on screen (enters at ${disclosureAt(b).toFixed(2)}s, scene ends ${duration}s)`);
  }
  return errors;
}
