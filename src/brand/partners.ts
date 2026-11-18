/**
 * Affiliate partners: programs the owner joined and approved for promotion (pure data).
 *
 * A video promotes a partner only through `spec.affiliate` (src/video/affiliate.ts). That one
 * field puts the disclosure everywhere it is required: the "Ad" tag on the end card, the first
 * line of the caption, the per-platform settings and the bio line on the post sheet. A video
 * without it may not name any partner at all (validation). Knowledge videos stay untouched.
 *
 * Adding a partner: research doc first (docs/affiliate/<id>.md: terms, claim bank with exact
 * quotes, rules), then an entry here, then the owner's approval (docs/STATUS.md).
 * The link goes in the bio only: never in a caption, never on screen.
 */
export type Partner = {
  /** How the name is written on screen and in captions ("systeme.io"). */
  name: string;
  /**
   * Every way of writing the name that counts as naming the partner, as words. Matching
   * ignores case and punctuation ("systeme.io", "Systeme IO" and "systeme" all match "systeme").
   */
  aliases: string[];
  /** The affiliate link (bio only). */
  link: string;
  /** Deep link to one of the partner's pages: `{page}` becomes the page path (spec.affiliate.page). */
  pageLink?: string;
  /** What the program pays (for the post sheet; never stated to viewers). */
  terms: string;
  /** Research: terms, rules, claim bank. */
  research: string;
  /** When the terms and the research were last checked. Re-check before each video. */
  checked: string;
};

export const PARTNERS = {
  'systeme-io': {
    name: 'systeme.io',
    aliases: ['systeme'],
    link: 'https://systeme.io/?sa=sa0286549007496fe803218a3f1a238a9bf66cc091',
    pageLink: 'https://systeme.io/{page}?sa=sa0286549007496fe803218a3f1a238a9bf66cc091',
    terms: '60% lifetime recurring commission; counts only after the viewer opens a free account through the link',
    research: 'docs/affiliate/systeme-io.md',
    checked: '2026-11-18',
  },
} as const satisfies Record<string, Partner>;

export type PartnerId = keyof typeof PARTNERS;

export const isPartnerId = (id: string): id is PartnerId => Object.hasOwn(PARTNERS, id);
