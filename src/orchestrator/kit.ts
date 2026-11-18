/**
 * Story kits (pure types + text helpers). A kit is the domain material for one content
 * category: fictional world, line variants, scene material, post copy, assumptions and
 * real-source references. The writer (writer.ts) picks lines; the arcs (storyboard.ts)
 * turn them into library scenes. Kits live in content/kits/.
 */
import type { PresetName } from '../brand/presets.ts';
import type { SectionStyle } from '../sound/compose.ts';
import type { FlowStep, Fragment } from '../video/scenes/chaosToSystem.ts';
import type { StepDetail } from '../video/scenes/flowRun.ts';
import type { SceneSound } from '../video/scenes/model.ts';
import type { SceneSpec, TransitionSpec } from '../video/spec.ts';
import type { TimeRef } from '../video/timing.ts';

export type Section = 'hook' | 'problem' | 'explanation' | 'payoff' | 'cta';
export type Arc = 'signature' | 'editorial';
export type Harmony = 'clarity' | 'focus';

/**
 * A beat pinned to a spoken word, resolved once the final line is known: if the word is
 * no longer in the line (an edit), it falls back to the line's start or end + offset.
 */
export type Pin = { $pin: { line: string; word?: string; nth?: number; offset?: number; fallback?: 'start' | 'end' } };
export const pin = (line: string, word?: string, o: { nth?: number; offset?: number; fallback?: 'start' | 'end' } = {}): Pin => ({ $pin: { line, word, ...o } });
export const isPin = (x: unknown): x is Pin => typeof x === 'object' && x !== null && '$pin' in x;

export type LineVariant = {
  text: string;
  /** Caption markup (omit: the scene shows the words itself, e.g. the hook headline). */
  caption?: string;
  /** Extra silence before the line (seconds). */
  pause?: number;
};

export type KitScene = {
  type: SceneSpec['type'];
  /** Library scene props; `beats` may hold Pins. */
  props: Record<string, unknown>;
  transitionOut?: TransitionSpec;
  sounds?: SceneSound[];
  lead?: number;
  /** Cue that carries the chapter label (default "start"). */
  chapterCue?: string;
};

export type KitBeat = {
  /** Narration line id (and scene id in the editorial arc). */
  id: string;
  section: Section;
  /** Chapter label, e.g. "The summary". */
  label: string;
  lines: LineVariant[];
  /** Research refs this line relies on (must be verified, or the script is flagged). */
  claims?: string[];
  /** Editorial arc: the scene that carries this line. */
  scene?: KitScene;
  /** The idea's own hook may replace this line (hook beat only). */
  replaceable?: boolean;
};

/** Signature arc (v001-v2 look): chaos → workflow run → burst outro. */
export type SignatureMaterial = {
  workspace: { name: string; initials: string; breadcrumb: string };
  /** Up to 7 to-dos; exactly one `becomes` per flow step. */
  fragments: Fragment[];
  flow: FlowStep[];
  details: Array<StepDetail | null>;
  /** Per flow step: what the system did ("Sent"). */
  resolved: string[];
  stamp: string;
  /** Beats of the run, pinned to words of the step lines. */
  pins: { steps: Array<{ arrive: Pin; done: Pin }> };
};

export type KitReference = {
  ref: string;
  /** What the claim says, in plain words. */
  claim: string;
  url: string;
  /** Exact text expected on the page (verification = this quote is found there). */
  quote: string;
  /** The script depends on it: unverified → script review required. */
  required?: boolean;
};

export type IdeaSeed = { title: string; topic: string; audience: string; hook?: string; valueNote?: string; engagement?: number; commercial?: number; audienceValue?: number };

export type StoryKit = {
  id: string;
  label: string;
  /** One-line angle of the category (brief). */
  angle: string;
  promise: string;
  arc: Arc;
  preset: PresetName;
  harmony: Harmony;
  /** Short label for the eyebrow ("Invoices"). */
  short: string;
  /** Narration in order; the signature arc expects hook, system, step1–3, payoff, cta. */
  beats: KitBeat[];
  signature?: SignatureMaterial;
  /** Editorial arc: the score plan on this kit's cues (the signature arc has its own). */
  compose?: { anchor: string; sections: Array<{ at: string; style: SectionStyle }> };
  publish: { caption: string[]; hashtags: string[] };
  /** Stated assumptions about the audience/problem (research shows them as unverified). */
  assumptions: string[];
  references: KitReference[];
  /** What is fictional on screen (shown with the research). */
  illustrative: string[];
  /** Discovery: ideas this kit can produce. */
  seeds: IdeaSeed[];
};

// ---------- text helpers (deterministic) ----------

/** Display typography: straight apostrophes → ’. */
export const typo = (s: string) => s.replace(/'/g, '’');

/** Word normalisation of the timing resolver (src/video/timing.ts). */
export const normWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '').replace(/’/g, "'");
/** Spoken words of a line, normalised like the timing lock. */
export const spokenWords = (text: string) => text.split(/\s+/).map(normWord).filter((w) => /[\p{L}\p{N}]/u.test(w));

export const wordCount = (text: string) => spokenWords(text).length;

/** Words a display line should not end on ("the", "with" …): they move to the next line. */
const FUNCTION_WORDS = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'with', 'and', 'or', 'your', 'my', 'at', 'by', 'from']);

/** Display headline limits (hook scenes, display role 112u across the safe width; v001's longest line is 16). */
export const HEADLINE = { lines: 3, chars: 16 } as const;

/**
 * Break text into ≤ maxLines balanced lines of ≤ maxChars; prefer sentence ends; never end
 * a line on a function word. Returns null when the text cannot fit.
 */
export function fitLines(text: string, maxLines: number, maxChars: number): string[] | null {
  const words = text.trim().split(/\s+/);
  if (words.some((w) => w.length > maxChars)) return null;
  for (let width = Math.min(maxChars, Math.max(8, Math.ceil(text.length / maxLines))); width <= maxChars; width++) {
    const lines: string[][] = [];
    let cur: string[] = [];
    const push = () => {
      // Carry a trailing function word over to the next line.
      const carry: string[] = [];
      while (cur.length > 1 && FUNCTION_WORDS.has(cur[cur.length - 1]!.toLowerCase())) carry.unshift(cur.pop()!);
      lines.push(cur);
      cur = carry;
    };
    for (const w of words) {
      if (cur.length && [...cur, w].join(' ').length > width) push();
      cur.push(w);
      if (/[.!?]$/.test(w) && lines.length < maxLines - 1 && cur.join(' ').length >= width * 0.5) push();
    }
    if (cur.length) lines.push(cur);
    const out = lines.map((l) => l.join(' '));
    if (out.length <= maxLines && out.every((l) => l.length <= maxChars)) return out;
  }
  return null;
}

/** Break text into lines for display; falls back to a looser width when it cannot fit. */
export function breakLines(text: string, maxLines = 3, maxChars = 16): string[] {
  for (let c = maxChars; c <= text.length + 1; c++) {
    const l = fitLines(text, maxLines, c);
    if (l) return l;
  }
  return [text];
}

/** Does this spoken line fit a hook headline (3 lines × 16 characters)? */
export const fitsHeadline = (text: string) => fitLines(typo(text), HEADLINE.lines, HEADLINE.chars) !== null;

/** Emphasise the closing word(s) of a phrase: "the *money.*", "the *same way.*". */
function emphasiseEnd(line: string, mark = '*'): string {
  const ws = line.split(' ');
  const last = ws[ws.length - 1]!.replace(/[^\p{L}]/gu, '');
  const prev = ws[ws.length - 2]?.toLowerCase() ?? '';
  // A short last word reads better with its partner ("same way"), never with an article.
  const take = ws.length >= 2 && last.length <= 4 && !FUNCTION_WORDS.has(prev) ? 2 : 1;
  return [...ws.slice(0, -take), `${mark}${ws.slice(-take).join(' ')}${mark}`].join(' ');
}

/** Headline markup for a spoken line (hook, payoff statement). */
export function headlineFrom(text: string, maxLines: number = HEADLINE.lines): string {
  const lines = breakLines(typo(text), maxLines, HEADLINE.chars);
  lines[lines.length - 1] = emphasiseEnd(lines[lines.length - 1]!);
  return lines.join('\n');
}

/** Caption markup for a line without an authored caption: ≤ 7 words per phrase, 2 lines. */
export function captionFor(text: string): string {
  const t = typo(text).trim();
  const phrases: string[] = [];
  let cur: string[] = [];
  for (const w of t.split(/\s+/)) {
    cur.push(w);
    if ((/[,.;:!?]$/.test(w) && cur.length >= 3) || cur.length === 7) {
      phrases.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) {
    if (cur.length < 3 && phrases.length) phrases[phrases.length - 1] += ` ${cur.join(' ')}`;
    else phrases.push(cur.join(' '));
  }
  const fmt = (p: string) => breakLines(p, 2, 22).join('\n');
  const out = phrases.map(fmt);
  out[out.length - 1] = emphasiseEnd(out[out.length - 1]!);
  return out.join('|');
}

/**
 * Pin → engine TimeRef, checking the word is really spoken in the line. `wordsOf` gives a
 * line's words: from the timing lock when it exists (exact tokenisation), else the text.
 */
export function resolvePin(p: Pin, wordsOf: (id: string) => string[] | undefined): TimeRef {
  const { line, word, nth, offset, fallback } = p.$pin;
  const ws = wordsOf(line);
  if (ws === undefined) throw new Error(`pin: no line "${line}"`);
  if (word) {
    const hits = ws.map(normWord).filter((w) => w === normWord(word)).length;
    if (hits >= (nth ?? 1)) return { line, word, ...(nth ? { nth } : {}), ...(offset ? { offset } : {}) };
  }
  return { line, edge: fallback ?? 'start', ...(offset ? { offset } : {}) };
}

/** Replace every Pin inside a value with a TimeRef. */
export function resolvePins<T>(x: T, wordsOf: (id: string) => string[] | undefined): T {
  const walk = (v: unknown): unknown => {
    if (isPin(v)) return resolvePin(v, wordsOf);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, y]) => [k, walk(y)]));
    return v;
  };
  return walk(x) as T;
}
