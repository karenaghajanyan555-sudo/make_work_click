/**
 * Creative diversity (pure): "reuse the engine, not the creative experience" (D46).
 *
 * Every video has a creative record (`content/creative/<id>.ts`): how it opens, which hook
 * mechanism, which narrative structure, which visual metaphor, how it demonstrates, how it ends,
 * the directions that were considered, the review answers and the hypothesis. This module
 * compares a record with the previous five, weighted toward what a viewer experiences as "the
 * same video again", and checks the creative process (≥ 3 genuinely different directions, the
 * strongest suitable one chosen, the review answered).
 *
 * Not scored, ever: the brand constants every video shares on purpose (BRAND_CONSTANTS). They are
 * identity, not repetition.
 *
 * Provenance: every authored field says what it rests on — `observed` (seen in the renders,
 * specs or docs), `reconstructed` (an intention stated in a doc or comment written at the time),
 * `planned` (a new video's plan), `unknown` (no record; never filled in after the fact). Unknown
 * dimensions are left out of a comparison and reported as coverage.
 *
 * Outside every cache key (src/pipeline/cache.ts RENDER_INPUTS / MIX_INPUTS): changing this file
 * or a record never re-renders or re-mixes anything. The thresholds are a judgement (D46): tune
 * them here, tests follow.
 */
import type { VideoSpec } from '../video/spec.ts';
import { computeTimeline } from '../video/timeline.ts';
import { PRESETS } from '../brand/presets.ts';

// ---------------------------------------------------------------- dimensions and weights

/** Identity every video shares on purpose: never scored as repetition. */
export const BRAND_CONSTANTS = [
  'palette (ink, paper, signal lime = the system did it, coral = before)',
  'typography (Geist, Instrument Serif emphasis, Geist Mono labels)',
  'narrator (Bella × Nicole)',
  'spec frame, grain, key light',
  'the MAKE WORK CLICK mark',
] as const;

export type Dimension = 'opening' | 'hook' | 'structure' | 'visual' | 'demonstration' | 'ending' | 'sequence' | 'composition' | 'pacing' | 'motion' | 'sound';

/** Weights: the six core dimensions a viewer notices first carry ~83 % of the score. */
export const DIMENSIONS: Record<Dimension, { label: string; weight: number; core: boolean }> = {
  opening: { label: 'Opening concept', weight: 3, core: true },
  structure: { label: 'Narrative structure', weight: 3, core: true },
  hook: { label: 'Hook mechanism', weight: 2.5, core: true },
  visual: { label: 'Visual storytelling (metaphor)', weight: 2.5, core: true },
  demonstration: { label: 'Demonstration method', weight: 2.5, core: true },
  ending: { label: 'Ending', weight: 2.5, core: true },
  sequence: { label: 'Scene sequence', weight: 1, core: false },
  composition: { label: 'Composition', weight: 0.5, core: false },
  pacing: { label: 'Pacing', weight: 0.5, core: false },
  motion: { label: 'Animation language', weight: 0.5, core: false },
  sound: { label: 'Sound design', weight: 0.5, core: false },
};
export type CoreDimension = 'opening' | 'hook' | 'structure' | 'visual' | 'demonstration' | 'ending';
export const CORE: readonly CoreDimension[] = ['opening', 'hook', 'structure', 'visual', 'demonstration', 'ending'];
const isCore = (d: Dimension): d is CoreDimension => (CORE as readonly string[]).includes(d);

/** Verdict thresholds (judgement, D46). */
export const RULES = {
  /** Weighted similarity to any of the previous five at or above this fails. */
  fail: 0.6,
  /** … at or above this warns. */
  warn: 0.45,
  /** How many previous videos are compared. */
  window: 5,
  /** The immediately previous video may not share these kinds (exact match). */
  backToBack: ['opening', 'structure', 'ending'] as readonly CoreDimension[],
  /** A core kind used by this many of the previous five warns ("a pattern is forming"). */
  patternCount: 3,
  /** Below this share of the total weight known on both sides, a comparison is "insufficient". */
  minCoverage: 0.5,
  /** Directions must differ pairwise in at least this many of DIRECTION_AXES. */
  directionAxes: 2,
  /** A same-family (not same-kind) match counts this much. */
  family: 0.6,
};

// ---------------------------------------------------------------- vocabulary (extend freely)

/**
 * Known kinds per core dimension, with an optional family: two different kinds in one family
 * are "the same idea with a different label" and count RULES.family. Add kinds as new creative
 * directions appear; an unknown kind is a warning (typo or new idea), never silently equal.
 */
export const VOCABULARY: Record<CoreDimension, Record<string, string | null>> = {
  opening: {
    'headline-over-chaos': 'headline', // a headline typing in over scattered to-dos (v001–v009)
    'headline-on-dark': 'headline',
    'question-card': 'headline',
    'counter-running': 'in-motion',
    'timer-running': 'in-motion',
    'collapse-in-progress': 'in-motion',
    'split-race': 'in-motion',
    'result-first': 'result',
    'real-capture': 'result',
    'evidence-close-up': 'evidence',
    'mystery-crop': 'evidence',
    'object-pov': null,
  },
  hook: {
    curiosity: null, discovery: null, pain: null, money: null, time: null, contrarian: 'challenge-belief',
    myth: 'challenge-belief', mistake: null, 'before-after': null, demonstration: null, challenge: null,
    'hidden-feature': null, comparison: null, 'surprising-fact': null, question: null,
  },
  structure: {
    transformation: 'problem-solution', // problem → the system → payoff (v001–v009)
    discovery: 'problem-solution',
    'before-after': 'problem-solution',
    escalation: null,
    investigation: 'evidence-led',
    myth: 'evidence-led',
    'data-explainer': 'evidence-led',
    experiment: 'test',
    'split-comparison': 'test',
    'first-person': 'character',
    'customer-journey': 'character',
    'mystery-reveal': null,
    mistake: null,
    checklist: null,
    'product-demo': 'demo',
    'live-workflow': 'demo',
    'unexpected-use': 'demo',
  },
  visual: {
    'todos-become-workflow': 'todo-resolution', // to-dos flip into flow steps, the switch clicks
    'todos-resolved-by-cards': 'todo-resolution', // UI cards answer the to-dos, checked off
    'paper-trail': 'documents',
    'evidence-board': 'documents',
    'race-lanes': 'race',
    'stopwatch-split': 'race',
    'waiting-object': 'character',
    'machine-cutaway': null,
    'map-journey': null,
    'real-interface': null,
  },
  demonstration: {
    'illustrative-ui-flow': 'illustrative-ui',
    'illustrative-ui-cards': 'illustrative-ui',
    'accurate-simulation': 'illustrative-ui',
    'real-capture': null,
    'document-evidence': null,
    'data-visual': null,
    'typography-only': null,
    'enacted-scenario': null,
  },
  ending: {
    'brand-lockup-cta': 'lockup', // 3–4 s switch + wordmark + CTA (v001–v009)
    'brand-lockup-ad': 'lockup',
    'payoff-integrated': null,
    'recap-card': 'artifact',
    'save-artifact': 'artifact',
    'loop-to-start': null,
    'open-question': null,
    reveal: null,
  },
};

// ---------------------------------------------------------------- records

export type Basis = 'observed' | 'reconstructed' | 'planned' | 'unknown';
/** A value with what it rests on. `unknown` carries no value: never filled in after the fact. */
export type Fact<T> = { basis: Basis; value?: T; source?: string; note?: string };
export type Kinded = { kind: string; description: string };

/** Spec-level facts for a video that has no built spec yet (a plan), same shape as derived. */
export type Plan = {
  scenes: string[];
  preset: string;
  transitions: string[];
  camera: string[];
  harmony: string | null;
  sections: string[];
  seconds: number;
  words: number;
};

export const REVIEW_QUESTIONS = [
  'What makes this video visually different from our last five videos?',
  'What makes its opening different?',
  'Why is this the right storytelling structure for this subject?',
  'What is the strongest moment?',
  'What will viewers learn?',
  'What would make someone share or save it?',
  'Is any scene unnecessary?',
  'Is the ending integrated into the story rather than another generic logo screen?',
] as const;

export type DirectionScores = { subjectFit: number; hookStrength: number; demonstration: number; feasibility: number };
export type Direction = {
  name: string;
  summary: string;
  /** Kinds from VOCABULARY. */
  opening: string;
  structure: string;
  visual: string;
  demonstration: string;
  /** 1–5 each: how well it serves this subject (not how different it is). */
  scores: DirectionScores;
  chosen?: boolean;
  /** Chosen direction: why it suits the subject. */
  suitability?: string;
  /** Other directions: why not. */
  rejectedBecause?: string;
};

export type CreativeRecord = {
  id: string;
  /** Production order (comparison window = the previous RULES.window by seq). */
  seq: number;
  title: string;
  /** legacy = made before D46 (informational checks only); planned = storyboard; built = rendered. */
  status: 'legacy' | 'planned' | 'built';
  subject: Fact<string>;
  opening: Fact<Kinded>;
  hook: Fact<Kinded & { text?: string }>;
  structure: Fact<Kinded>;
  visual: Fact<Kinded>;
  demonstration: Fact<Kinded>;
  ending: Fact<Kinded>;
  /** Why it was made this way, as written at the time (reconstructed) or planned. */
  intent: Fact<string>;
  directions: Fact<Direction[]>;
  review: Fact<Partial<Record<(typeof REVIEW_QUESTIONS)[number], string>>>;
  hypothesis: Fact<string>;
  /** Spec-level plan for a video without a built spec. Ignored once the spec exists. */
  plan?: Fact<Plan>;
  /** The owner's approval of the concept and storyboard (required before a full render). */
  approved?: { date: string; note?: string };
  /** Why the chosen direction is not the highest-scoring passing one (turns that fail into a warning). */
  choiceNote?: string;
  /** Other notes (sources, caveats). */
  notes?: string[];
};

// ---------------------------------------------------------------- derived (from a spec)

export type Derived = Plan & { basis: 'observed' | 'planned'; productShare: number };

/** Scene types that put the light product world (UI windows/cards) on screen. */
const PRODUCT_SCENES = new Set(['chaosToSystem', 'flowRun', 'dashboard', 'notifications', 'timeline', 'comparison', 'data', 'payoff']);

export function deriveFromSpec(spec: VideoSpec, fps = 30): Derived {
  const t = computeTimeline(spec, fps);
  const seconds = t.totalFrames / fps;
  const preset = spec.preset ?? 'editorial';
  const transitions = [...new Set(t.entries.map((e) => e.transitionOut?.type).filter((x): x is NonNullable<typeof x> => Boolean(x)))].sort();
  const camera = [
    ...new Set(
      spec.scenes.flatMap((s) => {
        const p = s.props as Record<string, unknown>;
        return [p.smooth ? 'smooth' : null, typeof p.camera === 'string' ? `camera-${p.camera}` : null, p.glow ? 'glow-follow' : null, p.trails ? 'trails' : null].filter((x): x is string => Boolean(x));
      }),
    ),
  ].sort();
  const words = (spec.narration?.lines ?? []).reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);
  const productFrames = t.entries.filter((e) => PRODUCT_SCENES.has(e.scene.type)).reduce((n, e) => n + e.durationInFrames, 0);
  return {
    basis: 'observed',
    scenes: spec.scenes.map((s) => s.type),
    preset,
    transitions,
    camera,
    harmony: spec.audio?.compose?.harmony ?? (spec.score ? 'hand-written' : null),
    sections: spec.audio?.compose?.sections.map((s) => s.style) ?? [],
    seconds: Number(seconds.toFixed(2)),
    words,
    productShare: Number((productFrames / Math.max(1, t.totalFrames)).toFixed(2)),
  };
}

function fromPlan(p: Plan): Derived {
  const product = p.scenes.filter((s) => PRODUCT_SCENES.has(s)).length / Math.max(1, p.scenes.length);
  return { ...p, basis: 'planned', productShare: Number(product.toFixed(2)) };
}

// ---------------------------------------------------------------- similarity

/** Longest common subsequence length / longer length: 1 = same order of the same things. */
export function sequenceSimilarity(a: readonly string[], b: readonly string[]): number {
  if (!a.length && !b.length) return 1;
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i]![j] = a[i - 1] === b[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
  return dp[a.length]![b.length]! / Math.max(a.length, b.length);
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  const A = new Set(a), B = new Set(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

const closeness = (a: number, b: number) => (a <= 0 && b <= 0 ? 1 : 1 - Math.min(1, Math.abs(a - b) / Math.max(a, b)));

export function kindSimilarity(dim: CoreDimension, a: string, b: string): number {
  if (a === b) return 1;
  const fa = VOCABULARY[dim][a], fb = VOCABULARY[dim][b];
  return fa && fb && fa === fb ? RULES.family : 0;
}

export type DimResult = { dim: Dimension; weight: number; a: string | null; b: string | null; similarity: number | null; match: 'same' | 'family' | 'partial' | 'different' | 'unknown' };
export type Comparison = { other: string; dims: DimResult[]; score: number | null; coverage: number };

const known = <T>(f: Fact<T> | undefined): T | undefined => (f && f.basis !== 'unknown' ? f.value : undefined);

function label(sim: number | null, family = false): DimResult['match'] {
  if (sim === null) return 'unknown';
  if (sim >= 0.999) return 'same';
  if (family) return 'family';
  return sim >= 0.5 ? 'partial' : 'different';
}

export type Profile = { record: CreativeRecord; derived: Derived | null };

export function profile(record: CreativeRecord, spec?: VideoSpec): Profile {
  const plan = known(record.plan);
  return { record, derived: spec ? deriveFromSpec(spec) : plan ? fromPlan(plan) : null };
}

export function compare(x: Profile, y: Profile): Comparison {
  const dims: DimResult[] = [];
  for (const dim of CORE) {
    const a = known(x.record[dim] as Fact<Kinded>)?.kind ?? null;
    const b = known(y.record[dim] as Fact<Kinded>)?.kind ?? null;
    const sim = a && b ? kindSimilarity(dim, a, b) : null;
    dims.push({ dim, weight: DIMENSIONS[dim].weight, a, b, similarity: sim, match: label(sim, sim !== null && sim > 0 && sim < 1) });
  }
  const p = x.derived, q = y.derived;
  const add = (dim: Dimension, a: string | null, b: string | null, sim: number | null) => dims.push({ dim, weight: DIMENSIONS[dim].weight, a, b, similarity: sim === null ? null : Number(sim.toFixed(2)), match: label(sim) });
  if (p && q) {
    add('sequence', p.scenes.join(' → '), q.scenes.join(' → '), sequenceSimilarity(p.scenes, q.scenes));
    const share = (s: number) => (s >= 0.6 ? 'product-led' : s >= 0.3 ? 'mixed' : 'type/graphic-led');
    const align = (preset: string) => PRESETS[preset as keyof typeof PRESETS]?.layout.align ?? preset;
    add('composition', `${align(p.preset)}-aligned, ${share(p.productShare)}`, `${align(q.preset)}-aligned, ${share(q.productShare)}`, 0.5 * Number(align(p.preset) === align(q.preset)) + 0.5 * Number(share(p.productShare) === share(q.productShare)));
    const pace = (d: Derived) => `${(d.seconds / Math.max(1, d.scenes.length)).toFixed(1)} s/scene, ${(d.words / Math.max(1, d.seconds)).toFixed(1)} words/s`;
    add('pacing', pace(p), pace(q), (closeness(p.seconds / p.scenes.length, q.seconds / q.scenes.length) + closeness(p.words / p.seconds, q.words / q.seconds)) / 2);
    add('motion', `${p.preset}: ${[...p.transitions, ...p.camera].join(', ')}`, `${q.preset}: ${[...q.transitions, ...q.camera].join(', ')}`, 0.4 * Number(p.preset === q.preset) + 0.6 * jaccard([...p.transitions, ...p.camera], [...q.transitions, ...q.camera]));
    add('sound', `${p.harmony}: ${p.sections.join(' → ')}`, `${q.harmony}: ${q.sections.join(' → ')}`, 0.5 * Number(p.harmony === q.harmony) + 0.5 * sequenceSimilarity(p.sections, q.sections));
  } else for (const dim of ['sequence', 'composition', 'pacing', 'motion', 'sound'] as const) add(dim, null, null, null);
  const total = Object.values(DIMENSIONS).reduce((n, d) => n + d.weight, 0);
  const knownDims = dims.filter((d) => d.similarity !== null);
  const knownWeight = knownDims.reduce((n, d) => n + d.weight, 0);
  const score = knownWeight ? knownDims.reduce((n, d) => n + d.weight * d.similarity!, 0) / knownWeight : null;
  return { other: y.record.id, dims, score: score === null ? null : Number(score.toFixed(2)), coverage: Number((knownWeight / total).toFixed(2)) };
}

// ---------------------------------------------------------------- evaluation

export type Stage = 'storyboard' | 'render';
export type Finding = { level: 'fail' | 'warn' | 'info'; text: string };
export type DirectionRow = { name: string; chosen: boolean; suitability: number; maxSimilarity: number | null; verdict: 'pass' | 'warn' | 'fail' };
export type Evaluation = {
  id: string;
  stage: Stage;
  status: CreativeRecord['status'];
  verdict: 'PASS' | 'WARN' | 'FAIL';
  comparisons: Comparison[];
  findings: Finding[];
  directions: DirectionRow[];
  derived: Derived | null;
};

/** The previous RULES.window records by seq (most recent first). */
export function previous(record: CreativeRecord, all: readonly CreativeRecord[]): CreativeRecord[] {
  return all.filter((r) => r.seq < record.seq).sort((a, b) => b.seq - a.seq).slice(0, RULES.window);
}

const suitabilityOf = (d: Direction) => d.scores.subjectFit + d.scores.hookStrength + d.scores.demonstration + d.scores.feasibility;
const DIRECTION_AXES = ['opening', 'structure', 'visual', 'demonstration'] as const;

/** Similarity findings for one profile against the window (used for the video and for each direction). */
function judge(me: Profile, window: Profile[]): { comparisons: Comparison[]; findings: Finding[] } {
  const comparisons = window.map((p) => compare(me, p));
  const findings: Finding[] = [];
  for (const c of comparisons) {
    if (c.score === null || c.coverage < RULES.minCoverage) {
      findings.push({ level: 'warn', text: `vs ${c.other}: insufficient data (${Math.round(c.coverage * 100)} % of the weight known on both sides)` });
      continue;
    }
    if (c.score >= RULES.fail) findings.push({ level: 'fail', text: `vs ${c.other}: weighted similarity ${c.score} ≥ ${RULES.fail} (${c.dims.filter((d) => d.match === 'same').map((d) => DIMENSIONS[d.dim].label).join(', ') || 'no identical dimension'} the same)` });
    else if (c.score >= RULES.warn) findings.push({ level: 'warn', text: `vs ${c.other}: weighted similarity ${c.score} ≥ ${RULES.warn}` });
  }
  const last = comparisons[0];
  if (last) for (const d of last.dims.filter((x) => (RULES.backToBack as readonly string[]).includes(x.dim) && x.match === 'same')) findings.push({ level: 'fail', text: `${DIMENSIONS[d.dim].label} "${d.a}" repeats the previous video (${last.other})` });
  for (const dim of CORE) {
    const n = comparisons.filter((c) => c.dims.find((d) => d.dim === dim)?.match === 'same').length;
    if (n >= RULES.patternCount) findings.push({ level: 'warn', text: `${DIMENSIONS[dim].label} is the same as in ${n} of the last ${comparisons.length} videos` });
  }
  return { comparisons, findings };
}

const verdictOf = (f: readonly Finding[]): Evaluation['verdict'] => (f.some((x) => x.level === 'fail') ? 'FAIL' : f.some((x) => x.level === 'warn') ? 'WARN' : 'PASS');

export function evaluate(record: CreativeRecord, history: readonly CreativeRecord[], o: { stage: Stage; specs?: ReadonlyMap<string, VideoSpec> }): Evaluation {
  const specs = o.specs ?? new Map<string, VideoSpec>();
  const me = profile(record, specs.get(record.id));
  const window = previous(record, history).map((r) => profile(r, specs.get(r.id)));
  const { comparisons, findings } = judge(me, window);
  const legacy = record.status === 'legacy';

  // Vocabulary: an unknown kind is a typo or a new idea — say so, never treat it as equal.
  for (const dim of CORE) {
    const f = record[dim] as Fact<Kinded>;
    if (f.basis === 'unknown') { if (!legacy) findings.push({ level: 'fail', text: `${DIMENSIONS[dim].label}: not decided` }); continue; }
    const kind = f.value?.kind ?? '';
    if (!(kind in VOCABULARY[dim])) findings.push({ level: legacy ? 'warn' : kind && !/todo/i.test(kind) ? 'warn' : 'fail', text: `${DIMENSIONS[dim].label}: kind "${kind}" is not in the vocabulary (src/creative/diversity.ts) — add it if it is a new idea` });
    if (!legacy && !f.value?.description?.trim()) findings.push({ level: 'fail', text: `${DIMENSIONS[dim].label}: no description` });
  }

  // Provenance: a legacy record never claims a plan, and planned facts belong to new videos.
  if (legacy) {
    for (const [k, v] of Object.entries(record)) if (v && typeof v === 'object' && 'basis' in v && (v as Fact<unknown>).basis === 'planned') findings.push({ level: 'fail', text: `legacy record: "${k}" claims basis "planned"` });
    findings.push({ level: 'info', text: 'legacy video (made before D46): process checks do not apply; similarity is informational' });
  }

  // Process: directions, choice, review, hypothesis (new videos only).
  const rows: DirectionRow[] = [];
  if (!legacy) {
    const dirs = known(record.directions) ?? [];
    if (dirs.length < 3) findings.push({ level: 'fail', text: `${dirs.length} creative direction(s) recorded; at least 3 substantially different ones are required` });
    for (let i = 0; i < dirs.length; i++)
      for (let j = i + 1; j < dirs.length; j++) {
        const a = dirs[i]!, b = dirs[j]!;
        const differ = DIRECTION_AXES.filter((ax) => kindSimilarity(ax, a[ax], b[ax]) < 1).length;
        if (differ < RULES.directionAxes) findings.push({ level: 'fail', text: `directions "${a.name}" and "${b.name}" differ in ${differ} of ${DIRECTION_AXES.length} axes (opening, structure, visual, demonstration); they must differ in ≥ ${RULES.directionAxes}` });
      }
    for (const d of dirs) {
      const r: CreativeRecord = { ...record, opening: kindFact(d.opening), structure: kindFact(d.structure), visual: kindFact(d.visual), demonstration: kindFact(d.demonstration) };
      const j = judge(profile(r, specs.get(record.id)), window);
      const max = j.comparisons.reduce<number | null>((m, c) => (c.score === null ? m : Math.max(m ?? 0, c.score)), null);
      rows.push({ name: d.name, chosen: Boolean(d.chosen), suitability: suitabilityOf(d), maxSimilarity: max, verdict: j.findings.some((x) => x.level === 'fail') ? 'fail' : j.findings.some((x) => x.level === 'warn') ? 'warn' : 'pass' });
    }
    const chosen = dirs.filter((d) => d.chosen);
    if (dirs.length && chosen.length !== 1) findings.push({ level: 'fail', text: `${chosen.length} directions marked chosen; exactly one must be` });
    const c = chosen[0];
    if (c) {
      if (!c.suitability || c.suitability.trim().length < 40) findings.push({ level: 'fail', text: `chosen direction "${c.name}": say why it suits this subject (suitability, ≥ 40 characters)` });
      for (const d of dirs.filter((x) => !x.chosen)) if (!d.rejectedBecause?.trim()) findings.push({ level: 'fail', text: `direction "${d.name}": say why it was not chosen (rejectedBecause)` });
      for (const ax of DIRECTION_AXES) {
        const v = known(record[ax] as Fact<Kinded>)?.kind;
        if (v && v !== c[ax]) findings.push({ level: 'fail', text: `${DIMENSIONS[ax].label}: the record says "${v}" but the chosen direction says "${c[ax]}"` });
      }
      const passing = rows.filter((r) => r.verdict !== 'fail');
      const best = passing.reduce<DirectionRow | null>((b, r) => (!b || r.suitability > b.suitability ? r : b), null);
      if (best && best.name !== c.name && best.suitability > suitabilityOf(c))
        findings.push({ level: record.choiceNote?.trim() ? 'warn' : 'fail', text: `"${best.name}" scores higher on suitability (${best.suitability} vs ${suitabilityOf(c)}) and passes the diversity check${record.choiceNote?.trim() ? `; choice note: ${record.choiceNote}` : ': choose it, or explain in choiceNote'}` });
      const mine = rows.find((r) => r.name === c.name);
      if (mine?.verdict === 'fail') findings.push({ level: 'fail', text: `the chosen direction fails the diversity check` });
    }
    const answers = known(record.review) ?? {};
    const missing = REVIEW_QUESTIONS.filter((q) => (answers[q]?.trim().length ?? 0) < 20);
    if (missing.length) findings.push({ level: o.stage === 'render' ? 'fail' : 'warn', text: `creative review: ${missing.length} of ${REVIEW_QUESTIONS.length} questions unanswered${o.stage === 'render' ? ' (required before rendering)' : ' (answer before rendering)'}` });
    if (!record.approved?.date) findings.push({ level: o.stage === 'render' ? 'fail' : 'info', text: o.stage === 'render' ? 'the owner has not approved the concept and storyboard (record.approved)' : 'awaiting the owner\'s approval of the concept (record.approved) — required before a full render' });
    if (!known(record.hypothesis)?.trim()) findings.push({ level: o.stage === 'render' ? 'fail' : 'warn', text: 'no hypothesis (what we expect from the audience, and why)' });
    if (!me.derived) findings.push({ level: 'warn', text: 'no spec and no plan: scene sequence, composition, pacing, motion and sound not compared' });
  }

  return { id: record.id, stage: o.stage, status: record.status, verdict: verdictOf(findings), comparisons, findings, directions: rows, derived: me.derived };
}

const kindFact = (kind: string): Fact<Kinded> => ({ basis: 'planned', value: { kind, description: kind } });

// ---------------------------------------------------------------- report

const pct = (x: number | null) => (x === null ? '—' : x.toFixed(2));

export function report(e: Evaluation, record: CreativeRecord): string {
  const L: string[] = [];
  L.push(`# Creative diversity — ${record.id}`, '');
  L.push(`**Verdict: ${e.verdict}** · stage: ${e.stage} · status: ${e.status} · compared with the previous ${e.comparisons.length}: ${e.comparisons.map((c) => c.other).join(', ') || '—'}`, '');
  L.push(`Subject: ${record.subject.value ?? '(unknown)'} [${record.subject.basis}]`, '');
  if (e.findings.length) {
    L.push('## Findings');
    for (const f of e.findings) L.push(`- ${f.level === 'fail' ? '✗ FAIL' : f.level === 'warn' ? '△ WARN' : '· info'} — ${f.text}`);
    L.push('');
  }
  L.push('## Weighted similarity (1 = the same experience; FAIL ≥ ' + RULES.fail + ', WARN ≥ ' + RULES.warn + ')', '');
  L.push(`| Dimension | Weight | ${record.id} | ${e.comparisons.map((c) => c.other).join(' | ')} |`);
  L.push(`|---|---|---|${e.comparisons.map(() => '---').join('|')}|`);
  for (const dim of Object.keys(DIMENSIONS) as Dimension[]) {
    const mine = e.comparisons[0]?.dims.find((d) => d.dim === dim)?.a ?? (isCore(dim) ? ((record[dim] as Fact<Kinded>).value?.kind ?? 'unknown') : '—');
    const cells = e.comparisons.map((c) => {
      const d = c.dims.find((x) => x.dim === dim)!;
      return d.similarity === null ? 'unknown' : `${d.match} (${d.similarity.toFixed(2)})${isCore(dim) ? `: ${d.b}` : ''}`;
    });
    L.push(`| ${DIMENSIONS[dim].label} | ${DIMENSIONS[dim].weight} | ${mine ?? '—'} | ${cells.join(' | ')} |`);
  }
  L.push(`| **Weighted similarity** | | | ${e.comparisons.map((c) => `**${pct(c.score)}** (coverage ${Math.round(c.coverage * 100)} %)`).join(' | ')} |`, '');
  L.push(`Not scored (brand identity, shared on purpose): ${BRAND_CONSTANTS.join(' · ')}.`, '');
  if (e.directions.length) {
    L.push('## Creative directions considered', '', '| Direction | Chosen | Suitability (of 20) | Max similarity to the last five | Diversity |', '|---|---|---|---|---|');
    for (const d of e.directions) L.push(`| ${d.name} | ${d.chosen ? '✓' : ''} | ${d.suitability} | ${pct(d.maxSimilarity)} | ${d.verdict} |`);
    L.push('');
  }
  L.push('## Provenance', '');
  for (const k of ['subject', 'opening', 'hook', 'structure', 'visual', 'demonstration', 'ending', 'intent', 'directions', 'review', 'hypothesis'] as const) {
    const f = record[k] as Fact<unknown>;
    const v = f.value === undefined ? '' : typeof f.value === 'string' ? f.value : k === 'directions' ? `${(f.value as Direction[]).length} directions` : k === 'review' ? `${Object.keys(f.value as object).length} answers` : ((f.value as Kinded).description ?? '');
    L.push(`- **${k}** [${f.basis}]${v ? `: ${v}` : ''}${f.source ? ` — source: ${f.source}` : ''}${f.note ? ` — ${f.note}` : ''}`);
  }
  if (e.derived) L.push('', `Spec facts (${e.derived.basis}): ${e.derived.scenes.join(' → ')} · ${e.derived.seconds} s · ${e.derived.words} words · preset ${e.derived.preset} · transitions ${e.derived.transitions.join(', ') || '—'} · harmony ${e.derived.harmony ?? '—'}`);
  return L.join('\n') + '\n';
}
