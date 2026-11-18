/**
 * Production orchestrator CLI (the Control Center does the same: npm run control).
 *
 *   npm run produce -- idea add --title T --topic T --audience A --category invoices
 *                      [--hook H] [--value 1-5] [--engagement 1-5] [--commercial 1-5]
 *                      [--source URL --claim C [--quote Q]]…
 *   npm run produce -- idea list | idea discover [playbooks] | idea set <id> --priority N
 *   npm run produce -- start <ideaId> [--review-script] [--fail-once <stage>] [--run]
 *   npm run produce -- batch <ideaId>… [--review-script] [--run]   one job per idea, run in turn
 *   npm run produce -- run [<jobId>]                     run the queue (or one job) here
 *   npm run produce -- status [<jobId>]
 *   npm run produce -- resume|retry <jobId> [--fail-once <stage>] [--run]
 *   npm run produce -- rerun <jobId> [--force stage,stage] [--run]   re-check every stage
 *   npm run produce -- stage <jobId> <stage> [--force]  run one stage (upstream outputs kept)
 *   npm run produce -- cancel <jobId>
 *   npm run produce -- approve|revise|reject <jobId> [--notes N] [--script]
 *   npm run produce -- edit-line <jobId> <lineId> [--text T] [--caption C] [--pause S]
 *   npm run produce -- publish <jobId> --platform P --at ISO [--url U] [--video-id ID]
 *   npm run produce -- metrics <publicationId> [--views N] [--completion 0-1] [--avg-watch S] …
 *   npm run produce -- insights
 *
 * One runner at a time (lease in the database); jobs run one after another; Ctrl-C
 * interrupts the current stage cleanly (resume continues where it stopped).
 */
import { dbErrorMessage, openDb } from '../src/orchestrator/db.ts';
import { isStage, JOB_LABEL, type StageName } from '../src/orchestrator/model.ts';
import {
  addIdea,
  addMetrics,
  addPublication,
  decide,
  discover,
  editScript,
  insights,
  jobView,
  requeue,
  startProduction,
} from '../src/orchestrator/production.ts';
import { recover, Runner } from '../src/orchestrator/runner.ts';
import { STAGE_DEFS } from '../src/orchestrator/stages.ts';
import { acquireLease, currentLease, getJob, heartbeat, listIdeas, listJobs, releaseLease, requestCancel, setJobStatus, updateIdea } from '../src/orchestrator/store.ts';

const argv = process.argv.slice(2);
const flags = new Map<string, string[]>();
const pos: string[] = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]!;
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1]!.startsWith('--') ? argv[++i]! : 'true';
    flags.set(k, [...(flags.get(k) ?? []), v]);
  } else pos.push(a);
}
const flag = (k: string) => flags.get(k)?.[0];
const num = (k: string) => (flag(k) !== undefined ? Number(flag(k)) : undefined);
const has = (k: string) => flags.has(k);
const die = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

const db = openDb();
const [cmd, sub] = pos;

async function runHere(jobId?: string, o: { only?: StageName; force?: StageName[] } = {}): Promise<void> {
  if (!acquireLease(db, `cli ${process.pid}`)) {
    const l = currentLease(db)!;
    if (jobId && !o.only && !o.force?.length) {
      const j = requeue(db, jobId);
      console.log(`A runner is already active (${l.label}, pid ${l.pid}): ${j.id} is ${JOB_LABEL[j.status]} and that runner will pick it up.`);
    } else {
      console.error(`✗ Not run: a runner is already active (${l.label}, pid ${l.pid}). Two runners never work at once; use that runner (Control Center: the stage's Run button) or stop it first.`);
      process.exitCode = 1;
    }
    return;
  }
  for (const f of recover(db)) console.log(`recovered: ${f} → interrupted`);
  const runner = new Runner(db, STAGE_DEFS, { verbose: !has('quiet') });
  let signals = 0;
  const stop = () => {
    if (++signals > 1) process.exit(130);
    console.log('\n■ interrupting the current stage (Ctrl-C again to force quit)…');
    runner.interrupt();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  const beat = setInterval(() => {
    try {
      if (!heartbeat(db)) {
        console.error('✗ runner lease lost (another runner took it): interrupting the current stage');
        runner.interrupt();
      }
    } catch {
      // Busy database: the next beat retries (a lease goes stale only after 60 s).
    }
  }, 10_000);
  try {
    if (jobId) {
      const j = getJob(db, jobId) ?? die(`no job ${jobId}`);
      if (j.status !== 'queued') setJobStatus(db, jobId, 'queued');
      const done = await runner.runJob(jobId, o);
      printJob(done.id);
    } else {
      const ids = await runner.drain();
      if (!ids.length) console.log('Queue empty.');
      for (const id of ids) printJob(id);
    }
  } finally {
    clearInterval(beat);
    releaseLease(db);
  }
}

const ICON: Record<string, string> = { pending: '·', running: '▸', succeeded: '✓', reused: '↺', failed: '✗', interrupted: '‖', cancelled: '⊘', waiting: '…' };
function printJob(jobId: string): void {
  const v = jobView(db, jobId);
  console.log(`\n${v.job.id}  ${v.job.video_id}  ${v.job.label}${v.job.notes ? ` — ${v.job.notes}` : ''}`);
  console.log(`  idea ${v.idea?.id}: ${v.idea?.title}`);
  for (const s of v.stages) {
    const t = s.seconds != null ? `${s.seconds.toFixed(1).padStart(7)} s` : '         ';
    console.log(`  ${ICON[s.status] ?? '?'} ${s.stage.padEnd(10)} ${s.status.padEnd(11)} ${t}  ${s.attempts > 1 ? `attempt ${s.attempts}` : ''}`);
  }
  if (v.job.error) console.log(`  error: ${v.job.error.split('\n').slice(0, 6).join('\n         ')}`);
}

try {
switch (cmd) {
  case 'idea': {
    if (sub === 'add') {
      const urls = flags.get('source') ?? [];
      const claimsF = flags.get('claim') ?? [];
      const quotes = flags.get('quote') ?? [];
      const i = addIdea(db, {
        title: flag('title') ?? die('--title is required'),
        topic: flag('topic') ?? die('--topic is required'),
        audience: flag('audience') ?? die('--audience is required'),
        category: flag('category') ?? die('--category is required'),
        hook: flag('hook'),
        valueNote: flag('value-note'),
        audienceValue: num('value'),
        engagement: num('engagement'),
        commercial: num('commercial'),
        arc: flag('arc'),
        preset: flag('preset'),
        notes: flag('notes'),
        sources: urls.map((url, k) => ({ url, claim: claimsF[k] ?? die(`--source ${url} needs a --claim`), quote: quotes[k] })),
      });
      console.log(`✓ ${i.id} "${i.title}" (${i.category})`);
    } else if (sub === 'discover') {
      const found = await discover(db, pos[2] ?? 'playbooks');
      console.log(found.length ? found.map((i) => `✓ ${i.id} discovered: ${i.title} (${i.category})`).join('\n') : 'Nothing new.');
    } else if (sub === 'set') {
      const id = pos[2] ?? die('idea set <ideaId> --field value');
      const patch: Record<string, unknown> = {};
      for (const [k, v] of flags) patch[k === 'priority' ? 'priorityOverride' : k] = v[0] === 'clear' ? null : /^-?\d+(\.\d+)?$/.test(v[0]!) ? Number(v[0]) : v[0];
      const i = updateIdea(db, id, patch);
      console.log(`✓ ${i.id} updated`);
    } else {
      const rows = listIdeas(db);
      if (!rows.length) console.log('No ideas yet: npm run produce -- idea add … (or idea discover)');
      for (const i of rows)
        console.log(
          `${i.id}  ${String(i.priority_override ?? i.priority ?? '—').padStart(3)}${i.priority_override != null ? '*' : ' '}  ${i.status.padEnd(17)} ${i.research_status.padEnd(9)} ${i.category.padEnd(11)} ${i.title}`,
        );
    }
    break;
  }
  case 'start': {
    const failOnce = flag('fail-once');
    if (failOnce && !isStage(failOnce)) die(`unknown stage ${failOnce}`);
    const j = startProduction(db, pos[1] ?? die('start <ideaId>'), { reviewScript: has('review-script'), ...(failOnce ? { failOnce: failOnce as StageName } : {}) });
    console.log(`✓ ${j.id} queued: ${j.video_id}`);
    if (has('run')) await runHere(j.id);
    break;
  }
  case 'batch': {
    const ids = pos.slice(1);
    if (!ids.length) die('batch <ideaId>…');
    for (const id of ids) console.log(`✓ ${startProduction(db, id, { reviewScript: has('review-script') }).id} queued for ${id}`);
    if (has('run')) await runHere();
    break;
  }
  case 'run':
    await runHere(pos[1]);
    break;
  case 'status':
    if (pos[1]) printJob(pos[1]);
    else for (const j of listJobs(db)) console.log(`${j.id}  ${j.video_id.padEnd(34)} ${JOB_LABEL[j.status].padEnd(19)} ${j.current_stage ?? ''}`);
    break;
  case 'resume':
  case 'retry': {
    const failOnce = flag('fail-once');
    const j = requeue(db, pos[1] ?? die(`${cmd} <jobId>`), failOnce && isStage(failOnce) ? { failOnce } : {});
    console.log(`✓ ${j.id} ${JOB_LABEL[j.status]}`);
    if (has('run')) await runHere(j.id);
    break;
  }
  case 'rerun': {
    const id = pos[1] ?? die('rerun <jobId>');
    const force = (flag('force') ?? '').split(',').filter(isStage);
    requeue(db, id);
    await runHere(id, { force });
    break;
  }
  case 'stage': {
    const [, id, stage] = pos;
    if (!id || !stage || !isStage(stage)) die('stage <jobId> <stage> [--force]');
    await runHere(id, { only: stage as StageName, force: has('force') ? [stage as StageName] : [] });
    break;
  }
  case 'cancel': {
    const j = requestCancel(db, pos[1] ?? die('cancel <jobId>'));
    console.log(`✓ ${j.id} ${j.cancel_requested ? 'cancel requested' : JOB_LABEL[j.status]}`);
    break;
  }
  case 'approve':
  case 'revise':
  case 'reject': {
    const decision = cmd === 'approve' ? 'approved' : cmd === 'reject' ? 'rejected' : 'revise';
    const j = decide(db, pos[1] ?? die(`${cmd} <jobId>`), has('script') ? 'script' : 'video', decision, flag('notes') ?? '', 'owner (CLI)');
    console.log(`✓ ${j.id} ${JOB_LABEL[j.status]}`);
    if (has('run') && j.status === 'queued') await runHere(j.id);
    break;
  }
  case 'edit-line': {
    const [, id, line] = pos;
    if (!id || !line) die('edit-line <jobId> <lineId> [--text T] [--caption C] [--pause S]');
    editScript(db, id!, { lines: { [line!]: { ...(flag('text') ? { text: flag('text') } : {}), ...(flag('caption') ? { caption: flag('caption')!.replace(/\\n/g, '\n') } : {}), ...(num('pause') !== undefined ? { pause: num('pause') } : {}) } } });
    console.log(`✓ ${id}: line "${line}" edited — rerun the job to apply (npm run produce -- rerun ${id})`);
    break;
  }
  case 'publish': {
    const id = addPublication(db, pos[1] ?? die('publish <jobId> --platform P --at ISO'), {
      platform: flag('platform') ?? die('--platform'),
      publishedAt: flag('at') ?? die('--at (ISO date the human posted it)'),
      url: flag('url'),
      platformVideoId: flag('video-id'),
    });
    console.log(`✓ publication ${id} recorded (nothing was posted by this tool)`);
    break;
  }
  case 'metrics': {
    const id = addMetrics(db, Number(pos[1] ?? die('metrics <publicationId> …')), {
      views: num('views'),
      completionRate: num('completion'),
      avgWatchSeconds: num('avg-watch'),
      saves: num('saves'),
      shares: num('shares'),
      comments: num('comments'),
      profileVisits: num('profile-visits'),
      linkClicks: num('link-clicks'),
      affiliateConversions: num('affiliate-conversions'),
      notes: flag('notes'),
    });
    console.log(`✓ metrics ${id} recorded`);
    break;
  }
  case 'insights':
    console.log(JSON.stringify(insights(db), null, 2));
    break;
  default:
    console.log('Commands: idea add|list|discover|set, start, batch, run, status, resume, retry, rerun, stage, cancel, approve, revise, reject, edit-line, publish, metrics, insights');
    console.log('Details: head of scripts/produce.ts, docs/ORCHESTRATOR.md');
}
} catch (e) {
  console.error(`✗ ${dbErrorMessage(e)}`);
  process.exitCode = 1;
}
db.close();
