/**
 * Everything a human needs to post a QA-passed video, in one folder. Posts nothing.
 *
 *   npm run publish-pack -- <videoId>
 *     → out/<id>/publish/cover.jpg   1080×1920 cover (rendered still at publish.coverAt)
 *     → out/<id>/publish/post.md     file + checksum, title, caption, per-platform steps
 *
 * Affiliate videos get the full publishing package instead (src/publishing/package.ts, docs/QA.md
 * § Gate 3): post.md in 10 sections, per-platform caption/bio/link files, analytics.csv. It needs
 * a fresh, passing `npm run verify-affiliate -- <id>` run and refuses otherwise.
 *
 * Refuses unless the delivery file exists and the QA report for that exact file passed.
 * Platform facts and sources: docs/PLATFORMS.md § Posting.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getVideo } from '../content/index.ts';
import { PARTNER_RECORDS } from '../content/affiliate/index.ts';
import { FORMATS } from '../src/brand/format.ts';
import { ff, probe } from '../src/pipeline/ffmpeg.ts';
import { deliveryPath, ROOT, videoOut } from '../src/pipeline/paths.ts';
import { openSession, renderStills } from '../src/pipeline/remotion.ts';
import { buildAffiliatePackage, verificationProblems, type Verification } from '../src/publishing/package.ts';
import { postText } from '../src/video/publish.ts';
import { validateSpec } from '../src/video/spec.ts';
import { computeTimeline, toFrames } from '../src/video/timeline.ts';

const id = process.argv[2];
if (!id || id.startsWith('--')) {
  console.error('Usage: npm run publish-pack -- <videoId>');
  process.exit(2);
}
const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const spec = getVideo(id);
const errors = validateSpec(spec);
if (errors.length) fail(`spec invalid:\n  ${errors.join('\n  ')}`);
const pub = spec.publish ?? fail(`${id} has no publish copy (content/videos/${id}.ts → publish)`);
const format = FORMATS[spec.format];
const timeline = computeTimeline(spec, format.fps);
const coverFrame = toFrames(pub.coverAt, format.fps);
if (coverFrame >= timeline.totalFrames) fail(`publish.coverAt ${pub.coverAt}s is past the last frame (${timeline.totalFrames - 1})`);

// The pack describes one exact file: it must exist and QA must have passed on it.
const video = deliveryPath(id);
if (!existsSync(video)) fail(`no delivery file: run npm run build -- ${id}`);
const qaFile = path.join(videoOut(id), 'qa', 'report.json');
if (!existsSync(qaFile)) fail(`no QA report: run npm run qa -- ${id}`);
const qa = JSON.parse(readFileSync(qaFile, 'utf8')) as { upload?: { sha256: string }; checks: Array<{ id: string; status: string; detail?: string }> };
// For this exact file: by sha256 (reports since Phase 2.5 record it), else by time. A
// re-delivery with identical bytes keeps its QA; any other file needs QA again.
const videoSha = createHash('sha256').update(readFileSync(video)).digest('hex');
if (qa.upload ? qa.upload.sha256 !== videoSha : statSync(qaFile).mtimeMs < statSync(video).mtimeMs) fail(`the QA report is not for this delivery file: run npm run qa -- ${id} --no-render`);
// Same rule as the QA gate (docs/QA.md): only a FAIL blocks; warnings are listed on the sheet.
const failed = qa.checks.filter((c) => c.status === 'fail');
if (failed.length) fail(`QA did not pass: ${failed.map((c) => c.id).join(', ')}`);
const warned = qa.checks.filter((c) => c.status === 'warn');

const out = path.join(videoOut(id), 'publish');
mkdirSync(out, { recursive: true });

// Affiliate videos: the package rests on a verification run of this video's claims and links.
const record = spec.affiliate ? (PARTNER_RECORDS[spec.affiliate.partner] ?? fail(`no publishing record for ${spec.affiliate.partner} (content/affiliate/)`)) : null;
const verFile = path.join(out, 'verification.json');
const verification = record && existsSync(verFile) ? (JSON.parse(readFileSync(verFile, 'utf8')) as Verification) : null;
if (record) {
  const blocked = verificationProblems(verification, spec, record, new Date());
  if (blocked.length) fail(`publishing package blocked:\n  ${blocked.join('\n  ')}`);
}

// Cover: lossless still → JPEG (the bundled ffmpeg has no image2 file muxer: pipe it).
const work = path.join(out, '.work');
const session = await openSession(false);
let png: string;
try {
  [png] = (await renderStills(session, id, [coverFrame], work, { videoId: id })) as [string];
} finally {
  await session.close();
}
const jpg = await ff('ffmpeg', ['-v', 'error', '-i', png, '-c:v', 'mjpeg', '-q:v', '2', '-pix_fmt', 'yuvj420p', '-f', 'image2pipe', '-']);
if (jpg.code !== 0) fail(`cover encode: ${jpg.stderr.slice(-400)}`);
const coverPath = path.join(out, 'cover.jpg');
writeFileSync(coverPath, jpg.stdout);
rmSync(work, { recursive: true, force: true });

const bytes = readFileSync(video);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const p = await probe(video);
const v = p.streams.find((s) => s.codec_type === 'video')!;
const a = p.streams.find((s) => s.codec_type === 'audio');
const seconds = Number(v.duration);
const mb = (n: number) => (n / 1e6).toFixed(1);
const rel = (f: string) => path.relative(ROOT, f);
const rel_ = rel;
if (record && verification) {
  const pkg = buildAffiliatePackage({
    spec,
    record,
    verification,
    file: { path: rel_(video), mb: mb(bytes.length), seconds, width: Number(v.width), height: Number(v.height), sha256 },
    qa: { report: rel_(qaFile), checks: qa.checks.length, warned: warned.map((c) => c.id) },
    cover: { path: rel_(coverPath), frame: coverFrame, at: pub.coverAt },
    now: new Date(),
  });
  if (pkg.problems.length) fail(`publishing package blocked:\n  ${pkg.problems.join('\n  ')}`);
  for (const [name, body] of Object.entries(pkg.files)) {
    const f = path.join(out, name);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(`${f}.part`, body);
    renameSync(`${f}.part`, f);
  }
  console.log(`✓ ${rel(coverPath)} (${(jpg.stdout.length / 1024).toFixed(0)} KB)`);
  for (const name of Object.keys(pkg.files)) console.log(`✓ ${rel(path.join(out, name))}`);
  process.exit(0);
}
const text = postText(pub);

const md = `# Post pack — ${id}

**Nothing here is posted automatically.** Upload by hand, only after the video is approved.

| | |
|---|---|
| Video | \`${rel(video)}\` — ${mb(bytes.length)} MB, ${seconds.toFixed(2)} s, ${v.width}×${v.height}, ${v.codec_name} + ${a?.codec_name ?? 'no audio'} |
| sha256 | \`${sha256}\` |
| QA | PASS, ${qa.checks.length} checks${warned.length ? `, ${warned.length} warning(s): ${warned.map((c) => c.id).join(', ')}` : ''} (\`${rel(qaFile)}\`) |
| Cover | \`${rel(coverPath)}\` — frame ${coverFrame} (${pub.coverAt.toFixed(2)} s) |

Upload this same file everywhere. Do not add platform music or effects: the mix is final
(−14 LUFS, voice, score and effects balanced together).

## Title (YouTube Shorts)

\`\`\`text
${pub.title}
\`\`\`

## Caption (all platforms)

\`\`\`text
${text}
\`\`\`

## Per platform

AI label: **turn it on everywhere.** Meta and TikTok require it for realistic-sounding synthetic
audio (verified; TikTok: "label all AI-generated content that contains realistic images, audio,
and video"); for YouTube it is our transparency choice (sources: docs/PLATFORMS.md § Posting).
The caption also says the voice is AI-generated.

| Platform | Cover | AI label | Notes |
|---|---|---|---|
| YouTube Shorts | pick ${pub.coverAt.toFixed(1)} s in the frame picker | Studio, "AI use" disclosure: Yes | Title above; caption as description |
| Instagram Reels | upload \`cover.jpg\` | AI label on (Meta: required) | Share to feed: on |
| Facebook Reels | upload \`cover.jpg\` | AI label on (Meta: required) | Same caption |
| TikTok | pick ${pub.coverAt.toFixed(1)} s, or upload \`cover.jpg\` | AI-generated content setting: on (TikTok: required) | Same caption |

Button and setting names differ between app versions; the ones above were not checked in the apps.

## Before posting
- [ ] Watched \`${path.basename(video)}\` start to finish on a phone, sound on
- [ ] Approved by the owner (recorded in docs/STATUS.md until the approval store exists)
- [ ] Caption and title read once more; no links (knowledge video: no partner named)

## After posting
- [ ] Note each post's URL and time in docs/STATUS.md
`;
writeFileSync(path.join(out, 'post.md'), md);
console.log(`✓ ${rel(coverPath)} (${(jpg.stdout.length / 1024).toFixed(0)} KB)`);
console.log(`✓ ${rel(path.join(out, 'post.md'))}`);
