/**
 * End-to-end production check in a throwaway copy of the repo (your real database, videos,
 * takes and packages are never touched): idea → research → … → render → QA → editorial →
 * approval → package, with a runner crash (SIGKILL) in the middle of the render, a restart,
 * a duplicate start, a re-delivery after packaging, a package retry, and a database backup +
 * restore. The test approval is given inside the copy only.
 *
 *   npm run test:e2e [-- --keep]     (~10 min: one real render; needs no network except research)
 *
 * The copy: every tracked + unignored file, node_modules linked, the narration cache copied
 * (so no synthesis is needed when the script matches a cached take). --keep leaves it on disk.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SRC = path.resolve(import.meta.dirname, '..');
const keep = process.argv.includes('--keep');
const root = mkdtempSync(path.join(tmpdir(), 'mwc-e2e-'));
const dbFile = path.join(root, 'data', 'studio.db');
const env = { ...process.env, MWC_DB: dbFile };
const results: Array<{ step: string; ok: boolean; detail: string }> = [];
const t0 = performance.now();
const secs = (t: number) => ((performance.now() - t) / 1000).toFixed(1);
const check = (step: string, ok: boolean, detail: string) => {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${step}: ${detail}`);
};
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const node = (args: string[]) => spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', ...args], { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const produce = (...args: string[]) => node(['scripts/produce.ts', ...args, '--quiet']);
const q = <T>(sql: string, ...p: Array<string | number>) => {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    return db.prepare(sql).all(...p) as T[];
  } finally {
    db.close();
  }
};
const pidAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

try {
  // ---- the copy ----
  const files = spawnSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: SRC, encoding: 'utf8' }).stdout.split('\0').filter(Boolean);
  for (const f of files) {
    if (!existsSync(path.join(SRC, f))) continue;
    mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    cpSync(path.join(SRC, f), path.join(root, f));
  }
  symlinkSync(path.join(SRC, 'node_modules'), path.join(root, 'node_modules'));
  if (existsSync(path.join(SRC, '.venv'))) symlinkSync(path.join(SRC, '.venv'), path.join(root, '.venv')); // only used on a narration cache miss
  if (existsSync(path.join(SRC, '.cache', 'narration'))) cpSync(path.join(SRC, '.cache', 'narration'), path.join(root, '.cache', 'narration'), { recursive: true });
  // The TTS model is only read: linked, like node_modules (synthesis writes to the copied cache).
  mkdirSync(path.join(root, '.cache'), { recursive: true });
  for (const d of readdirSync(path.join(SRC, '.cache')).filter((x) => x !== 'narration')) symlinkSync(path.join(SRC, '.cache', d), path.join(root, '.cache', d));
  for (const d of ['public/textures']) if (existsSync(path.join(SRC, d)) && !existsSync(path.join(root, d))) cpSync(path.join(SRC, d), path.join(root, d), { recursive: true });
  console.log(`copy: ${files.length} files → ${root}`);

  // ---- idea, then a run that is killed mid-render ----
  let r = produce('idea', 'add', '--title', 'Invoices that chase themselves', '--topic', 'Automatic payment reminders', '--audience', 'Freelancers and small studios', '--category', 'invoices', '--value', '4', '--engagement', '4', '--commercial', '3');
  check('idea registered', r.status === 0, r.stdout.trim() || r.stderr.trim());
  r = produce('start', 'idea-0001');
  check('job queued', r.status === 0, r.stdout.trim() || r.stderr.trim());
  const dup = produce('start', 'idea-0001');
  check('duplicate start refused', dup.status !== 0 && /already has job/.test(dup.stderr), dup.stderr.trim());
  const videoId = q<{ video_id: string }>("SELECT video_id FROM jobs WHERE id = 'job-0001'")[0]!.video_id;
  const segDir = path.join(root, 'out', videoId, 'segments');

  const tRun = performance.now();
  const runner = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'scripts/produce.ts', 'run', 'job-0001', '--quiet'], { cwd: root, env, stdio: 'ignore' });
  // Wait until the render has finished at least one scene segment, then kill -9 the runner.
  let killedAt = '';
  let orphan = 0;
  for (let i = 0; i < 1800; i++) {
    await new Promise((res) => setTimeout(res, 1000));
    const segs = existsSync(segDir) ? readdirSync(segDir).filter((f) => f.endsWith('.mp4') && !f.includes('.part')) : [];
    const run = q<{ child_pid: number | null }>("SELECT child_pid FROM stage_runs WHERE job_id = 'job-0001' AND stage = 'render' AND status = 'running'")[0];
    if (run?.child_pid && segs.length >= 1) {
      orphan = run.child_pid;
      runner.kill('SIGKILL');
      killedAt = `${segs.length} segment(s) done, ${secs(tRun)} s into the job`;
      break;
    }
    if (runner.exitCode !== null) break;
  }
  await new Promise((res) => (runner.exitCode !== null ? res(null) : runner.once('close', res)));
  if (!killedAt) {
    const j = q<{ status: string; error: string | null; current_stage: string | null }>("SELECT status, error, current_stage FROM jobs WHERE id = 'job-0001'")[0]!;
    throw new Error(`the run ended before a segment rendered: ${j.status} at ${j.current_stage}: ${j.error ?? ''}`);
  }
  check('runner killed mid-render (SIGKILL)', Boolean(killedAt), killedAt);
  check('job left marked running by the dead runner', q<{ status: string }>("SELECT status FROM jobs WHERE id = 'job-0001'")[0]!.status === 'running', 'as after a crash or power cut');
  check('its engine child kept running (orphan)', orphan > 0 && pidAlive(orphan), `pid ${orphan}`);
  const segsBefore = readdirSync(segDir).filter((f) => f.endsWith('.mp4') && !f.includes('.part'));

  // ---- restart: recover + resume ----
  const tResume = performance.now();
  r = produce('run', 'job-0001');
  const resumeS = secs(tResume);
  check('restart recovered the job', /recovered: job-0001\/render → interrupted/.test(r.stdout), r.stdout.split('\n').filter((l) => l.includes('recovered')).join(' | '));
  check('orphaned render stopped by recovery', !pidAlive(orphan), `pid ${orphan} ${pidAlive(orphan) ? 'still alive' : 'gone'}`);
  const job = q<{ status: string; error: string | null }>("SELECT status, error FROM jobs WHERE id = 'job-0001'")[0]!;
  check('resumed to the approval gate', job.status === 'awaiting_approval', `${job.status}${job.error ? `: ${job.error.split('\n')[0]}` : ''} in ${resumeS} s`);
  const renderLog = readFileSync(path.join(root, 'out', videoId, 'production', 'logs', 'render.log'), 'utf8');
  const cachedSegs = (renderLog.split('── run').at(-1)!.match(/segment \d+ \S+ \[[^\]]+\] cached/g) ?? []).length;
  check('segments finished before the kill were reused', cachedSegs >= segsBefore.length, `${cachedSegs} cached of ${segsBefore.length} done before the kill`);
  const stages = q<{ stage: string; status: string; seconds: number }>("SELECT stage, status, seconds FROM stage_runs WHERE job_id = 'job-0001' ORDER BY id");
  for (const s of ['idea', 'research', 'brief', 'script', 'storyboard', 'voice', 'assets', 'spec'])
    check(`${s}: finished once, reused after the crash`, stages.filter((x) => x.stage === s && x.status === 'succeeded').length === 1, stages.filter((x) => x.stage === s).map((x) => x.status).join(' → '));
  const qa = q<{ pass: number; checks_total: number; data: string }>("SELECT pass, checks_total, data FROM qa_reports WHERE job_id = 'job-0001' ORDER BY id DESC LIMIT 1")[0];
  check('technical QA', qa?.pass === 1, qa ? `${qa.checks_total} checks: ${(JSON.parse(qa.data) as { checks: Array<{ id: string; status: string }> }).checks.filter((c) => ['container.decode', 'captions.timing', 'visual.emptyScene', 'assets.present'].includes(c.id)).map((c) => `${c.id} ${c.status}`).join(', ')}` : 'no report');
  const ed = q<{ problems: number; attention: number; data: string }>("SELECT problems, attention, data FROM editorial_reports WHERE job_id = 'job-0001' ORDER BY id DESC LIMIT 1")[0];
  check('editorial QA report (never approves)', Boolean(ed) && (JSON.parse(ed!.data) as { approves: boolean }).approves === false, ed ? `${ed.problems} problems, ${ed.attention} to look at` : 'none');
  const claims = q<{ ref: string; status: string; confidence: string; retrieved_at: string }>("SELECT c.ref AS ref, c.status AS status, c.confidence AS confidence, c.retrieved_at AS retrieved_at FROM claims c JOIN research r ON r.id = c.research_id WHERE r.job_id = 'job-0001' AND c.kind = 'fact'");
  check('research claims carry support, confidence, retrieval date', claims.length > 0 && claims.every((c) => c.confidence && c.retrieved_at), claims.map((c) => `${c.ref} ${c.status}/${c.confidence}`).join(', '));
  const upload = path.join(root, 'out', videoId, `${videoId}.mp4`);
  const approvedSha = sha(upload);

  // ---- approval (inside the copy) + package ----
  const tPkg = performance.now();
  r = produce('approve', 'job-0001', '--notes', 'e2e test approval (throwaway copy)', '--run');
  const jd = q<{ status: string; error: string | null }>("SELECT status, error FROM jobs WHERE id = 'job-0001'")[0]!;
  check('approved → packaged', jd.status === 'done', `${jd.status}${jd.error ? `: ${jd.error.split('\n')[0]}` : ''} in ${secs(tPkg)} s`);
  const pkgDir = path.join(root, 'out', videoId, 'package');
  const manifest = existsSync(path.join(pkgDir, 'manifest.json')) ? (JSON.parse(readFileSync(path.join(pkgDir, 'manifest.json'), 'utf8')) as { files: Array<{ file: string; sha256: string }> }) : { files: [] };
  check('package files match their manifest', manifest.files.length > 0 && manifest.files.every((f) => sha(path.join(pkgDir, f.file)) === f.sha256), manifest.files.map((f) => f.file).join(', '));
  check('packaged MP4 = the approved file', existsSync(path.join(pkgDir, `${videoId}.mp4`)) && sha(path.join(pkgDir, `${videoId}.mp4`)) === approvedSha, approvedSha.slice(0, 12));
  const takeDir = path.join(root, 'public', 'narration', videoId);
  const takes = existsSync(takeDir) ? readdirSync(takeDir) : [];
  const approvedJson = takes.includes('take-01') ? (JSON.parse(readFileSync(path.join(takeDir, 'take-01', 'approved.json'), 'utf8')) as { files: Record<string, string> }) : null;
  check('narration frozen once, complete', takes.join(',') === 'take-01' && Boolean(approvedJson) && Object.entries(approvedJson!.files).every(([f, h]) => sha(path.join(takeDir, 'take-01', f)) === h), takes.join(', ') || 'none');

  // ---- after packaging: a re-delivery must not change the package; a package retry no duplicate ----
  const tDel = performance.now();
  r = node(['scripts/deliver.ts', videoId, '--force']);
  check('re-delivery leaves the approved package byte-identical', r.status === 0 && sha(path.join(pkgDir, `${videoId}.mp4`)) === approvedSha, `upload ${sha(upload) === approvedSha ? 'identical bytes' : 'new bytes'} after a forced re-encode (${secs(tDel)} s); package ${sha(path.join(pkgDir, `${videoId}.mp4`)).slice(0, 12)}`);
  r = produce('rerun', 'job-0001', '--force', 'package');
  const pk = q<{ n: number }>("SELECT COUNT(*) AS n FROM packages WHERE job_id = 'job-0001'")[0]!.n;
  const after = q<{ status: string }>("SELECT status FROM jobs WHERE id = 'job-0001'")[0]!.status;
  check('package retry: done again, no duplicate package, take frozen once', pk === 1 && readdirSync(takeDir).length === 1 && after === 'done', `${pk} package row(s), status ${after}, takes ${readdirSync(takeDir).join(', ')}`);

  // ---- database backup + restore ----
  r = node(['scripts/db.ts', 'backup']);
  const bfile = /✓ (\S+)/.exec(r.stdout)?.[1];
  check('db backup (verified)', r.status === 0 && Boolean(bfile), r.stdout.trim());
  produce('idea', 'add', '--title', 'Added after the backup', '--topic', 't', '--audience', 'a', '--category', 'invoices');
  const before = q<{ n: number }>('SELECT COUNT(*) AS n FROM ideas')[0]!.n;
  r = node(['scripts/db.ts', 'restore', bfile ?? 'missing']);
  const restored = q<{ n: number }>('SELECT COUNT(*) AS n FROM ideas')[0]!.n;
  check('db restore', r.status === 0 && before === 2 && restored === 1, `${before} ideas → ${restored} after restore; ${r.stdout.trim().split('\n').at(-1)}`);
  r = node(['scripts/db.ts', 'check']);
  check('db check', r.status === 0, r.stdout.trim());

  const total = stages.filter((s) => s.status === 'succeeded').reduce((a, s) => a + (s.seconds ?? 0), 0);
  console.log(`\nstage seconds (succeeded runs): ${stages.filter((s) => s.status === 'succeeded').map((s) => `${s.stage} ${s.seconds.toFixed(1)}`).join(', ')} — ${total.toFixed(0)} s`);
} catch (e) {
  check('e2e', false, (e as Error).stack ?? String(e));
} finally {
  const failed = results.filter((r) => !r.ok);
  console.log(`\nE2E ${failed.length ? 'FAIL' : 'PASS'}: ${results.length - failed.length}/${results.length} checks in ${secs(t0)} s${keep ? ` · copy kept at ${root}` : ''}`);
  if (!keep) rmSync(root, { recursive: true, force: true });
  process.exitCode = failed.length ? 1 : 0;
}
