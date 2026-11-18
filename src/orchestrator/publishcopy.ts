/**
 * Publishing package text (pure): per-platform copy and caption files.
 *
 * Limits (primary sources, checked 2026-11-17; docs/PLATFORMS.md § Posting):
 *   YouTube    title ≤ 100 characters, description ≤ 5,000 bytes (Data API videos resource)
 *   Instagram  caption ≤ 2,200 characters, ≤ 30 hashtags, ≤ 20 @ tags (Graph API IG User Media)
 *   TikTok     caption (post_info.title) ≤ 2,200 UTF-16 code units (Content Posting API)
 *   Facebook   Reels caption limit not verified: held to the 2,200 limit above
 */
import { parsePhrase } from '../captions/phrase.ts';
import type { CaptionWindow } from '../video/narration.ts';
import { postText, type PublishSpec } from '../video/publish.ts';

export const PLATFORM_LIMITS = {
  youtube: { titleChars: 100, descriptionBytes: 5000 },
  instagram: { captionChars: 2200, hashtags: 30 },
  tiktok: { captionUnits: 2200 },
  facebook: { captionChars: 2200 },
} as const;

export type PlatformCopy = { platform: 'youtube' | 'instagram' | 'tiktok' | 'facebook'; name: string; title?: string; text: string; length: number; limit: string; ok: boolean; settings: string[] };

export function platformCopy(p: Pick<PublishSpec, 'title' | 'caption' | 'hashtags'>): PlatformCopy[] {
  const text = postText({ ...p, coverAt: 0 });
  const chars = [...text].length;
  const L = PLATFORM_LIMITS;
  const ai = 'AI label: on';
  return [
    {
      platform: 'youtube',
      name: 'YouTube Shorts',
      title: p.title,
      text,
      length: Buffer.byteLength(text, 'utf8'),
      limit: `title ≤ ${L.youtube.titleChars} chars, description ≤ ${L.youtube.descriptionBytes} bytes`,
      ok: [...p.title].length <= L.youtube.titleChars && Buffer.byteLength(text, 'utf8') <= L.youtube.descriptionBytes,
      settings: ['Studio → "Altered or synthetic content": Yes', 'Description: the text below'],
    },
    {
      platform: 'instagram',
      name: 'Instagram Reels',
      text: `${p.title}\n\n${text}`,
      length: [...`${p.title}\n\n${text}`].length,
      limit: `caption ≤ ${L.instagram.captionChars} chars, ≤ ${L.instagram.hashtags} hashtags`,
      ok: [...`${p.title}\n\n${text}`].length <= L.instagram.captionChars && p.hashtags.length <= L.instagram.hashtags,
      settings: [ai + ' (Meta requires it for realistic synthetic audio)', 'Cover: cover.jpg', 'Share to feed: on'],
    },
    {
      platform: 'tiktok',
      name: 'TikTok',
      text: `${p.title}\n\n${text}`,
      length: `${p.title}\n\n${text}`.length,
      limit: `caption ≤ ${L.tiktok.captionUnits} UTF-16 units`,
      ok: `${p.title}\n\n${text}`.length <= L.tiktok.captionUnits,
      settings: ['"AI-generated content" setting: on', 'Cover: cover.jpg or the frame at the cover time'],
    },
    {
      platform: 'facebook',
      name: 'Facebook Reels',
      text: `${p.title}\n\n${text}`,
      length: chars,
      limit: `held to ${L.facebook.captionChars} chars (Facebook's own limit not verified)`,
      ok: [...`${p.title}\n\n${text}`].length <= L.facebook.captionChars,
      settings: [ai + ' (Meta requires it for realistic synthetic audio)', 'Cover: cover.jpg'],
    },
  ];
}

/** Caption markup → plain text (no emphasis marks, line breaks as spaces). */
export const plainCaption = (markup: string) =>
  parsePhrase(markup)
    .map((t, i) => (i && !t.glued ? ' ' : '') + t.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

const stamp = (s: number, sep: ',' | '.') => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const r = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(sec)}${sep}${p(r, 3)}`;
};

/** SubRip captions of what is spoken, one cue per caption phrase plus uncaptioned lines. */
export function srt(cues: Array<{ at: number; out: number; text: string }>): string {
  return cues.map((c, i) => `${i + 1}\n${stamp(c.at, ',')} --> ${stamp(c.out, ',')}\n${c.text}\n`).join('\n');
}
export function vtt(cues: Array<{ at: number; out: number; text: string }>): string {
  return `WEBVTT\n\n${cues.map((c) => `${stamp(c.at, '.')} --> ${stamp(c.out, '.')}\n${c.text}\n`).join('\n')}`;
}

/**
 * Subtitle cues for the whole narration: on-screen caption phrases where they exist, the
 * spoken line itself where the frame shows the words (hook headline, CTA).
 */
export function subtitleCues(lines: Array<{ id: string; text: string; at: number; duration: number }>, windows: CaptionWindow[]): Array<{ at: number; out: number; text: string }> {
  const out: Array<{ at: number; out: number; text: string }> = [];
  for (const l of lines) {
    const w = windows.filter((x) => x.id === l.id || x.id.startsWith(`${l.id}.`));
    if (w.length) for (const x of w) out.push({ at: x.at, out: Math.max(x.at + 0.5, Math.min(x.out, l.at + l.duration + 0.4)), text: plainCaption(x.markup) });
    else out.push({ at: l.at, out: l.at + l.duration + 0.2, text: l.text.replace(/'/g, '’') });
  }
  return out.sort((a, b) => a.at - b.at);
}
