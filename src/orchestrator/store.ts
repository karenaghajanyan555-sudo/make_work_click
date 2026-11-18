/**
 * Repository over the production database: every read and write the runner, CLI and
 * dashboard do goes through here. Job status changes are checked against model.ts.
 */
import { json, now, tx, type Db } from './db.ts';
import { canTransition, type IdeaStatus, type JobOptions, type JobStatus, type StageName, type StageStatus } from './model.ts';

// ---------- ideas ----------
export type IdeaRow = {
  id: string;
  title: string;
  topic: string;
  audience: string;
  category: string;
  hook: string | null;
  value_note: string | null;
  audience_value: number;
  engagement: number;
  commercial: number;
  arc: string | null;
  preset: string | null;
  notes: string | null;
  origin: string;
  score: number | null;
  priority: number | null;
  priority_override: number | null;
  research_status: string;
  status: IdeaStatus;
  created_at: string;
  updated_at: string;
};
export type IdeaSource = { url: string; claim: string; quote?: string | null };
export type IdeaInput = {
  title: string;
  topic: string;
  audience: string;
  category: string;
  hook?: string;
  valueNote?: string;
  audienceValue?: number;
  engagement?: number;
  commercial?: number;
  arc?: string;
  preset?: string;
  notes?: string;
  origin?: string;
  status?: IdeaStatus;
  sources?: IdeaSource[];
};

const nextId = (db: Db, table: 'ideas' | 'jobs', prefix: string) => {
  const rows = db.prepare(`SELECT id FROM ${table}`).all() as Array<{ id: string }>;
  const n = Math.max(0, ...rows.map((r) => Number(r.id.slice(prefix.length + 1)) || 0)) + 1;
  return `${prefix}-${String(n).padStart(4, '0')}`;
};

const rating = (x: number | undefined, d = 3) => {
  const v = Math.round(x ?? d);
  if (!(v >= 1 && v <= 5)) throw new Error(`ratings are 1–5 (got ${x})`);
  return v;
};

export function validateIdea(i: IdeaInput): string[] {
  const e: string[] = [];
  for (const k of ['title', 'topic', 'audience', 'category'] as const) if (!i[k]?.trim()) e.push(`${k} is required`);
  if (i.title && [...i.title.trim()].length > 100) e.push('title: at most 100 characters (YouTube)');
  for (const s of i.sources ?? []) {
    if (!/^https?:\/\//.test(s.url)) e.push(`source "${s.url}": must be an http(s) URL`);
    if (!s.claim?.trim()) e.push(`source "${s.url}": say which claim it supports`);
  }
  return e;
}

export function createIdea(db: Db, i: IdeaInput): IdeaRow {
  const errors = validateIdea(i);
  if (errors.length) throw new Error(errors.join('; '));
  return tx(db, () => {
  const id = nextId(db, 'ideas', 'idea');
  const t = now();
  db.prepare(
    `INSERT INTO ideas (id, title, topic, audience, category, hook, value_note, audience_value, engagement, commercial, arc, preset, notes, origin, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    i.title.trim(),
    i.topic.trim(),
    i.audience.trim(),
    i.category.trim(),
    i.hook?.trim() || null,
    i.valueNote?.trim() || null,
    rating(i.audienceValue),
    rating(i.engagement),
    rating(i.commercial),
    i.arc || null,
    i.preset || null,
    i.notes || null,
    i.origin ?? 'manual',
    i.status ?? 'new',
    t,
    t,
  );
  for (const s of i.sources ?? []) addIdeaSource(db, id, s);
  event(db, null, 'idea', `${id} added: ${i.title.trim()}`);
  return getIdea(db, id)!;
  });
}

export function addIdeaSource(db: Db, ideaId: string, s: IdeaSource): void {
  db.prepare('INSERT INTO idea_sources (idea_id, url, claim, quote, created_at) VALUES (?, ?, ?, ?, ?)').run(ideaId, s.url, s.claim, s.quote ?? null, now());
}

const IDEA_FIELDS: Record<string, string> = {
  title: 'title',
  topic: 'topic',
  audience: 'audience',
  category: 'category',
  hook: 'hook',
  valueNote: 'value_note',
  audienceValue: 'audience_value',
  engagement: 'engagement',
  commercial: 'commercial',
  arc: 'arc',
  preset: 'preset',
  notes: 'notes',
  status: 'status',
  priorityOverride: 'priority_override',
  score: 'score',
  priority: 'priority',
  researchStatus: 'research_status',
};

export function updateIdea(db: Db, id: string, patch: Record<string, unknown>): IdeaRow {
  const sets: string[] = [];
  const vals: Array<string | number | null> = [];
  for (const [k, v] of Object.entries(patch)) {
    const col = IDEA_FIELDS[k];
    if (!col) throw new Error(`unknown idea field "${k}"`);
    if (['audienceValue', 'engagement', 'commercial'].includes(k)) vals.push(rating(Number(v)));
    else vals.push(v === undefined || v === '' ? null : (v as string | number | null));
    sets.push(`${col} = ?`);
  }
  if (!sets.length) return getIdea(db, id)!;
  db.prepare(`UPDATE ideas SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).run(...vals, now(), id);
  const row = getIdea(db, id);
  if (!row) throw new Error(`no idea ${id}`);
  return row;
}

export const getIdea = (db: Db, id: string) => db.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as IdeaRow | undefined;
export const listIdeas = (db: Db) =>
  db.prepare('SELECT * FROM ideas ORDER BY COALESCE(priority_override, priority, 0) DESC, created_at').all() as IdeaRow[];
export const ideaSources = (db: Db, id: string) =>
  db.prepare('SELECT url, claim, quote FROM idea_sources WHERE idea_id = ? ORDER BY id').all(id) as IdeaSource[];

// ---------- jobs ----------
export type JobRow = {
  id: string;
  idea_id: string;
  video_id: string;
  status: JobStatus;
  options: string;
  current_stage: string | null;
  error: string | null;
  notes: string | null;
  runner_pid: number | null;
  cancel_requested: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
};
export const jobOptions = (j: JobRow) => json<JobOptions>(j.options, {});

export function createJob(db: Db, ideaId: string, videoId: string, options: JobOptions = {}): JobRow {
  return tx(db, () => {
  const id = nextId(db, 'jobs', 'job');
  const t = now();
  db.prepare('INSERT INTO jobs (id, idea_id, video_id, status, options, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id,
    ideaId,
    videoId,
    'queued',
    JSON.stringify(options),
    t,
    t,
  );
  event(db, id, 'job', `${id} queued for ${ideaId} as ${videoId}`);
  return getJob(db, id)!;
  });
}

export const getJob = (db: Db, id: string) => db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined;
export const listJobs = (db: Db) => db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all() as JobRow[];
export const nextQueued = (db: Db) => db.prepare("SELECT * FROM jobs WHERE status = 'queued' ORDER BY updated_at, id LIMIT 1").get() as JobRow | undefined;

/** Change a job's state; throws on an edge model.ts does not allow. */
export function setJobStatus(db: Db, id: string, to: JobStatus, fields: Partial<Pick<JobRow, 'error' | 'notes' | 'current_stage' | 'runner_pid'>> = {}): JobRow {
  return tx(db, () => {
  const job = getJob(db, id);
  if (!job) throw new Error(`no job ${id}`);
  if (job.status !== to && !canTransition(job.status, to)) throw new Error(`job ${id}: cannot go from ${job.status} to ${to}`);
  const t = now();
  const sets = ['status = ?', 'updated_at = ?'];
  const vals: Array<string | number | null> = [to, t];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v ?? null);
  }
  if (to === 'running') sets.push(`started_at = COALESCE(started_at, '${t}')`, 'cancel_requested = 0');
  if (['done', 'failed', 'cancelled', 'rejected', 'interrupted', 'awaiting_approval', 'awaiting_review', 'revision'].includes(to)) {
    sets.push('finished_at = ?');
    vals.push(t);
  }
  if (to === 'queued') sets.push('finished_at = NULL', 'error = NULL', ...(fields.notes === undefined ? ['notes = NULL'] : []));
  db.prepare(`UPDATE jobs SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  if (job.status !== to) event(db, id, 'status', `${job.status} → ${to}${fields.error ? `: ${fields.error.split('\n')[0]}` : ''}`);
  return getJob(db, id)!;
  });
}

export function setJobOptions(db: Db, id: string, options: JobOptions): void {
  db.prepare('UPDATE jobs SET options = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(options), now(), id);
}

export function requestCancel(db: Db, id: string): JobRow {
  return tx(db, () => {
    const job = getJob(db, id);
    if (!job) throw new Error(`no job ${id}`);
    if (job.status === 'running') {
      // A live runner stops the current step itself; a dead one cannot, so cancel here.
      if (job.runner_pid && runnerAlive(db, job.runner_pid)) {
        db.prepare('UPDATE jobs SET cancel_requested = 1, updated_at = ? WHERE id = ?').run(now(), id);
        event(db, id, 'cancel', 'cancel requested (the runner stops the current step)');
        return getJob(db, id)!;
      }
      for (const r of db.prepare("SELECT * FROM stage_runs WHERE job_id = ? AND status = 'running'").all(id) as RunRow[]) finishRun(db, r, 'cancelled', { error: 'cancelled (its runner was no longer running)' });
    }
    return setJobStatus(db, id, 'cancelled', { runner_pid: null });
  });
}

// ---------- stage runs ----------
export type RunRow = {
  id: number;
  job_id: string;
  stage: StageName;
  attempt: number;
  status: StageStatus;
  input_hash: string;
  output_hash: string | null;
  output: string | null;
  error: string | null;
  log_path: string | null;
  child_pid: number | null;
  started_at: string;
  finished_at: string | null;
  seconds: number | null;
};

export function startRun(db: Db, jobId: string, stage: StageName, inputHash: string, logPath: string | null): RunRow {
  const attempt = (db.prepare("SELECT COUNT(*) AS n FROM stage_runs WHERE job_id = ? AND stage = ? AND status != 'reused'").get(jobId, stage) as { n: number }).n + 1;
  const r = db
    .prepare('INSERT INTO stage_runs (job_id, stage, attempt, status, input_hash, log_path, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(jobId, stage, attempt, 'running', inputHash, logPath, now());
  db.prepare('UPDATE jobs SET current_stage = ?, updated_at = ? WHERE id = ?').run(stage, now(), jobId);
  return db.prepare('SELECT * FROM stage_runs WHERE id = ?').get(Number(r.lastInsertRowid)) as RunRow;
}

export function finishRun(db: Db, run: RunRow, status: Exclude<StageStatus, 'running'>, r: { output?: unknown; outputHash?: string; error?: string } = {}): void {
  const t = now();
  const seconds = (Date.parse(t) - Date.parse(run.started_at)) / 1000;
  db.prepare('UPDATE stage_runs SET status = ?, output = ?, output_hash = ?, error = ?, finished_at = ?, seconds = ?, child_pid = NULL WHERE id = ?').run(
    status,
    r.output === undefined ? null : JSON.stringify(r.output),
    r.outputHash ?? null,
    r.error ?? null,
    t,
    seconds,
    run.id,
  );
}

/** Record that a stage's previous output was reused (same input hash, artifacts present). */
export function reuseRun(db: Db, jobId: string, stage: StageName, prev: RunRow): void {
  const t = now();
  db.prepare(
    'INSERT INTO stage_runs (job_id, stage, attempt, status, input_hash, output_hash, output, log_path, started_at, finished_at, seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
  ).run(jobId, stage, prev.attempt, 'reused', prev.input_hash, prev.output_hash, prev.output, prev.log_path, t, t);
}

export const setChildPid = (db: Db, runId: number, pid: number | null) => db.prepare('UPDATE stage_runs SET child_pid = ? WHERE id = ?').run(pid, runId);

/** Latest run of a stage that produced usable output (succeeded or reused). */
export const latestComplete = (db: Db, jobId: string, stage: StageName) =>
  db.prepare("SELECT * FROM stage_runs WHERE job_id = ? AND stage = ? AND status IN ('succeeded', 'reused') ORDER BY id DESC LIMIT 1").get(jobId, stage) as RunRow | undefined;
export const runsOf = (db: Db, jobId: string) => db.prepare('SELECT * FROM stage_runs WHERE job_id = ? ORDER BY id').all(jobId) as RunRow[];
export const runningRuns = (db: Db) => db.prepare("SELECT * FROM stage_runs WHERE status = 'running'").all() as RunRow[];

// ---------- records (one row per produced version) ----------
export type RecordTable = 'briefs' | 'scripts' | 'storyboards' | 'asset_manifests';
export function saveRecord(db: Db, table: RecordTable, jobId: string, inputHash: string, data: unknown): number {
  const r = db.prepare(`INSERT INTO ${table} (job_id, input_hash, data, created_at) VALUES (?, ?, ?, ?)`).run(jobId, inputHash, JSON.stringify(data), now());
  return Number(r.lastInsertRowid);
}
export function latestRecord<T>(db: Db, table: RecordTable, jobId: string): (T & { recordId: number }) | undefined {
  const row = db.prepare(`SELECT id, data FROM ${table} WHERE job_id = ? ORDER BY id DESC LIMIT 1`).get(jobId) as { id: number; data: string } | undefined;
  return row ? { ...json<T>(row.data, {} as T), recordId: row.id } : undefined;
}

// ---------- approvals + edits ----------
export type Target = 'script' | 'video';
export type Decision = 'approved' | 'rejected' | 'revise';
export type ApprovalRow = { id: number; job_id: string; target: Target; target_hash: string; decision: Decision; notes: string | null; decided_by: string; decided_at: string };

export function addApproval(db: Db, jobId: string, target: Target, targetHash: string, decision: Decision, notes = '', by = 'owner'): ApprovalRow {
  const r = db
    .prepare('INSERT INTO approvals (job_id, target, target_hash, decision, notes, decided_by, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(jobId, target, targetHash, decision, notes || null, by, now());
  event(db, jobId, 'decision', `${target} ${decision}${notes ? `: ${notes}` : ''}`);
  return db.prepare('SELECT * FROM approvals WHERE id = ?').get(Number(r.lastInsertRowid)) as ApprovalRow;
}
/** The latest decision on exactly this version (hash) of the target. */
export const decisionFor = (db: Db, jobId: string, target: Target, hash: string) =>
  db.prepare('SELECT * FROM approvals WHERE job_id = ? AND target = ? AND target_hash = ? ORDER BY id DESC LIMIT 1').get(jobId, target, hash) as ApprovalRow | undefined;
export const approvalsOf = (db: Db, jobId: string) => db.prepare('SELECT * FROM approvals WHERE job_id = ? ORDER BY id').all(jobId) as ApprovalRow[];

export type EditTarget = 'script' | 'storyboard';
export function addEdit(db: Db, jobId: string, target: EditTarget, data: unknown): void {
  db.prepare('INSERT INTO edits (job_id, target, data, created_at) VALUES (?, ?, ?, ?)').run(jobId, target, JSON.stringify(data), now());
  event(db, jobId, 'edit', `${target} edited`);
}
export function latestEdit<T>(db: Db, jobId: string, target: EditTarget): T | undefined {
  const row = db.prepare('SELECT data FROM edits WHERE job_id = ? AND target = ? ORDER BY id DESC LIMIT 1').get(jobId, target) as { data: string } | undefined;
  return row ? json<T>(row.data, {} as T) : undefined;
}

// ---------- events ----------
export function event(db: Db, jobId: string | null, kind: string, message: string): void {
  db.prepare('INSERT INTO events (job_id, at, kind, message) VALUES (?, ?, ?, ?)').run(jobId, now(), kind, message);
}
export const eventsOf = (db: Db, jobId: string | null, limit = 200) =>
  (jobId
    ? db.prepare('SELECT * FROM events WHERE job_id = ? ORDER BY id DESC LIMIT ?').all(jobId, limit)
    : db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT ?').all(limit)) as Array<{ id: number; job_id: string | null; at: string; kind: string; message: string }>;

// ---------- runner lease (one runner at a time) ----------
export const pidAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
};
export type Lease = { pid: number; started_at: string; heartbeat_at: string; label: string };
export const currentLease = (db: Db) => db.prepare('SELECT pid, started_at, heartbeat_at, label FROM runner WHERE id = 1').get() as Lease | undefined;

/** Take the runner lease unless another live process holds it. */
export function acquireLease(db: Db, label: string, pid = process.pid): boolean {
  return tx(db, () => {
  const cur = currentLease(db);
  if (cur && cur.pid !== pid && leaseLive(cur)) return false;
  const t = now();
  db.prepare('INSERT INTO runner (id, pid, started_at, heartbeat_at, label) VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET pid = excluded.pid, started_at = excluded.started_at, heartbeat_at = excluded.heartbeat_at, label = excluded.label').run(
    pid,
    t,
    t,
    label,
  );
  return true;
  });
}
/** Refresh the lease; false if this process no longer holds it. */
export const heartbeat = (db: Db, pid = process.pid) => Number(db.prepare('UPDATE runner SET heartbeat_at = ? WHERE id = 1 AND pid = ?').run(now(), pid).changes) > 0;
/** A lease counts only while its process is alive AND it heartbeats (a reused pid after a reboot does not). */
export const LEASE_STALE_MS = 60_000;
export function leaseLive(l: Lease | undefined, at = Date.now()): boolean {
  return Boolean(l && pidAlive(l.pid) && at - Date.parse(l.heartbeat_at) < LEASE_STALE_MS);
}
/**
 * Is `pid` a live runner? Its process must exist, and if a lease is recorded it must be
 * that pid's and fresh (a reused pid after a reboot holds no fresh lease). With no lease
 * row at all (a runner used directly, as in tests) the pid is trusted.
 */
export const runnerAlive = (db: Db, pid: number) => {
  if (!pidAlive(pid)) return false;
  const l = currentLease(db);
  return !l || (l.pid === pid && leaseLive(l));
};
export const releaseLease = (db: Db, pid = process.pid) => db.prepare('DELETE FROM runner WHERE id = 1 AND pid = ?').run(pid);
