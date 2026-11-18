/**
 * Brief + script writer (pure, deterministic). Rule-based, no LLM: the kit supplies the
 * category's line variants; the writer picks them (seeded by the idea id), uses the idea's
 * own hook when it fits, applies human edits, and links lines to research claims. It never
 * states a fact research did not find supported: a line that relies on any other claim is
 * flagged and the job pauses for script review.
 *
 * WriterProvider is the extension point for other writers (e.g. an optional local or
 * hosted model); the built-in `kit` writer is the default and needs nothing installed.
 */
import { fnv1a } from '../video/timing.ts';
import { captionFor, fitsHeadline, HEADLINE, typo, wordCount, type Arc, type Harmony, type KitBeat, type Section, type StoryKit } from './kit.ts';
import type { PresetName } from '../brand/presets.ts';

export const CTA_LINE = 'Follow for more systems like this.';
export const DISCLOSURE = 'Fictional business, illustrative workflow. Narration voice is AI-generated.';
/** Spoken pace used for estimates before the voice exists (Bella × Nicole, measured ~2.6 words/s). */
const WORDS_PER_SECOND = 2.6;

export type IdeaFacts = {
  id: string;
  title: string;
  topic: string;
  audience: string;
  category: string;
  hook: string | null;
  valueNote: string | null;
  arc: string | null;
  preset: string | null;
};

export type ClaimStatus = 'supported' | 'partial' | 'unverified' | 'contradicted' | 'assumption' | 'illustrative' | 'suggestion';
export type ClaimSummary = { ref: string; text: string; kind: 'fact' | 'assumption' | 'illustrative' | 'suggestion'; status: ClaimStatus; url?: string; required: boolean };

export type Brief = {
  ideaId: string;
  title: string;
  topic: string;
  audience: string;
  category: string;
  kit: string;
  arc: Arc;
  preset: PresetName;
  harmony: Harmony;
  angle: string;
  promise: string;
  hookConcept: string | null;
  /** The idea's hook, used as the spoken hook (null: the kit's hook is used). */
  hookLine: string | null;
  notes: string[];
  cta: string;
  claimsPolicy: string;
  claims: ClaimSummary[];
  publish: { title: string; caption: string; hashtags: string[] };
  seed: number;
};

/** A hook the narrator can say in ~3 s: one sentence-ish, ≤ 10 words, no figures. */
export function usableHook(h: string | null): { line: string | null; note?: string } {
  if (!h?.trim()) return { line: null };
  const t = h.trim().replace(/\s+/g, ' ');
  const n = wordCount(t);
  if (n < 3 || n > 10) return { line: null, note: `hook concept has ${n} words (spoken hook: 3–10): kept for the post copy, the kit's hook is used` };
  if (/\d/.test(t)) return { line: null, note: 'hook concept contains a figure: figures need a verified source, so the kit hook is used' };
  if (!fitsHeadline(t)) return { line: null, note: `hook concept does not fit the headline (${HEADLINE.lines} lines × ${HEADLINE.chars} characters): kept for the post copy, the kit's hook is used` };
  return { line: /[.!?]$/.test(t) ? t : `${t}.` };
}

export function makeBrief(idea: IdeaFacts, kit: StoryKit, claims: ClaimSummary[]): Brief {
  const hook = usableHook(idea.hook);
  const arc = (idea.arc === 'signature' || idea.arc === 'editorial') && idea.arc === kit.arc ? idea.arc : kit.arc;
  const notes: string[] = [];
  if (hook.note) notes.push(hook.note);
  if (idea.arc && idea.arc !== kit.arc) notes.push(`kit "${kit.id}" is written for the ${kit.arc} arc; "${idea.arc}" ignored`);
  const caption = [idea.valueNote?.trim() || kit.publish.caption[0]!, ...kit.publish.caption.slice(1), DISCLOSURE].join('\n\n');
  return {
    ideaId: idea.id,
    title: idea.title.trim(),
    topic: idea.topic,
    audience: idea.audience,
    category: idea.category,
    kit: kit.id,
    arc,
    preset: (idea.preset as PresetName | null) ?? kit.preset,
    harmony: kit.harmony,
    angle: kit.angle,
    promise: idea.valueNote?.trim() || kit.promise,
    hookConcept: idea.hook,
    hookLine: hook.line,
    notes,
    cta: CTA_LINE,
    claimsPolicy: 'Only claims research found directly supported are stated as fact (anything else pauses for a script review). Every business, person, app and number on screen is fictional and illustrative.',
    claims,
    publish: { title: typo(idea.title.trim()), caption: typo(caption), hashtags: kit.publish.hashtags.slice(0, 5) },
    seed: parseInt(fnv1a(`${idea.id}:${kit.id}`), 16),
  };
}

// ---------- script ----------
export type ScriptLine = {
  id: string;
  section: Section;
  label: string;
  text: string;
  caption?: string;
  pause?: number;
  claims: string[];
  origin: 'kit' | 'idea' | 'edit';
  variant: number;
};
export type Script = {
  arc: Arc;
  kit: string;
  lines: ScriptLine[];
  sections: Record<Section, string[]>;
  words: number;
  estimatedSeconds: number;
  flags: string[];
  /** True if a human must review before production continues. */
  needsReview: boolean;
};
export type ScriptEdit = { lines?: Record<string, { text?: string; caption?: string | null; pause?: number }> };
/** What the script stage reads: the brief without its title and post copy (a title edit never touches the voice). */
export type ScriptBrief = Omit<Brief, 'title' | 'publish'>;
export const scriptBrief = ({ title: _t, publish: _p, ...rest }: Brief): ScriptBrief => rest;

export type WriterProvider = { id: string; write: (brief: ScriptBrief, kit: StoryKit, edit?: ScriptEdit, sticky?: Record<string, number> | null) => Script };

/** Variant of a beat for an idea: an independent hash per beat (every combination is reachable). */
export function pickVariant(seed: number, beatId: string, n: number): number {
  // FNV-1a's low bits follow the input's character parity; mix (murmur3 fmix32) before the modulo.
  let h = parseInt(fnv1a(`${seed}:${beatId}`), 16);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) % n;
}

/**
 * `sticky`: the variants this job already chose (from its previous script). A later edit or
 * rerun keeps them, so changing one line never swaps the others.
 */
export function writeScript(brief: ScriptBrief, kit: StoryKit, edit?: ScriptEdit, sticky?: Record<string, number> | null): Script {
  const flags: string[] = [];
  let needsReview = false;
  const lines: ScriptLine[] = kit.beats.map((b: KitBeat) => {
    const kept = sticky?.[b.id];
    const variant = kept !== undefined && kept < b.lines.length ? kept : pickVariant(brief.seed, b.id, b.lines.length);
    const v = b.lines[variant]!;
    let text = v.text;
    let caption = v.caption;
    let origin: ScriptLine['origin'] = 'kit';
    if (b.replaceable && brief.hookLine) {
      text = brief.hookLine;
      origin = 'idea';
      if (caption !== undefined) caption = captionFor(text);
    }
    const e = edit?.lines?.[b.id];
    if (e) {
      if (e.text !== undefined && e.text.trim() && e.text.trim() !== text) {
        text = e.text.trim();
        origin = 'edit';
        if (caption !== undefined && e.caption === undefined) caption = captionFor(text);
      }
      if (e.caption !== undefined) caption = e.caption === null ? undefined : e.caption;
    }
    const pause = e?.pause ?? v.pause;
    const claims = b.claims ?? [];
    for (const ref of claims) {
      const c = brief.claims.find((x) => x.ref === ref);
      if (!c) {
        flags.push(`line "${b.id}" cites "${ref}", which research does not know`);
        needsReview = true;
      } else if (c.status !== 'supported') {
        flags.push(`line "${b.id}" relies on "${ref}" (${c.status}): review before production`);
        needsReview = true;
      }
    }
    const n = wordCount(text);
    if (n > 16) flags.push(`line "${b.id}" has ${n} words: long for one breath`);
    return { id: b.id, section: b.section, label: b.label, text, ...(caption !== undefined ? { caption } : {}), ...(pause !== undefined ? { pause } : {}), claims, origin, variant };
  });
  for (const c of brief.claims) if (c.required && c.status !== 'supported' && !flags.some((f) => f.includes(`"${c.ref}"`))) {
    flags.push(`required claim "${c.ref}" is ${c.status}: review before production`);
    needsReview = true;
  }
  const sections: Record<Section, string[]> = { hook: [], problem: [], explanation: [], payoff: [], cta: [] };
  for (const l of lines) sections[l.section].push(l.id);
  const words = lines.reduce((s, l) => s + wordCount(l.text), 0);
  const estimatedSeconds = Number((words / WORDS_PER_SECOND + lines.reduce((s, l) => s + (l.pause ?? 0) + 0.25, 0) + 1.2).toFixed(1));
  if (estimatedSeconds > 30) flags.push(`about ${estimatedSeconds} s: over the 20–25 s target`);
  return { arc: brief.arc, kit: kit.id, lines, sections, words, estimatedSeconds, flags, needsReview };
}

export const KIT_WRITER: WriterProvider = { id: 'kit', write: writeScript };
