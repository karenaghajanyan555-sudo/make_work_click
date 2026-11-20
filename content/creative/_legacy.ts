/**
 * Shared facts for the creative records of videos made before D46 (2026-11-18 audit,
 * docs/growth/AUDIT.md). Only what was seen or written at the time — nothing is invented:
 * no alternative directions, review answers or hypotheses were recorded for these videos,
 * so those stay `unknown`.
 */
import type { Fact, Kinded } from '../../src/creative/diversity.ts';

export const SHEETS = 'QA contact sheets out/<id>/qa/sheet.png, read in the 2026-11-18 audit';

/** All six open the same way (sheets of v002, v004, v008 viewed; the others use the same scene types). */
export const headlineOverChaos = (source: string): Fact<Kinded> => ({
  basis: 'observed',
  value: { kind: 'headline-over-chaos', description: 'A headline typing in on the dark ground over faint, scattered to-do cards; little else moves for ~3 s.' },
  source,
});

export const transformation = (source: string): Fact<Kinded> => ({
  basis: 'observed',
  value: { kind: 'transformation', description: 'Problem (to-dos) → the system → it runs → to-dos resolved → brand.' },
  source,
});

export const lockup = (ad: boolean, source: string): Fact<Kinded> => ({
  basis: 'observed',
  value: ad
    ? { kind: 'brand-lockup-ad', description: 'Switch click, wordmark, "The tool I’d use" CTA and the Ad tag; ~4 s.' }
    : { kind: 'brand-lockup-cta', description: 'Switch click, wordmark, "Follow for more systems like this."; ~3–4 s.' },
  source,
});

export const NOT_RECORDED = {
  directions: { basis: 'unknown', note: 'no record of alternative creative directions was kept' },
  review: { basis: 'unknown', note: 'made before the creative review existed' },
  hypothesis: { basis: 'unknown', note: 'no audience hypothesis was written before posting' },
} as const;
