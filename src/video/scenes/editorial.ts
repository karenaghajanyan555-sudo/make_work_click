/**
 * Editorial scene types (pure models): words carry the beat, the UI stays out of the way.
 *
 *   hook       HookScene       headline over the scattered to-dos of the problem
 *   statement  StatementScene  one big line, optional section label and support line
 *   problem    ProblemScene    the pain piling up: messages/tasks stack, unanswered
 *   payoff     PayoffScene     the to-dos get checked off by the system, then the line
 *
 * Beats default from the duration so a narration-timed scene works without hand timing;
 * any beat can be set (or written against a spoken word: src/video/timing.ts).
 */
import { count, ordered, type SceneModel } from './model.ts';

export type MemoItem = { text: string; tag?: string };

// ---------- hook ----------
export type HookProps = {
  /** Phrase markup. */
  headline: string;
  /** Small mono label above the headline (e.g. "N° 002 · Meetings"). */
  eyebrow?: string;
  /** Up to 7 to-do cards scattered on depth planes behind the headline. */
  fragments?: MemoItem[];
  /** Default: the preset's alignment. */
  align?: 'left' | 'center';
  beats?: Partial<{ headline: number; out: number }>;
};
export const HOOK_LAYOUT = { headlineTop: 660, eyebrowGap: 44, lines: 3 } as const;
/** Default headline −0.3 s: already rising at frame 0, so the very first frame reads (QA hook.firstFrame). */
export const hookBeats = (p: HookProps, duration: number) => ({ headline: -0.3, out: Math.max(0.6, duration - 0.42), ...p.beats });

export const hookModel: SceneModel<HookProps> = {
  name: 'HookScene',
  story: 'Open on the problem: a headline over the scattered to-dos it causes.',
  minDuration: 1.6,
  cues: (p, d) => {
    const b = hookBeats(p, d);
    return { start: 0, headline: Math.max(0, b.headline), out: b.out };
  },
  validate: (p, d) => [
    ...count('fragments', p.fragments?.length ?? 0, 0, 7),
    ...(p.headline.trim() ? [] : ['headline is empty']),
    ...ordered(['headline', 'out'], hookBeats(p, d)),
  ],
  sounds: () => [],
};

// ---------- statement ----------
export type StatementProps = {
  text: string;
  label?: string;
  /** Supporting line under the statement (lead role, muted). */
  support?: string;
  align?: 'left' | 'center';
  role?: 'display' | 'title';
  beats?: Partial<{ text: number; support: number; out: number }>;
};
export const statementBeats = (p: StatementProps, _d: number) => ({ text: 0.1, support: 0.75, ...p.beats });

export const statementModel: SceneModel<StatementProps> = {
  name: 'StatementScene',
  story: 'One line, said big. Section openers, turns in the story, the thesis.',
  minDuration: 1.4,
  cues: (p, d) => {
    const b = statementBeats(p, d);
    return { start: 0, text: b.text, ...(p.support ? { support: b.support } : {}), ...(b.out !== undefined ? { out: b.out } : {}) };
  },
  validate: (p, d) => [...(p.text.trim() ? [] : ['text is empty']), ...ordered(['text', 'support', 'out'], statementBeats(p, d))],
  sounds: () => [],
};

// ---------- problem ----------
export type ProblemItem = {
  text: string;
  /** Who/when, mono (e.g. "Leo · 2:14 PM"). */
  meta?: string;
  /** Friction tag in coral (e.g. "No reply"). */
  tag?: string;
};
export type ProblemProps = {
  items: ProblemItem[];
  /** Coral counter that climbs as items land, e.g. "Unanswered". */
  counter?: string;
  beats?: Partial<{ first: number; interval: number }>;
};
export const PROBLEM_LAYOUT = { bottom: 1190, cardHeight: 118, gap: 18, width: 860, depthScale: 0.045, counterTop: 548 } as const;
export const problemBeats = (p: ProblemProps, d: number) => {
  const n = p.items.length;
  const first = p.beats?.first ?? 0.2;
  return { first, interval: p.beats?.interval ?? Math.min(0.45, Math.max(0.18, (d - first - 0.9) / Math.max(1, n - 1))) };
};

export const problemModel: SceneModel<ProblemProps> = {
  name: 'ProblemScene',
  story: 'The pain, piling up: messages and tasks stack faster than anyone answers.',
  minDuration: 1.8,
  cues: (p, d) => {
    const b = problemBeats(p, d);
    const c: Record<string, number> = { start: 0 };
    p.items.forEach((_, k) => (c[`item${k}`] = b.first + k * b.interval));
    return c;
  },
  validate: (p) => count('items', p.items.length, 2, 6),
  sounds: (p) => p.items.map((_, k) => ({ cue: `item${k}`, id: 'tick', variant: k })),
};

// ---------- payoff ----------
export type PayoffItem = MemoItem & { /** What the system did, lime tag (e.g. "Sent"). */ resolved: string };
export type PayoffProps = {
  items: PayoffItem[];
  /** The closing line, phrase markup. */
  statement?: string;
  beats?: Partial<{ items: number; interval: number; statement: number }>;
};
export const PAYOFF_LAYOUT = { rowHeight: 82, gap: 22, statementTop: 330, listCenter: 820 } as const;
export const payoffBeats = (p: PayoffProps, _d: number) => {
  const items = p.beats?.items ?? 0.35;
  const interval = p.beats?.interval ?? 0.26;
  return { items, interval, statement: p.beats?.statement ?? items + (p.items.length - 1) * interval + 0.55 };
};
export const payoffCheckAt = (b: ReturnType<typeof payoffBeats>, k: number) => b.items + k * b.interval;

export const payoffModel: SceneModel<PayoffProps> = {
  name: 'PayoffScene',
  story: 'The resolution: every to-do from the problem, checked off by the system.',
  minDuration: 2,
  cues: (p, d) => {
    const b = payoffBeats(p, d);
    const c: Record<string, number> = { start: 0 };
    p.items.forEach((_, k) => (c[`check${k}`] = payoffCheckAt(b, k)));
    if (p.statement) c.statement = b.statement;
    return c;
  },
  validate: (p) => count('items', p.items.length, 1, 5),
  sounds: (p) => p.items.map((_, k) => ({ cue: `check${k}`, id: 'check', variant: k })),
};
