/**
 * Phase 2.5 hardening: database safety (migrations, foreign keys, transactions, backup and
 * restore), crash recovery at every stage (a real child process killed with SIGKILL),
 * leases after a machine restart, duplicate prevention, approval binding, gold takes,
 * research support levels, editorial QA, the new technical QA checks, and the dependency
 * graph measured with the real stage input functions.
 *
 * Isolation: every database is ":memory:" or a temp file (openDb refuses data/studio.db
 * under `node --test`); nothing renders, nothing is written under content/, public/ or
 * out/ (one editorial report goes to out/v999-hardening-test/ and is removed).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { crc32, deflateSync } from 'node:zlib';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { KITS } from '../content/kits/index.ts';
import { NARRATOR } from '../src/brand/voice.ts';
import { FORMATS } from '../src/brand/format.ts';
import { MIX_INPUTS, RENDER_INPUTS } from '../src/pipeline/cache.ts';
import { ff } from '../src/pipeline/ffmpeg.ts';
import { narrationKey } from '../src/pipeline/narration.ts';
import { ROOT } from '../src/pipeline/paths.ts';
import { assetChecks, captionChecks, decodeCheck, emptySceneCheck } from '../src/pipeline/qa.ts';
import { planSegments } from '../src/pipeline/segments.ts';
import { fitVideo } from '../src/orchestrator/assemble.ts';
import { backupDb, checkDb, dbErrorMessage, MIGRATIONS, openDb, REAL_DB, restoreDb, SCHEMA_VERSION, schemaVersion, tx } from '../src/orchestrator/db.ts';
import { editorialReview, readingEase } from '../src/orchestrator/editorial.ts';
import { STAGES, type StageName } from '../src/orchestrator/model.ts';
import { decide, editScript, editStoryboard, requeue, startProduction } from '../src/orchestrator/production.ts';
import { assessClaim, coverage, terms } from '../src/orchestrator/research.ts';
import { recover, Runner, type StageDef, type StageSet } from '../src/orchestrator/runner.ts';
import { frozenTake, research_env, STAGE_DEFS } from '../src/orchestrator/stages.ts';
import { planStoryboard } from '../src/orchestrator/storyboard.ts';
import {
  acquireLease,
  addApproval,
  createIdea,
  createJob,
  finishRun,
  getJob,
  heartbeat,
  leaseLive,
  requestCancel,
  runsOf,
  setJobStatus,
  startRun,
  updateIdea,
} from '../src/orchestrator/store.ts';
import { CTA_LINE, DISCLOSURE, makeBrief, scriptBrief, writeScript, type ClaimSummary, type IdeaFacts } from '../src/orchestrator/writer.ts';
import { defineVideo } from '../src/video/define.ts';
import { computeTimeline } from '../src/video/timeline.ts';
import { estimateLock } from '../src/video/timing.ts';
import { fakeStages } from './fixtures/fake-stages.ts';

const tmp = mkdtempSync(path.join(tmpdir(), 'mwc-hard-'));
process.on('exit', () => rmSync(tmp, { recursive: true, force: true }));
const logRoot = path.join(tmp, 'logs');
const ideaInput = { title: 'Invoices that chase themselves', topic: 'Automatic reminders', audience: 'Freelancers', category: 'invoices' };
const sha = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
const deadPid = 2 ** 22 + 4321;
let n = 0;
const tmpDb = () => path.join(tmp, `db-${++n}`, 'studio.db');

// ====================================================================== database
test('db: tests can never open the real production database', () => {
  assert.throws(() => openDb(REAL_DB), /temporary database/);
});

test('db: migration 1 → 2 backs up first, keeps every row, then enforces foreign keys and one active job per idea', () => {
  const file = tmpDb();
  mkdirSync(path.dirname(file), { recursive: true });
  const v1 = new DatabaseSync(file);
  v1.exec('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  v1.exec(MIGRATIONS[0]!);
  v1.exec("INSERT INTO meta VALUES ('schema', '1')");
  const t = '2026-11-17T00:00:00.000Z';
  v1.prepare("INSERT INTO ideas (id, title, topic, audience, category, status, created_at, updated_at) VALUES ('idea-0001', 'T', 't', 'a', 'invoices', 'new', ?, ?)").run(t, t);
  v1.prepare("INSERT INTO jobs (id, idea_id, video_id, status, created_at, updated_at) VALUES ('job-0001', 'idea-0001', 'v900-a', 'awaiting_approval', ?, ?)").run(t, t);
  v1.prepare("INSERT INTO research (job_id, idea_id, input_hash, provider, status, summary, created_at) VALUES ('job-0001', 'idea-0001', 'h', 'p', 'verified', 's', ?)").run(t);
  v1.prepare("INSERT INTO claims (research_id, ref, text, kind, status) VALUES (1, 'r', 'c', 'fact', 'verified')").run();
  v1.prepare("INSERT INTO approvals (job_id, target, target_hash, decision, decided_by, decided_at) VALUES ('job-0001', 'video', 'x', 'revise', 'owner', ?)").run(t);
  v1.prepare("INSERT INTO events (job_id, at, kind, message) VALUES ('job-0001', ?, 'k', 'm'), (NULL, ?, 'idea', 'm')").run(t, t);
  v1.close();

  const db = openDb(file);
  assert.equal(schemaVersion(db), SCHEMA_VERSION);
  const backups = readdirSync(path.join(path.dirname(file), 'backups'));
  assert.equal(backups.filter((f) => f.includes('pre-migration-1-to-2')).length, 1, 'a backup is written before migrating');
  for (const [table, rows] of [['ideas', 1], ['jobs', 1], ['research', 1], ['claims', 1], ['approvals', 1], ['events', 2]] as const) {
    assert.equal((db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n, rows, `${table} kept`);
  }
  assert.ok(checkDb(db).ok);
  assert.throws(() => db.prepare("INSERT INTO jobs (id, idea_id, video_id, status, created_at, updated_at) VALUES ('job-0002', 'idea-0001', 'v900-b', 'queued', 't', 't')").run(), (e: Error) => /active job/.test(dbErrorMessage(e)));
  assert.throws(() => db.prepare("INSERT INTO briefs (job_id, input_hash, data, created_at) VALUES ('job-nope', 'h', '{}', 't')").run(), /FOREIGN KEY/);
  assert.throws(() => db.prepare("INSERT INTO approvals (job_id, target, target_hash, decision, decided_by, decided_at) VALUES ('job-0001', 'video', 'x', 'maybe', 'o', 't')").run(), /CHECK/);
  const cols = (db.prepare('PRAGMA table_info(claims)').all() as Array<{ name: string }>).map((c) => c.name);
  for (const c of ['support', 'confidence', 'quote_match', 'coverage', 'limitations', 'retrieved_at']) assert.ok(cols.includes(c), `claims.${c}`);
  db.close();
  // Opening again migrates nothing and backs up nothing.
  openDb(file).close();
  assert.equal(readdirSync(path.join(path.dirname(file), 'backups')).length, 1);
});

test('db: a database newer than the code is refused, not "migrated"', () => {
  const file = tmpDb();
  openDb(file).close();
  const raw = new DatabaseSync(file);
  raw.exec("UPDATE meta SET value = '99' WHERE key = 'schema'");
  raw.close();
  assert.throws(() => openDb(file), /newer than this code/);
});

test('db: tx() is all-or-nothing; nested calls are savepoints', () => {
  const db = openDb(':memory:');
  assert.throws(() =>
    tx(db, () => {
      createIdea(db, ideaInput);
      throw new Error('boom');
    }),
  );
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM ideas').get() as { n: number }).n, 0, 'the idea and its event rolled back');
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM events').get() as { n: number }).n, 0);
  tx(db, () => {
    createIdea(db, ideaInput);
    assert.throws(() => tx(db, () => (createIdea(db, { ...ideaInput, title: 'inner' }), assert.fail('x'))));
  });
  assert.deepEqual((db.prepare('SELECT title FROM ideas').all() as Array<{ title: string }>).map((r) => r.title), [ideaInput.title], 'outer kept, inner rolled back');
});

test('db: backup is a verified copy; restore swaps it in and keeps the replaced database', async () => {
  const file = tmpDb();
  const db = openDb(file);
  createIdea(db, ideaInput);
  const b = await backupDb(db, path.join(path.dirname(file), 'backups', 'one.db'));
  assert.ok(b.check.ok && b.bytes > 0);
  createIdea(db, { ...ideaInput, title: 'After the backup' });
  db.close();
  const r = restoreDb(b.file, file);
  assert.ok(r.safetyCopy && existsSync(r.safetyCopy));
  const back = openDb(file);
  assert.equal((back.prepare('SELECT COUNT(*) AS n FROM ideas').get() as { n: number }).n, 1, 'restored to the backup');
  back.close();
  const safety = new DatabaseSync(r.safetyCopy!, { readOnly: true });
  assert.equal((safety.prepare('SELECT COUNT(*) AS n FROM ideas').get() as { n: number }).n, 2, 'what was replaced is kept');
  safety.close();
  // A damaged file is never restored.
  const bad = path.join(tmp, 'bad.db');
  writeFileSync(bad, Buffer.alloc(8192, 7));
  assert.throws(() => restoreDb(bad, file));
  const still = openDb(file);
  assert.equal((still.prepare('SELECT COUNT(*) AS n FROM ideas').get() as { n: number }).n, 1, 'target untouched');
  still.close();
});

// ====================================================================== leases + recovery
test('lease: after a machine restart a reused pid with a stale heartbeat is not a live runner', () => {
  const db = openDb(':memory:');
  const alive = process.ppid; // a live process that is not us: what a reused pid looks like
  const old = new Date(Date.now() - 120_000).toISOString();
  db.prepare("INSERT INTO runner (id, pid, started_at, heartbeat_at, label) VALUES (1, ?, ?, ?, 'before reboot')").run(alive, old, old);
  assert.equal(leaseLive(db.prepare('SELECT * FROM runner').get() as never), false);
  assert.ok(acquireLease(db, 'after reboot'), 'a stale lease is taken over even though its pid is alive');
  assert.ok(heartbeat(db), 'the holder heartbeats');
  db.prepare('UPDATE runner SET pid = ?, heartbeat_at = ?').run(alive, new Date().toISOString());
  assert.equal(acquireLease(db, 'second runner'), false, 'a fresh lease of a live process is respected');
  assert.equal(heartbeat(db), false, 'a runner that lost the lease learns it from its heartbeat');
});

test('recover: orphaned jobs become interrupted (even if their pid was reused); a live runner\'s jobs are left alone', () => {
  const db = openDb(':memory:');
  const job = (title: string, pid: number) => {
    const j = createJob(db, createIdea(db, { ...ideaInput, title }).id, `v9${n++}-x`);
    setJobStatus(db, j.id, 'running', { runner_pid: pid });
    startRun(db, j.id, 'render', 'h', null);
    return j.id;
  };
  const reused = job('pid reused after reboot', process.ppid);
  const dead = job('runner killed', deadPid);
  const mine = job('running here', process.pid);
  const fixed = recover(db, { activeJob: mine });
  assert.ok(fixed.includes(reused) && fixed.includes(`${reused}/render`));
  assert.ok(fixed.includes(dead));
  assert.equal(getJob(db, mine)!.status, 'running', 'the job this process runs is not touched');
  assert.equal(getJob(db, reused)!.status, 'interrupted');
  assert.match(getJob(db, reused)!.notes ?? '', /resume/);
  // While another live runner holds a fresh lease, recover does nothing.
  const other = job('other runner', process.ppid);
  db.prepare("INSERT INTO runner (id, pid, started_at, heartbeat_at, label) VALUES (1, ?, ?, ?, 'other')").run(process.ppid, new Date().toISOString(), new Date().toISOString());
  assert.deepEqual(recover(db), []);
  assert.equal(getJob(db, other)!.status, 'running');
});

test('cancel: a running job whose runner is gone is cancelled at once (no flag left waiting)', () => {
  const db = openDb(':memory:');
  const j = createJob(db, createIdea(db, ideaInput).id, 'v900-c');
  setJobStatus(db, j.id, 'running', { runner_pid: deadPid });
  startRun(db, j.id, 'voice', 'h', null);
  assert.equal(requestCancel(db, j.id).status, 'cancelled');
  assert.equal(runsOf(db, j.id)[0]!.status, 'cancelled');
});

test('runner: a stage whose input cannot be read fails as that stage; retry resumes there', async () => {
  const db = openDb(':memory:');
  const j = createJob(db, createIdea(db, ideaInput).id, 'v900-d');
  let broken = true;
  const stages = fakeStages();
  const real = stages.spec.input;
  stages.spec = { ...stages.spec, input: (ctx) => (broken ? (() => { throw new Error('upstream file missing'); })() : real(ctx)) } as StageDef;
  const runner = new Runner(db, stages, { logRoot });
  const failed = await runner.runJob(j.id);
  assert.equal(failed.status, 'failed');
  assert.match(failed.error ?? '', /^spec: upstream file missing/);
  const specRun = runsOf(db, j.id).find((r) => r.stage === 'spec')!;
  assert.equal(specRun.status, 'failed', 'recorded against spec, not assets');
  broken = false;
  requeue(db, j.id);
  assert.equal((await runner.runJob(j.id)).status, 'done');
});

test('runner: an interrupt stops only the job it hits', async () => {
  const db = openDb(':memory:');
  const j = createJob(db, createIdea(db, ideaInput).id, 'v900-e');
  const runner = new Runner(db, fakeStages(), { logRoot });
  runner.interrupt(); // e.g. a lost lease, between jobs
  assert.equal((await runner.runJob(j.id)).status, 'done');
});

/** Run a job in a child process that blocks in `stage`, SIGKILL it there, recover and finish. */
async function crashAt(stage: StageName) {
  const file = tmpDb();
  const db = openDb(file);
  const j = createJob(db, createIdea(db, ideaInput).id, 'v900-crash');
  const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(ROOT, 'tests/fixtures/crash-runner.ts'), file, j.id, stage, logRoot], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  child.stderr.on('data', (b: Buffer) => (err += b.toString()));
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`child never reached ${stage}: ${err}`)), 15_000);
    child.stdout.on('data', (b: Buffer) => {
      if (b.toString().includes(`BLOCKED ${stage}`)) {
        clearTimeout(t);
        resolve();
      }
    });
  });
  child.kill('SIGKILL');
  await new Promise((r) => child.once('close', r));
  // The child's lease is still there with a fresh heartbeat but a dead pid: not live.
  assert.equal(getJob(db, j.id)!.status, 'running', 'the killed runner left the job marked running');
  assert.ok(acquireLease(db, 'restarted'), 'a dead runner\'s lease is taken over');
  const fixed = recover(db);
  assert.ok(fixed.includes(`${j.id}/${stage}`), `${stage}: the killed stage is marked interrupted`);
  assert.equal(getJob(db, j.id)!.status, 'interrupted');
  requeue(db, j.id);
  const runs: Record<string, number> = {};
  assert.equal((await new Runner(db, fakeStages({ runs }), { logRoot }).runJob(j.id)).status, 'done');
  const all = runsOf(db, j.id);
  const before = STAGES.slice(0, STAGES.indexOf(stage));
  for (const s of before) assert.equal(runs[s], undefined, `${stage}: ${s} finished before the crash and was reused`);
  assert.equal(runs[stage], 1, `${stage}: the killed stage ran again once`);
  assert.deepEqual(all.filter((r) => r.stage === stage && r.status !== 'reused').map((r) => r.status), ['interrupted', 'succeeded']);
  for (const s of STAGES) assert.equal(all.filter((r) => r.stage === s && r.status === 'succeeded').length, 1, `${stage}: ${s} succeeded exactly once`);
  assert.ok(checkDb(db).ok, 'database intact after the kill');
  db.close();
}
test('crash: SIGKILL of the runner during each of the 13 stages, then restart: finished stages are kept, the killed one reruns once', async () => {
  for (const s of STAGES) await crashAt(s);
});

// ====================================================================== duplicates + decisions
test('jobs: one active job per idea, enforced by the database too; a finished job cannot be re-run beside an active one', async () => {
  const db = openDb(':memory:');
  const i = createIdea(db, ideaInput);
  const a = startProduction(db, i.id);
  assert.throws(() => startProduction(db, i.id), /already has job/);
  assert.throws(() => createJob(db, i.id, 'v901-raw'), /UNIQUE/);
  setJobStatus(db, a.id, 'cancelled');
  const b = startProduction(db, i.id);
  assert.throws(() => requeue(db, a.id), /already has an active job/);
  assert.equal(getJob(db, b.id)!.status, 'queued');
});

test('decisions: approval re-checks the file on disk and the QA report of that exact file', () => {
  const db = openDb(':memory:');
  const j = createJob(db, createIdea(db, ideaInput).id, 'v900-f');
  const upload = path.join(tmp, 'upload.mp4');
  writeFileSync(upload, 'approved bytes');
  const fileSha = sha('approved bytes');
  setJobStatus(db, j.id, 'running');
  const qaId = Number(db.prepare("INSERT INTO qa_reports (job_id, upload_sha256, pass, checks_total, checks_failed, report_path, data, created_at) VALUES (?, ?, 1, 1, 0, 'r', '{}', 't')").run(j.id, fileSha).lastInsertRowid);
  finishRun(db, startRun(db, j.id, 'render', 'h', null), 'succeeded', { output: { sha256: fileSha, upload: path.relative(ROOT, upload) } });
  finishRun(db, startRun(db, j.id, 'qa', 'h', null), 'succeeded', { output: { pass: true, qaId } });
  setJobStatus(db, j.id, 'awaiting_approval');
  writeFileSync(upload, 'rebuilt by someone else');
  assert.throws(() => decide(db, j.id, 'video', 'approved'), /changed on disk/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM approvals').get()!.n, 0, 'nothing recorded');
  writeFileSync(upload, 'approved bytes');
  assert.throws(() => decide(db, j.id, 'video', 'maybe' as never), /decision must be/);
  assert.equal(decide(db, j.id, 'video', 'approved', '', 'test').status, 'queued');
  assert.throws(() => decide(db, j.id, 'video', 'approved'), /not awaiting approval/, 'a double click records nothing twice');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM approvals').get()!.n, 1);
});

test('gold takes: only a complete, intact take counts as frozen', () => {
  const draft = path.join(tmp, 'draft');
  const base = path.join(tmp, 'narration', 'v900-g');
  mkdirSync(draft, { recursive: true });
  writeFileSync(path.join(draft, 'take.json'), '{"lines":[]}');
  const take = (name: string, files: Record<string, string>, approved: boolean) => {
    const d = path.join(base, name);
    mkdirSync(d, { recursive: true });
    for (const [f, body] of Object.entries(files)) writeFileSync(path.join(d, f), body);
    if (approved) writeFileSync(path.join(d, 'approved.json'), JSON.stringify({ files: Object.fromEntries(Object.entries(files).map(([f, b]) => [f, sha(b)])) }));
  };
  assert.equal(frozenTake('v900-g', draft, base), null);
  take('take-01.part', { 'take.json': '{"lines":[]}', 'take.wav': 'w' }, true);
  take('take-02', { 'take.json': '{"lines":[]}' }, false);
  assert.equal(frozenTake('v900-g', draft, base), null, 'an interrupted copy (.part) or a take without approved.json is not frozen');
  take('take-03', { 'take.json': '{"lines":[]}', 'take.wav': 'w' }, true);
  assert.equal(frozenTake('v900-g', draft, base), 'take-03');
  writeFileSync(path.join(base, 'take-03', 'take.wav'), 'edited');
  assert.throws(() => frozenTake('v900-g', draft, base), /does not match its approved.json/);
});

// ====================================================================== research
test('research support levels: supported needs the exact quote AND the claim\'s terms; similar text is never "supported"', () => {
  const page = 'Billing. Automatic email reminders for unpaid invoices. To enable automatic reminders for customers regarding unpaid invoices, go to Settings. Plans start at 20 dollars per month.';
  const full = assessClaim(page, 'Invoicing software can send automatic email reminders for unpaid invoices.', 'Automatic email reminders for unpaid invoices');
  assert.equal(full.status, 'supported');
  assert.equal(full.quoteMatch, 'exact');
  assert.ok(full.limitations!.some((l) => /not a reading/.test(l)));
  const narrow = assessClaim(page, 'Reminders cut late payments in half for small studios.', 'Automatic email reminders for unpaid invoices');
  assert.equal(narrow.status, 'partial', 'the quote is real, but it does not say that');
  assert.match(narrow.note!, /cut|late|half|studios/);
  const similar = assessClaim(page, 'Invoicing software can send automatic email reminders for unpaid invoices.', 'Automatic reminder emails for every unpaid invoice');
  assert.equal(similar.status, 'partial');
  assert.equal(similar.quoteMatch, 'similar');
  assert.equal(similar.confidence, 'low');
  const neg = assessClaim('Automatic email reminders for unpaid invoices are not available on the free plan.', 'Invoicing software can send automatic email reminders for unpaid invoices.', 'Automatic email reminders for unpaid invoices');
  assert.equal(neg.status, 'contradicted');
  assert.equal(assessClaim(page, 'Anything at all.', 'A sentence that is not there').status, 'unverified');
  assert.equal(coverage(terms('Plans start at 30 dollars'), terms(page)).missing.includes('30'), true, 'numbers must match exactly');
});

test('writer: anything but a directly supported claim pauses the script for review', () => {
  const kit = KITS.invoices!;
  const facts: IdeaFacts = { id: 'idea-0001', title: 'T', topic: 't', audience: 'a', category: 'invoices', hook: null, valueNote: null, arc: null, preset: null };
  const claims = (status: ClaimSummary['status']): ClaimSummary[] => kit.references.map((r) => ({ ref: r.ref, text: r.claim, kind: 'fact', status, url: r.url, required: Boolean(r.required) }));
  assert.equal(writeScript(scriptBrief(makeBrief(facts, kit, claims('supported'))), kit).needsReview, false);
  for (const st of ['partial', 'unverified', 'contradicted'] as const) assert.equal(writeScript(scriptBrief(makeBrief(facts, kit, claims(st))), kit).needsReview, true, st);
});

// ====================================================================== editorial QA
function kitVideo(kitId: string) {
  const kit = KITS[kitId]!;
  const facts: IdeaFacts = { id: 'idea-0001', title: kit.seeds[0]!.title, topic: 't', audience: 'a', category: kit.id, hook: null, valueNote: null, arc: null, preset: null };
  const claims: ClaimSummary[] = kit.references.map((r) => ({ ref: r.ref, text: r.claim, kind: 'fact', status: 'supported', url: r.url, required: Boolean(r.required) }));
  const brief = makeBrief(facts, kit, claims);
  const script = writeScript(scriptBrief(brief), kit);
  const sb = planStoryboard(script, kit, { series: 'N° 900', preset: brief.preset, harmony: brief.harmony });
  const lock = estimateLock('v900-kit', script.lines);
  const fit = fitVideo({ id: 'v900-kit', title: brief.title, series: 'N° 900', brief: { topic: 't', audience: 'a', cta: brief.cta, hook: script.lines[0]!.text }, publish: brief.publish }, script, sb, lock);
  assert.deepEqual(fit.errors, []);
  return { kit, brief, script, sb, lock, fit, claims };
}
const editorialFor = (v: ReturnType<typeof kitVideo>, over: Partial<Parameters<typeof editorialReview>[0]> = {}) =>
  editorialReview({
    script: v.script,
    storyboard: v.sb,
    scenes: v.fit.spec.scenes.map((s) => ({ id: s.id, type: s.type, duration: s.duration })),
    lock: { voice: NARRATOR!.label, lines: v.lock.lines },
    claims: v.claims.map((c) => ({ ...c, kind: 'fact' as const, confidence: 'high' as const })),
    technical: [{ id: 'pacing.static', status: 'pass', detail: 'longest 0.70 s' }],
    preset: v.sb.preset,
    publishCaption: v.brief.publish.caption,
    brand: { cta: CTA_LINE, disclosure: DISCLOSURE, narrator: NARRATOR!.label, presets: ['editorial', 'cinematic', 'calm'] },
    ...over,
  });

test('editorial QA: a structured report on every kit, covering every area, that never approves', () => {
  for (const id of Object.keys(KITS)) {
    const r = editorialFor(kitVideo(id));
    assert.equal(r.approves, false);
    assert.equal(r.verdict, 'needs your review');
    for (const area of ['hook', 'clarity', 'progression', 'repetition', 'pacing', 'variety', 'claims', 'cta', 'brand']) assert.ok(r.items.some((i) => i.area === area), `${id}: ${area} covered`);
    assert.equal(r.problems, 0, `${id}: ${r.items.filter((i) => i.status === 'problem').map((i) => `${i.id} ${i.measure}`).join('; ')}`);
  }
  assert.ok(readingEase(['Stop chasing your own invoices.']) > readingEase(['Organisational interdependencies necessitate comprehensive documentation.']));
  const hookOf = (text: string) => editorialFor(kitVideo('invoices'), { script: { ...kitVideo('invoices').script, lines: kitVideo('invoices').script.lines.map((l) => (l.section === 'hook' ? { ...l, text } : l)) } }).items.find((i) => i.id === 'hook.tension')!.status;
  assert.equal(hookOf("Getting paid shouldn't depend on chasing."), 'ok');
  assert.equal(hookOf('Invoices are documents with numbers.'), 'look');
});

test('editorial QA: real problems are reported (and nothing is enforced)', () => {
  const v = kitVideo('invoices');
  const script = { ...v.script, lines: v.script.lines.filter((l) => l.section !== 'cta').map((l) => (l.section === 'hook' ? { ...l, text: 'Here is a very long opening line that just keeps going on and on.' } : l)) };
  const r = editorialFor(v, {
    script,
    claims: v.claims.map((c) => ({ ...c, kind: 'fact' as const, status: 'partial' as const, note: 'covers 40 %' })),
    lock: { voice: 'someone-else', lines: v.lock.lines },
    publishCaption: 'no disclosure',
  });
  const problems = r.items.filter((i) => i.status === 'problem').map((i) => i.id);
  for (const id of ['hook.length', 'cta.present', 'claims.cited', 'brand.narrator', 'brand.disclosure']) assert.ok(problems.includes(id), `${id} reported`);
  assert.equal(r.approves, false);
  assert.equal(STAGE_DEFS.editorial.gate, undefined, 'the editorial stage never pauses or blocks a job');
});

// ====================================================================== technical QA additions
test('QA captions: overlap and out-of-range fail, short reading time warns, clean passes', () => {
  const ok = [{ id: 'a', markup: 'Stop chasing', at: 0.2, out: 1.6 }, { id: 'b', markup: 'Get *paid*', at: 2.0, out: 3.0 }];
  assert.equal(captionChecks(ok, 5)[0]!.status, 'pass');
  assert.equal(captionChecks([ok[0]!, { ...ok[1]!, at: 1.2 }], 5)[0]!.status, 'fail');
  assert.equal(captionChecks([ok[0]!, { ...ok[1]!, out: 6 }], 5)[0]!.status, 'fail');
  assert.equal(captionChecks([{ id: 'c', markup: 'one two three four five six seven', at: 1, out: 1.6 }], 5)[0]!.status, 'warn');
  assert.equal(captionChecks([], 5)[0]!.status, 'skip');
});

test('QA empty scenes and missing assets', () => {
  const stds = [...Array(30).fill(20), ...Array(30).fill(1.5), ...Array(30).fill(12)];
  assert.equal(emptySceneCheck(stds, [{ id: 'a', from: 0, frames: 30 }, { id: 'b', from: 30, frames: 30 }, { id: 'c', from: 60, frames: 30 }]).status, 'fail');
  assert.equal(emptySceneCheck(stds, [{ id: 'a', from: 0, frames: 30 }, { id: 'c', from: 60, frames: 30 }]).status, 'pass');
  assert.equal(assetChecks([{ file: 'x', role: 'narration' }], () => false).status, 'fail');
  assert.equal(assetChecks([{ file: 'x', role: 'narration' }], () => true).status, 'pass');
});

/** A tiny grayscale PNG (zlib + crc32 from node:zlib): the bundled ffmpeg reads PNG sequences, not raw video. */
function png(w: number, h: number, shade: (x: number, y: number) => number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  const rows = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rows[y * (w + 1) + 1 + x] = shade(x, y);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

test('QA decode: a complete file passes; a truncated one fails', async () => {
  const dir = path.join(tmp, 'frames');
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < 45; i++) writeFileSync(path.join(dir, `f${String(i).padStart(3, '0')}.png`), png(64, 64, (x, y) => (x * 3 + y * 2 + i * 9) % 256));
  const file = path.join(tmp, 'tiny.mp4');
  const r = await ff('ffmpeg', ['-hide_banner', '-y', '-v', 'error', '-framerate', '30', '-i', path.join(dir, 'f%03d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-f', 'mp4', file]);
  assert.equal(r.code, 0, r.stderr);
  assert.equal((await decodeCheck(file, ff)).status, 'pass');
  const cut = path.join(tmp, 'tiny-cut.mp4');
  const bytes = readFileSync(file);
  writeFileSync(cut, bytes.subarray(0, Math.floor(bytes.length * 0.6)));
  assert.equal((await decodeCheck(cut, ff)).status, 'fail');
});

// ====================================================================== dependency graph
/**
 * The real stages' input() functions, with the heavy run() bodies replaced by pure fakes
 * (no synthesis, render, files). Each test change must re-run exactly the stages listed.
 */
function graphStages(ran: StageName[], assetVersion: { v: number }): StageSet {
  const real = STAGE_DEFS;
  const wrap = <K extends StageName>(name: K, run: StageDef['run'], extra: Partial<StageDef> = {}): StageDef =>
    ({ ...real[name], run: (inp: unknown, ctx: never, h: string) => (ran.push(name), run(inp, ctx, h)), valid: () => true, ...extra }) as StageDef;
  return {
    idea: wrap('idea', real.idea.run),
    research: wrap('research', real.research.run),
    brief: wrap('brief', real.brief.run),
    script: wrap('script', real.script.run),
    storyboard: wrap('storyboard', real.storyboard.run, { gate: undefined }),
    voice: wrap('voice', (inp: any) => ({ kind: 'draft', key: inp.key, dir: `.cache/narration/test-${inp.key}`, lock: estimateLock(inp.videoId, inp.lines), lockFile: 'x', spokenSeconds: 0, synthesized: false, seconds: 0, listen: '' })),
    assets: wrap('assets', (inp: any) => ({ recordId: 1, hash: 'a', files: 0, bytes: 0, shared: 0, renderHash: sha(JSON.stringify([inp.groups['public/fonts'], inp.groups['public/textures'], inp.v])), mixHash: sha(JSON.stringify([inp.groups['assets/sound'], inp.groups.narration])) }), {
      input: (ctx) => ({ ...(real.assets.input(ctx) as object), v: assetVersion.v }),
    }),
    spec: wrap('spec', (inp: any) => {
      const fit = fitVideo({ id: inp.videoId, title: inp.title, series: inp.series, brief: { ...inp.meta, hook: inp.script.lines[0].text }, publish: inp.publish }, inp.script, inp.storyboard, inp.lock);
      if (fit.errors.length) throw new Error(fit.errors.join('; '));
      return { file: 'x', fileSha: 'x', authored: fit.authored, durationSeconds: 0, coverAt: fit.authored.publish!.coverAt, adjustments: [], scenes: fit.spec.scenes.map((s) => ({ id: s.id, type: s.type, duration: s.duration })) };
    }),
    render: wrap('render', (_inp: unknown, _c: unknown, h: string) => ({ renderId: 1, upload: 'x', sha256: h, bytes: 0, videoSeconds: 0, segments: { rendered: 0, total: 0, detail: '' }, steps: {} })),
    qa: wrap('qa', (inp: any) => ({ qaId: 1, pass: true, total: 1, failed: [], warnings: [], report: 'x', sheets: [], checks: [{ id: 'pacing.static', status: 'pass', detail: inp.sha256.slice(0, 6) }] })),
    editorial: wrap('editorial', () => ({ reportId: 1, problems: 0, attention: 0, summary: '', report: 'x', json: 'x' })),
    approval: wrap('approval', real.approval.run),
    package: wrap('package', () => ({ packageId: 1, dir: 'x', files: [], take: 'take-01' })),
  } as StageSet;
}

test('dependency graph (real stage inputs): every change re-runs exactly what reads it, nothing else', async () => {
  const page = '<h2>Automatic email reminders for unpaid invoices</h2><p>To enable automatic reminders for customers regarding unpaid invoices, open Settings.</p>';
  const savedFetcher = research_env.fetcher;
  research_env.fetcher = async () => ({ status: 200, text: page });
  try {
    const db = openDb(':memory:');
    const idea = createIdea(db, ideaInput);
    const job = createJob(db, idea.id, 'v990-deps');
    const ran: StageName[] = [];
    const assetVersion = { v: 1 };
    const runner = new Runner(db, graphStages(ran, assetVersion), { logRoot });
    const pass = async () => {
      ran.length = 0;
      requeue(db, job.id);
      const j = await runner.runJob(job.id);
      return { status: j.status, ran: [...ran] };
    };
    const renderSha = () => JSON.parse(runsOf(db, job.id).filter((r) => r.stage === 'render' && r.output).at(-1)!.output!).sha256 as string;
    const approve = () => addApproval(db, job.id, 'video', renderSha(), 'approved', '', 'test');

    const first = await pass();
    assert.equal(first.status, 'awaiting_approval');
    assert.deepEqual(first.ran, STAGES.slice(0, STAGES.indexOf('approval') + 1));
    approve();
    assert.deepEqual((await pass()).ran, ['approval', 'package'], 'approval → only packaging');
    assert.deepEqual((await pass()).ran, [], 'no change → nothing rebuilt');

    updateIdea(db, idea.id, { title: 'Get paid without chasing anyone' });
    const title = await pass();
    assert.deepEqual(title.ran, ['idea', 'brief', 'spec', 'package'], 'title: no research, script, voice, render or QA');
    assert.equal(title.status, 'done', 'the approval still holds: the file did not change');

    editScript(db, job.id, { lines: { payoff: { caption: 'You never\n*chased it.*' } } });
    const caption = await pass();
    assert.deepEqual(caption.ran, ['script', 'storyboard', 'spec', 'render', 'qa', 'editorial', 'approval'], 'caption only: picture changes, voice does not');
    assert.equal(caption.status, 'awaiting_approval', 'a new file needs a new approval');

    editScript(db, job.id, { lines: { payoff: { text: 'And you never sent a single reminder.' } } });
    assert.deepEqual((await pass()).ran, ['script', 'storyboard', 'voice', 'assets', 'spec', 'render', 'qa', 'editorial', 'approval'], 'spoken line: new voice, timing, picture');

    editStoryboard(db, job.id, { preset: 'cinematic' });
    assert.deepEqual((await pass()).ran, ['storyboard', 'spec', 'render', 'qa', 'editorial', 'approval'], 'look: no script or voice');

    assetVersion.v = 2;
    assert.deepEqual((await pass()).ran, ['assets', 'render', 'qa', 'editorial', 'approval'], 'a changed asset: only what renders or mixes it');

    const waiting = await pass();
    assert.deepEqual(waiting.ran, ['approval'], 'an unapproved file: only the approval gate re-checks, nothing rebuilds');
    assert.equal(waiting.status, 'awaiting_approval');
    approve();
    assert.deepEqual((await pass()).ran, ['approval', 'package']);
    updateIdea(db, idea.id, { engagement: 5 });
    const rating = await pass();
    assert.deepEqual(rating.ran, ['idea'], 'a rating changes the score only');
    assert.equal(rating.status, 'done');
  } finally {
    research_env.fetcher = savedFetcher;
  }
});

test('render cache granularity: one scene, one caption, code/brand/assets, audio', () => {
  const v = kitVideo('onboarding');
  const spec = defineVideo(v.fit.authored, v.lock);
  const fps = FORMATS[spec.format].fps;
  const keys = (s: typeof spec, code = 'code-A') => planSegments(s, computeTimeline(s, fps), code).map((x) => x.key);
  const base = keys(spec);
  const changed = (other: string[]) => other.map((k, i) => (k === base[i] ? null : i)).filter((i): i is number => i !== null);
  assert.ok(base.length >= 5);
  // One scene's content.
  const k = 2;
  const oneScene = structuredClone(v.fit.authored);
  (oneScene.scenes[k] as { props: Record<string, unknown> }).props = { ...(oneScene.scenes[k] as { props: Record<string, unknown> }).props, title: 'New client · Changed' };
  const c1 = changed(keys(defineVideo(oneScene, v.lock)));
  assert.ok(c1.includes(k) && c1.every((i) => Math.abs(i - k) <= 1), `one scene → its segment (+ a hand-off neighbour), got ${c1}`);
  // Render code, brand tokens, fonts, textures: all in RENDER_INPUTS → every segment.
  assert.equal(changed(keys(spec, 'code-B')).length, base.length);
  for (const d of ['src/brand', 'src/remotion', 'public/fonts', 'public/textures']) assert.ok(RENDER_INPUTS.includes(d), `${d} is a render input`);
  // Audio only (score plan): no segment.
  const audio = structuredClone(v.fit.authored);
  (audio as { audio?: Record<string, unknown> }).audio = { ...((audio as { audio?: Record<string, unknown> }).audio ?? {}), gainDb: -3 };
  assert.deepEqual(changed(keys(defineVideo(audio, v.lock))), [], 'audio changes never re-render the picture');
  // Sound: composer code and every sample file (not only the manifest) are mix inputs.
  for (const d of ['src/sound', 'src/pipeline/sound', 'assets/sound/vcsl']) assert.ok(MIX_INPUTS.some((m) => m === d || d.startsWith(`${m}/`)), `${d} is a mix input`);
});

test('voice cache: narrator recipe and line text change the take key; captions and title do not', () => {
  const lines = [{ id: 'hook', text: 'Stop chasing your own invoices.' }];
  const key = narrationKey(lines);
  assert.equal(narrationKey([{ ...lines[0]!, caption: 'Stop *chasing*' } as never]), key);
  assert.notEqual(narrationKey([{ id: 'hook', text: 'Stop chasing invoices.' }]), key);
  const speed = NARRATOR!.speed;
  try {
    (NARRATOR as { speed: number }).speed = speed + 0.1;
    assert.notEqual(narrationKey(lines), key, 'a narrator change is a new take');
  } finally {
    (NARRATOR as { speed: number }).speed = speed;
  }
});

test('editorial report: written beside QA, recorded, and never touches the job state', async () => {
  const dir = path.join(ROOT, 'out', 'v999-hardening-test');
  try {
    const db = openDb(':memory:');
    const j = createJob(db, createIdea(db, ideaInput).id, 'v999-hardening-test');
    const v = kitVideo('invoices');
    const inp = {
      videoId: 'v999-hardening-test',
      sha256: 'f'.repeat(64),
      script: v.script,
      storyboard: v.sb.scenes,
      scenes: v.fit.spec.scenes.map((s) => ({ id: s.id, type: s.type, duration: s.duration })),
      lock: { voice: 'someone-else', lines: v.lock.lines },
      claims: [],
      technical: [],
      preset: v.sb.preset,
      caption: 'no disclosure',
      code: 'c',
    };
    const out = await STAGE_DEFS.editorial.run(inp, { db, job: getJob(db, j.id)!, log: () => {} } as never, 'h');
    assert.ok((out as { problems: number }).problems >= 2, 'problems reported');
    assert.ok(existsSync(path.join(dir, 'qa', 'editorial.md')));
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM editorial_reports').get()!.n, 1);
    assert.equal(getJob(db, j.id)!.status, 'queued', 'state unchanged: the owner decides');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
