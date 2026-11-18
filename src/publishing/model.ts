/**
 * Publishing facts (pure). Every statement a publishing package makes carries one of four
 * statuses, so the person posting can tell what was checked from what they still have to do:
 *
 *   verified    an official source says it (exact quote, URL, date); re-checked by
 *               `npm run verify-affiliate` where the page can be fetched
 *   account     depends on the owner's own account (an ID, a payout method, eligibility):
 *               confirm it there, we cannot see it
 *   configure   works only after extra setup, by the owner or by the viewer who signs up
 *   unverified  an assumption: nobody has checked it
 *
 * "Tested" is never written by hand: it appears in a package only from a verification run's own
 * record (verification.json: the request, the response, the date). Rules: docs/QA.md § Gate 3.
 */

export type FactStatus = 'verified' | 'account' | 'configure' | 'unverified';

export type Source = {
  url: string;
  /** Verbatim from the page (matched ignoring case, spacing, quote marks and dashes). */
  quote: string;
  /**
   * How the verifier reads the page: `raw` HTML, `rendered` in headless Chrome (client-side
   * pages; `click` opens a collapsed section first), or `manual` (cannot be fetched: re-check by
   * hand when older than MANUAL_FACT_MAX_DAYS).
   */
  method: 'raw' | 'rendered' | 'manual';
  click?: string;
  /** Last check by a person (YYYY-MM-DD). Runs record their own dates. */
  checked: string;
  /**
   * The automatic check flags a negation word in the quote's sentence. When a person has read the
   * sentence and the word belongs to another clause, record it here: the run then accepts that one
   * word (and says so in the package); any other negation still fails.
   */
  negationReviewed?: { word: string; why: string };
};

export type Fact = {
  id: string;
  /** The fact, worded no stronger than its source (the verifier compares its terms with the passage). */
  text: string;
  status: FactStatus;
  /** Required for `verified`; optional documentation for the others. */
  source?: Source;
  /** Where to confirm it, or the steps to set it up (account / configure), or what to do. */
  how?: string;
  /**
   * Opt-in scope (v009): the fact belongs only to packages of videos whose `spec.affiliate.page` is
   * one of these (a booking setup step has no place in a course video's package). Omit: every video.
   */
  pages?: string[];
};

/** The facts that belong to a video's package: unscoped ones, plus those scoped to its page. */
export const factsForPage = <F extends Fact>(facts: readonly F[], page: string | undefined): F[] => facts.filter((f) => !f.pages || (page !== undefined && f.pages.includes(page)));

/** A product claim a video or its caption states (the partner's claim bank). Always `verified`. */
export type Claim = { text: string; source: Source };

/** Older than this, a verification run no longer counts (prices and limits change). */
export const VERIFICATION_MAX_DAYS = 7;
/** Older than this, a fact that can only be checked by hand is flagged for a re-check. */
export const MANUAL_FACT_MAX_DAYS = 30;

export const STATUS_LABEL: Record<FactStatus, string> = {
  verified: 'Verified',
  account: 'Confirm in your account',
  configure: 'Needs configuration',
  unverified: 'Unverified',
};

/** Problems with a list of facts as data (tests and the verifier call it). */
export function factProblems(facts: readonly Fact[], where: string): string[] {
  const e: string[] = [];
  const ids = new Set<string>();
  for (const f of facts) {
    if (ids.has(f.id)) e.push(`${where}: fact id "${f.id}" is repeated`);
    ids.add(f.id);
    if (f.status === 'verified' && !f.source) e.push(`${where}: "${f.id}" is verified but has no source`);
    if ((f.status === 'account' || f.status === 'configure') && !f.how) e.push(`${where}: "${f.id}" (${f.status}) needs "how": where to confirm or how to set it up`);
    if (f.source && !/^\d{4}-\d{2}-\d{2}$/.test(f.source.checked)) e.push(`${where}: "${f.id}" source.checked must be YYYY-MM-DD`);
    if (f.source && !/^https:\/\//.test(f.source.url)) e.push(`${where}: "${f.id}" source.url must be https`);
  }
  return e;
}

export const daysBetween = (fromIso: string, to: Date) => (to.getTime() - new Date(fromIso).getTime()) / 86_400_000;
