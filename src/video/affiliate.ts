/**
 * Affiliate videos (pure): one opt-in spec field, `affiliate: { partner }`, and everything a
 * paid link legally and by platform policy needs follows from it. Rules and sources:
 * docs/affiliate/<partner>.md § 3, docs/PLATFORMS.md § Affiliate disclosure, decision D42.
 *
 *   on screen  the end card carries an "Ad" tag from the moment the CTA names the partner
 *              (applyAffiliate, called by defineVideo; the endCard renders it)
 *   caption    first line: "Ad: I earn a commission from <partner> through the link in my bio."
 *   posting    TikTok commercial content toggle, Instagram paid partnership label, the bio
 *              line "Paid link" next to the link (publish-pack)
 *
 * Teach first: the partner is named on the end card (and in the post copy) only. The body of
 * the video is the knowledge video, tool-agnostic, worth watching without the end card.
 * If the narration names the partner, the first line that does must also say the disclosure
 * (an endorsement made out loud needs a spoken disclosure: 16 CFR 255.0, "clearly and
 * conspicuously"). Videos without `affiliate` may not name any partner (validation), so a
 * paid relationship can never appear undisclosed.
 */
import { FORMATS } from '../brand/format.ts';
import { isPartnerId, PARTNERS, type Partner, type PartnerId } from '../brand/partners.ts';
import { DISCLOSURE_READ_SECONDS, disclosureAt, endCardBeats } from './scenes/endCard.ts';
import type { VideoSpec } from './spec.ts';

export type AffiliateSpec = {
  partner: PartnerId;
  /** Deep link: the partner page the bio link opens (`Partner.pageLink`), e.g. "booking-calendar". */
  page?: string;
  /**
   * Every partner fact the video and its caption state, as claim ids from the partner's claim bank
   * (content/affiliate/<partner>.ts). Required with publish copy: the publishing package re-checks
   * each one on the live page before it is built (docs/QA.md § Gate 3).
   */
  claims?: string[];
};

/** The on-screen tag: a short label in a pill, then one sentence. */
export type DisclosureTag = { label: string; text: string };

export type Disclosure = {
  partner: Partner;
  /** End-card tag. */
  screen: DisclosureTag;
  /** First line of the caption on every platform (before "more"). */
  caption: string;
  /** Text to put next to the link in the bio. */
  bio: string;
  /** The link for the bio (deep link when `page` is set). */
  link: string;
};

export function partnerOf(a: AffiliateSpec): Partner {
  if (!isPartnerId(a.partner)) throw new Error(`unknown affiliate partner "${a.partner}" (src/brand/partners.ts)`);
  return PARTNERS[a.partner];
}

export function disclosureFor(a: AffiliateSpec): Disclosure {
  const p = partnerOf(a);
  const link = a.page && p.pageLink ? p.pageLink.replace('{page}', a.page) : p.link;
  const sentence = `I earn a commission from ${p.name} through the link in my bio.`;
  return { partner: p, screen: { label: 'Ad', text: sentence }, caption: `Ad: ${sentence}`, bio: `Paid link: I earn a commission from ${p.name}`, link };
}

// ---------- naming a partner ----------

const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Does the text name the partner (any alias, as whole words, ignoring case and punctuation)? */
export function names(text: string, p: Partner): boolean {
  const ws = words(text);
  return p.aliases.some((alias) => {
    const a = words(alias);
    return ws.some((_, i) => a.every((w, k) => ws[i + k] === w));
  });
}

/** Every string inside a value (scene props), for naming checks. */
function strings(x: unknown, out: string[] = []): string[] {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) for (const v of x) strings(v, out);
  else if (x && typeof x === 'object') for (const v of Object.values(x)) strings(v, out);
  return out;
}

const COMMISSION = /\bcommissions?\b/i;

// ---------- the spec ----------

/**
 * The spec with the disclosure on its end card (no-op without `affiliate`). The end card is
 * the last scene, so it can simply hold longer: it lasts until the tag has been on screen
 * for DISCLOSURE_READ_SECONDS (whole frames).
 */
export function applyAffiliate<T extends Pick<VideoSpec, 'affiliate' | 'scenes' | 'format'>>(spec: T): T {
  if (!spec.affiliate || !isPartnerId(spec.affiliate.partner)) return spec;
  const last = spec.scenes[spec.scenes.length - 1];
  if (!last || last.type !== 'endCard') return spec;
  const props = { ...last.props, disclosure: disclosureFor(spec.affiliate).screen };
  const fps = FORMATS[spec.format].fps;
  const need = Math.ceil((disclosureAt(endCardBeats(props)) + DISCLOSURE_READ_SECONDS) * fps - 1e-6) / fps;
  return { ...spec, scenes: [...spec.scenes.slice(0, -1), { ...last, duration: Math.max(last.duration, need), props }] };
}

export function validateAffiliate(spec: VideoSpec): string[] {
  const e: string[] = [];
  const lines = spec.narration?.lines ?? [];
  const pub = spec.publish ? [spec.publish.title, spec.publish.caption, ...spec.publish.hashtags] : [];
  const last = spec.scenes[spec.scenes.length - 1];

  if (!spec.affiliate) {
    for (const [id, p] of Object.entries(PARTNERS) as Array<[PartnerId, Partner]>) {
      const where = [
        ...lines.filter((l) => names(`${l.text} ${l.caption ?? ''}`, p)).map((l) => `narration "${l.id}"`),
        ...spec.scenes.filter((s) => strings(s.props).some((t) => names(t, p))).map((s) => `scene "${s.id}"`),
        ...(pub.some((t) => names(t, p)) ? ['publish copy'] : []),
      ];
      if (where.length) e.push(`${where.join(', ')} names ${p.name}, a paid partner: only an affiliate video (affiliate: { partner: '${id}' }) may name it, with the disclosure`);
    }
    for (const s of spec.scenes) if (s.type === 'endCard' && s.props.disclosure) e.push(`scene "${s.id}": an ad disclosure on a video without affiliate`);
    return e;
  }

  if (!isPartnerId(spec.affiliate.partner)) return [`affiliate.partner "${spec.affiliate.partner}" is not a partner (src/brand/partners.ts: ${Object.keys(PARTNERS).join(', ')})`];
  const d = disclosureFor(spec.affiliate);
  const p = d.partner;
  if (spec.publish && !spec.affiliate.claims?.length) e.push(`affiliate.claims: list the ${p.name} facts this video and its caption state (claim ids from content/affiliate/${spec.affiliate.partner}.ts); the publishing package re-checks each one`);
  if (spec.affiliate.claims && new Set(spec.affiliate.claims).size !== spec.affiliate.claims.length) e.push('affiliate.claims: a claim id is repeated');
  if (spec.affiliate.page !== undefined) {
    if (!p.pageLink) e.push(`affiliate.page: ${p.name} has no deep links (pageLink)`);
    if (!/^[a-z0-9][a-z0-9/-]*$/.test(spec.affiliate.page)) e.push(`affiliate.page "${spec.affiliate.page}" must be a page path like "booking-calendar"`);
  }

  // On screen: the end card carries the tag, exactly as derived from the partner.
  if (!last || last.type !== 'endCard') e.push('an affiliate video ends on an endCard: the end card carries the "Ad" disclosure');
  else if (JSON.stringify(last.props.disclosure) !== JSON.stringify(d.screen)) e.push(`scene "${last.id}": the end card must carry the disclosure ${JSON.stringify(d.screen)} (defineVideo adds it; a spec written without defineVideo: applyAffiliate)`);
  for (const s of spec.scenes.slice(0, -1)) if (s.type === 'endCard' && s.props.disclosure) e.push(`scene "${s.id}": the disclosure belongs on the last scene`);

  // Spoken: the first line that names the partner says the disclosure too.
  const first = lines.find((l) => names(l.text, p));
  if (first && !COMMISSION.test(first.text)) e.push(`narration "${first.id}" names ${p.name} without the spoken disclosure: say it in that line (e.g. "Full disclosure: I earn a commission from ${p.name}.")`);

  // Teach first: no partner on screen before the end card, unless the voice disclosed it.
  if (!first) {
    for (const s of spec.scenes.slice(0, -1)) {
      if (strings(s.props).some((t) => names(t, p))) e.push(`scene "${s.id}" shows ${p.name} before the end card: the partner appears on the end card only (or the narration says the disclosure first)`);
    }
  }
  // Post copy: the disclosure line (which names the partner, as TikTok requires) is put in
  // front of the caption by postText; links stay out of it (validatePublish).
  return e;
}
