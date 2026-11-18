/**
 * A partner's publishing record (pure types + link building): everything an affiliate package
 * states about the partner, each fact with its status and source. Data lives in
 * content/affiliate/<partner>.ts, outside the render inputs, so a re-check never re-renders a video.
 */
import { PARTNERS, type PartnerId } from '../brand/partners.ts';
import { factProblems, factsForPage, type Claim, type Fact } from './model.ts';
import type { PlatformId } from './platforms.ts';

export type PartnerRecord = {
  partner: PartnerId;
  /** Claim bank: product facts a video or caption may state, by id (spec.affiliate.claims). */
  claims: Record<string, Claim>;
  /** Affiliate link rules: how the link must be written, where the ID lives (requirement 2). */
  link: Fact[];
  /** Per-platform source tags (requirement 3). */
  tracking: {
    /** URL parameter the partner documents for a traffic-source tag (`&tk=instagram`). */
    param: string;
    tags: Record<PlatformId, string>;
    facts: Fact[];
    /** What a link test looks for in the response (cookies the partner sets for a click). */
    test?: { affiliateCookie: string; tagCookie?: string };
  };
  /** Commission, payout, attribution (requirement 4). */
  program: Fact[];
  /** Free-plan limits and payment-processor requirements, incl. what a buyer must set up (requirement 7). */
  plan: Fact[];
  /** Owner's account settings to confirm before posting. */
  account: Fact[];
  /** Assumptions nobody has checked. */
  assumptions: Fact[];
};

/** The record as one video's package sees it: every fact list narrowed to the video's page (Fact.pages). */
export function recordForPage(r: PartnerRecord, page: string | undefined): PartnerRecord {
  return {
    ...r,
    link: factsForPage(r.link, page),
    tracking: { ...r.tracking, facts: factsForPage(r.tracking.facts, page) },
    program: factsForPage(r.program, page),
    plan: factsForPage(r.plan, page),
    account: factsForPage(r.account, page),
    assumptions: factsForPage(r.assumptions, page),
  };
}

/** Affiliate ID from the partner's link (the `sa`-style parameter's value). */
export function affiliateId(partner: PartnerId): { param: string; id: string } {
  const u = new URL(PARTNERS[partner].link);
  const [param, id] = [...u.searchParams.entries()][0] ?? [];
  if (!param || !id) throw new Error(`${partner}: link has no affiliate parameter`);
  return { param, id };
}

/** The bio link for one platform: the deep link (or home link) with the platform's source tag. */
export function platformLink(r: PartnerRecord, platform: PlatformId, page?: string): string {
  const p = PARTNERS[r.partner];
  const base = page && 'pageLink' in p && p.pageLink ? p.pageLink.replace('{page}', page) : p.link;
  const u = new URL(base);
  u.searchParams.set(r.tracking.param, r.tracking.tags[platform]);
  return u.toString();
}

export function recordProblems(r: PartnerRecord): string[] {
  const e = [
    ...factProblems(r.link, `${r.partner}.link`),
    ...factProblems(r.tracking.facts, `${r.partner}.tracking`),
    ...factProblems(r.program, `${r.partner}.program`),
    ...factProblems(r.plan, `${r.partner}.plan`),
    ...factProblems(r.account, `${r.partner}.account`),
    ...factProblems(r.assumptions, `${r.partner}.assumptions`),
  ];
  for (const f of r.assumptions) if (f.status !== 'unverified') e.push(`${r.partner}.assumptions: "${f.id}" must be unverified`);
  for (const f of r.account) if (f.status !== 'account') e.push(`${r.partner}.account: "${f.id}" must be account`);
  for (const [id, c] of Object.entries(r.claims)) {
    if (!/^[a-z0-9.-]+$/.test(id)) e.push(`${r.partner}.claims: id "${id}" (lowercase, digits, dots, dashes)`);
    if (!c.source.quote.trim() || !/^https:\/\//.test(c.source.url)) e.push(`${r.partner}.claims.${id}: quote and https url required`);
  }
  const tags = Object.values(r.tracking.tags);
  if (new Set(tags).size !== tags.length) e.push(`${r.partner}.tracking: each platform needs its own tag`);
  for (const t of tags) if (!/^[a-z0-9_-]{1,40}$/.test(t)) e.push(`${r.partner}.tracking: tag "${t}" must be a plain URL-safe word`);
  return e;
}
