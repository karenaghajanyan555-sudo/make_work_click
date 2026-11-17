/**
 * Caption phrase markup → tokens.
 *
 * Captions are written phrase by phrase (never word-by-word karaoke). Inside a phrase:
 *   *word*    → emphasis: brand serif italic
 *   **word**  → signal:   brand serif italic in the accent colour (use sparingly)
 *   \n        → forced line break
 * Punctuation written directly after a span ("**itself**.") is glued to it, not spaced.
 */
export type Emphasis = 'none' | 'emphasis' | 'signal';

export type CaptionToken = {
  text: string;
  emphasis: Emphasis;
  /** No space before this token (punctuation touching the previous span). */
  glued: boolean;
  /** Token starts a new line. */
  newLine: boolean;
};

const TOKEN_RE = /\*\*([^*]+)\*\*|\*([^*]+)\*|([^\s*]+)/g;
const SPAN_RE = /\*\*[^*]+\*\*|\*[^*]+\*/g;

export function parsePhrase(markup: string): CaptionToken[] {
  const tokens: CaptionToken[] = [];
  const lines = markup.split('\n');

  lines.forEach((line, lineIndex) => {
    if (line.replace(SPAN_RE, '').includes('*')) {
      throw new Error(`Unbalanced emphasis markup in caption: "${markup}"`);
    }
    let lastEnd = -1;
    let firstInLine = true;
    for (const m of line.matchAll(TOKEN_RE)) {
      const [, signal, emphasis, plain] = m;
      const kind: Emphasis = signal ? 'signal' : emphasis ? 'emphasis' : 'none';
      const touching = lastEnd === m.index;
      const words = (signal ?? emphasis ?? plain ?? '').trim().split(/\s+/).filter(Boolean);
      words.forEach((text, wordIndex) => {
        tokens.push({
          text,
          emphasis: kind,
          glued: wordIndex === 0 && touching && !firstInLine,
          newLine: lineIndex > 0 && firstInLine,
        });
        firstInLine = false;
      });
      lastEnd = m.index + m[0].length;
    }
  });

  if (tokens.length === 0) throw new Error('Empty caption phrase');
  return tokens;
}

/** Frame (relative to phrase start) at which each token begins its entrance. */
export function tokenEnterFrames(tokens: readonly CaptionToken[], staggerFrames: number): number[] {
  let visibleIndex = 0;
  return tokens.map((t) => (t.glued ? Math.max(0, visibleIndex - 1) : visibleIndex++) * staggerFrames);
}
