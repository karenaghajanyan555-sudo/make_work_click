/**
 * Re-verify everything an affiliate video's publishing package will state, on the live pages, and
 * test its links. Posts nothing, changes nothing in any account.
 *
 *   npm run verify-affiliate -- <videoId>
 *     → out/<id>/publish/verification.json   (publish-pack refuses without a fresh, passing run)
 *
 * Checks (docs/QA.md § Gate 3):
 *   claims     every claim id in spec.affiliate.claims: the quote is on the page and its passage
 *              covers the claim (the orchestrator's research check, assessClaim)
 *   facts      every partner and platform fact with a raw/rendered source, the same way;
 *              `manual` sources are listed with their hand-check date
 *   links      each platform's bio link: HTTP status, redirects, parameters kept, the partner's
 *              affiliate cookie holds our ID, the tag cookie holds the platform tag; plus a
 *              control request without the parameters (must set no affiliate cookie)
 *
 * A test request can count as a click in the affiliate stats. It cannot create a referral (that
 * needs a sign-up), and no form is submitted.
 */
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getVideo } from '../content/index.ts';
import { PARTNER_RECORDS } from '../content/affiliate/index.ts';
import { assessClaim, httpFetcher, pageText } from '../src/orchestrator/research.ts';
import { openPageReader, type PageReader } from '../src/pipeline/browser.ts';
import { videoOut } from '../src/pipeline/paths.ts';
import type { Fact, Source } from '../src/publishing/model.ts';
import { PACKAGE_PLATFORMS, type CheckStatus, type FactCheck, type LinkTest, type Verification } from '../src/publishing/package.ts';
import { affiliateId, platformLink, recordForPage, recordProblems } from '../src/publishing/partner.ts';
import { DISCLOSURE_LAW, PLATFORMS, type PlatformId } from '../src/publishing/platforms.ts';

const id = process.argv[2];
if (!id || id.startsWith('--')) {
  console.error('Usage: npm run verify-affiliate -- <videoId>');
  process.exit(2);
}
const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const spec = getVideo(id);
if (!spec.affiliate) fail(`${id} is not an affiliate video (no spec.affiliate)`);
const record = PARTNER_RECORDS[spec.affiliate!.partner] ?? fail(`no publishing record for ${spec.affiliate!.partner} (content/affiliate/)`);
const bad = recordProblems(record);
if (bad.length) fail(`publishing record:\n  ${bad.join('\n  ')}`);
const claimIds = spec.affiliate!.claims ?? [];
const unknown = claimIds.filter((c) => !record.claims[c]);
if (unknown.length) fail(`claim ids not in content/affiliate/${record.partner}.ts: ${unknown.join(', ')}`);

// Everything to check: claims as `claim:<id>`, every fact that carries a source.
type Item = { id: string; text: string; source: Source };
const items: Item[] = claimIds.map((c) => ({ id: `claim:${c}`, text: record.claims[c]!.text, source: record.claims[c]!.source }));
// Only the facts this video's package states (Fact.pages: a booking setup step is not re-read for a course video).
const scoped = recordForPage(record, spec.affiliate!.page);
const facts: Fact[] = [
  ...scoped.link,
  ...scoped.tracking.facts,
  ...scoped.program,
  ...scoped.plan,
  ...scoped.account,
  ...scoped.assumptions,
  ...PACKAGE_PLATFORMS.flatMap((p) => [...PLATFORMS[p].facts.disclosure, ...PLATFORMS[p].facts.ai, ...PLATFORMS[p].facts.bio]),
  ...DISCLOSURE_LAW,
];
for (const f of facts) if (f.source) items.push({ id: f.id, text: f.text, source: f.source });

// One fetch per page (and click): raw HTML, or rendered text.
let reader: PageReader | null = null;
const pages = new Map<string, Promise<{ status: number | null; text: string; error?: string }>>();
const page = (s: Source) => {
  const key = `${s.method}|${s.url}|${s.click ?? ''}`;
  if (!pages.has(key)) {
    pages.set(
      key,
      (async () => {
        try {
          if (s.method === 'raw') {
            const r = await httpFetcher(s.url);
            return { status: r.status, text: pageText(r.text) };
          }
          reader ??= await openPageReader();
          const r = await reader.text(s.url, s.click ? { click: s.click } : {});
          return { status: r.status, text: r.text.replace(/\s+/g, ' ') };
        } catch (e) {
          return { status: null, text: '', error: (e as Error).message };
        }
      })(),
    );
  }
  return pages.get(key)!;
};

const checks: FactCheck[] = [];
try {
  for (const it of items) {
    const at = new Date().toISOString();
    if (it.source.method === 'manual') {
      checks.push({ id: it.id, url: it.source.url, method: 'manual', status: 'manual', at, note: `checked by hand ${it.source.checked}` });
      continue;
    }
    const pg = await page(it.source);
    if (pg.error || !pg.text || (pg.status !== null && pg.status >= 400)) {
      checks.push({ id: it.id, url: it.source.url, method: it.source.method, status: 'unreachable', at, note: pg.error ?? `HTTP ${pg.status}` });
      continue;
    }
    const a = assessClaim(pg.text, it.text, it.source.quote);
    // A negation a person has read and placed in another clause (Source.negationReviewed): accept
    // that one word, say so; any other negation still fails.
    const rv = it.source.negationReviewed;
    if (a.status === 'contradicted' && rv && a.note?.includes(`says "${rv.word}"`)) {
      a.status = 'supported';
      a.note = `quote found; "${rv.word}" in its sentence was read by hand (${it.source.checked}): ${rv.why}`;
    }
    checks.push({ id: it.id, url: it.source.url, method: it.source.method, status: a.status as CheckStatus, at, ...(a.evidence ? { evidence: a.evidence.slice(0, 400) } : {}), ...(a.note ? { note: a.note } : {}) });
  }
} finally {
  if (reader) await (reader as PageReader).close();
}

// Link tests: follow redirects by hand to see every Set-Cookie and the final URL.
async function linkTest(platform: PlatformId | 'control', url: string, expectTag?: string): Promise<LinkTest> {
  const at = new Date().toISOString();
  const aff = affiliateId(record.partner);
  const want = record.tracking.test;
  const cookies: string[] = [];
  let current = url;
  let status: number | null = null;
  let redirects = 0;
  try {
    for (;;) {
      const r = await fetch(current, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (MAKE-WORK-CLICK link check; no sign-up)' }, signal: AbortSignal.timeout(20_000) });
      status = r.status;
      cookies.push(...r.headers.getSetCookie());
      const loc = r.headers.get('location');
      if (r.status >= 300 && r.status < 400 && loc && redirects < 5) {
        current = new URL(loc, current).toString();
        redirects++;
        continue;
      }
      await r.arrayBuffer();
      break;
    }
  } catch (e) {
    return { platform, url, at, httpStatus: status, finalUrl: null, redirects, paramsKept: false, affiliateCookie: null, tagCookie: null, ok: false, error: (e as Error).message };
  }
  const want0 = new URL(url).searchParams;
  const got = new URL(current).searchParams;
  const paramsKept = [...want0.entries()].every(([k, v]) => got.get(k) === v);
  const cookie = (name?: string) => {
    if (!name) return null;
    const c = cookies.find((s) => s.startsWith(`${name}=`));
    return c ? decodeURIComponent(c.slice(name.length + 1).split(';')[0]!) : null;
  };
  const affValue = cookie(want?.affiliateCookie);
  const tagValue = cookie(want?.tagCookie);
  const affiliateCookie = want && affValue !== null ? { name: want.affiliateCookie, holdsId: affValue.includes(aff.id) } : null;
  const tagCookie = want?.tagCookie && tagValue !== null ? { name: want.tagCookie, value: tagValue } : null;
  const ok =
    platform === 'control'
      ? status === 200 && !affiliateCookie
      : status === 200 && paramsKept && (want ? Boolean(affiliateCookie?.holdsId) && (!want.tagCookie || tagCookie?.value === expectTag) : true);
  return { platform, url, at, httpStatus: status, finalUrl: current, redirects, paramsKept, affiliateCookie, tagCookie, ok, ...(ok ? {} : { error: platform === 'control' ? 'the page without parameters set an affiliate cookie' : 'see the fields' }) };
}

const links: LinkTest[] = [];
for (const p of PACKAGE_PLATFORMS) links.push(await linkTest(p, platformLink(record, p, spec.affiliate!.page), record.tracking.tags[p]));
const control = new URL(platformLink(record, 'instagram', spec.affiliate!.page));
control.search = '';
links.push(await linkTest('control', control.toString()));

const v: Verification = { video: id, partner: record.partner, ranAt: new Date().toISOString(), claims: claimIds, facts: checks, links };
const out = path.join(videoOut(id), 'publish');
mkdirSync(out, { recursive: true });
const file = path.join(out, 'verification.json');
writeFileSync(`${file}.part`, `${JSON.stringify(v, null, 2)}\n`);
renameSync(`${file}.part`, file);

const count = (s: string) => checks.filter((c) => c.status === s).length;
console.log(`claims  ${checks.filter((c) => c.id.startsWith('claim:') && c.status === 'supported').length}/${claimIds.length} supported`);
console.log(`facts   ${count('supported')} supported, ${count('partial')} partial, ${count('unverified')} not found, ${count('contradicted')} contradicted, ${count('unreachable')} unreachable, ${count('manual')} by hand`);
for (const c of checks.filter((c) => c.status !== 'supported' && c.status !== 'manual')) console.log(`  ! ${c.id}: ${c.status} — ${c.note ?? ''} (${c.url})`);
for (const l of links) console.log(`link    ${l.platform.padEnd(9)} ${l.ok ? 'pass' : 'FAIL'}  HTTP ${l.httpStatus}, ${l.redirects} redirect(s), params ${l.paramsKept ? 'kept' : 'lost'}, affiliate cookie ${l.affiliateCookie ? (l.affiliateCookie.holdsId ? 'holds ID' : 'without ID') : 'none'}${l.tagCookie ? `, tag ${l.tagCookie.value}` : ''}`);
console.log(`✓ ${path.relative(process.cwd(), file)}`);
