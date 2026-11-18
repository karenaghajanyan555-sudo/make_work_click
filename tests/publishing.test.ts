import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIDEOS, getVideo } from '../content/index.ts';
import { PARTNER_RECORDS } from '../content/affiliate/index.ts';
import { PARTNERS, type PartnerId } from '../src/brand/partners.ts';
import { factProblems, VERIFICATION_MAX_DAYS } from '../src/publishing/model.ts';
import { buildAffiliatePackage, PACKAGE_PLATFORMS, platformCaption, verificationProblems, type Verification } from '../src/publishing/package.ts';
import { affiliateId, platformLink, recordForPage, recordProblems } from '../src/publishing/partner.ts';
import { DISCLOSURE_LAW, PLATFORMS } from '../src/publishing/platforms.ts';
import { validateSpec, type VideoSpec } from '../src/video/spec.ts';

const v008 = getVideo('v008-bookings-run-themselves');
const record = PARTNER_RECORDS['systeme-io'];
const NOW = new Date('2026-11-18T12:00:00Z');

/** A run in which everything passed (what verify-affiliate writes on a good day). */
function passingRun(spec: VideoSpec, at = '2026-11-18T10:00:00.000Z'): Verification {
  const id = affiliateId('systeme-io').id;
  return {
    video: spec.id,
    partner: 'systeme-io',
    ranAt: at,
    claims: spec.affiliate!.claims!,
    facts: spec.affiliate!.claims!.map((c) => ({ id: `claim:${c}`, url: record.claims[c]!.source.url, method: 'raw' as const, status: 'supported' as const, at })),
    links: [
      ...PACKAGE_PLATFORMS.map((p) => ({ platform: p, url: platformLink(record, p, spec.affiliate!.page), at, httpStatus: 200, finalUrl: platformLink(record, p, spec.affiliate!.page), redirects: 0, paramsKept: true, affiliateCookie: { name: 'systeme_affiliate_systemeio', holdsId: true }, tagCookie: { name: 'tk_systemeio', value: p }, ok: true })),
      { platform: 'control' as const, url: 'https://systeme.io/booking-calendar', at, httpStatus: 200, finalUrl: 'https://systeme.io/booking-calendar', redirects: 0, paramsKept: true, affiliateCookie: null, tagCookie: null, ok: true },
    ].map((l) => ({ ...l, url: l.url.includes(id) || l.platform === 'control' ? l.url : 'broken' })),
  };
}

const input = (verification: Verification) => ({
  spec: v008,
  record,
  verification,
  file: { path: 'out/v008/v008.mp4', mb: '39.7', seconds: 23.67, width: 1080, height: 1920, sha256: 'abc' },
  qa: { report: 'out/v008/qa/report.json', checks: 29, warned: [] },
  cover: { path: 'out/v008/publish/cover.jpg', frame: 90, at: 3 },
  now: NOW,
});

test('publishing data: every partner has a well-formed record; platform and law facts are well-formed', () => {
  for (const p of Object.keys(PARTNERS) as PartnerId[]) {
    assert.ok(PARTNER_RECORDS[p], `no publishing record for ${p}`);
    assert.deepEqual(recordProblems(PARTNER_RECORDS[p]), []);
  }
  for (const [id, r] of Object.entries(PLATFORMS)) assert.deepEqual(factProblems([...r.facts.disclosure, ...r.facts.ai, ...r.facts.bio], id), []);
  assert.deepEqual(factProblems(DISCLOSURE_LAW, 'law'), []);
});

test('affiliate videos with publish copy list their claims, and every claim is in the claim bank', () => {
  const affiliates = VIDEOS.filter((v) => v.affiliate && v.publish);
  assert.ok(affiliates.length >= 1);
  for (const v of affiliates) {
    const r = PARTNER_RECORDS[v.affiliate!.partner];
    assert.ok(v.affiliate!.claims?.length, `${v.id}: no claims`);
    for (const c of v.affiliate!.claims!) assert.ok(r.claims[c], `${v.id}: claim "${c}" not in the claim bank`);
  }
  const missing = validateSpec({ ...v008, affiliate: { ...v008.affiliate!, claims: [] } }).join('\n');
  assert.match(missing, /affiliate\.claims: list the systeme\.io facts/);
});

test('platform links keep the affiliate ID, add one tag per platform and never use www', () => {
  const { param, id } = affiliateId('systeme-io');
  const links = PACKAGE_PLATFORMS.map((p) => platformLink(record, p, 'booking-calendar'));
  for (const [i, l] of links.entries()) {
    const u = new URL(l);
    assert.equal(u.searchParams.get(param), id);
    assert.equal(u.searchParams.get(record.tracking.param), record.tracking.tags[PACKAGE_PLATFORMS[i]!]);
    assert.equal(u.hostname, 'systeme.io');
    assert.equal(u.pathname, '/booking-calendar');
  }
  assert.notEqual(links[0], links[1]);
  assert.equal(new URL(platformLink(record, 'tiktok')).pathname, '/');
});

test('a package needs a fresh verification run where every claim is supported and every link passes', () => {
  assert.match(verificationProblems(null, v008, record, NOW).join(), /no verification run/);
  assert.deepEqual(verificationProblems(passingRun(v008), v008, record, NOW), []);
  const stale = passingRun(v008, new Date(NOW.getTime() - (VERIFICATION_MAX_DAYS + 1) * 86_400_000).toISOString());
  assert.match(verificationProblems(stale, v008, record, NOW).join(), /days old/);
  const partial = passingRun(v008);
  partial.facts[0] = { ...partial.facts[0]!, status: 'partial', note: 'quote changed' };
  assert.match(verificationProblems(partial, v008, record, NOW).join(), /is partial/);
  const broken = passingRun(v008);
  broken.links[0] = { ...broken.links[0]!, ok: false, affiliateCookie: null };
  assert.match(verificationProblems(broken, v008, record, NOW).join(), /instagram link test failed/);
  const untested = passingRun(v008);
  untested.links = untested.links.filter((l) => l.platform !== 'tiktok');
  assert.match(verificationProblems(untested, v008, record, NOW).join(), /tiktok link was not tested/);
});

test('package: 10 sections, labelled facts, per-platform files within limits, "Tested" only from a run', () => {
  const pkg = buildAffiliatePackage(input(passingRun(v008)));
  assert.deepEqual(pkg.problems, []);
  const md = pkg.files['post.md']!;
  for (let n = 1; n <= 10; n++) assert.match(md, new RegExp(`^## ${n}\\. `, 'm'), `section ${n}`);
  for (const p of PACKAGE_PLATFORMS) {
    const cap = pkg.files[`${p}/caption.txt`]!;
    assert.ok(cap.startsWith('Ad: I earn a commission from systeme.io'), `${p} caption leads with the disclosure`);
    assert.equal(cap.match(/illustrative/gi)?.length, 1, `${p}: the illustrative line, once`);
    assert.ok(platformCaption(v008, p).ok);
    assert.ok(pkg.files[`${p}/link.txt`]!.includes(affiliateId('systeme-io').id));
    assert.ok([...pkg.files[`${p}/bio.txt`]!.trim()].length <= (PLATFORMS[p].bioMax ?? 150));
  }
  // Every fact row carries one of the allowed labels.
  const labels = [...md.matchAll(/^\| (Verified[^|]*|NOT re-confirmed|Confirm in your account|Needs configuration|Unverified) \|/gm)].length;
  const rows = [...md.matchAll(/^\| [^|`]+ \| [^|]+(?:\| [^|]*)?\|$/gm)].filter((m) => !/^\| (Status|Platform|Link|Scene|---|Video|sha256|QA|Cover|Verification run|instagram|tiktok|control|Instagram Reels|TikTok|systeme\.io) /.test(m[0]));
  assert.ok(labels >= 40, `labelled rows: ${labels}`);
  for (const r of rows) assert.match(r[0], /^\| (Verified|NOT|Confirm|Needs|Unverified|MISSING)/, r[0]);
  assert.match(md, /Tested 2026-11-18: HTTP 200/);

  // Without link tests the package is blocked and never says "Tested".
  const noLinks = passingRun(v008);
  noLinks.links = [];
  const blocked = buildAffiliatePackage(input(noLinks));
  assert.ok(blocked.problems.length);
  assert.doesNotMatch(blocked.files['post.md']!, /Tested \d{4}/);
  assert.match(blocked.files['post.md']!, /BLOCKED — do not post/);
});

test('page-scoped facts (Fact.pages): a booking setup step stays out of a course video\'s package, and back', () => {
  const ids = (page: string | undefined) => {
    const r = recordForPage(record, page);
    return [...r.plan, ...r.assumptions].map((f) => f.id);
  };
  const booking = ids('booking-calendar');
  const course = ids('online-courses');
  for (const id of ['plan.paid-booking-setup', 'plan.meet-integration', 'assume.free-funnel']) {
    assert.ok(booking.includes(id), `${id} in booking packages`);
    assert.ok(!course.includes(id), `${id} not in course packages`);
  }
  for (const id of ['plan.course-sell-setup', 'plan.workflow-setup', 'assume.free-workflow-steps']) {
    assert.ok(course.includes(id) && !booking.includes(id), id);
  }
  // Unscoped facts reach every package; a video without a page gets only unscoped ones.
  for (const id of ['plan.stripe', 'plan.free-limits', 'assume.signup-credited']) assert.ok(booking.includes(id) && course.includes(id) && ids(undefined).includes(id), id);
  assert.ok(!ids(undefined).includes('plan.paid-booking-setup'));
  // v008's package still carries its booking setup; v009's carries the workflow, not the booking.
  const v009 = getVideo('v009-sale-does-the-rest');
  const md8 = buildAffiliatePackage(input(passingRun(v008))).files['post.md']!;
  const pkg9 = buildAffiliatePackage({ ...input(passingRun(v009)), spec: v009 });
  assert.deepEqual(pkg9.problems, []);
  const md9 = pkg9.files['post.md']!;
  assert.match(md8, /Paid calendar/);
  assert.doesNotMatch(md8, /Workflows are inactive/);
  assert.match(md9, /Workflows are inactive/);
  assert.doesNotMatch(md9, /Paid calendar|Google Meet integration/);
});
