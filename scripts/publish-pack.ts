/**
 * Everything a human needs to post a QA-passed video, in one folder. Posts nothing.
 *
 *   npm run publish-pack -- <videoId>
 *     → out/<id>/publish/cover.jpg   1080×1920 cover (rendered still at publish.coverAt)
 *     → out/<id>/publish/post.md     file + checksum, title, caption, per-platform steps
 *
 * Refuses unless the delivery file exists and the QA report for that exact file passed.
 * Platform facts and sources: docs/PLATFORMS.md § Posting.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getVideo } from '../content/index.ts';
import { FORMATS } from '../src/brand/format.ts';
import { ff, probe } from '../src/pipeline/ffmpeg.ts';
import { deliveryPath, ROOT, videoOut } from '../src/pipeline/paths.ts';
import { openSession, renderStills } from '../src/pipeline/remotion.ts';
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
if (statSync(qaFile).mtimeMs < statSync(video).mtimeMs) fail('QA report is older than the delivery file: run npm run qa -- ' + id + ' --no-render');
const qa = JSON.parse(readFileSync(qaFile, 'utf8')) as { checks: Array<{ id: string; status: string }> };
const failed = qa.checks.filter((c) => c.status !== 'pass');
if (failed.length) fail(`QA did not pass: ${failed.map((c) => c.id).join(', ')}`);

const out = path.join(videoOut(id), 'publish');
mkdirSync(out, { recursive: true });

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
const text = postText(pub);

const md = `# Post pack — ${id}

**Nothing here is posted automatically.** Upload by hand, only after the video is approved.

| | |
|---|---|
| Video | \`${rel(video)}\` — ${mb(bytes.length)} MB, ${seconds.toFixed(2)} s, ${v.width}×${v.height}, ${v.codec_name} + ${a?.codec_name ?? 'no audio'} |
| sha256 | \`${sha256}\` |
| QA | PASS, ${qa.checks.length} checks (\`${rel(qaFile)}\`) |
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

AI label: **turn it on everywhere.** Meta requires it for realistic-sounding synthetic
audio (verified); for YouTube and TikTok it is our transparency choice (sources and the
reasoning: docs/PLATFORMS.md § Posting). The caption also says the voice is AI-generated.

| Platform | Cover | AI label | Notes |
|---|---|---|---|
| YouTube Shorts | pick ${pub.coverAt.toFixed(1)} s in the frame picker | Studio, "AI use" disclosure: Yes | Title above; caption as description |
| Instagram Reels | upload \`cover.jpg\` | AI label on (Meta: required) | Share to feed: on |
| Facebook Reels | upload \`cover.jpg\` | AI label on (Meta: required) | Same caption |
| TikTok | pick ${pub.coverAt.toFixed(1)} s, or upload \`cover.jpg\` | AI-generated content setting: on | Same caption |

Button and setting names differ between app versions; the ones above were not checked in the apps.

## Before posting
- [ ] Watched \`${path.basename(video)}\` start to finish on a phone, sound on
- [ ] Approved by the owner (recorded in docs/STATUS.md until the approval store exists)
- [ ] Caption and title read once more; no links, no affiliate anything

## After posting
- [ ] Note each post's URL and time in docs/STATUS.md
`;
writeFileSync(path.join(out, 'post.md'), md);
console.log(`✓ ${rel(coverPath)} (${(jpg.stdout.length / 1024).toFixed(0)} KB)`);
console.log(`✓ ${rel(path.join(out, 'post.md'))}`);
