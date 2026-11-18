/**
 * Editorial QA (pure, deterministic): a structured report a person reads before deciding.
 * Separate from technical QA (src/pipeline/qa.ts: is the file correct?). This asks: is the
 * story clear, honest and on brand? Each item is a measured value against a stated rule:
 *   ok       within the rule
 *   look     worth a look (taste may accept it)
 *   problem  breaks a studio rule (docs/STORY.md, docs/BRAND.md, claims policy)
 * It never approves and never blocks: the verdict is always "needs your review"; the
 * owner's decision in the Control Center is the only approval. Rule numbers come from
 * docs/STORY.md (20–25 s, hook in ~3 s, ≤ 7-word caption phrases, one CTA) and the kit writer.
 */
import type { TimingLock } from '../video/timing.ts';
import type { ClaimResult } from './research.ts';
import type { Storyboard } from './storyboard.ts';
import type { Script } from './writer.ts';

export type EditorialArea = 'hook' | 'clarity' | 'progression' | 'repetition' | 'pacing' | 'variety' | 'claims' | 'cta' | 'brand';
export type EditorialItem = { id: string; area: EditorialArea; status: 'ok' | 'look' | 'problem'; measure: string; rule: string };
export type EditorialReport = {
  verdict: 'needs your review';
  /** Always false: editorial QA informs the decision, it never makes it. */
  approves: false;
  summary: string;
  attention: number;
  problems: number;
  items: EditorialItem[];
};

export type EditorialInput = {
  script: Pick<Script, 'lines' | 'sections'>;
  storyboard: Pick<Storyboard, 'scenes'>;
  /** Scene durations as rendered (seconds). */
  scenes: Array<{ id: string; type: string; duration: number }>;
  lock: Pick<TimingLock, 'voice' | 'lines'>;
  claims: ClaimResult[];
  /** Technical QA results (id, status, detail): pacing is read from them. */
  technical: Array<{ id: string; status: string; detail: string }>;
  preset: string;
  publishCaption: string;
  brand: { cta: string; disclosure: string; narrator: string; presets: string[] };
};

export const EDITORIAL_RULES = {
  hookWords: [3, 10] as const,
  hookSeconds: { ok: 3, look: 3.6 },
  lineWords: { ok: 16, look: 20 },
  readingEase: { ok: 60, look: 50 },
  wordsPerSecond: { min: 2.0, max: 3.3 },
  totalSeconds: { ok: [18, 27] as const, look: [15, 32] as const },
  sceneSeconds: { min: 1.2, look: 8 },
  distinctScenes: { ok: 3, look: 2 },
  repeatedTermLines: 3,
  order: ['hook', 'problem', 'explanation', 'payoff', 'cta'] as const,
} as const;

const STOP = new Set('a an the and or but of to in on at by for with from is are was be it its this that you your we our they them their so then than not no just more one every each'.split(' '));
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').split(/\s+/).filter(Boolean);
/** Syllables, English heuristic (vowel groups, silent final e). Good enough for a readability band. */
export function syllables(w: string): number {
  const x = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!x) return 0;
  if (x.length <= 3) return 1;
  const groups = x.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}
/** Flesch reading ease (higher = easier; 60–70 is plain English). */
export function readingEase(lines: string[]): number {
  const ws = lines.flatMap(words);
  if (!ws.length) return 0;
  const sentences = Math.max(1, lines.join(' ').split(/[.!?]+/).filter((s) => s.trim()).length);
  const syl = ws.reduce((s, w) => s + syllables(w), 0);
  return 206.835 - 1.015 * (ws.length / sentences) - 84.6 * (syl / ws.length);
}

export function editorialReview(inp: EditorialInput): EditorialReport {
  const R = EDITORIAL_RULES;
  const items: EditorialItem[] = [];
  const add = (id: string, area: EditorialArea, status: EditorialItem['status'], measure: string, rule: string) => items.push({ id, area, status, measure, rule });
  const lines = inp.script.lines;
  const dur = (id: string) => inp.lock.lines.find((l) => l.id === id)?.duration ?? 0;

  // ---- hook ----
  const hook = lines.find((l) => l.section === 'hook');
  if (!hook) add('hook.present', 'hook', 'problem', 'no hook line', 'every video opens on a spoken hook');
  else {
    const n = words(hook.text).length;
    add('hook.length', 'hook', n >= R.hookWords[0] && n <= R.hookWords[1] ? 'ok' : 'problem', `${n} words: "${hook.text}"`, `${R.hookWords[0]}–${R.hookWords[1]} words`);
    const s = dur(hook.id);
    add('hook.time', 'hook', s <= R.hookSeconds.ok ? 'ok' : s <= R.hookSeconds.look ? 'look' : 'problem', `spoken in ${s.toFixed(2)} s`, `said within ${R.hookSeconds.ok} s (the scroll decision)`);
    const pain = /\b(you|your|stop\w*|never|still|again|same|every|without|chas\w*|forg[eo]t\w*|lost|late|by hand|no more|shouldn['’]t|don['’]t|can['’]t)\b/i.test(hook.text);
    add('hook.tension', 'hook', pain ? 'ok' : 'look', pain ? 'names the viewer or the friction' : 'no viewer or friction word', 'the hook names the viewer\'s problem (heuristic: you/your, stop, again, by hand, …)');
  }

  // ---- clarity ----
  const longest = lines.reduce((m, l) => Math.max(m, words(l.text).length), 0);
  add('clarity.lineLength', 'clarity', longest <= R.lineWords.ok ? 'ok' : longest <= R.lineWords.look ? 'look' : 'problem', `longest line ${longest} words`, `≤ ${R.lineWords.ok} words per line (one breath)`);
  const ease = readingEase(lines.map((l) => l.text));
  add('clarity.readingEase', 'clarity', ease >= R.readingEase.ok ? 'ok' : ease >= R.readingEase.look ? 'look' : 'problem', `Flesch reading ease ${ease.toFixed(0)}`, `≥ ${R.readingEase.ok} (plain spoken English)`);
  const spoken = inp.lock.lines.reduce((s, l) => s + l.duration, 0);
  const wps = lines.reduce((s, l) => s + words(l.text).length, 0) / Math.max(0.1, spoken);
  add('clarity.pace', 'clarity', wps >= R.wordsPerSecond.min && wps <= R.wordsPerSecond.max ? 'ok' : 'look', `${wps.toFixed(2)} words/s spoken`, `${R.wordsPerSecond.min}–${R.wordsPerSecond.max} words/s`);

  // ---- progression ----
  const seq = lines.map((l) => l.section);
  const missing = R.order.filter((s) => !seq.includes(s) && s !== 'problem');
  const ranks = seq.map((s) => R.order.indexOf(s));
  const inOrder = ranks.every((r, i) => i === 0 || r >= ranks[i - 1]!);
  add('progression.order', 'progression', missing.length ? 'problem' : inOrder ? 'ok' : 'look', `${seq.join(' → ')}`, 'hook → (problem) → explanation → payoff → CTA, each once, in order');

  // ---- repetition ----
  const termLines = new Map<string, Set<string>>();
  for (const l of lines.filter((x) => x.section !== 'cta')) for (const w of words(l.text)) if (w.length >= 4 && !STOP.has(w)) termLines.set(w, (termLines.get(w) ?? new Set()).add(l.id));
  const repeated = [...termLines].filter(([, s]) => s.size >= R.repeatedTermLines).map(([w, s]) => `"${w}" ×${s.size}`);
  add('repetition.words', 'repetition', repeated.length ? 'look' : 'ok', repeated.length ? repeated.join(', ') : 'no content word in 3+ lines', `no content word repeated in ${R.repeatedTermLines}+ lines (unless it is the point)`);
  const openers = lines.map((l) => words(l.text)[0]);
  const sameOpen = openers.filter((w, i) => i > 0 && w === openers[i - 1] && !STOP.has(w!));
  add('repetition.openers', 'repetition', sameOpen.length ? 'look' : 'ok', sameOpen.length ? `consecutive lines start with "${sameOpen.join('", "')}"` : 'consecutive lines open differently', 'consecutive lines do not open with the same word');
  const backToBack = inp.scenes.filter((s, i) => i > 0 && s.type === inp.scenes[i - 1]!.type).map((s) => s.id);
  add('repetition.scenes', 'repetition', backToBack.length ? 'look' : 'ok', backToBack.length ? `same scene type twice in a row at ${backToBack.join(', ')}` : 'no scene type twice in a row', 'each scene looks different from the last');

  // ---- pacing + variety ----
  const total = inp.scenes.reduce((s, x) => s + x.duration, 0);
  const T = R.totalSeconds;
  add('pacing.total', 'pacing', total >= T.ok[0] && total <= T.ok[1] ? 'ok' : total >= T.look[0] && total <= T.look[1] ? 'look' : 'problem', `${total.toFixed(1)} s`, `${T.ok[0]}–${T.ok[1]} s (target 20–25 s)`);
  const shortest = inp.scenes.reduce((m, s) => (s.duration < m.duration ? s : m), inp.scenes[0]!);
  const longestScene = inp.scenes.reduce((m, s) => (s.duration > m.duration ? s : m), inp.scenes[0]!);
  // A long scene is fine while it keeps moving (the signature flow run is one continuous
  // camera move); motion itself is pacing.motion. Too short to read is the problem.
  add('pacing.sceneLength', 'pacing', shortest.duration < R.sceneSeconds.min ? 'problem' : longestScene.duration > R.sceneSeconds.look ? 'look' : 'ok', `scenes ${shortest.duration.toFixed(1)}–${longestScene.duration.toFixed(1)} s (${shortest.id} … ${longestScene.id})`, `each scene ≥ ${R.sceneSeconds.min} s; over ${R.sceneSeconds.look} s it must keep moving (see pacing.motion)`);
  const stat = inp.technical.find((c) => c.id === 'pacing.static');
  if (stat) add('pacing.motion', 'pacing', stat.status === 'pass' ? 'ok' : stat.status === 'warn' ? 'look' : 'problem', stat.detail, 'no stretch without meaningful motion over 1.2 s (technical QA measure)');
  const distinct = new Set(inp.scenes.map((s) => s.type)).size;
  add('variety.sceneTypes', 'variety', distinct >= R.distinctScenes.ok ? 'ok' : distinct >= R.distinctScenes.look ? 'look' : 'problem', `${distinct} scene types: ${[...new Set(inp.scenes.map((s) => s.type))].join(', ')}`, `≥ ${R.distinctScenes.ok} different scene types`);

  // ---- claims ----
  const facts = inp.claims.filter((c) => c.kind === 'fact');
  const cited = new Set(lines.flatMap((l) => l.claims));
  const unsupported = facts.filter((c) => cited.has(c.ref) && c.status !== 'supported');
  add('claims.cited', 'claims', unsupported.length ? 'problem' : 'ok', unsupported.length ? unsupported.map((c) => `"${c.ref}" is ${c.status} (${c.note ?? ''})`).join('; ') : `${[...cited].length} cited claim(s), all supported${facts.filter((c) => cited.has(c.ref)).map((c) => ` (${c.ref}: ${c.confidence ?? '?'} confidence)`).join('')}`, 'a line states a fact only if research found it directly supported');
  const contradicted = facts.filter((c) => c.status === 'contradicted');
  if (contradicted.length) add('claims.contradicted', 'claims', 'problem', contradicted.map((c) => `"${c.ref}": ${c.note}`).join('; '), 'no contradicted source behind the video');
  const figures = lines.filter((l) => /\d/.test(l.text) && !l.claims.length).map((l) => `"${l.text}"`);
  add('claims.figures', 'claims', figures.length ? 'look' : 'ok', figures.length ? `figures without a cited claim: ${figures.join(', ')}` : 'no spoken figures without a source', 'spoken numbers are sourced, or clearly part of the fictional example');

  // ---- CTA ----
  const cta = lines.filter((l) => l.section === 'cta');
  const last = lines.at(-1);
  add('cta.present', 'cta', cta.length === 1 && last?.section === 'cta' ? 'ok' : 'problem', cta.length ? `${cta.length} CTA line(s), last line: "${last?.text}"` : 'no CTA line', 'exactly one CTA, as the last line');
  if (cta[0]) add('cta.brand', 'cta', cta[0].text === inp.brand.cta ? 'ok' : 'look', `"${cta[0].text}"`, `the studio CTA: "${inp.brand.cta}"`);
  const end = inp.scenes.at(-1);
  add('cta.endCard', 'cta', end?.type === 'endCard' && end.duration >= 1.5 ? 'ok' : 'look', end ? `last scene ${end.type}, ${end.duration.toFixed(1)} s` : 'no scenes', 'ends on the brand end card, ≥ 1.5 s');

  // ---- brand ----
  add('brand.narrator', 'brand', inp.lock.voice === inp.brand.narrator ? 'ok' : 'problem', `voice ${inp.lock.voice}`, `the studio narrator (${inp.brand.narrator})`);
  add('brand.preset', 'brand', inp.brand.presets.includes(inp.preset) ? 'ok' : 'problem', `preset ${inp.preset}`, `a brand preset (${inp.brand.presets.join(', ')})`);
  add('brand.disclosure', 'brand', inp.publishCaption.includes(inp.brand.disclosure) ? 'ok' : 'problem', inp.publishCaption.includes(inp.brand.disclosure) ? 'post copy carries the AI + fiction disclosure' : 'post copy has no disclosure', `"${inp.brand.disclosure}" in the caption`);
  const sceneSaysAll = lines.every((l) => inp.storyboard.scenes.some((s) => s.say.includes(l.id)));
  add('brand.everyLineOnScreen', 'brand', sceneSaysAll ? 'ok' : 'look', sceneSaysAll ? 'every spoken line belongs to a scene' : `lines no scene says: ${lines.filter((l) => !inp.storyboard.scenes.some((s) => s.say.includes(l.id))).map((l) => l.id).join(', ')}`, 'every line is spoken over the scene that shows it');

  const problems = items.filter((i) => i.status === 'problem').length;
  const attention = items.filter((i) => i.status !== 'ok').length;
  return {
    verdict: 'needs your review',
    approves: false,
    summary: `${items.length} editorial checks: ${problems} problem(s), ${attention - problems} to look at. Editorial QA never approves: watch the video and decide.`,
    attention,
    problems,
    items,
  };
}

/** The report as Markdown (out/<id>/qa/editorial.md). */
export function editorialMarkdown(videoId: string, r: EditorialReport): string {
  const icon = { ok: 'ok', look: 'LOOK', problem: 'PROBLEM' } as const;
  return [
    `# Editorial QA — ${videoId}`,
    '',
    `**${r.verdict}** · ${r.summary}`,
    '',
    '| Area | Check | Status | Measured | Rule |',
    '|---|---|---|---|---|',
    ...r.items.map((i) => `| ${i.area} | ${i.id} | ${icon[i.status]} | ${i.measure.replace(/\|/g, '/')} | ${i.rule.replace(/\|/g, '/')} |`),
    '',
    'Technical QA (report.md) checks the file. This report checks the story; neither approves the video.',
    '',
  ].join('\n');
}
