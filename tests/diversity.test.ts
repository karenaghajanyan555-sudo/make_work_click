import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { VIDEOS } from '../content/index.ts';
import { PRODUCTIONS } from '../content/productions/index.ts';
import { RECORDS, getRecord } from '../content/creative/index.ts';
import {
  BRAND_CONSTANTS, CORE, DIMENSIONS, REVIEW_QUESTIONS, RULES, compare, deriveFromSpec, evaluate, kindSimilarity, profile, report, sequenceSimilarity,
  type CreativeRecord, type Direction, type Fact,
} from '../src/creative/diversity.ts';
import { GATE_EXEMPT, gate } from '../src/creative/gate.ts';
import { MIX_INPUTS, RENDER_INPUTS } from '../src/pipeline/cache.ts';
import type { VideoSpec } from '../src/video/spec.ts';

const SPECS = new Map<string, VideoSpec>(VIDEOS.map((v) => [v.id, v]));
const PRODUCTION_IDS = new Set(PRODUCTIONS.map((p) => p.id));
/** Fixture tests compare against the six videos made before D46 (planned records like v010 come later). */
const LEGACY = RECORDS.filter((r) => r.status === 'legacy');
const planned = <T>(value: T): Fact<T> => ({ basis: 'planned', value });
const k = (kind: string) => planned({ kind, description: `${kind} (test)` });
const ANSWERS = Object.fromEntries(REVIEW_QUESTIONS.map((q) => [q, `A considered answer to: ${q}`]));

const dir = (name: string, o: Partial<Direction>): Direction => ({
  name, summary: `${name} summary`, opening: 'evidence-close-up', structure: 'investigation', visual: 'paper-trail', demonstration: 'document-evidence',
  scores: { subjectFit: 3, hookStrength: 3, demonstration: 3, feasibility: 3 }, rejectedBecause: 'weaker fit for this subject', ...o,
});

/** A new video that differs from the legacy six on every core dimension. */
function fresh(o: Partial<CreativeRecord> = {}): CreativeRecord {
  return {
    id: 'v999-test', seq: 99, title: 'Test', status: 'planned',
    subject: planned('A test subject'),
    opening: k('evidence-close-up'), hook: k('myth'), structure: k('investigation'), visual: k('paper-trail'), demonstration: k('document-evidence'), ending: k('save-artifact'),
    intent: planned('Because the subject is a misquoted number, the evidence is the story.'),
    directions: planned([
      dir('Paper trail', { chosen: true, rejectedBecause: undefined, suitability: 'The subject is a misquoted statistic; tracing it to the source is the story itself.', scores: { subjectFit: 5, hookStrength: 4, demonstration: 4, feasibility: 4 } }),
      dir('Race', { opening: 'timer-running', structure: 'experiment', visual: 'race-lanes', demonstration: 'data-visual' }),
      dir('The waiting task', { opening: 'object-pov', structure: 'first-person', visual: 'waiting-object', demonstration: 'enacted-scenario' }),
    ]),
    review: planned(ANSWERS),
    hypothesis: planned('Skip rate below our baseline because the opening is a number already ticking.'),
    plan: planned({ scenes: ['statement', 'data', 'timeline', 'payoff'], preset: 'minimal', transitions: ['fade', 'wipe'], camera: [], harmony: 'focus', sections: ['intro', 'lift', 'home'], seconds: 30, words: 80 }),
    approved: { date: '2026-11-18', note: 'test' },
    ...o,
  };
}
const legacyLike = (id: string, seq: number): CreativeRecord => ({ ...getRecord(id)!, id: `copy-of-${id}`, seq, status: 'planned' });

test('diversity: brand constants are never scored; the six core dimensions carry the weight', () => {
  const dims = Object.keys(DIMENSIONS).join(' ');
  for (const word of ['palette', 'colour', 'color', 'typography', 'font', 'narrator', 'voice', 'logo', 'grain']) assert.ok(!dims.includes(word), word);
  assert.ok(BRAND_CONSTANTS.length >= 4);
  const total = Object.values(DIMENSIONS).reduce((n, d) => n + d.weight, 0);
  const core = CORE.reduce((n, d) => n + DIMENSIONS[d].weight, 0);
  assert.ok(core / total >= 0.8, `core share ${core / total}`);
  for (const d of CORE) assert.ok(DIMENSIONS[d].weight >= 2.5, d);
  for (const [d, v] of Object.entries(DIMENSIONS)) if (!v.core) assert.ok(v.weight <= 1, d);
});

test('diversity: legacy records state provenance and never invent decisions', () => {
  assert.equal(LEGACY.length, 6);
  for (const r of RECORDS.filter((x) => x.status === 'legacy')) {
    assert.ok(SPECS.has(r.id), `${r.id} has a spec`);
    for (const key of ['subject', 'opening', 'hook', 'structure', 'visual', 'demonstration', 'ending', 'intent', 'directions', 'review', 'hypothesis'] as const) {
      const f = r[key] as Fact<unknown>;
      assert.ok(['observed', 'reconstructed', 'unknown'].includes(f.basis), `${r.id}.${key}: ${f.basis}`);
      if (f.basis === 'unknown') assert.equal(f.value, undefined, `${r.id}.${key}: unknown carries no value`);
      else assert.ok(f.source, `${r.id}.${key}: ${f.basis} needs a source`);
    }
    for (const key of ['directions', 'review', 'hypothesis'] as const) assert.equal(r[key].basis, 'unknown', `${r.id}.${key} was never recorded`);
    assert.equal(r.intent.basis, 'reconstructed');
    assert.equal(r.plan, undefined);
  }
  assert.deepEqual([...RECORDS].map((r) => r.seq), [...new Set(RECORDS.map((r) => r.seq))], 'unique seq');
});

test('diversity: the existing videos would have been caught (same plot, new topic)', () => {
  const sim = (a: string, b: string) => compare(profile(getRecord(a)!, SPECS.get(a)), profile(getRecord(b)!, SPECS.get(b))).score!;
  assert.ok(sim('v009-sale-does-the-rest', 'v008-bookings-run-themselves') >= RULES.fail);
  assert.ok(sim('v008-bookings-run-themselves', 'v003-invoices-chase-themselves') >= RULES.fail);
  const e = evaluate(legacyLike('v009-sale-does-the-rest', 99), LEGACY, { stage: 'storyboard', specs: SPECS });
  assert.equal(e.verdict, 'FAIL');
  assert.ok(e.findings.some((f) => /repeats the previous video/.test(f.text)));
});

test('diversity: a genuinely different video passes; spec facts come from the spec', () => {
  const e = evaluate(fresh(), LEGACY, { stage: 'render', specs: SPECS });
  assert.equal(e.verdict, 'PASS', e.findings.map((f) => f.text).join('\n'));
  assert.equal(e.comparisons.length, RULES.window);
  assert.deepEqual(e.comparisons.map((c) => c.other), ['v009-sale-does-the-rest', 'v008-bookings-run-themselves', 'v004-client-onboarding-runs', 'v003-invoices-chase-themselves', 'v002-meetings']);
  for (const c of e.comparisons) assert.ok(c.score! < RULES.warn, `${c.other} ${c.score}`);
  assert.deepEqual(deriveFromSpec(SPECS.get('v008-bookings-run-themselves')!).scenes, ['chaosToSystem', 'flowRun', 'endCard']);
  const md = report(e, fresh());
  assert.match(md, /Verdict: PASS/);
  assert.match(md, /Not scored \(brand identity/);
});

test('diversity: back-to-back repeats of opening, structure or ending fail on their own', () => {
  const e = evaluate(fresh({ opening: k('headline-over-chaos') }), LEGACY, { stage: 'storyboard', specs: SPECS });
  assert.equal(e.verdict, 'FAIL');
  assert.ok(e.findings.some((f) => /Opening concept "headline-over-chaos" repeats the previous video/.test(f.text)));
  assert.ok(e.comparisons[0]!.score! < RULES.fail, 'the weighted score alone would not have failed it');
});

test('diversity: families, sequences and unknowns', () => {
  assert.equal(kindSimilarity('ending', 'brand-lockup-cta', 'brand-lockup-ad'), RULES.family);
  assert.equal(kindSimilarity('ending', 'brand-lockup-cta', 'loop-to-start'), 0);
  assert.equal(sequenceSimilarity(['a', 'b', 'c'], ['a', 'b', 'c']), 1);
  assert.equal(sequenceSimilarity(['a', 'b', 'c'], ['x', 'y']), 0);
  const thin = fresh({ hook: { basis: 'unknown' }, structure: { basis: 'unknown' }, visual: { basis: 'unknown' }, demonstration: { basis: 'unknown' }, ending: { basis: 'unknown' }, plan: undefined });
  const c = compare(profile(thin), profile(getRecord('v009-sale-does-the-rest')!));
  assert.ok(c.coverage < RULES.minCoverage);
  const e = evaluate({ ...thin, status: 'legacy' }, LEGACY, { stage: 'storyboard' });
  assert.ok(e.findings.some((f) => f.level === 'warn' && /insufficient data/.test(f.text)));
});

test('diversity: directions must be three, genuinely different, and the strongest suitable one chosen', () => {
  const dirs = fresh().directions.value!;
  const two = evaluate(fresh({ directions: planned(dirs.slice(0, 2)) }), LEGACY, { stage: 'storyboard', specs: SPECS });
  assert.ok(two.findings.some((f) => f.level === 'fail' && /at least 3/.test(f.text)));
  const clones = evaluate(fresh({ directions: planned([dirs[0]!, dir('B', { visual: 'evidence-board' }), dir('C', { demonstration: 'data-visual' })]) }), LEGACY, { stage: 'storyboard', specs: SPECS });
  assert.ok(clones.findings.some((f) => f.level === 'fail' && /differ in 1 of 4 axes/.test(f.text)));
  const better = [dirs[0]!, { ...dirs[1]!, scores: { subjectFit: 5, hookStrength: 5, demonstration: 5, feasibility: 5 } }, dirs[2]!];
  const weakerChosen = evaluate(fresh({ directions: planned(better) }), LEGACY, { stage: 'storyboard', specs: SPECS });
  assert.ok(weakerChosen.findings.some((f) => f.level === 'fail' && /scores higher on suitability/.test(f.text)));
  const explained = evaluate(fresh({ directions: planned(better), choiceNote: 'Race needs a capture we cannot make yet.' }), LEGACY, { stage: 'storyboard', specs: SPECS });
  assert.ok(explained.findings.some((f) => f.level === 'warn' && /choice note/.test(f.text)));
  assert.ok(!explained.findings.some((f) => f.level === 'fail'));
  const mismatch = evaluate(fresh({ visual: k('race-lanes') }), LEGACY, { stage: 'storyboard', specs: SPECS });
  assert.ok(mismatch.findings.some((f) => /the record says "race-lanes" but the chosen direction says "paper-trail"/.test(f.text)));
  assert.equal(evaluate(fresh(), LEGACY, { stage: 'storyboard', specs: SPECS }).directions.length, 3);
});

test('diversity: the review and hypothesis are required before rendering, not before storyboarding', () => {
  const r = fresh({ review: planned({}), hypothesis: { basis: 'unknown' } });
  assert.equal(evaluate(r, LEGACY, { stage: 'storyboard', specs: SPECS }).verdict, 'WARN');
  const atRender = evaluate(r, LEGACY, { stage: 'render', specs: SPECS });
  assert.equal(atRender.verdict, 'FAIL');
  assert.ok(atRender.findings.some((f) => /8 of 8 questions unanswered/.test(f.text)));
  const scaffold = fresh({ opening: { basis: 'unknown' }, hook: { basis: 'unknown' } });
  assert.ok(evaluate(scaffold, LEGACY, { stage: 'storyboard', specs: SPECS }).findings.some((f) => f.level === 'fail' && /not decided/.test(f.text)));
  const unapproved = evaluate(fresh({ approved: undefined }), LEGACY, { stage: 'render', specs: SPECS });
  assert.ok(unapproved.findings.some((f) => f.level === 'fail' && /not approved the concept/.test(f.text)));
  assert.equal(evaluate(fresh({ approved: undefined }), LEGACY, { stage: 'storyboard', specs: SPECS }).verdict, 'PASS');
  const unknownKind = evaluate(fresh({ ending: k('confetti-burst') }), LEGACY, { stage: 'storyboard', specs: SPECS });
  assert.ok(unknownKind.findings.some((f) => f.level === 'warn' && /not in the vocabulary/.test(f.text)));
});

test('gate: protects new videos, leaves existing ones, previews and productions alone, override is explicit', () => {
  const base = { records: LEGACY, productions: PRODUCTION_IDS, specs: SPECS };
  for (const id of PRODUCTION_IDS) assert.equal(gate(id, base).level, 'exempt');
  for (const id of Object.keys(GATE_EXEMPT)) assert.equal(gate(id, base).level, 'exempt');
  for (const r of LEGACY) assert.equal(gate(r.id, base).allow, true, r.id);
  for (const v of VIDEOS) assert.equal(gate(v.id, base).allow, true, `existing video ${v.id} still renders`);
  assert.equal(gate('v999-new', base).allow, false);
  assert.equal(gate('v999-new', { ...base, override: 'short' }).allow, false);
  const over = gate('v999-new', { ...base, override: 'Owner approved a one-off test render on 2026-11-18' });
  assert.equal(over.level, 'override');
  const copy = legacyLike('v009-sale-does-the-rest', 99);
  assert.equal(gate(copy.id, { ...base, records: [...LEGACY, copy] }).allow, false);
  const ok = fresh();
  assert.equal(gate(ok.id, { ...base, records: [...LEGACY, ok] }).level, 'pass');
  const v10 = getRecord('v010-the-23-minute-number')!;
  const unapproved = { ...v10, approved: undefined };
  assert.equal(gate(v10.id, { ...base, records: RECORDS.map((r) => (r.id === v10.id ? unapproved : r)) }).allow, false, 'a planned record without approval: no full render');
});

test('diversity: lives outside every cache key and outside the composition', () => {
  for (const p of [...RENDER_INPUTS, ...MIX_INPUTS]) assert.ok(!/creative/.test(p), p);
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
  for (const root of ['src/remotion', 'src/video', 'src/brand', 'src/pipeline', 'src/captions', 'src/sound'])
    for (const f of walk(root).filter((x) => /\.tsx?$/.test(x))) assert.ok(!/from ['"][^'"]*creative/.test(readFileSync(f, 'utf8')), `${f} imports creative code`);
  assert.ok(!/creative/.test(readFileSync('content/index.ts', 'utf8')), 'content/index.ts (the composition registry) does not import records');
});

test('diversity: v010, the first video under D46, passes against the real history; a render needs the recorded approval', () => {
  const v10 = getRecord('v010-the-23-minute-number')!;
  const e = evaluate(v10, RECORDS, { stage: 'storyboard', specs: SPECS });
  assert.equal(e.verdict, 'PASS', e.findings.map((f) => f.text).join('\n'));
  assert.deepEqual(e.comparisons.map((c) => c.other), ['v009-sale-does-the-rest', 'v008-bookings-run-themselves', 'v004-client-onboarding-runs', 'v003-invoices-chase-themselves', 'v002-meetings']);
  for (const c of e.comparisons) assert.ok(c.score! <= 0.1, `${c.other} ${c.score}`);
  assert.equal(e.directions.filter((d) => d.chosen).length, 1);
  assert.equal(SPECS.has(v10.id), false, 'no spec before the owner approves the visual execution (look test)');
  const unapproved = { ...v10, approved: undefined };
  const atRender = evaluate(unapproved, RECORDS, { stage: 'render', specs: SPECS });
  assert.deepEqual(atRender.findings.filter((f) => f.level === 'fail').map((f) => f.text), ['the owner has not approved the concept and storyboard (record.approved)']);
  assert.ok(v10.approved?.date, 'the owner approved concept + storytelling on 2026-11-18 (E2)');
  assert.equal(evaluate(v10, RECORDS, { stage: 'render', specs: SPECS }).verdict, 'PASS');
});
