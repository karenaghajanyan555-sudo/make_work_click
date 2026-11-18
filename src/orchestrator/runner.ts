/**
 * The job runner: executes a job's stages in order, one at a time, recording every run.
 *
 * For each stage: build its declared input → hash it → if the last complete run has the
 * same hash and its artifacts still exist, reuse it (status `reused`, no work); otherwise
 * run it. A stage may pause the job for a human (`Wait`, or a `gate` after it succeeds).
 * Failures stop the job with the error recorded; `retry` re-queues it and the completed
 * stages are reused. SIGINT/SIGTERM interrupt the current stage (child processes killed);
 * a crashed runner is detected by `recover()` (dead pid) and the job can be resumed.
 * Engine steps run as child processes (fresh process per step, like `npm run make`).
 */
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readlinkSync } from 'node:fs';
import path from 'node:path';
import { sha256 } from '../pipeline/cache.ts';
import { ROOT, videoOut } from '../pipeline/paths.ts';
import type { Db } from './db.ts';
import { STAGES, stableStringify, type JobStatus, type StageName } from './model.ts';
import {
  currentLease,
  event,
  finishRun,
  getIdea,
  getJob,
  jobOptions,
  latestComplete,
  leaseLive,
  nextQueued,
  pidAlive,
  reuseRun,
  runningRuns,
  setChildPid,
  setJobOptions,
  setJobStatus,
  startRun,
  updateIdea,
  type IdeaRow,
  type JobRow,
  type RunRow,
} from './store.ts';

/** Thrown by a stage to pause the job for a human decision. */
export class Wait extends Error {
  readonly status: Extract<JobStatus, 'awaiting_review' | 'awaiting_approval' | 'revision' | 'rejected'>;
  constructor(status: Wait['status'], message: string) {
    super(message);
    this.status = status;
  }
}
class Aborted extends Error {
  readonly reason: 'interrupted' | 'cancelled';
  constructor(reason: 'interrupted' | 'cancelled') {
    super(reason);
    this.reason = reason;
  }
}

export type StageCtx = {
  db: Db;
  job: JobRow;
  idea: IdeaRow;
  /** Output of an upstream stage (complete in this pass). */
  out: <T>(stage: StageName) => T;
  log: (line: string) => void;
  /** Run `node <script> …args` from the repo root; output goes to the stage log. */
  node: (script: string, args: string[]) => Promise<void>;
  signal: AbortSignal;
};

export type StageDef<I = unknown, O = unknown> = {
  name: StageName;
  /** Bump to invalidate every cached output of this stage (logic changed). */
  version: number;
  /** Everything the stage reads. Hashed: the stage reruns only when this changes. */
  input: (ctx: StageCtx) => I | Promise<I>;
  run: (input: I, ctx: StageCtx, inputHash: string) => O | Promise<O>;
  /** Files a reused output needs (e.g. the upload file). Missing → run again. */
  valid?: (output: O, ctx: StageCtx) => boolean;
  /** After success (or reuse): pause the job for a human? */
  gate?: (output: O, ctx: StageCtx) => { status: 'awaiting_review'; message: string } | null;
};
export type StageSet = { [K in StageName]: StageDef<any, any> };

export type RunOptions = {
  /** Run only this stage (its upstream outputs must exist). */
  only?: StageName;
  /** Run these stages even if their input is unchanged. */
  force?: StageName[];
  /** Echo stage logs to stdout. */
  verbose?: boolean;
};

export const hashInput = (stage: StageDef, input: unknown) => sha256(stableStringify({ stage: stage.name, version: stage.version, input }));
export const logDir = (job: JobRow) => path.join(videoOut(job.video_id), 'production', 'logs');

export class Runner {
  private abort: AbortController | null = null;
  private stopping: 'interrupted' | 'cancelled' | null = null;

  readonly db: Db;
  readonly stages: StageSet;
  readonly opts: { verbose?: boolean; logRoot?: string };
  constructor(db: Db, stages: StageSet, opts: { verbose?: boolean; logRoot?: string } = {}) {
    this.db = db;
    this.stages = stages;
    this.opts = opts;
  }

  /** Interrupt the running stage (signal handler). The job ends `interrupted`. */
  interrupt(): void {
    this.stopping = 'interrupted';
    this.abort?.abort();
  }

  get busy(): boolean {
    return this.abort !== null;
  }

  /** Run every queued job, oldest first. Returns the ids processed. */
  async drain(): Promise<string[]> {
    const done: string[] = [];
    for (let j = nextQueued(this.db); j && !this.stopping; j = nextQueued(this.db)) {
      await this.runJob(j.id);
      done.push(j.id);
    }
    return done;
  }

  async runJob(jobId: string, o: RunOptions = {}): Promise<JobRow> {
    const db = this.db;
    // An interrupt stops the job it hits, not every later one (drain() checks between jobs).
    this.stopping = null;
    let job = getJob(db, jobId);
    if (!job) throw new Error(`no job ${jobId}`);
    if (job.status !== 'running') job = setJobStatus(db, jobId, 'running', { runner_pid: process.pid });
    const idea = getIdea(db, job.idea_id)!;
    updateIdea(db, idea.id, { status: 'in_production' });
    const outputs = new Map<StageName, unknown>();
    const verbose = o.verbose ?? this.opts.verbose ?? false;
    const logs = this.opts.logRoot ? path.join(this.opts.logRoot, job.id) : logDir(job);
    mkdirSync(logs, { recursive: true });
    this.abort = new AbortController();
    const abort = this.abort;
    const cancelPoll = setInterval(() => {
      try {
        if (getJob(db, jobId)?.cancel_requested) {
          this.stopping = 'cancelled';
          abort.abort();
        }
      } catch {
        // A busy database is retried on the next poll; never crash the runner from a timer.
      }
    }, 1000);

    let current: RunRow | null = null;
    try {
      for (const name of STAGES) {
        const def = this.stages[name];
        if (this.stopping || getJob(db, jobId)?.cancel_requested) throw new Aborted(this.stopping ?? 'cancelled');
        const logPath = path.join(logs, `${name}.log`);
        const log = (line: string) => {
          appendFileSync(logPath, line.endsWith('\n') ? line : `${line}\n`);
          if (verbose) process.stdout.write(`  ${name} │ ${line.endsWith('\n') ? line : `${line}\n`}`);
        };
        const ctx: StageCtx = {
          db,
          job,
          idea: getIdea(db, job.idea_id)!,
          out: <T>(s: StageName) => {
            if (!outputs.has(s)) throw new Error(`stage "${name}" needs "${s}", which has no output yet`);
            return outputs.get(s) as T;
          },
          log,
          node: (script, args) => this.node(script, args, log, () => current, abort.signal),
          signal: abort.signal,
        };
        const prev = latestComplete(db, jobId, name);
        if (o.only && o.only !== name) {
          // Single-stage mode: upstream outputs come from their last complete run.
          if (STAGES.indexOf(name) > STAGES.indexOf(o.only)) break;
          if (!prev) throw new Error(`run "${name}" first (no output yet)`);
          outputs.set(name, JSON.parse(prev.output ?? 'null'));
          continue;
        }
        let input: unknown;
        let inputHash: string;
        try {
          input = await def.input(ctx);
          inputHash = hashInput(def, input);
        } catch (e) {
          // Record the failure against this stage (not the previous one), so it can be retried.
          current = startRun(db, jobId, name, 'input-unavailable', logPath);
          log(`── could not read this stage's input: ${e instanceof Error ? e.message : String(e)}`);
          throw e;
        }
        const forced = o.force?.includes(name) ?? false;
        let output: unknown;
        if (!forced && prev && prev.input_hash === inputHash && prev.output !== null && (!def.valid || def.valid(JSON.parse(prev.output), ctx))) {
          output = JSON.parse(prev.output);
          reuseRun(db, jobId, name, prev);
          log(`reused (input ${inputHash.slice(0, 12)} unchanged)`);
        } else {
          current = startRun(db, jobId, name, inputHash, logPath);
          log(`── run ${current.attempt} · input ${inputHash.slice(0, 12)} · ${new Date().toISOString()}`);
          const opts = jobOptions(getJob(db, jobId)!);
          try {
            if (opts.failOnce === name) {
              setJobOptions(db, jobId, { ...opts, failOnce: undefined });
              throw new Error(`injected failure (--fail-once ${name}): nothing was run`);
            }
            output = await def.run(input, ctx, inputHash);
            if (abort.signal.aborted) throw new Aborted(this.stopping ?? 'interrupted');
          } catch (e) {
            if (e instanceof Wait) {
              finishRun(db, current, 'waiting', { error: e.message });
              log(`waiting: ${e.message}`);
              current = null;
              const status = e.status;
              const j = setJobStatus(db, jobId, status, { notes: e.message, runner_pid: null });
              updateIdea(db, idea.id, { status: status === 'rejected' ? 'rejected' : status === 'awaiting_approval' ? 'awaiting_approval' : status === 'awaiting_review' ? 'awaiting_review' : 'in_production' });
              return j;
            }
            throw e;
          }
          finishRun(db, current, 'succeeded', { output, outputHash: sha256(stableStringify(output)) });
          log(`succeeded in ${((Date.now() - Date.parse(current.started_at)) / 1000).toFixed(1)} s`);
          current = null;
        }
        outputs.set(name, output);
        const g = def.gate?.(output, ctx);
        if (g) {
          event(db, jobId, 'gate', g.message);
          const j = setJobStatus(db, jobId, g.status, { notes: g.message, runner_pid: null });
          updateIdea(db, idea.id, { status: 'awaiting_review' });
          return j;
        }
        if (o.only === name) break;
      }
      if (o.only) return setJobStatus(db, jobId, 'interrupted', { runner_pid: null, notes: `ran ${o.only} only` });
      const j = setJobStatus(db, jobId, 'done', { runner_pid: null, current_stage: null, notes: null });
      updateIdea(db, idea.id, { status: 'approved' });
      return j;
    } catch (e) {
      const aborted = e instanceof Aborted || abort.signal.aborted;
      const reason: 'interrupted' | 'cancelled' = e instanceof Aborted ? e.reason : (this.stopping ?? 'interrupted');
      const stage = current?.stage ?? getJob(db, jobId)?.current_stage ?? null;
      const error = aborted ? null : `${stage ? `${stage}: ` : ''}${errorText(e, current)}`;
      // If even this bookkeeping fails (e.g. the database is busy), the job stays `running`
      // and recover() marks it interrupted on the runner's next idle tick.
      if (current) finishRun(db, current, aborted ? reason : 'failed', { error: aborted ? reason : (error ?? undefined) });
      const status: JobStatus = aborted ? reason : 'failed';
      return setJobStatus(db, jobId, status, { error, runner_pid: null });
    } finally {
      clearInterval(cancelPoll);
      this.abort = null;
      if (this.stopping === 'cancelled') this.stopping = null;
    }
  }

  /** Child process in its own process group, so an interrupt can stop the whole tree. */
  private node(script: string, args: string[], log: (s: string) => void, run: () => RunRow | null, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new Aborted(this.stopping ?? 'interrupted'));
      log(`$ node ${script} ${args.join(' ')}`);
      const child = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', script, ...args], {
        cwd: ROOT,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const r = run();
      if (r && child.pid) setChildPid(this.db, r.id, child.pid);
      const onData = (b: Buffer) => log(b.toString().replace(/\n$/, ''));
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);
      const kill = () => {
        if (!child.pid) return;
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {}
        setTimeout(() => {
          try {
            process.kill(-child.pid!, 'SIGKILL');
          } catch {}
        }, 4000).unref();
      };
      signal.addEventListener('abort', kill, { once: true });
      child.on('error', reject);
      child.on('close', (code) => {
        signal.removeEventListener('abort', kill);
        if (r) setChildPid(this.db, r.id, null);
        if (signal.aborted) return reject(new Aborted(this.stopping ?? 'interrupted'));
        if (code === 0) resolve();
        else reject(new Error(`node ${script} ${args.join(' ')} exited with ${code}`));
      });
    });
  }
}

/** Error message plus the end of the stage log (what the engine printed before failing). */
function errorText(e: unknown, run: RunRow | null): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (!run?.log_path || !existsSync(run.log_path)) return msg;
  const tail = readFileSync(run.log_path, 'utf8').trimEnd().split('\n').slice(-12).join('\n');
  return `${msg}\n--- log tail ---\n${tail}`;
}

/**
 * After a crash, kill or restart (also of the whole machine): runs and jobs still marked
 * `running` that no live runner owns become `interrupted`, and their orphaned engine
 * processes are stopped. Only the lease holder runs jobs, so once this process holds the
 * lease (or nobody live does), every `running` row except `activeJob` (the job this
 * process is running right now) is an orphan. A pid alone proves nothing after a reboot
 * (pids are reused); the lease heartbeat does.
 */
export function recover(db: Db, o: { activeJob?: string | null } = {}): string[] {
  const lease = currentLease(db);
  if (lease && lease.pid !== process.pid && leaseLive(lease)) return [];
  const fixed: string[] = [];
  for (const r of runningRuns(db)) {
    if (o.activeJob && r.job_id === o.activeJob) continue;
    if (r.child_pid) killOrphan(r.child_pid);
    finishRun(db, r, 'interrupted', { error: 'the runner stopped (crash, kill or restart) during this stage' });
    fixed.push(`${r.job_id}/${r.stage}`);
  }
  for (const j of db.prepare("SELECT * FROM jobs WHERE status = 'running'").all() as JobRow[]) {
    if (o.activeJob && j.id === o.activeJob) continue;
    setJobStatus(db, j.id, 'interrupted', { runner_pid: null, error: null, notes: 'the runner stopped during this job: resume to continue (finished stages are kept)' });
    fixed.push(j.id);
  }
  return fixed;
}

/** Stop an engine process left behind by a dead runner — only if it is really ours (cwd = repo, a scripts/*.ts command). */
function killOrphan(pid: number): void {
  if (!pidAlive(pid)) return;
  try {
    const cwd = readlinkSync(`/proc/${pid}/cwd`);
    const cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
    if (cwd === ROOT && /scripts\/[a-z-]+\.ts/.test(cmd)) process.kill(-pid, 'SIGKILL');
  } catch {
    // Gone already, or not inspectable: leave it.
  }
}
