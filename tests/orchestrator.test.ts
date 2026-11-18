/**
 * Production orchestrator: state machine, persistence, runner behaviour (reuse, retry,
 * interrupt/resume, cancel, gates, crash recovery), dependency granularity, the writer,
 * arcs and spec fitting on both kits, research verification, scoring, package copy.
 * Runner tests use an in-memory database and fake stages; nothing renders.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { KITS } from '../content/kits/index.ts';
import { fitVideo } from '../src/orchestrator/assemble.ts';
import { openDb } from '../src/orchestrator/db.ts';
import { captionFor, fitsHeadline, headlineFrom, HEADLINE, pin, resolvePin, spokenWords } from '../src/orchestrator/kit.ts';
import { canTransition, STAGES, stableStringify, type StageName } from '../src/orchestrator/model.ts';
import { assignVideoId, decide, requeue, startProduction } from '../src/orchestrator/production.ts';
import { platformCopy, srt, subtitleCues } from '../src/orchestrator/publishcopy.ts';
import { findQuote, pageText, SOURCE_CHECK, type Fetcher } from '../src/orchestrator/research.ts';
import { hashInput, recover, Runner, Wait, type StageDef, type StageSet } from '../src/orchestrator/runner.ts';
import { categoryPerformance, scoreIdea } from '../src/orchestrator/scoring.ts';
import { planStoryboard } from '../src/orchestrator/storyboard.ts';
import { reviewView } from '../src/orchestrator/review.ts';
import { addApproval, createIdea, createJob, decisionFor, finishRun, getJob, requestCancel, runsOf, saveRecord, setJobStatus, startRun, updateIdea } from '../src/orchestrator/store.ts';
import { makeBrief, scriptBrief, usableHook, writeScript, type ClaimSummary, type IdeaFacts } from '../src/orchestrator/writer.ts';
import { validateSpec } from '../src/video/spec.ts';

const logRoot = mkdtempSync(path.join(tmpdir(), 'mwc-orch-'));
process.on('exit', () => rmSync(logRoot, { recursive: true, force: true }));

const ideaInput = { title: 'Invoices that chase themselves', topic: 'Automatic reminders', audience: 'Freelancers', category: 'invoices' };

// ---------- model + store ----------
test('job transitions: only listed edges are allowed', () => {
  assert.ok(canTransition('queued', 'running'));
  assert.ok(canTransition('running', 'awaiting_approval'));
  assert.ok(canTransition('awaiting_approval', 'queued'));
  assert.ok(!canTransition('failed', 'running'), 'a failed job is re-queued, never restarted in place');
  assert.ok(!canTransition('done', 'running'));
  assert.ok(!canTransition('rejected', 'awaiting_approval'));
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const j = createJob(db, i.id, 'v900-test');
  assert.throws(() => setJobStatus(db, j.id, 'done'), /cannot go from queued to done/);
});

test('ideas: validation, ratings, priority order', () => {
  const db = openDb(':memory:');
  assert.throws(() => createIdea(db, { ...ideaInput, title: '' }), /title is required/);
  assert.throws(() => createIdea(db, { ...ideaInput, audienceValue: 9 }), /1–5/);
  assert.throws(() => createIdea(db, { ...ideaInput, sources: [{ url: 'ftp://x', claim: 'c' }] }), /http/);
  const a = createIdea(db, ideaInput);
  const b = createIdea(db, { ...ideaInput, title: 'Second' });
  assert.equal(a.id, 'idea-0001');
  assert.equal(b.id, 'idea-0002');
  updateIdea(db, a.id, { priority: 50 });
  updateIdea(db, b.id, { priorityOverride: 90 });
  const order = (db.prepare('SELECT id FROM ideas ORDER BY COALESCE(priority_override, priority, 0) DESC').all() as Array<{ id: string }>).map((r) => r.id);
  assert.deepEqual(order, ['idea-0002', 'idea-0001']);
});

test('stable hashing ignores key order', () => {
  assert.equal(stableStringify({ b: 1, a: [1, { d: 2, c: 3 }] }), stableStringify({ a: [1, { c: 3, d: 2 }], b: 1 }));
});

// ---------- runner with fake stages ----------
type Probe = { runs: Record<string, number>; inputs: Record<string, unknown> };
function fakeStages(p: Probe, over: Partial<Record<StageName, Partial<StageDef>>> = {}): StageSet {
  const set = {} as StageSet;
  for (const s of STAGES) {
    set[s] = {
      name: s,
      version: 1,
      input: (ctx) => ({ title: s === 'brief' || s === 'package' ? ctx.idea.title : undefined, topic: ctx.idea.topic, upstream: STAGES.indexOf(s) > 0 ? ctx.out(STAGES[STAGES.indexOf(s) - 1]!) : null, extra: p.inputs[s] ?? null }),
      run: () => {
        p.runs[s] = (p.runs[s] ?? 0) + 1;
        return { stage: s, n: STAGES.indexOf(s) };
      },
      ...over[s],
    } as StageDef;
  }
  return set;
}

test('runner: a full run, then a rerun reuses every stage', async () => {
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const j = createJob(db, i.id, 'v900-test');
  const p: Probe = { runs: {}, inputs: {} };
  const runner = new Runner(db, fakeStages(p), { logRoot });
  assert.equal((await runner.runJob(j.id)).status, 'done');
  assert.equal(Object.values(p.runs).reduce((a, b) => a + b, 0), STAGES.length);
  requeue(db, j.id);
  assert.equal((await runner.runJob(j.id)).status, 'done');
  assert.equal(Object.values(p.runs).reduce((a, b) => a + b, 0), STAGES.length, 'nothing ran the second time');
  assert.equal(runsOf(db, j.id).filter((r) => r.status === 'reused').length, STAGES.length);
});

test('runner: an injected failure stops the job; retry reuses what completed', async () => {
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const j = createJob(db, i.id, 'v900-test', { failOnce: 'spec' });
  const p: Probe = { runs: {}, inputs: {} };
  const runner = new Runner(db, fakeStages(p), { logRoot });
  const failed = await runner.runJob(j.id);
  assert.equal(failed.status, 'failed');
  assert.match(failed.error ?? '', /injected failure/);
  assert.equal(p.runs.render, undefined, 'nothing after the failing stage ran');
  requeue(db, j.id);
  assert.equal((await runner.runJob(j.id)).status, 'done');
  assert.equal(p.runs.voice, 1, 'upstream stages were reused, not rerun');
  assert.equal(p.runs.spec, 1);
  const specRuns = runsOf(db, j.id).filter((r) => r.stage === 'spec' && r.status !== 'reused');
  assert.deepEqual(specRuns.map((r) => [r.attempt, r.status]), [[1, 'failed'], [2, 'succeeded']]);
});

test('runner: changing an input reruns that stage and what depends on it, nothing upstream', async () => {
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const j = createJob(db, i.id, 'v900-test');
  const p: Probe = { runs: {}, inputs: {} };
  const runner = new Runner(db, fakeStages(p, { qa: { run: () => ((p.runs.qa = (p.runs.qa ?? 0) + 1), { stage: 'qa', v: p.inputs.qa }) } }), { logRoot });
  await runner.runJob(j.id);
  p.inputs.qa = 'changed';
  requeue(db, j.id);
  await runner.runJob(j.id);
  assert.equal(p.runs.render, 1);
  assert.equal(p.runs.qa, 2);
  assert.equal(p.runs.editorial, 2, 'the stage reading the changed output reran');
  assert.equal(p.runs.approval, 1, 'its output did not change, so nothing further reran');
});

test('runner: approval waits for a human; the decision binds to that exact output', async () => {
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const j = createJob(db, i.id, 'v900-test');
  const p: Probe = { runs: {}, inputs: {} };
  const runner = new Runner(
    db,
    fakeStages(p, {
      approval: {
        run: (_in, ctx) => {
          const d = decisionFor(ctx.db, ctx.job.id, 'video', 'sha-1');
          if (d?.decision === 'approved') return { approvalId: d.id };
          throw new Wait('awaiting_approval', 'ready');
        },
      },
    }),
    { logRoot },
  );
  assert.equal((await runner.runJob(j.id)).status, 'awaiting_approval');
  assert.equal(p.runs.package, undefined, 'nothing is packaged without approval');
  addApproval(db, j.id, 'video', 'sha-1', 'approved');
  setJobStatus(db, j.id, 'queued');
  assert.equal((await runner.runJob(j.id)).status, 'done');
  assert.equal(p.runs.package, 1);
});

test('runner: interrupt mid-stage, then resume from there', async () => {
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const j = createJob(db, i.id, 'v900-test');
  const p: Probe = { runs: {}, inputs: {} };
  let block = true;
  const runner = new Runner(
    db,
    fakeStages(p, {
      render: {
        run: (_in, ctx) =>
          new Promise((resolve, reject) => {
            p.runs.render = (p.runs.render ?? 0) + 1;
            if (!block) return resolve({ stage: 'render' });
            ctx.signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      },
    }),
    { logRoot },
  );
  const pending = runner.runJob(j.id);
  await new Promise((r) => setTimeout(r, 50));
  runner.interrupt();
  assert.equal((await pending).status, 'interrupted');
  assert.equal(runsOf(db, j.id).find((r) => r.stage === 'render')?.status, 'interrupted');
  block = false;
  const r2 = new Runner(db, fakeStages(p, { render: { run: () => ((p.runs.render = (p.runs.render ?? 0) + 1), { stage: 'render' }) } }), { logRoot });
  requeue(db, j.id);
  assert.equal((await r2.runJob(j.id)).status, 'done');
  assert.equal(p.runs.voice, 1, 'stages before the interruption were reused');
  assert.equal(p.runs.render, 2);
});

test('runner: cancel stops a running job; recover() marks orphaned runs interrupted', async () => {
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const j = createJob(db, i.id, 'v900-test');
  const p: Probe = { runs: {}, inputs: {} };
  const runner = new Runner(db, fakeStages(p, { voice: { run: (_in, ctx) => new Promise((_res, rej) => ctx.signal.addEventListener('abort', () => rej(new Error('x')))) } }), { logRoot });
  const pending = runner.runJob(j.id);
  await new Promise((r) => setTimeout(r, 30));
  requestCancel(db, j.id);
  assert.equal((await pending).status, 'cancelled');
  // A runner that died without cleanup: its run is still "running" with a dead pid.
  const j2 = createJob(db, createIdea(db, { ...ideaInput, title: 'Other' }).id, 'v901-test');
  setJobStatus(db, j2.id, 'running', { runner_pid: 2 ** 22 + 12345 });
  startRun(db, j2.id, 'render', 'h', null);
  const fixed = recover(db);
  assert.ok(fixed.includes(`${j2.id}/render`));
  assert.equal(getJob(db, j2.id)!.status, 'interrupted');
});

test('runner: script review gate pauses after the storyboard when asked', async () => {
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const j = createJob(db, i.id, 'v900-test', { reviewScript: true });
  const p: Probe = { runs: {}, inputs: {} };
  const runner = new Runner(
    db,
    fakeStages(p, {
      storyboard: {
        run: () => ({ reviewHash: 'rh' }),
        gate: (o, ctx) => (decisionFor(ctx.db, ctx.job.id, 'script', (o as { reviewHash: string }).reviewHash)?.decision === 'approved' ? null : { status: 'awaiting_review', message: 'review' }),
      },
    }),
    { logRoot },
  );
  assert.equal((await runner.runJob(j.id)).status, 'awaiting_review');
  assert.equal(p.runs.voice, undefined, 'the voice waits for the script review');
  addApproval(db, j.id, 'script', 'rh', 'approved');
  setJobStatus(db, j.id, 'queued');
  assert.equal((await runner.runJob(j.id)).status, 'done');
});

test('decisions: a failed QA can never be approved; approval needs awaiting_approval', () => {
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const j = createJob(db, i.id, 'v900-test');
  assert.throws(() => decide(db, j.id, 'video', 'approved'), /not awaiting approval/);
  setJobStatus(db, j.id, 'running');
  for (const [stage, out] of [['render', { sha256: 's1' }], ['qa', { pass: false, qaId: 1 }]] as const) {
    const r = startRun(db, j.id, stage, 'h', null);
    finishRun(db, r, 'succeeded', { output: out });
  }
  setJobStatus(db, j.id, 'awaiting_approval');
  assert.throws(() => decide(db, j.id, 'video', 'approved'), /cannot be approved/);
  assert.equal(decide(db, j.id, 'video', 'revise', 'shorter hook').status, 'revision');
});

test('review page: scripts that repeat another job are flagged; working jobs read in plain words', () => {
  const db = openDb(':memory:');
  const lines = (xs: string[]) => ({ lines: xs.map((text, k) => ({ id: `l${k}`, section: 'hook', text })), words: 12, estimatedSeconds: 20, flags: [] });
  const a = createJob(db, createIdea(db, ideaInput).id, 'v900-a', { reviewScript: true });
  const b = createJob(db, createIdea(db, { ...ideaInput, title: 'Stop writing reminders' }).id, 'v901-b', { reviewScript: true });
  const c = createJob(db, createIdea(db, { ...ideaInput, title: 'Something new' }).id, 'v902-c', { reviewScript: true });
  saveRecord(db, 'scripts', a.id, 'h', lines(["Getting paid shouldn't depend on chasing.", 'Let the system follow up.', 'The invoice goes out.']));
  saveRecord(db, 'scripts', b.id, 'h', lines(['Getting paid shouldn’t depend on chasing!', 'Let the system follow up.', 'A different ending.']));
  saveRecord(db, 'scripts', c.id, 'h', lines(['Nothing like the others.', 'At all.']));
  for (const j of [a, b, c]) {
    setJobStatus(db, j.id, 'running');
    setJobStatus(db, j.id, 'awaiting_review');
  }
  const r = reviewView(db);
  const byId = Object.fromEntries(r.scripts.map((s) => [s.jobId, s]));
  assert.equal(byId[b.id]!.repeats?.video, 'v900-a', 'two of three lines are the same once punctuation is ignored');
  assert.equal(byId[b.id]!.repeats?.same, 2);
  assert.equal(byId[c.id]!.repeats, null);
  setJobStatus(db, c.id, 'cancelled');
  const d = createJob(db, createIdea(db, { ...ideaInput, title: 'Rendering one' }).id, 'v903-d');
  setJobStatus(db, d.id, 'running', { current_stage: 'render' });
  const w = reviewView(db).working.find((x) => x.jobId === d.id)!;
  assert.equal(w.step, 'Rendering');
  assert.ok(w.progress > 0.5 && w.progress < 1);
  assert.ok(!reviewView(db).scripts.some((s) => s.jobId === c.id), 'cancelled jobs are not shown');
});

test('jobs: one active job per idea, ideas need a kit, video ids count up', () => {
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const j = startProduction(db, i.id);
  assert.match(j.video_id, /^v\d{3}-invoices-chase-themselves$/);
  assert.throws(() => startProduction(db, i.id), /already has job/);
  const other = createIdea(db, { ...ideaInput, title: 'Podcast clips', category: 'podcasts' });
  assert.throws(() => startProduction(db, other.id), /no story kit/);
  const n = Number(j.video_id.slice(1, 4));
  assert.equal(Number(assignVideoId(db, 'Another idea').slice(1, 4)), n + 1);
});

// ---------- dependency granularity (real stage inputs) ----------
const facts = (over: Partial<IdeaFacts> = {}): IdeaFacts => ({ id: 'idea-0001', title: 'Invoices that chase themselves', topic: 't', audience: 'a', category: 'invoices', hook: null, valueNote: null, arc: null, preset: null, ...over });
const verified = (kit: string): ClaimSummary[] => KITS[kit]!.references.map((r) => ({ ref: r.ref, text: r.claim, kind: 'fact', status: 'supported', url: r.url, required: Boolean(r.required) }));
const fakeDef = (name: StageName) => ({ name, version: 1 }) as StageDef;

test('a title edit changes the brief but not the script or the voice', () => {
  const kit = KITS.invoices!;
  const a = makeBrief(facts(), kit, verified('invoices'));
  const b = makeBrief(facts({ title: 'Get paid without chasing' }), kit, verified('invoices'));
  assert.notEqual(hashInput(fakeDef('brief'), a), hashInput(fakeDef('brief'), b));
  assert.equal(hashInput(fakeDef('script'), scriptBrief(a)), hashInput(fakeDef('script'), scriptBrief(b)));
  assert.deepEqual(writeScript(scriptBrief(a), kit).lines, writeScript(scriptBrief(b), kit).lines);
});

test('a script edit changes the spoken lines (voice input); a caption-only edit does not', () => {
  const kit = KITS.invoices!;
  const br = scriptBrief(makeBrief(facts(), kit, verified('invoices')));
  const base = writeScript(br, kit);
  const spoken = (s: typeof base) => s.lines.map(({ id, text }) => ({ id, text }));
  const textEdit = writeScript(br, kit, { lines: { payoff: { text: 'You never sent a reminder.' } } });
  const capEdit = writeScript(br, kit, { lines: { payoff: { caption: 'You never\n*chased.*' } } });
  assert.notDeepEqual(spoken(textEdit), spoken(base));
  assert.equal(textEdit.lines.find((l) => l.id === 'payoff')!.origin, 'edit');
  assert.deepEqual(spoken(capEdit), spoken(base));
  assert.notDeepEqual(capEdit.lines, base.lines);
});

// ---------- writer ----------
test('writer: deterministic, uses a fitting idea hook, rejects figures and long hooks', () => {
  const kit = KITS.invoices!;
  const br = makeBrief(facts(), kit, verified('invoices'));
  assert.deepEqual(writeScript(scriptBrief(br), kit), writeScript(scriptBrief(br), kit));
  assert.equal(usableHook('Stop chasing invoices.').line, 'Stop chasing invoices.');
  assert.equal(usableHook('Late invoices cost freelancers 20 hours.').line, null, 'figures need a verified source');
  assert.equal(usableHook('one two').line, null);
  const own = makeBrief(facts({ hook: 'Stop chasing your own invoices' }), kit, verified('invoices'));
  const s = writeScript(scriptBrief(own), kit);
  assert.equal(s.lines[0]!.text, 'Stop chasing your own invoices.');
  assert.equal(s.lines[0]!.origin, 'idea');
  for (const k of ['hook', 'problem', 'explanation', 'payoff', 'cta'] as const) assert.ok(s.sections[k].length > 0, `section ${k}`);
});

test('writer: variants vary per idea and stay chosen for a job', () => {
  const kit = KITS.invoices!;
  const combos = new Set<string>();
  for (let n = 1; n <= 24; n++) {
    const s = writeScript(scriptBrief(makeBrief(facts({ id: `idea-${String(n).padStart(4, '0')}` }), kit, verified('invoices'))), kit);
    combos.add(s.lines.map((l) => l.variant).join(''));
  }
  assert.ok(combos.size >= 4, `only ${combos.size} line combinations across 24 ideas`);
  const br = scriptBrief(makeBrief(facts(), kit, verified('invoices')));
  const first = writeScript(br, kit);
  const flipped = Object.fromEntries(first.lines.map((l) => [l.id, kit.beats.find((b) => b.id === l.id)!.lines.length - 1 - l.variant]));
  const kept = writeScript(br, kit, { lines: { payoff: { pause: 1 } } }, flipped);
  assert.deepEqual(kept.lines.map((l) => l.variant), first.lines.map((l) => flipped[l.id]), 'sticky variants win over the seed');
});

test('writer: a line relying on an unverified claim is flagged and needs review', () => {
  const kit = KITS.invoices!;
  const claims = verified('invoices').map((c) => ({ ...c, status: 'partial' as const }));
  const s = writeScript(scriptBrief(makeBrief(facts(), kit, claims)), kit);
  assert.ok(s.needsReview);
  assert.ok(s.flags.some((f) => f.includes('auto-reminders')));
  assert.ok(!writeScript(scriptBrief(makeBrief(facts(), kit, verified('invoices'))), kit).needsReview);
});

test('text helpers: headlines ≤ 3 × 16 characters, captions ≤ 7 words per phrase, pins fall back', () => {
  // v001's approved headline is reproduced exactly; a line too wide for the frame is refused.
  assert.equal(headlineFrom("Your business shouldn't depend on your memory."), 'Your business\nshouldn’t depend\non your *memory.*');
  assert.ok(!fitsHeadline("You did the work. Now you're chasing the money."), 'wrapped to 4 lines in the v003 review');
  assert.equal(usableHook("You did the work. Now you're chasing the money.").line, null);
  assert.ok(!/\b(the|with|a)\n/.test(headlineFrom('Every new client starts with the same questions.')), 'no line ends on a function word');
  for (const t of ['Files, access and answers arrive before the kickoff, every single time for every client.', 'Short line here.']) {
    for (const phrase of captionFor(t).split('|')) assert.ok(spokenWords(phrase.replace(/\*/g, '')).length <= 7, phrase);
  }
  assert.deepEqual(resolvePin(pin('a', 'sends'), () => ['the', 'reminder', 'sends', 'itself']), { line: 'a', word: 'sends' });
  assert.deepEqual(resolvePin(pin('a', 'gone', { fallback: 'end', offset: 0.1 }), () => ['the', 'reminder']), { line: 'a', edge: 'end', offset: 0.1 });
});

// ---------- arcs + spec fitting ----------
test('every kit hook fits the headline; no line is both captioned and set by its scene', () => {
  for (const kit of Object.values(KITS)) {
    for (const v of kit.beats.find((b) => b.id === 'hook')!.lines) {
      assert.ok(fitsHeadline(v.text), `${kit.id}: "${v.text}" is wider than ${HEADLINE.lines} × ${HEADLINE.chars}`);
      for (const l of headlineFrom(v.text).split('\n')) assert.ok(l.replace(/\*/g, '').length <= HEADLINE.chars, l);
    }
    const b = makeBrief(facts({ category: kit.id }), kit, verified(kit.id));
    const s = writeScript(scriptBrief(b), kit);
    const sb = planStoryboard(s, kit, { series: 'N° 900', preset: b.preset, harmony: b.harmony });
    const spec = fitVideo({ id: 'v900-test', title: b.title, series: 'N° 900', brief: { topic: b.topic, audience: b.audience, hook: s.lines[0]!.text, cta: b.cta }, publish: b.publish }, s, sb, undefined).spec;
    for (const id of sb.sceneText) assert.equal(spec.narration!.lines.find((l) => l.id === id)?.caption, undefined, `${kit.id}: "${id}" would be drawn twice (v003 review)`);
  }
});

for (const kit of Object.values(KITS)) {
  test(`kit ${kit.id}: script → ${kit.arc} storyboard → a spec the engine validates`, () => {
    const b = makeBrief(facts({ category: kit.id, title: kit.seeds[0]!.title }), kit, verified(kit.id));
    const s = writeScript(scriptBrief(b), kit);
    const sb = planStoryboard(s, kit, { series: 'N° 900', preset: b.preset, harmony: b.harmony });
    const fit = fitVideo({ id: 'v900-test', title: b.title, series: 'N° 900', brief: { topic: b.topic, audience: b.audience, hook: s.lines[0]!.text, cta: b.cta }, publish: b.publish }, s, sb, undefined);
    assert.deepEqual(fit.errors, []);
    assert.deepEqual(validateSpec(fit.spec).filter((e) => !e.includes('timing lock')), []);
    const total = fit.spec.scenes.reduce((x, y) => x + y.duration, 0);
    assert.ok(total > 15 && total < 32, `${total.toFixed(1)} s`);
    assert.ok(fit.spec.publish!.coverAt > 0 && fit.spec.publish!.coverAt < 4);
    if (kit.arc === 'signature') assert.deepEqual(fit.spec.scenes.map((x) => x.type), ['chaosToSystem', 'flowRun', 'endCard']);
    else assert.equal(fit.spec.scenes.at(-1)!.type, 'endCard');
  });
}

// ---------- research ----------
test('research: supported only when the cited page has the quote and it covers the claim', async () => {
  const pages: Record<string, string> = {
    '/doc': '<html><head><title>Reminders &amp; more</title><script>var x="Automatic email reminders";</script></head><body><h2>Automatic&nbsp;email   reminders for unpaid invoices</h2></body></html>',
    '/other': '<p>Nothing relevant here.</p>',
  };
  const server = createServer((req, res) => {
    const body = pages[req.url ?? ''];
    res.writeHead(body ? 200 : 404, { 'content-type': 'text/html' });
    res.end(body ?? 'not found');
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  const fetcher: Fetcher = async (u) => {
    const r = await fetch(u);
    return { status: r.status, text: await r.text() };
  };
  try {
    const r = await SOURCE_CHECK.research(
      {
        topic: 't',
        category: 'invoices',
        audience: 'a',
        references: [{ ref: 'k1', claim: 'Invoicing software can send automatic email reminders for unpaid invoices.', url: `${base}/doc`, quote: 'Automatic email reminders for unpaid invoices', required: true }],
        userSources: [
          { url: `${base}/other`, claim: 'something', quote: 'reminders' },
          { url: `${base}/missing`, claim: 'gone', quote: 'x' },
          { url: `${base}/doc`, claim: 'no quote given' },
        ],
        assumptions: ['People chase by hand.'],
        illustrative: ['Names are fictional.'],
        suggestions: ['Hook option: "Stop chasing."'],
      },
      fetcher,
    );
    const st = Object.fromEntries(r.claims.map((c) => [c.ref, c.status]));
    assert.deepEqual(st, { k1: 'supported', 'source-1': 'unverified', 'source-2': 'unverified', 'source-3': 'unverified', 'assumption-1': 'assumption', 'illustrative-1': 'illustrative', 'suggestion-1': 'suggestion' });
    const k1 = r.claims.find((c) => c.ref === 'k1')!;
    assert.equal(k1.quoteMatch, 'exact');
    assert.equal(k1.confidence, 'medium', '6 of 8 claim terms in the passage');
    assert.ok(k1.retrievedAt && k1.limitations?.some((l) => /not a reading/.test(l)), 'every claim says how it was judged and when');
    assert.equal(r.sources.length, 3, 'each URL fetched once');
    assert.equal(r.sources.find((s) => s.url.endsWith('/doc'))!.title, 'Reminders & more');
  } finally {
    server.close();
  }
  assert.equal(pageText('<b>a</b>&#x2019;s &mdash; ok'), 'a ’s — ok');
  assert.equal(findQuote('He said “Hello — world”.', 'said "hello - world"'), 'He said “Hello — world”.', 'evidence keeps the page’s own wording');
  assert.equal(findQuote('nothing here', 'missing'), null);
});

// ---------- scoring ----------
test('scoring: weighted base, kit fit, research penalty, performance only with enough data', () => {
  const s = scoreIdea({ audienceValue: 5, engagement: 4, commercial: 4, hasKit: true, flaggedClaims: 0, performance: 1 });
  assert.equal(s.base, 88);
  assert.equal(s.priority, 88);
  assert.equal(scoreIdea({ audienceValue: 5, engagement: 4, commercial: 4, hasKit: false, flaggedClaims: 1, performance: 1 }).priority, Math.round(88 * 0.6 - 5));
  const few = [{ category: 'invoices', completionRate: 0.6 }];
  assert.equal(categoryPerformance('invoices', few), 1, 'no multiplier from one post');
  const posts = [...Array(3).fill({ category: 'invoices', completionRate: 0.6 }), ...Array(3).fill({ category: 'onboarding', completionRate: 0.3 })];
  assert.ok(categoryPerformance('invoices', posts) > 1);
  assert.ok(categoryPerformance('onboarding', posts) < 1);
  assert.ok(categoryPerformance('invoices', [...posts, ...Array(30).fill({ category: 'x', completionRate: 0.01 })]) <= 1.15, 'clamped');
});

// ---------- package copy ----------
test('package: platform copy within verified limits, subtitles from caption phrases', () => {
  const copy = platformCopy({ title: 'Invoices that chase themselves', caption: 'Body.\n\nFictional business.', hashtags: ['#automation', '#freelance'] });
  assert.deepEqual(copy.map((c) => c.platform), ['youtube', 'instagram', 'tiktok', 'facebook']);
  assert.ok(copy.every((c) => c.ok));
  assert.ok(!platformCopy({ title: 'x'.repeat(101), caption: 'b', hashtags: [] })[0]!.ok);
  const cues = subtitleCues(
    [
      { id: 'hook', text: "You did the work.", at: 0.25, duration: 1.5 },
      { id: 'step', text: 'Finish the job. The invoice goes out.', at: 2, duration: 2 },
    ],
    [
      { id: 'step.0', markup: 'Finish the job.', at: 2.04, out: 2.8 },
      { id: 'step.1', markup: 'The invoice goes out\n*on its own.*', at: 2.9, out: 4.5 },
    ],
  );
  assert.deepEqual(cues.map((c) => c.text), ['You did the work.', 'Finish the job.', 'The invoice goes out on its own.']);
  assert.match(srt(cues), /^1\n00:00:00,250 --> 00:00:01,950\nYou did the work\.\n/);
});

// ---------- Control Center API ----------
test('control center: overview, add + start an idea, refuses cross-origin writes and paths outside out/', async () => {
  const { startControlCenter } = await import('../src/orchestrator/server.ts');
  const db = openDb(':memory:');
  const cc = startControlCenter(db, { port: 0, log: () => {} });
  await new Promise((r) => cc.server.once('listening', r));
  const base = `http://127.0.0.1:${(cc.server.address() as { port: number }).port}`;
  try {
    const idea = (await (await fetch(`${base}/api/ideas`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ideaInput) })).json()) as { id: string };
    assert.equal(idea.id, 'idea-0001');
    const bad = await fetch(`${base}/api/ideas`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...ideaInput, title: '' }) });
    assert.equal(bad.status, 400);
    const ov = (await (await fetch(`${base}/api/overview`)).json()) as { ideas: unknown[]; kits: Array<{ id: string }>; stages: string[] };
    assert.equal(ov.ideas.length, 1);
    assert.deepEqual(ov.kits.map((k) => k.id).sort(), Object.keys(KITS).sort());
    assert.equal(ov.stages.length, STAGES.length);
    assert.equal((await fetch(`${base}/api/discover`, { method: 'POST', headers: { origin: 'http://evil.example' } })).status, 403);
    assert.equal((await fetch(`${base}/files/..%2F..%2Fpackage.json`)).status, 403);
    const review = (await (await fetch(`${base}/api/review`)).json()) as Record<string, unknown[]>;
    for (const k of ['decide', 'scripts', 'working', 'approved', 'earlier']) assert.ok(Array.isArray(review[k]), k);
    assert.match(await (await fetch(`${base}/`)).text(), /review\.js/, 'home is the Review page');
    assert.match(await (await fetch(`${base}/details`)).text(), /details\.js/, 'the full dashboard moved to /details');
    const css = await (await fetch(`${base}/tokens.css`)).text();
    assert.match(css, /--signal:#C9F25D/i, 'colours come from the brand tokens');
  } finally {
    await cc.close();
  }
});
