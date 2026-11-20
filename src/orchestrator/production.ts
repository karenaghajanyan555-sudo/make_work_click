/**
 * Production actions shared by the CLI (scripts/produce.ts) and the Control Center
 * (server.ts): start, retry/resume, cancel, decisions, edits, discovery, metrics, views.
 * Each action is a checked state change; the runner does the work.
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { KITS } from '../../content/kits/index.ts';
import { ROOT } from '../pipeline/paths.ts';
import { now, tx, type Db } from './db.ts';
import { fileHash } from '../pipeline/cache.ts';
import { isStage, JOB_LABEL, STAGES, type JobOptions, type StageName } from './model.ts';
import { playbookDiscovery, type DiscoveryProvider } from './research.ts';
import { postPerformance, type QaOut, type RenderOut, type StoryboardOut } from './stages.ts';
import {
  addApproval,
  addEdit,
  approvalsOf,
  createIdea,
  createJob,
  event,
  eventsOf,
  getIdea,
  getJob,
  ideaSources,
  jobOptions,
  latestComplete,
  latestEdit,
  latestRecord,
  listIdeas,
  listJobs,
  runsOf,
  setJobOptions,
  setJobStatus,
  updateIdea,
  type Decision,
  type IdeaInput,
  type JobRow,
  type Target,
} from './store.ts';
import { categoryPerformance } from './scoring.ts';
import type { ScriptEdit } from './writer.ts';
import type { StoryboardEdit } from './storyboard.ts';

const STOP = new Set(['a', 'an', 'the', 'that', 'your', 'you', 'for', 'of', 'to', 'and', 'with', 'is', 'are', 'it', 'its', 'by', 'on', 'in', 'how', 'why']);

/** Next free vNNN across hand-made videos, productions, creative records (planned videos, D46) and jobs; slug from the title. */
export function assignVideoId(db: Db, title: string): string {
  const used = new Set<number>();
  for (const dir of ['content/videos', 'content/productions', 'content/creative']) {
    const abs = path.join(ROOT, dir);
    if (existsSync(abs)) for (const f of readdirSync(abs)) if (/^v\d{3}-/.test(f)) used.add(Number(f.slice(1, 4)));
  }
  for (const j of listJobs(db)) used.add(Number(j.video_id.slice(1, 4)));
  const n = Math.max(0, ...used) + 1;
  const words = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/[\s-]+/)
    .filter((w) => w && !STOP.has(w))
    .slice(0, 3);
  return `v${String(n).padStart(3, '0')}-${words.join('-') || 'video'}`;
}

export function addIdea(db: Db, i: IdeaInput) {
  return createIdea(db, i);
}

export function startProduction(db: Db, ideaId: string, options: JobOptions = {}): JobRow {
  // One transaction: the "no active job" check and the insert cannot interleave with another
  // process (the database also enforces one active job per idea: jobs_one_active_per_idea).
  return tx(db, () => {
    const idea = getIdea(db, ideaId);
    if (!idea) throw new Error(`no idea ${ideaId}`);
    const active = listJobs(db).find((j) => j.idea_id === ideaId && !['done', 'cancelled', 'rejected'].includes(j.status));
    if (active) throw new Error(`${ideaId} already has job ${active.id} (${JOB_LABEL[active.status]}): resume or cancel it`);
    if (!(idea.category in KITS)) throw new Error(`no story kit for "${idea.category}" (available: ${Object.keys(KITS).join(', ')})`);
    const job = createJob(db, ideaId, assignVideoId(db, idea.title), options);
    updateIdea(db, ideaId, { status: 'in_production' });
    return job;
  });
}

/** Re-queue a stopped job: completed stages are reused, the rest run. */
export function requeue(db: Db, jobId: string, o: { failOnce?: StageName } = {}): JobRow {
  return tx(db, () => {
    const job = getJob(db, jobId);
    if (!job) throw new Error(`no job ${jobId}`);
    if (job.status === 'queued' || job.status === 'running') return job;
    if (['done', 'cancelled', 'rejected'].includes(job.status)) {
      const other = listJobs(db).find((j) => j.id !== jobId && j.idea_id === job.idea_id && !['done', 'cancelled', 'rejected'].includes(j.status));
      if (other) throw new Error(`${job.idea_id} already has an active job (${other.id}, ${JOB_LABEL[other.status]}): finish or cancel it first`);
    }
    if (o.failOnce) setJobOptions(db, jobId, { ...jobOptions(job), failOnce: o.failOnce });
    return setJobStatus(db, jobId, 'queued');
  });
}

/**
 * A human decision on the script review or the final video. The video decision binds to
 * the upload's sha256, and only after checking the file on disk is still that exact,
 * QA-passed file (what the owner just watched is what gets approved).
 */
export function decide(db: Db, jobId: string, target: Target, decision: Decision, notes = '', by = 'owner'): JobRow {
  if (!['approved', 'rejected', 'revise'].includes(decision)) throw new Error(`decision must be approved, revise or rejected (got "${decision}")`);
  return tx(db, () => {
    const job = getJob(db, jobId);
    if (!job) throw new Error(`no job ${jobId}`);
    if (target === 'video') {
      if (job.status !== 'awaiting_approval') throw new Error(`${jobId} is ${JOB_LABEL[job.status]}, not awaiting approval`);
      const render = latestComplete(db, jobId, 'render');
      const qa = latestComplete(db, jobId, 'qa');
      if (!render?.output || !qa?.output) throw new Error('no rendered, QA-checked video to decide on');
      const r = JSON.parse(render.output) as RenderOut;
      const q = JSON.parse(qa.output) as QaOut;
      const qaRow = db.prepare('SELECT upload_sha256, pass FROM qa_reports WHERE id = ?').get(q.qaId) as { upload_sha256: string; pass: number } | undefined;
      if (decision === 'approved') {
        if (!q.pass || !qaRow?.pass) throw new Error('QA failed on this video: it cannot be approved');
        if (qaRow.upload_sha256 !== r.sha256) throw new Error('the QA report is for a different file than the latest render: resume the job to re-run QA');
        const file = path.join(ROOT, r.upload);
        if (!existsSync(file) || fileHash(file) !== r.sha256) throw new Error(`the upload file changed on disk since QA (${r.upload}): resume the job to rebuild and re-check it before approving`);
      }
      addApproval(db, jobId, 'video', r.sha256, decision, notes, by);
      if (decision === 'approved') return setJobStatus(db, jobId, 'queued', { notes: 'approved: packaging' });
      if (decision === 'rejected') {
        updateIdea(db, job.idea_id, { status: 'rejected' });
        return setJobStatus(db, jobId, 'rejected', { notes });
      }
      return setJobStatus(db, jobId, 'revision', { notes });
    }
    if (job.status !== 'awaiting_review') throw new Error(`${jobId} is ${JOB_LABEL[job.status]}, not waiting for a script review`);
    const sb = latestComplete(db, jobId, 'storyboard');
    if (!sb?.output) throw new Error('no storyboard to review');
    addApproval(db, jobId, 'script', (JSON.parse(sb.output) as StoryboardOut).reviewHash, decision, notes, by);
    if (decision === 'approved') return setJobStatus(db, jobId, 'queued', { notes: 'script approved' });
    return setJobStatus(db, jobId, 'revision', { notes });
  });
}

export function editScript(db: Db, jobId: string, edit: ScriptEdit): void {
  if (!getJob(db, jobId)) throw new Error(`no job ${jobId}`);
  const prev = latestEdit<ScriptEdit>(db, jobId, 'script') ?? {};
  addEdit(db, jobId, 'script', { lines: { ...(prev.lines ?? {}), ...(edit.lines ?? {}) } });
}
export function editStoryboard(db: Db, jobId: string, edit: StoryboardEdit): void {
  if (!getJob(db, jobId)) throw new Error(`no job ${jobId}`);
  addEdit(db, jobId, 'storyboard', { ...(latestEdit<StoryboardEdit>(db, jobId, 'storyboard') ?? {}), ...edit });
}

// ---------- discovery ----------
export const DISCOVERY: Record<string, DiscoveryProvider> = { playbooks: playbookDiscovery(KITS) };
export async function discover(db: Db, provider = 'playbooks') {
  const p = DISCOVERY[provider];
  if (!p) throw new Error(`no discovery provider "${provider}" (available: ${Object.keys(DISCOVERY).join(', ')})`);
  const existing = new Set(listIdeas(db).map((i) => i.title.toLowerCase()));
  const found = await p.discover(existing);
  return found.map((f) =>
    createIdea(db, { title: f.title, topic: f.topic, audience: f.audience, category: f.category, hook: f.hook, valueNote: f.valueNote, audienceValue: f.audienceValue, engagement: f.engagement, commercial: f.commercial, origin: f.origin, status: 'discovered' }),
  );
}

// ---------- analytics (manual entry) ----------
export type MetricsInput = {
  capturedAt?: string;
  views?: number;
  avgWatchSeconds?: number;
  retention?: Array<[number, number]>;
  completionRate?: number;
  saves?: number;
  shares?: number;
  comments?: number;
  profileVisits?: number;
  linkClicks?: number;
  affiliateConversions?: number;
  notes?: string;
};
export function addPublication(db: Db, jobId: string, p: { platform: string; platformVideoId?: string; url?: string; publishedAt: string }): number {
  const job = getJob(db, jobId);
  if (!job) throw new Error(`no job ${jobId}`);
  const idea = getIdea(db, job.idea_id)!;
  const sb = latestComplete(db, jobId, 'storyboard');
  const script = latestComplete(db, jobId, 'script');
  const hook = script?.output ? (JSON.parse(script.output) as { lines: Array<{ text: string }> }).lines[0]?.text : null;
  const sbo = sb?.output ? (JSON.parse(sb.output) as StoryboardOut) : null;
  const r = db
    .prepare('INSERT INTO publications (job_id, video_id, platform, platform_video_id, url, published_at, hook, category, arc, preset, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(jobId, job.video_id, p.platform, p.platformVideoId ?? null, p.url ?? null, p.publishedAt, hook ?? null, idea.category, sbo?.arc ?? null, sbo?.preset ?? null, now());
  event(db, jobId, 'published', `recorded as posted on ${p.platform} (${p.publishedAt})`);
  return Number(r.lastInsertRowid);
}
export function addMetrics(db: Db, publicationId: number, m: MetricsInput): number {
  if (m.completionRate !== undefined && !(m.completionRate >= 0 && m.completionRate <= 1)) throw new Error('completionRate is a fraction 0–1');
  const r = db
    .prepare(
      'INSERT INTO metrics (publication_id, captured_at, views, avg_watch_seconds, retention, completion_rate, saves, shares, comments, profile_visits, link_clicks, affiliate_conversions, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      publicationId,
      m.capturedAt ?? now(),
      m.views ?? null,
      m.avgWatchSeconds ?? null,
      m.retention ? JSON.stringify(m.retention) : null,
      m.completionRate ?? null,
      m.saves ?? null,
      m.shares ?? null,
      m.comments ?? null,
      m.profileVisits ?? null,
      m.linkClicks ?? null,
      m.affiliateConversions ?? null,
      m.notes ?? null,
    );
  return Number(r.lastInsertRowid);
}
/** Per category / arc / preset averages: the inputs future scoring and hook choice can use. */
export function insights(db: Db) {
  const rows = db
    .prepare(
      `SELECT p.id, p.video_id, p.platform, p.category, p.arc, p.preset, p.hook, m.views, m.completion_rate, m.avg_watch_seconds, m.saves, m.shares
       FROM publications p LEFT JOIN metrics m ON m.id = (SELECT id FROM metrics WHERE publication_id = p.id ORDER BY captured_at DESC, id DESC LIMIT 1)`,
    )
    .all() as Array<Record<string, unknown>>;
  const posts = postPerformance(db);
  const cats = [...new Set(rows.map((r) => String(r.category)))];
  return { posts: rows, categoryMultiplier: Object.fromEntries(cats.map((c) => [c, categoryPerformance(c, posts)])) };
}

// ---------- views ----------
export function jobView(db: Db, jobId: string) {
  const job = getJob(db, jobId);
  if (!job) throw new Error(`no job ${jobId}`);
  const runs = runsOf(db, jobId);
  // While a pass runs, stages after the current one show as pending (their last result is from an earlier pass).
  const cur = job.status === 'running' && job.current_stage && isStage(job.current_stage) ? STAGES.indexOf(job.current_stage) : -1;
  const stages = STAGES.map((s, k) => {
    const mine = runs.filter((r) => r.stage === s);
    const last = cur >= 0 && k > cur ? undefined : mine.at(-1);
    return {
      stage: s,
      status: last?.status ?? 'pending',
      previous: cur >= 0 && k > cur ? (mine.at(-1)?.status ?? null) : null,
      attempts: mine.filter((r) => r.status !== 'reused').length,
      startedAt: last?.started_at ?? null,
      finishedAt: last?.finished_at ?? null,
      seconds: last?.seconds ?? null,
      error: last?.error ?? null,
      runId: last?.id ?? null,
      output: last?.output ? JSON.parse(last.output) : null,
    };
  });
  const research = db.prepare('SELECT * FROM research WHERE job_id = ? ORDER BY id DESC LIMIT 1').get(jobId) as { id: number } | undefined;
  return {
    job: { ...job, options: jobOptions(job), label: JOB_LABEL[job.status] },
    idea: getIdea(db, job.idea_id),
    sources: ideaSources(db, job.idea_id),
    stages,
    runs,
    research: research
      ? {
          ...research,
          claims: db.prepare('SELECT c.*, s.url, s.title AS source_title, s.http_status FROM claims c LEFT JOIN sources s ON s.id = c.source_id WHERE c.research_id = ? ORDER BY c.id').all(research.id),
          sources: db.prepare('SELECT * FROM sources WHERE research_id = ? ORDER BY id').all(research.id),
        }
      : null,
    brief: latestRecord(db, 'briefs', jobId) ?? null,
    script: latestRecord(db, 'scripts', jobId) ?? null,
    storyboard: latestRecord(db, 'storyboards', jobId) ?? null,
    assets: latestRecord(db, 'asset_manifests', jobId) ?? null,
    renders: db.prepare('SELECT id, upload_path, upload_sha256, bytes, video_seconds, segments_rendered, segments_total, build_seconds, created_at FROM renders WHERE job_id = ? ORDER BY id DESC').all(jobId),
    qa: db.prepare('SELECT id, upload_sha256, pass, checks_total, checks_failed, report_path, data, created_at FROM qa_reports WHERE job_id = ? ORDER BY id DESC').all(jobId).map((q) => ({ ...(q as Record<string, unknown>), data: JSON.parse(String((q as { data: string }).data)) })),
    editorial: (() => {
      const e = db.prepare('SELECT id, upload_sha256, attention, problems, data, created_at FROM editorial_reports WHERE job_id = ? ORDER BY id DESC LIMIT 1').get(jobId) as { data: string } | undefined;
      return e ? { ...e, data: JSON.parse(e.data) } : null;
    })(),
    approvals: approvalsOf(db, jobId),
    packages: db.prepare('SELECT * FROM packages WHERE job_id = ? ORDER BY id DESC').all(jobId),
    events: eventsOf(db, jobId, 100),
  };
}

export const isStageName = isStage;
