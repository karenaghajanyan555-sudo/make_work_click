/**
 * Production model (pure): stages, job/stage states and the allowed transitions.
 * The runner (runner.ts) and the store (store.ts) refuse any edge not listed here.
 */

export const STAGES = ['idea', 'research', 'brief', 'script', 'storyboard', 'voice', 'assets', 'spec', 'render', 'qa', 'editorial', 'approval', 'package'] as const;
export type StageName = (typeof STAGES)[number];
export const isStage = (s: string): s is StageName => (STAGES as readonly string[]).includes(s);

export type JobStatus =
  | 'queued'
  | 'running'
  | 'awaiting_review'
  | 'awaiting_approval'
  | 'failed'
  | 'interrupted'
  | 'cancelled'
  | 'revision'
  | 'rejected'
  | 'done';

/** Allowed job transitions. Waiting states resume through `queued`. */
export const JOB_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  queued: ['running', 'cancelled'],
  running: ['awaiting_review', 'awaiting_approval', 'failed', 'interrupted', 'cancelled', 'revision', 'rejected', 'done'],
  awaiting_review: ['queued', 'revision', 'cancelled'],
  awaiting_approval: ['queued', 'revision', 'rejected', 'cancelled'],
  failed: ['queued', 'cancelled'],
  interrupted: ['queued', 'cancelled'],
  revision: ['queued', 'cancelled'],
  rejected: ['queued'],
  cancelled: ['queued'],
  done: ['queued'],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return JOB_TRANSITIONS[from].includes(to);
}

export type StageStatus = 'running' | 'succeeded' | 'reused' | 'failed' | 'interrupted' | 'cancelled' | 'waiting';
export const STAGE_TRANSITIONS: Record<StageStatus, readonly StageStatus[]> = {
  running: ['succeeded', 'failed', 'interrupted', 'cancelled', 'waiting'],
  waiting: ['succeeded', 'failed', 'cancelled', 'interrupted'],
  succeeded: [],
  reused: [],
  failed: [],
  interrupted: [],
  cancelled: [],
};
/** A stage run whose output downstream stages may use. */
export const isComplete = (s: StageStatus) => s === 'succeeded' || s === 'reused';

export type IdeaStatus = 'discovered' | 'new' | 'in_production' | 'awaiting_review' | 'awaiting_approval' | 'approved' | 'rejected' | 'archived';
/** Idea-level research summary: every fact supported, or something to review. ('verified' = rows written before Phase 2.5.) */
export type ResearchStatus = 'none' | 'supported' | 'flagged' | 'verified';

export type JobOptions = {
  /** Pause after the storyboard for a human review of script + storyboard. */
  reviewScript?: boolean;
  /** Test hook: this stage fails on its next run, once (then the flag clears). */
  failOnce?: StageName;
};

/** Human-facing label per job state (dashboard, CLI). */
export const JOB_LABEL: Record<JobStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  awaiting_review: 'Script review',
  awaiting_approval: 'Awaiting approval',
  failed: 'Failed',
  interrupted: 'Interrupted',
  cancelled: 'Cancelled',
  revision: 'Revision requested',
  rejected: 'Rejected',
  done: 'Packaged',
};

/** JSON with sorted keys: the same value always hashes the same. */
export function stableStringify(x: unknown): string {
  if (x === undefined) return 'null';
  if (x === null || typeof x !== 'object') return JSON.stringify(x);
  if (Array.isArray(x)) return `[${x.map(stableStringify).join(',')}]`;
  const o = x as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(',')}}`;
}
