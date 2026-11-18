/**
 * Post copy for a finished video: one title, one caption, a few hashtags, the cover moment.
 * Authored in the content file next to the video it describes; `npm run publish-pack`
 * turns it into out/<id>/publish/ (cover + post sheet). Nothing is ever posted from code:
 * a human uploads after approval (CLAUDE.md, docs/PLATFORMS.md § Posting).
 */

export type PublishSpec = {
  /** Video seconds of the cover frame. Pick a moment where the hook reads in full. */
  coverAt: number;
  /** YouTube Shorts title (also the first line people read elsewhere). */
  title: string;
  /**
   * Caption body shared by every platform. Plain text, no links: an affiliate link goes in the
   * bio, and an affiliate video's disclosure line is put in front automatically (postText).
   */
  caption: string;
  /** A few specific tags, written with the leading "#". */
  hashtags: string[];
};

/** Limits checked against primary sources (docs/PLATFORMS.md § Posting). */
export const PUBLISH_LIMITS = {
  /** YouTube: title max 100 characters, no "<" or ">" (Data API snippet.title). */
  titleChars: 100,
  /** YouTube: description max 5000 bytes (Data API snippet.description). */
  captionBytes: 5000,
  /** House rule, not a platform limit: few, specific tags. */
  maxHashtags: 5,
} as const;

const LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|io|co|ai|app|net|org|ly|link)\b/i;
const HASHTAG = /^#[\p{L}\p{N}_]+$/u;

/**
 * Full caption as posted: the disclosure line first (affiliate videos: it must read before
 * "more"), the body, a blank line, the hashtags.
 */
export function postText(p: PublishSpec, disclosure?: string): string {
  const body = disclosure && !p.caption.trim().startsWith(disclosure) ? `${disclosure}\n\n${p.caption.trim()}` : p.caption.trim();
  return p.hashtags.length ? `${body}\n\n${p.hashtags.join(' ')}` : body;
}

/** `allowNames`: brand names that look like a domain but are not a link ("systeme.io"). */
export function validatePublish(p: PublishSpec, videoSeconds: number, allowNames: string[] = []): string[] {
  const e: string[] = [];
  if (!(p.coverAt >= 0 && p.coverAt < videoSeconds)) e.push(`publish.coverAt ${p.coverAt}s is outside the video (0–${videoSeconds}s)`);
  const title = p.title.trim();
  if (!title) e.push('publish.title is empty');
  if ([...title].length > PUBLISH_LIMITS.titleChars) e.push(`publish.title is ${[...title].length} characters (max ${PUBLISH_LIMITS.titleChars})`);
  if (/[<>]/.test(p.title + p.caption)) e.push('publish: "<" and ">" are not allowed (YouTube)');
  if (!p.caption.trim()) e.push('publish.caption is empty');
  const bytes = Buffer.byteLength(postText(p), 'utf8');
  if (bytes > PUBLISH_LIMITS.captionBytes) e.push(`publish caption + hashtags is ${bytes} bytes (max ${PUBLISH_LIMITS.captionBytes})`);
  const unnamed = (s: string) => allowNames.reduce((t, n) => t.split(n).join(' '), s);
  if (LINK.test(unnamed(p.title)) || LINK.test(unnamed(p.caption))) e.push('publish: no links in the title or caption');
  if (p.hashtags.length > PUBLISH_LIMITS.maxHashtags) e.push(`publish.hashtags: ${p.hashtags.length} tags (max ${PUBLISH_LIMITS.maxHashtags})`);
  const seen = new Set<string>();
  for (const h of p.hashtags) {
    if (!HASHTAG.test(h)) e.push(`publish.hashtags: "${h}" must be "#" + letters, digits or _`);
    const k = h.toLowerCase();
    if (seen.has(k)) e.push(`publish.hashtags: "${h}" is repeated`);
    seen.add(k);
  }
  return e;
}
