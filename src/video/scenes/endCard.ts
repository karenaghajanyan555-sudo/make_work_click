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
  beats?: Partial<EndCardBeats>;
};

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
  return errors;
}
