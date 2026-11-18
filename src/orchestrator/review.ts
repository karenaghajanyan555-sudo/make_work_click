/**
 * The Review page's data (Control Center home): only what the owner needs to decide.
 * Videos waiting for approval, scripts waiting for review, jobs still working, approved
 * packages, and engine videos (hand-written specs, decided in chat) that have an upload file.
 * Read-only: every action goes through the existing job endpoints.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { VIDEOS } from '../../content/index.ts';
import { OUT, ROOT } from '../pipeline/paths.ts';
import type { Db } from './db.ts';
import { STAGES } from './model.ts';
import { jobView } from './production.ts';
import { listJobs } from './store.ts';

/** What each stage is doing, in the owner's words. */
export const STAGE_HUMAN: Record<(typeof STAGES)[number], string> = {
  idea: 'Reading the idea',
  research: 'Checking sources',
  brief: 'Writing the brief',
  script: 'Writing the script',
  storyboard: 'Planning the scenes',
  voice: 'Recording the voice',
  assets: 'Gathering assets',
  spec: 'Assembling the video',
  render: 'Rendering',
  qa: 'Running quality checks',
  editorial: 'Editorial check',
  approval: 'Waiting for you',
  package: 'Building the post package',
};

type QaSummary = { pass: boolean; total: number; failed: string[] };
type Check = { id: string; status: string; detail: string };

/** `/files/…` URL for a path under out/, with a version so a rebuilt file reloads. */
function fileSrc(abs: string): string | null {
  if (!existsSync(abs)) return null;
  const st = statSync(abs);
  return `/files/${path.relative(OUT, abs).split(path.sep).join('/')}?v=${st.size}-${Math.round(st.mtimeMs)}`;
}
const mb = (abs: string) => (existsSync(abs) ? Number((statSync(abs).size / 1e6).toFixed(1)) : null);
const qaOf = (checks: Check[]): QaSummary => ({
  pass: !checks.some((c) => c.status === 'fail'),
  total: checks.length,
  failed: checks.filter((c) => c.status !== 'pass').map((c) => `${c.id}: ${c.detail}`),
});
const words = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/ +/g, ' ').trim();
type ScriptRec = { lines: Array<{ section: string; text: string }>; words: number; estimatedSeconds: number; flags: string[] };
const scriptOf = (v: { script?: unknown } | undefined) => (v?.script ?? null) as ScriptRec | null;

export function reviewView(db: Db) {
  const jobs = listJobs(db).filter((j) => !['cancelled', 'rejected'].includes(j.status));
  const views = new Map(jobs.map((j) => [j.id, jobView(db, j.id)]));
  const title = (id: string) => views.get(id)?.idea?.title ?? id;

  // Scripts of every other live job, to flag a script that repeats one we already have.
  const scriptLines = new Map(jobs.map((j) => [j.id, new Set((scriptOf(views.get(j.id))?.lines ?? []).map((l) => words(l.text)))]));
  const overlap = (jobId: string, lines: Array<{ text: string }>) => {
    let best: { title: string; video: string; same: number } | null = null;
    for (const other of jobs) {
      if (other.id === jobId) continue;
      const set = scriptLines.get(other.id)!;
      const same = lines.filter((l) => set.has(words(l.text))).length;
      if (same && (!best || same > best.same)) best = { title: title(other.id), video: other.video_id, same };
    }
    return best && best.same / Math.max(1, lines.length) >= 0.5 ? { ...best, of: lines.length } : null;
  };

  const decide = [];
  const scripts = [];
  const working = [];
  const approved = [];
  for (const j of jobs) {
    const v = views.get(j.id)!;
    const r = v.renders[0] as { upload_path: string; upload_sha256: string; video_seconds: number } | undefined;
    const upload = r ? path.resolve(ROOT, r.upload_path) : null;
    if (j.status === 'awaiting_approval' && r && upload) {
      const qa = v.qa[0] as { pass: number; data: { checks: Check[] } } | undefined;
      const ed = v.editorial?.data as { summary: string; items: Array<{ status: string; id: string; measure: string }> } | undefined;
      decide.push({
        jobId: j.id,
        video: j.video_id,
        title: title(j.id),
        src: fileSrc(upload),
        seconds: Number(r.video_seconds.toFixed(1)),
        mb: mb(upload),
        sha: r.upload_sha256.slice(0, 12),
        qa: qa ? { ...qaOf(qa.data.checks), pass: Boolean(qa.pass) } : null,
        notes: ed ? ed.items.filter((i) => i.status !== 'ok').map((i) => i.measure) : [],
        say: scriptOf(v)?.lines.map((l) => l.text) ?? [],
      });
    } else if (j.status === 'awaiting_review' && scriptOf(v)) {
      const s = scriptOf(v)!;
      scripts.push({
        jobId: j.id,
        title: title(j.id),
        lines: s.lines.map((l) => ({ section: l.section, text: l.text })),
        words: s.words,
        seconds: s.estimatedSeconds,
        flags: s.flags,
        repeats: overlap(j.id, s.lines),
      });
    } else if (j.status === 'done') {
      const p = v.packages[0] as { dir: string; manifest: string; created_at: string } | undefined;
      const files = p ? (JSON.parse(p.manifest) as Array<{ file: string }>).map((f) => f.file) : [];
      const dir = p ? path.resolve(ROOT, p.dir) : null;
      approved.push({
        jobId: j.id,
        video: j.video_id,
        title: title(j.id),
        src: upload ? fileSrc(upload) : null,
        packagedAt: p?.created_at ?? null,
        post: dir && files.includes('post.md') ? fileSrc(path.join(dir, 'post.md')) : null,
        folder: p?.dir ?? null,
      });
    } else {
      const k = j.current_stage ? STAGES.indexOf(j.current_stage as (typeof STAGES)[number]) : -1;
      working.push({
        jobId: j.id,
        title: title(j.id),
        status: j.status,
        step: k >= 0 ? STAGE_HUMAN[STAGES[k]!] : 'Starting',
        progress: k >= 0 ? Number(((k + (j.status === 'running' ? 0.5 : 0)) / STAGES.length).toFixed(3)) : 0,
        error: j.error ? j.error.split('\n')[0]! : null,
      });
    }
  }

  // Engine videos: hand-written specs with an upload file and no production job.
  const jobVideos = new Set(listJobs(db).map((j) => j.video_id));
  const earlier = VIDEOS.filter((s) => !jobVideos.has(s.id)).flatMap((s) => {
    const upload = path.join(OUT, s.id, `${s.id}.mp4`);
    if (!existsSync(upload)) return [];
    const report = path.join(OUT, s.id, 'qa', 'report.json');
    const checks = existsSync(report) ? (JSON.parse(readFileSync(report, 'utf8')) as { checks: Check[] }).checks : null;
    const dur = checks?.find((c) => c.id === 'video.duration')?.detail.match(/^([\d.]+)s/)?.[1];
    const take = s.narration?.take;
    return [{
      video: s.id,
      title: s.title,
      src: fileSrc(upload),
      seconds: dur ? Number(Number(dur).toFixed(1)) : null,
      mb: mb(upload),
      qa: checks ? qaOf(checks) : null,
      voice: !s.narration ? null : take ? (take.includes('/') ? `Approved voice (reused from ${take.split('/')[0]})` : 'Approved voice') : 'Draft voice: needs your OK',
      final: s.status === 'final',
      version: null as string | null,
    }];
  });
  // Same story, several cuts (v001, v001-v2): number them so the tiles can be told apart.
  for (const e of earlier) {
    const same = earlier.filter((x) => x.title === e.title);
    if (same.length > 1) e.version = `Version ${same.indexOf(e) + 1} of ${same.length}`;
  }

  return { decide, scripts, working, approved, earlier };
}
