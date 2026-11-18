/**
 * The affiliate publishing package (pure): everything a person needs to post an affiliate video on
 * Instagram and TikTok without researching anything again (docs/QA.md § Gate 3).
 *
 *   post.md                 the package: 10 sections, every line labelled Verified / Confirm in
 *                           your account / Needs configuration / Unverified
 *   <platform>/caption.txt  copy-ready caption, checked against that platform's limit
 *   <platform>/bio.txt      bio line (disclosure next to the link)
 *   <platform>/link.txt     bio link: affiliate ID kept, platform source tag added
 *   analytics.csv           the post-publication log to fill in
 *
 * It states "tested" only from a verification run's own record (`Verification`, written by
 * `npm run verify-affiliate`), never by default. Without a fresh, passing run it refuses.
 */
import { disclosureFor, type Disclosure } from '../video/affiliate.ts';
import { postText } from '../video/publish.ts';
import type { VideoSpec } from '../video/spec.ts';
import { daysBetween, MANUAL_FACT_MAX_DAYS, STATUS_LABEL, VERIFICATION_MAX_DAYS, type Fact, type Source } from './model.ts';
import { affiliateId, platformLink, recordForPage, type PartnerRecord } from './partner.ts';
import { DISCLOSURE_LAW, PLATFORMS, type PlatformId } from './platforms.ts';

// ---------- the verification record (written by npm run verify-affiliate) ----------

export type CheckStatus = 'supported' | 'partial' | 'unverified' | 'contradicted' | 'unreachable' | 'manual';
export type FactCheck = { id: string; url: string; method: Source['method']; status: CheckStatus; at: string; evidence?: string; note?: string };
export type LinkTest = {
  /** A platform's bio link, or `control`: the same page without the affiliate parameters. */
  platform: PlatformId | 'control';
  url: string;
  at: string;
  httpStatus: number | null;
  finalUrl: string | null;
  redirects: number;
  /** Every query parameter of the link is still in the final URL. */
  paramsKept: boolean;
  /** Affiliate cookie set by the response, and whether its value holds our affiliate ID. */
  affiliateCookie: { name: string; holdsId: boolean } | null;
  tagCookie: { name: string; value: string } | null;
  ok: boolean;
  error?: string;
};
export type Verification = { video: string; partner: string; ranAt: string; claims: string[]; facts: FactCheck[]; links: LinkTest[] };

export const PACKAGE_PLATFORMS: readonly PlatformId[] = ['instagram', 'tiktok'];

/** Why a verification run cannot back a package (empty = it can). */
export function verificationProblems(v: Verification | null, spec: VideoSpec, record: PartnerRecord, now: Date): string[] {
  if (!v) return ['no verification run: npm run verify-affiliate -- ' + spec.id];
  const e: string[] = [];
  if (v.video !== spec.id || v.partner !== record.partner) e.push(`the verification run is for ${v.video} / ${v.partner}`);
  const age = daysBetween(v.ranAt, now);
  if (!(age >= 0 && age <= VERIFICATION_MAX_DAYS)) e.push(`the verification run is ${age.toFixed(1)} days old (max ${VERIFICATION_MAX_DAYS}): run it again`);
  for (const id of spec.affiliate?.claims ?? []) {
    const c = v.facts.find((f) => f.id === `claim:${id}`);
    if (!c) e.push(`claim "${id}" was not checked in the run`);
    else if (c.status !== 'supported') e.push(`claim "${id}" is ${c.status} on ${c.url}${c.note ? ` (${c.note})` : ''}: fix the claim or its quote before publishing`);
  }
  for (const p of PACKAGE_PLATFORMS) {
    const t = v.links.find((l) => l.platform === p);
    if (!t) e.push(`${p} link was not tested`);
    else if (!t.ok) e.push(`${p} link test failed: ${t.error ?? `HTTP ${t.httpStatus}, params kept ${t.paramsKept}, affiliate cookie ${t.affiliateCookie?.holdsId ? 'holds the ID' : 'missing'}`}`);
  }
  return e;
}

// ---------- captions ----------

/** Scene types that show real product screenshots (none yet: every scene is the studio's fictional UI). */
export const CAPTURE_SCENE_TYPES: readonly string[] = [];

export const illustrativeLine = (partnerName: string) => `The screens in this video are illustrative, not ${partnerName}’s interface.`;

/** The caption as posted on one platform, and whether it fits that platform's limit. */
export function platformCaption(spec: VideoSpec, platform: PlatformId): { text: string; length: number; max: number; units: string; ok: boolean; problems: string[] } {
  const pub = spec.publish!;
  const d = disclosureFor(spec.affiliate!);
  const allIllustrative = spec.scenes.every((s) => !CAPTURE_SCENE_TYPES.includes(s.type));
  const body = allIllustrative && !/\billustrative\b/i.test(pub.caption) ? `${pub.caption.trim()}\n\n${illustrativeLine(d.partner.name)}` : pub.caption;
  const text = postText({ ...pub, caption: body }, d.caption);
  const rules = PLATFORMS[platform].caption;
  const length = rules.units === 'utf16' ? text.length : [...text].length;
  const problems: string[] = [];
  if (length > rules.max) problems.push(`${platform} caption is ${length} ${rules.units} (max ${rules.max})`);
  if (rules.hashtags !== undefined && pub.hashtags.length > rules.hashtags) problems.push(`${platform}: ${pub.hashtags.length} hashtags (max ${rules.hashtags})`);
  if (!text.startsWith(d.caption)) problems.push(`${platform} caption must start with the disclosure line`);
  return { text, length, max: rules.max, units: rules.units, ok: !problems.length, problems };
}

// ---------- the package ----------

export type PackageInput = {
  spec: VideoSpec;
  record: PartnerRecord;
  verification: Verification;
  file: { path: string; mb: string; seconds: number; width: number; height: number; sha256: string };
  qa: { report: string; checks: number; warned: string[] };
  cover: { path: string; frame: number; at: number };
  now: Date;
};

const day = (iso: string) => iso.slice(0, 10);
const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const quoteLink = (s: Source) => `“${s.quote}” — ${s.url}`;

/** A fact's label in the package: its status, re-stated from this run where the run checked it. */
function factLine(f: Fact, v: Verification, now: Date): { label: string; detail: string; flag?: string } {
  const run = v.facts.find((c) => c.id === f.id);
  const src = f.source ? ` Source: ${quoteLink(f.source)}` : '';
  if (f.status === 'verified' && f.source) {
    if (run?.status === 'supported') return { label: `Verified ${day(run.at)}${run.note?.includes('read by hand') ? ' (a negation in the sentence read by hand)' : ''}`, detail: `${f.text}${src}` };
    if (run && run.status !== 'manual') return { label: 'NOT re-confirmed', detail: `${f.text}${src}`, flag: `${f.id}: ${run.status} on ${day(run.at)}${run.note ? ` (${run.note})` : ''}; last confirmed by hand ${f.source.checked}` };
    const age = daysBetween(f.source.checked, now);
    const stale = age > MANUAL_FACT_MAX_DAYS;
    return { label: `Verified ${f.source.checked} (by hand)`, detail: `${f.text}${src}`, ...(stale ? { flag: `${f.id}: checked by hand ${Math.floor(age)} days ago: re-check` } : {}) };
  }
  return { label: STATUS_LABEL[f.status], detail: `${f.text}${f.how ? ` — ${f.how}` : ''}${src}` };
}

function factTable(facts: readonly Fact[], v: Verification, now: Date, flags: string[]): string {
  const rows = facts.map((f) => {
    const l = factLine(f, v, now);
    if (l.flag) flags.push(l.flag);
    return `| ${cell(l.label)} | ${cell(l.detail)} |`;
  });
  return ['| Status | Fact |', '|---|---|', ...rows].join('\n');
}

function steps(f: Fact | undefined): string {
  return f?.how ?? f?.text ?? '';
}

export function buildAffiliatePackage(i: PackageInput): { files: Record<string, string>; problems: string[] } {
  const { spec, verification: v, now } = i;
  // The facts this video's package states (Fact.pages scopes a page-specific fact to its videos).
  const record = recordForPage(i.record, spec.affiliate!.page);
  const problems = verificationProblems(v, spec, record, now);
  const d: Disclosure = disclosureFor(spec.affiliate!);
  const partner = d.partner.name;
  const id = affiliateId(record.partner);
  const flags: string[] = [];
  const pub = spec.publish!;
  const captions = Object.fromEntries(PACKAGE_PLATFORMS.map((p) => [p, platformCaption(spec, p)])) as Record<PlatformId, ReturnType<typeof platformCaption>>;
  for (const p of PACKAGE_PLATFORMS) problems.push(...captions[p].problems);
  const links = Object.fromEntries(PACKAGE_PLATFORMS.map((p) => [p, platformLink(record, p, spec.affiliate!.page)])) as Record<PlatformId, string>;
  for (const p of PACKAGE_PLATFORMS) {
    if (!links[p].includes(`${id.param}=${id.id}`)) problems.push(`${p} link lost the affiliate ID`);
    const bioMax = PLATFORMS[p].bioMax;
    if (bioMax !== undefined && [...d.bio].length > bioMax) problems.push(`${p} bio line is ${[...d.bio].length} characters (max ${bioMax})`);
  }
  const test = (p: PlatformId | 'control') => v.links.find((l) => l.platform === p);

  // 1 — claims
  const claimRows = (spec.affiliate!.claims ?? []).map((cid) => {
    const c = record.claims[cid];
    const run = v.facts.find((f) => f.id === `claim:${cid}`);
    if (!c) return `| MISSING | \`${cid}\` is not in the claim bank | |`;
    const label = run?.status === 'supported' ? `Verified ${day(run.at)}` : `NOT verified (${run?.status ?? 'not checked'})`;
    return `| ${label} | ${cell(c.text)} | “${cell(c.source.quote)}” — ${c.source.url} |`;
  });

  // 2/3 — link tests
  const testLine = (p: PlatformId | 'control') => {
    const t = test(p);
    if (!t) return '| not tested | | |';
    const cookie = t.affiliateCookie ? `\`${t.affiliateCookie.name}\` ${t.affiliateCookie.holdsId ? 'holds the ID' : 'does NOT hold the ID'}` : 'no affiliate cookie';
    const tag = t.tagCookie ? `, \`${t.tagCookie.name}=${t.tagCookie.value}\`` : '';
    return `| ${p} | Tested ${day(t.at)}: HTTP ${t.httpStatus ?? '—'}, ${t.redirects} redirect(s), parameters ${t.paramsKept ? 'kept' : 'LOST'}; ${cookie}${tag} | ${t.ok ? 'pass' : `FAIL${t.error ? `: ${cell(t.error)}` : ''}`} |`;
  };

  // 8 — interfaces
  const sceneRows = spec.scenes.map((s) => {
    const ws = (s.props as { workspace?: { name: string } }).workspace?.name;
    const capture = CAPTURE_SCENE_TYPES.includes(s.type);
    return `| \`${s.id}\` | ${s.type} | ${capture ? '**Actual product screenshot**' : `Illustrative: the studio’s fictional UI${ws ? ` (“${ws}”, a fictional business)` : ''}; not ${partner}’s interface`} |`;
  });

  const ig = PLATFORMS.instagram;
  const tt = PLATFORMS.tiktok;
  const igF = (fid: string) => ig.facts.disclosure.concat(ig.facts.ai, ig.facts.bio).find((f) => f.id === fid);
  const ttF = (fid: string) => tt.facts.disclosure.concat(tt.facts.ai, tt.facts.bio).find((f) => f.id === fid);

  const sections: string[] = [];
  sections.push(`# Publishing package — ${spec.id} (affiliate: ${partner})

**Nothing here is posted automatically.** A person uploads by hand, after watching the file and approving it.

| | |
|---|---|
| Video | \`${i.file.path}\` — ${i.file.mb} MB, ${i.file.seconds.toFixed(2)} s, ${i.file.width}×${i.file.height} |
| sha256 | \`${i.file.sha256}\` |
| QA | PASS, ${i.qa.checks} checks${i.qa.warned.length ? `, warnings: ${i.qa.warned.join(', ')}` : ''} (\`${i.qa.report}\`) |
| Cover | \`${i.cover.path}\` — frame ${i.cover.frame} (${i.cover.at.toFixed(2)} s) |
| Verification run | ${v.ranAt} (\`npm run verify-affiliate -- ${spec.id}\`; valid ${VERIFICATION_MAX_DAYS} days) |

**How to read the labels.** *Verified* = an official source says it (quote + URL; dated by the run that re-read it, or "by hand" where a page cannot be fetched). *Tested* = we ran it (request, response and date below). *Confirm in your account* = only you can see it. *Needs configuration* = works only after setup. *Unverified* = an assumption nobody checked.
${problems.length ? `\n> **BLOCKED — do not post:**\n${problems.map((p) => `> - ${p}`).join('\n')}\n` : ''}`);

  sections.push(`## 1. Product claims (every ${partner} fact in the video and the caption)

| Status | Claim | Quote — source |
|---|---|---|
${claimRows.join('\n')}`);

  sections.push(`## 2. Affiliate URL

- Affiliate ID: \`${id.id}\` (parameter \`${id.param}\`), from \`src/brand/partners.ts\`. Every link below is built from it, never typed by hand.
- Base link: \`${d.link}\`

${factTable(record.link, v, now, flags)}

| Link | Test | Result |
|---|---|---|
${PACKAGE_PLATFORMS.map((p) => testLine(p)).join('\n')}
${testLine('control')}

The control loads the same page without the affiliate parameters: it must set no affiliate cookie.
A test request can count as one click in your affiliate stats. **Not tested:** that a sign-up is credited (it needs a real new account by someone else).`);

  sections.push(`## 3. Tracking links (one per platform)

| Platform | Bio link |
|---|---|
${PACKAGE_PLATFORMS.map((p) => `| ${PLATFORMS[p].name} | \`${links[p]}\` |`).join('\n')}

${factTable(record.tracking.facts, v, now, flags)}`);

  sections.push(`## 4. Commission and payout

${factTable(record.program, v, now, flags)}`);

  sections.push(`## 5. Commercial disclosure

Built into the video and the copy: the end card carries the “${d.screen.label}” tag (“${d.screen.text}”), the caption’s first line is “${d.caption}”, and the bio line is “${d.bio}”.

**Instagram**

${factTable(ig.facts.disclosure, v, now, flags)}

**TikTok**

${factTable(tt.facts.disclosure, v, now, flags)}

**The law behind them (United States, FTC)** — our application (judgement, D42): the endorsement is on screen, so is the disclosure; the voice names no product and gives no opinion.

${factTable(DISCLOSURE_LAW, v, now, flags)}`);

  sections.push(`## 6. AI-generated content disclosure

The narrator is a synthetic voice (Kokoro), realistic-sounding: both platforms want it labelled. The caption also says so.

**Instagram**

${factTable(ig.facts.ai, v, now, flags)}

**TikTok**

${factTable(tt.facts.ai, v, now, flags)}`);

  sections.push(`## 7. Free plan and payment processors

What a viewer who signs up gets, and what they must set up before the workflow in the video takes payments.

${factTable(record.plan, v, now, flags)}`);

  sections.push(`## 8. Illustrative interfaces vs real screenshots

| Scene | Type | What is on screen |
|---|---|---|
${sceneRows.join('\n')}

No real ${partner} screenshots are used. The captions carry the line: ${illustrativeLine(partner)}`);

  const capBlock = (p: PlatformId) => {
    const c = captions[p];
    const src = PLATFORMS[p].caption.source;
    return `**${PLATFORMS[p].name}** — \`${p}/caption.txt\` (${c.length} ${c.units === 'utf16' ? 'UTF-16 units' : 'characters'} of ${c.max}${c.ok ? '' : ' — TOO LONG'}; limit verified by hand ${src.checked}: “${src.quote}” — ${src.url})

\`\`\`text
${c.text}
\`\`\``;
  };
  const same = captions.instagram.text === captions.tiktok.text;
  sections.push(`## 9. Captions and bio, per platform

${same ? 'Same caption text on both platforms (each checked against its own limit); they differ in the bio link tag, the settings and the eligibility below.\n\n' : ''}${capBlock('instagram')}

${capBlock('tiktok')}

**Instagram bio**
1. Profile → Edit profile → **Bio**: paste \`instagram/bio.txt\`: \`${d.bio}\`
2. ${steps(igF('ig.bio-links'))} Paste \`instagram/link.txt\`: \`${links.instagram}\`

${factTable(ig.facts.bio, v, now, flags)}

**TikTok bio**
1. ${steps(ttF('tt.link-available'))}
2. Profile → Edit profile → **Bio**: paste \`tiktok/bio.txt\` (${[...d.bio].length} of ${tt.bioMax} characters).
3. ${steps(ttF('tt.link-steps'))} Paste \`tiktok/link.txt\`: \`${links.tiktok}\`

${factTable(tt.facts.bio, v, now, flags)}

### Posting steps

**Instagram Reel**
1. New reel → pick \`${i.file.path.split('/').pop()}\` → Next. No music, text or filters from the app.
2. Cover: Edit cover → add \`cover.jpg\` from the camera roll.
3. Paste \`instagram/caption.txt\`. Its first line must be the disclosure: ${d.caption}
4. Paid partnership: ${steps(igF('ig.reel-steps'))} First time only: ${steps(igF('ig.enable-tools'))} ${steps(igF('ig.brand-optional-risk'))}
5. AI label: ${steps(igF('ig.ai-steps'))}
6. Share. Open the post: under your name it should say “Paid partnership”.

**TikTok** (only once the profile shows the link, step 1 of the bio)
1. Upload the same file → Next. No sounds, effects or text from the app.
2. Cover: pick ${i.cover.at.toFixed(1)} s, or upload \`cover.jpg\`.
3. Paste \`tiktok/caption.txt\`.
4. ${steps(ttF('tt.toggle-steps'))}
5. AI label: ${steps(ttF('tt.ai-steps'))}
6. Post.`);

  const metrics = (p: PlatformId) =>
    PLATFORMS[p].analytics.map((m) => `| ${PLATFORMS[p].name} | ${m.name} | ${cell(m.meaning)} | ${m.status === 'verified' && m.source ? `Verified ${m.source.checked} — ${m.source.url}` : 'Unverified name'} |`).join('\n');
  sections.push(`## 10. After posting: analytics checklist

Fill \`analytics.csv\` at each checkpoint (house rule): **1 h, 24 h, 72 h, 7 days, 28 days** after posting.

- [ ] Post URLs and times recorded (docs/STATUS.md)
- [ ] Each checkpoint: the metrics below, per platform
- [ ] ${partner} affiliate dashboard at 72 h, 7 and 28 days: new referred contacts (free sign-ups) and sales; look for the \`instagram\` / \`tiktok\` tag on sales (${STATUS_LABEL.account.toLowerCase()}: where it shows is not documented)
- [ ] Comments asking how to set it up: answer from section 7 (what needs configuration), never beyond the claim bank
- [ ] 28 days: compare with your other posts (your own baseline; no external benchmark is assumed)

| Platform | Metric | Meaning | Name verified |
|---|---|---|---|
${metrics('instagram')}
${metrics('tiktok')}
| ${partner} | Referred contacts, sales, commissions | Free sign-ups and paid sales credited to you | Help pages: the dashboard tracks “the number of contacts and sales”; tag on sales: see section 3 |`);

  const account = [...record.account, ...ig.facts.disclosure, ...tt.facts.bio, ...record.tracking.facts].filter((f) => f.status === 'account');
  const unverified = [...record.assumptions, ...record.tracking.facts, ...ig.facts.ai, ...ig.facts.bio, ...tt.facts.ai, ...DISCLOSURE_LAW].filter((f) => f.status === 'unverified');
  sections.push(`## Before posting

**Confirm in your account**
${account.map((f) => `- [ ] ${f.text} — ${f.how}`).join('\n')}

**Unverified assumptions** (known gaps; nothing to do unless one turns out wrong)
${unverified.map((f) => `- ${f.text}${f.how ? ` — ${f.how}` : ''}`).join('\n')}

**Re-check flags from this run**
${flags.length ? flags.map((f) => `- ${f}`).join('\n') : '- none'}

- [ ] Watched the file start to finish on a phone, sound on, and approved it
- [ ] Every line of section 1 says “Verified” with this run’s date`);

  const csv = ['date,hours_since_post,platform,views,viewers,avg_watch_time_s,watched_full_pct,likes,comments,shares,saves,follows,profile_views_or_link_taps,affiliate_contacts,affiliate_sales,notes'];

  return {
    problems,
    files: {
      'post.md': `${sections.join('\n\n')}\n`,
      'instagram/caption.txt': `${captions.instagram.text}\n`,
      'tiktok/caption.txt': `${captions.tiktok.text}\n`,
      'instagram/bio.txt': `${d.bio}\n`,
      'tiktok/bio.txt': `${d.bio}\n`,
      'instagram/link.txt': `${links.instagram}\n`,
      'tiktok/link.txt': `${links.tiktok}\n`,
      'analytics.csv': `${csv.join('\n')}\n`,
    },
  };
}
