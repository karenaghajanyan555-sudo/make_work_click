/**
 * Narration model (pure, JSON-compatible). A video's narration is a list of spoken lines,
 * each with an optional on-screen caption phrase and a start time on the video timeline.
 *
 * The narrator voice is a brand decision (src/brand/voice.ts), not part of the video spec.
 * Audio is synthesised as one take (scripts/tts/narrate.py) and cut into these lines.
 */
import { parsePhrase } from '../captions/phrase.ts';

export type NarrationLine = {
  /** Unique within the video; names the audio file and the caption cue. */
  id: string;
  /** Spoken text. Spoken English (docs/STORY.md): short sentences, no stage directions. */
  text: string;
  /**
   * On-screen phrase markup (docs/STORY.md caption rules). Omit when the frame already says
   * it. "|" splits a long line into phrases shown one after another, each entering when its
   * first word is spoken (needs a timing lock; src/video/define.ts).
   */
  caption?: string;
  /** Start on the video timeline, seconds. */
  at: number;
  /** Set by defineVideo() for split captions: each phrase and when it enters (video s). */
  phrases?: Array<{ markup: string; at: number }>;
};

export type NarrationSpec = {
  lines: NarrationLine[];
  /**
   * The approved take used by the render: public/narration/<videoId>/<take>/ (immutable,
   * hash-checked — scripts/approve-take.ts). "<otherVideoId>/take-NN" reuses another video's
   * approved take (the script must match it exactly). Omit while the narration is a draft:
   * the draft take comes from the narration cache (npm run voice).
   */
  take?: string;
  /** Narrator label; must be NARRATOR.label (src/brand/voice.ts). Recorded for traceability. */
  voice?: string;
};

export const NARRATION_RULES = {
  /** Silence kept between the end of one line and the start of the next. */
  minGapSeconds: 0.2,
  captionMaxWords: 7,
  captionMaxSpans: 1,
} as const;

const SPAN_RE = /\*\*[^*]+\*\*|\*[^*]+\*/g;

export function captionWordCount(markup: string): number {
  return parsePhrase(markup).filter((t) => !t.glued).length;
}

export function validateNarration(n: NarrationSpec): string[] {
  const errors: string[] = [];
  if (n.take !== undefined && !/^([a-z0-9-]+\/)?take-\d{2}$/.test(n.take)) errors.push(`narration take "${n.take}" must look like take-01 or <videoId>/take-01`);
  const ids = new Set<string>();
  let prevAt = -Infinity;
  for (const line of n.lines) {
    const where = `narration "${line.id}"`;
    if (!/^[a-z0-9-]+$/.test(line.id)) errors.push(`${where}: id must be lowercase letters, digits, dashes`);
    if (ids.has(line.id)) errors.push(`${where}: duplicate id`);
    ids.add(line.id);
    if (!line.text.trim()) errors.push(`${where}: empty text`);
    if (!(line.at >= 0)) errors.push(`${where}: at must be ≥ 0`);
    if (line.at <= prevAt) errors.push(`${where}: lines must be in time order`);
    prevAt = line.at;
    for (const phrase of line.caption?.split('|') ?? []) {
      try {
        const words = captionWordCount(phrase);
        if (words > NARRATION_RULES.captionMaxWords) errors.push(`${where}: caption phrase has ${words} words (max ${NARRATION_RULES.captionMaxWords})`);
        const spans = phrase.match(SPAN_RE)?.length ?? 0;
        if (spans > NARRATION_RULES.captionMaxSpans) errors.push(`${where}: caption phrase has ${spans} emphasis spans (max ${NARRATION_RULES.captionMaxSpans})`);
      } catch (e) {
        errors.push(`${where}: ${(e as Error).message}`);
      }
    }
    if (line.caption?.includes('|') && !line.phrases) errors.push(`${where}: split caption needs timing (defineVideo with a timing lock)`);
  }
  return errors;
}

export type PlacedLine = { id: string; start: number; end: number };

/**
 * Place synthesised lines (durations in seconds, by id) at their planned times.
 * Returns the placement and every problem: overlaps, missing gaps, running past the end.
 * With `shift`, a line that would start too early is pushed back (min gap) instead —
 * used for auditions; the final video must place without shifts.
 */
export function placeNarration(
  n: NarrationSpec,
  durations: Readonly<Record<string, number>>,
  totalSeconds: number,
  opts: { shift?: boolean } = {},
): { placed: PlacedLine[]; problems: string[] } {
  const placed: PlacedLine[] = [];
  const problems: string[] = [];
  for (const line of n.lines) {
    const d = durations[line.id];
    if (d === undefined) {
      problems.push(`narration "${line.id}": no audio`);
      continue;
    }
    const prev = placed.at(-1);
    let start = line.at;
    if (opts.shift && prev && start < prev.end + NARRATION_RULES.minGapSeconds) {
      start = prev.end + NARRATION_RULES.minGapSeconds;
      problems.push(`narration "${line.id}": shifted +${(start - line.at).toFixed(2)}s (previous line runs long)`);
    }
    placed.push({ id: line.id, start, end: start + d });
  }
  for (let i = 1; i < placed.length; i++) {
    const a = placed[i - 1]!;
    const b = placed[i]!;
    const gap = b.start - a.end;
    if (gap < NARRATION_RULES.minGapSeconds) {
      problems.push(`narration "${a.id}" ends ${a.end.toFixed(2)}s, "${b.id}" starts ${b.start.toFixed(2)}s (gap ${gap.toFixed(2)}s < ${NARRATION_RULES.minGapSeconds}s)`);
    }
  }
  const last = placed.at(-1);
  if (last && last.end > totalSeconds) problems.push(`narration "${last.id}" ends after the video (${last.end.toFixed(2)}s > ${totalSeconds}s)`);
  return { placed, problems };
}

/** Captions lead their line slightly and leave before the next line's caption. */
export const CAPTION_TIMING = { lead: -0.02, leaveBeforeNext: 0.5, leaveBeforeEnd: 0.4, phraseGap: 0.2 } as const;

export type CaptionWindow = { id: string; markup: string; at: number; out: number };

/** When each captioned line is on screen (seconds, video time). Pure; tested. */
export function captionWindows(n: NarrationSpec, totalSeconds: number): CaptionWindow[] {
  return n.lines.flatMap((line, i) => {
    if (line.caption === undefined) return [];
    const next = n.lines[i + 1];
    const out = next ? next.at - CAPTION_TIMING.leaveBeforeNext : totalSeconds - CAPTION_TIMING.leaveBeforeEnd;
    const phrases = line.phrases ?? [{ markup: line.caption, at: line.at }];
    return phrases.map((p, j) => ({
      id: phrases.length > 1 ? `${line.id}.${j}` : line.id,
      markup: p.markup,
      at: Math.max(0, p.at + CAPTION_TIMING.lead),
      out: j < phrases.length - 1 ? phrases[j + 1]!.at - CAPTION_TIMING.phraseGap : out,
    }));
  });
}
