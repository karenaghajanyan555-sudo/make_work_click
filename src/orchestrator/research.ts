/**
 * Research and discovery providers.
 *
 * Support is judged narrowly and says how it was judged. Each cited claim is checked
 * against the page it cites (fetched now, no paid API):
 *   supported     the exact quote is on the page AND the passage around it contains the
 *                 claim's key terms (≥ 60 %), with no negation in that sentence
 *   partial       the quote is on the page but covers too few of the claim's terms, or only
 *                 similar wording is on the page (not the exact quote)
 *   unverified    the page could not be retrieved, no quote was given, or nothing like it is there
 *   contradicted  the quote is on the page, but its sentence negates it ("not", "no longer", …)
 * Confidence describes the evidence, not the truth: high = exact quote + ≥ 85 % of the claim's
 * terms; medium = exact quote + 60–85 %; low = partial or contradicted; none = unverified.
 * It is a word-overlap check, not a reading: `limitations` says what was not established,
 * and a person confirms uncertain claims at the script review (the job pauses for it).
 * Other kinds are labelled for what they are (never facts):
 *   assumption    the kit's stated assumptions about the audience / problem
 *   illustrative  fictional names, UI and numbers shown on screen
 *   suggestion    creative options (alternative hooks, the angle)
 */
import { createHash } from 'node:crypto';
import type { IdeaSeed, KitReference, StoryKit } from './kit.ts';
import type { ClaimStatus } from './writer.ts';

export type UserSource = { url: string; claim: string; quote?: string | null };
export type ResearchInput = {
  topic: string;
  category: string;
  audience: string;
  userSources: UserSource[];
  references: KitReference[];
  assumptions: string[];
  illustrative: string[];
  /** Creative options to show beside the research (alternative hooks, angle). */
  suggestions?: string[];
};
export type SourceResult = { url: string; ok: boolean; httpStatus: number | null; title: string | null; fetchedAt: string; contentSha256: string | null; error: string | null };
export type Support = 'supported' | 'partial' | 'unverified' | 'contradicted';
export type Confidence = 'high' | 'medium' | 'low' | 'none';
export type ClaimResult = {
  ref: string;
  text: string;
  kind: 'fact' | 'assumption' | 'illustrative' | 'suggestion';
  status: ClaimStatus;
  url?: string;
  quote?: string;
  /** The page's own words around the match (what a person should read). */
  evidence?: string;
  required: boolean;
  note?: string;
  /** Facts only: how the support was established. */
  confidence?: Confidence;
  quoteMatch?: 'exact' | 'similar' | 'none';
  /** Share of the claim's key terms found in the passage (0–1). */
  coverage?: number;
  limitations?: string[];
  retrievedAt?: string;
};
export type ResearchResult = { provider: string; sources: SourceResult[]; claims: ClaimResult[]; notes: string[] };

export type Fetcher = (url: string) => Promise<{ status: number; text: string }>;

export interface ResearchProvider {
  id: string;
  describe: string;
  research(input: ResearchInput, fetcher: Fetcher): Promise<ResearchResult>;
}

/** Plain-text view of an HTML page (scripts, styles and tags removed, entities decoded). */
export function pageText(html: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', mdash: '—', ndash: '–', hellip: '…' };
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
      e[0] === '#' ? String.fromCodePoint(e[1]!.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (entities[e.toLowerCase()] ?? m),
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalise for quote matching: case, whitespace, curly quotes, dashes. */
export const normText = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

const escWord = (w: string) =>
  w
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/'/g, "['‘’]")
    .replace(/"/g, '["“”]')
    .replace(/-/g, '[-–—]');

/** Exact match of `quote` in `text` (case, spacing, quote marks and dashes ignored). */
function matchQuote(text: string, quote: string): { index: number; length: number } | null {
  const words = normText(quote).split(' ').filter(Boolean);
  if (!words.length) return null;
  const m = new RegExp(words.map(escWord).join('\\s+'), 'i').exec(text);
  return m ? { index: m.index, length: m[0].length } : null;
}

/** Find `quote` in `text`; returns the page's own words around it, or null. */
export function findQuote(text: string, quote: string): string | null {
  const m = matchQuote(text, quote);
  return m ? text.slice(Math.max(0, m.index - 100), Math.min(text.length, m.index + m.length + 100)).trim() : null;
}

const STOP_WORDS = new Set(
  'a an the and or but if then so of to in on at by for with from into onto over under as is are was were be been being it its this that these those there their they them you your we our us i me my he she his her can could will would may might must should do does did done have has had having not no than too very just also e.g eg etc such like when which who whom whose what where how why all any each every some most more less many much one ones own same other others about after before while during'.split(' '),
);
/** Content terms of a sentence: lowercased words minus stop words; numbers kept. */
export function terms(s: string): string[] {
  return [...new Set(normText(s).replace(/[^a-z0-9%\s-]/g, ' ').split(/[\s-]+/).filter((w) => w && !STOP_WORDS.has(w) && (w.length > 2 || /\d/.test(w))))];
}
/** Same term, allowing inflection: numbers exactly; words on a shared 5-letter stem (remind/reminders, invoicing/invoices). */
const sameTerm = (a: string, b: string) => (/\d/.test(a) || /\d/.test(b) ? a === b : a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5)) || (a.length < 5 && b.startsWith(a) && b.length - a.length <= 3) || (b.length < 5 && a.startsWith(b) && a.length - b.length <= 3));
/** Share of `want` terms that appear in `have`, and which are missing. */
export function coverage(want: string[], have: string[]): { share: number; missing: string[] } {
  if (!want.length) return { share: 0, missing: [] };
  const missing = want.filter((w) => !have.some((h) => sameTerm(w, h)));
  return { share: (want.length - missing.length) / want.length, missing };
}
const NEGATION = /\b(not|never|cannot|can['’]t|can not|doesn['’]t|don['’]t|isn['’]t|aren['’]t|won['’]t|no longer|deprecated|discontinued|removed|unsupported|unavailable)\b/i;
/** The sentence of `text` around [index, index+length) (bounded to 400 characters each side). */
function sentenceAround(text: string, index: number, length: number): string {
  const before = text.slice(Math.max(0, index - 400), index);
  const after = text.slice(index + length, index + length + 400);
  const start = Math.max(before.lastIndexOf('. '), before.lastIndexOf('! '), before.lastIndexOf('? '));
  const ends = ['. ', '! ', '? '].map((p) => after.indexOf(p)).filter((i) => i >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : after.length;
  return (before.slice(start >= 0 ? start + 2 : 0) + text.slice(index, index + length) + after.slice(0, end)).trim();
}

export type Assessment = Pick<ClaimResult, 'status' | 'evidence' | 'confidence' | 'quoteMatch' | 'coverage' | 'limitations' | 'note'>;
export const SUPPORT_RULES = { supportedCoverage: 0.6, highCoverage: 0.85, similarQuote: 0.7, passageChars: 300 } as const;

/**
 * How well `pageTextContent` supports `claim` through `quote` (pure, deterministic).
 * The passage = the matched quote ± 300 characters; negation is looked for in its sentence.
 */
export function assessClaim(pageTextContent: string, claim: string, quote: string): Assessment {
  const lexical = 'Automatic word-overlap check, not a reading: a person should confirm the passage means what the claim says.';
  const claimTerms = terms(claim);
  const m = matchQuote(pageTextContent, quote);
  if (m) {
    const passage = pageTextContent.slice(Math.max(0, m.index - SUPPORT_RULES.passageChars), Math.min(pageTextContent.length, m.index + m.length + SUPPORT_RULES.passageChars)).trim();
    const sentence = sentenceAround(pageTextContent, m.index, m.length);
    const cov = coverage(claimTerms, terms(passage));
    const neg = NEGATION.exec(sentence);
    const negInOwn = (s: string) => Boolean(neg && new RegExp(`\\b${neg[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s));
    const evidence = sentence.length >= 40 ? sentence.slice(0, 600) : passage.slice(0, 600);
    const share = Number(cov.share.toFixed(2));
    if (neg && !negInOwn(quote) && !negInOwn(claim)) {
      return { status: 'contradicted', evidence, confidence: 'low', quoteMatch: 'exact', coverage: share, note: `the quote is on the page, but its sentence says "${neg[0]}"`, limitations: [lexical, `Negation found automatically ("${neg[0]}"): read the sentence; it may qualify something else.`] };
    }
    const missingNote = cov.missing.length ? `claim terms not in the passage: ${cov.missing.join(', ')}` : 'every claim term is in the passage';
    if (cov.share >= SUPPORT_RULES.supportedCoverage) {
      return { status: 'supported', evidence, confidence: cov.share >= SUPPORT_RULES.highCoverage ? 'high' : 'medium', quoteMatch: 'exact', coverage: share, note: missingNote, limitations: [lexical, 'Shows what this page says on the retrieval date, not that it holds everywhere or later.', ...(cov.missing.length ? [`Not established by the passage: ${cov.missing.join(', ')}.`] : [])] };
    }
    return { status: 'partial', evidence, confidence: 'low', quoteMatch: 'exact', coverage: share, note: `the quote is on the page but supports only part of the claim (${Math.round(share * 100)} % of its terms; ${missingNote})`, limitations: [lexical, `Not established by the passage: ${cov.missing.join(', ')}.`] };
  }
  // No exact quote: the most similar sentence on the page, if any is close.
  const qTerms = terms(quote);
  let best = { share: 0, sentence: '' };
  for (const sentence of pageTextContent.split(/(?<=[.!?])\s+/)) {
    if (sentence.length > 800) continue;
    const c = coverage(qTerms, terms(sentence)).share;
    if (c > best.share) best = { share: c, sentence };
  }
  if (best.share >= SUPPORT_RULES.similarQuote) {
    return { status: 'partial', evidence: best.sentence.slice(0, 600), confidence: 'low', quoteMatch: 'similar', coverage: Number(coverage(claimTerms, terms(best.sentence)).share.toFixed(2)), note: `the exact quote is not on the page; a sentence with ${Math.round(best.share * 100)} % of its words is`, limitations: ['Similar wording is not the quote: it may be paraphrased, outdated or a different statement.', lexical] };
  }
  return { status: 'unverified', confidence: 'none', quoteMatch: 'none', coverage: 0, note: 'quoted text not found on the page', limitations: ['Nothing on the retrieved page matches the quote: the claim is not supported by this source.'] };
}

export const httpFetcher: Fetcher = async (url) => {
  const r = await fetch(url, { headers: { 'user-agent': 'MAKE-WORK-CLICK-research/1.0 (local, non-commercial fetch)' }, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  const text = await r.text();
  return { status: r.status, text: text.slice(0, 5_000_000) };
};

/** Built-in provider: the kit's references + the owner's sources, each fetched and checked. */
export const SOURCE_CHECK: ResearchProvider = {
  id: 'source-check',
  describe: 'Fetches every cited URL, finds the quoted text and checks the passage covers the claim (no API key).',
  async research(input, fetcher) {
    const sources = new Map<string, SourceResult & { text?: string }>();
    const fetchOnce = async (url: string) => {
      if (sources.has(url)) return sources.get(url)!;
      const fetchedAt = new Date().toISOString();
      let s: SourceResult & { text?: string };
      try {
        const r = await fetcher(url);
        const text = pageText(r.text);
        const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(r.text)?.[1]?.trim() ?? null;
        s = { url, ok: r.status >= 200 && r.status < 300, httpStatus: r.status, title: title ? pageText(title) : null, fetchedAt, contentSha256: createHash('sha256').update(r.text).digest('hex'), error: r.status >= 300 ? `HTTP ${r.status}` : null, text };
      } catch (e) {
        s = { url, ok: false, httpStatus: null, title: null, fetchedAt, contentSha256: null, error: (e as Error).message };
      }
      sources.set(url, s);
      return s;
    };
    const check = async (ref: string, claim: string, url: string, quote: string | null | undefined, required: boolean): Promise<ClaimResult> => {
      const s = await fetchOnce(url);
      const base = { ref, text: claim, kind: 'fact' as const, url, required, retrievedAt: s.fetchedAt, ...(quote ? { quote } : {}) };
      if (!s.ok) return { ...base, status: 'unverified', confidence: 'none', quoteMatch: 'none', coverage: 0, note: `source unreachable (${s.error})`, limitations: ['The source could not be retrieved: nothing was checked.'] };
      if (!quote) return { ...base, status: 'unverified', confidence: 'none', quoteMatch: 'none', coverage: 0, note: 'no quote given: the page loads, but the claim was not checked against its text', limitations: ['Add the exact sentence from the page that supports the claim.'] };
      return { ...base, ...assessClaim(s.text ?? '', claim, quote) };
    };
    const claims: ClaimResult[] = [];
    for (const r of input.references) claims.push(await check(r.ref, r.claim, r.url, r.quote, Boolean(r.required)));
    for (const [i, u] of input.userSources.entries()) claims.push(await check(`source-${i + 1}`, u.claim, u.url, u.quote, false));
    input.assumptions.forEach((a, i) => claims.push({ ref: `assumption-${i + 1}`, text: a, kind: 'assumption', status: 'assumption', required: false, note: 'stated by the kit, not researched' }));
    input.illustrative.forEach((a, i) => claims.push({ ref: `illustrative-${i + 1}`, text: a, kind: 'illustrative', status: 'illustrative', required: false }));
    (input.suggestions ?? []).forEach((a, i) => claims.push({ ref: `suggestion-${i + 1}`, text: a, kind: 'suggestion', status: 'suggestion', required: false, note: 'creative option, not a fact' }));
    const notes: string[] = [];
    if (!input.userSources.length) notes.push('No sources added to the idea: only the kit references were checked.');
    return { provider: this.id, sources: [...sources.values()].map(({ text: _t, ...s }) => s), claims, notes };
  },
};

export const RESEARCH_PROVIDERS: Record<string, ResearchProvider> = { [SOURCE_CHECK.id]: SOURCE_CHECK };

// ---------- discovery ----------
export type DiscoveredIdea = IdeaSeed & { category: string; origin: string };
export interface DiscoveryProvider {
  id: string;
  describe: string;
  discover(existingTitles: ReadonlySet<string>): Promise<DiscoveredIdea[]>;
}

/** Built-in discovery: the seed ideas of every story kit not yet in the registry. */
export function playbookDiscovery(kits: Readonly<Record<string, StoryKit>>): DiscoveryProvider {
  return {
    id: 'playbooks',
    describe: 'Seed ideas shipped with each story kit (offline).',
    async discover(existing) {
      return Object.values(kits).flatMap((k) =>
        k.seeds.filter((s) => !existing.has(s.title.toLowerCase())).map((s) => ({ ...s, category: k.id, origin: `discovery:playbooks/${k.id}` })),
      );
    },
  };
}
