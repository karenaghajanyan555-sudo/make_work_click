/**
 * Production Control Center: a local HTTP server (127.0.0.1 only) with a JSON API, the
 * dashboard (src/orchestrator/dashboard/: the Review page at /, production details at /details)
 * and a runner that works the queue in-process.
 * No framework: node:http. Files are served only from out/ (renders, QA sheets, packages)
 * and public/fonts. Mutating requests from other origins are refused.
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { KITS } from '../../content/kits/index.ts';
import { fonts, palette } from '../brand/tokens.ts';
import { PRESETS } from '../brand/presets.ts';
import { OUT, ROOT } from '../pipeline/paths.ts';
import { dbErrorMessage, type Db } from './db.ts';
import { isStage, JOB_LABEL, STAGES, type StageName } from './model.ts';
import { addMetrics, addPublication, decide, discover, editScript, editStoryboard, insights, jobView, requeue, startProduction } from './production.ts';
import { reviewView } from './review.ts';
import { logDir, recover, Runner } from './runner.ts';
import { STAGE_DEFS } from './stages.ts';
import {
  acquireLease,
  createIdea,
  currentLease,
  eventsOf,
  getJob,
  heartbeat,
  listIdeas,
  listJobs,
  nextQueued,
  releaseLease,
  requestCancel,
  runsOf,
  updateIdea,
} from './store.ts';

const DASH = path.join(ROOT, 'src', 'orchestrator', 'dashboard');
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.ttf': 'font/ttf', '.srt': 'text/plain; charset=utf-8', '.vtt': 'text/vtt; charset=utf-8', '.log': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

/** Brand tokens as CSS variables: the dashboard never hard-codes a colour. */
function tokensCss(): string {
  const v: Record<string, string> = {
    ink: palette.ink, graphite: palette.graphite, paper: palette.paper, fog: palette.fog, smoke: palette.smoke, hairline: palette.hairline,
    'hairline-strong': palette.hairlineStrong, signal: palette.signal, 'signal-deep': palette.signalDeep, 'signal-ink': palette.signalInk, friction: palette.friction,
    'ui-canvas': palette.ui.canvas, 'ui-surface': palette.ui.surface, 'ui-text': palette.ui.text, 'ui-muted': palette.ui.textMuted, card: palette.memoryCard,
  };
  const faces = [
    ['Geist', 'Geist-Variable.ttf', '100 900', 'normal'],
    ['Geist Mono', 'GeistMono-Variable.ttf', '100 900', 'normal'],
    ['Instrument Serif', 'InstrumentSerif-Regular.ttf', '400', 'normal'],
    ['Instrument Serif', 'InstrumentSerif-Italic.ttf', '400', 'italic'],
  ];
  return [
    ...faces.map(([f, file, w, s]) => `@font-face{font-family:"${f}";src:url(/fonts/${file}) format("truetype");font-weight:${w};font-style:${s};font-display:swap}`),
    `:root{${Object.entries(v).map(([k, x]) => `--${k}:${x}`).join(';')};--sans:${fonts.sans};--serif:${fonts.serif};--mono:${fonts.mono}}`,
  ].join('\n');
}

type Handler = (req: IncomingMessage, res: ServerResponse, m: RegExpMatchArray, body: Record<string, unknown>) => unknown | Promise<unknown>;

export function startControlCenter(db: Db, o: { port: number; host?: string; log?: (s: string) => void }) {
  const log = o.log ?? ((s: string) => console.log(s));
  const runner = new Runner(db, STAGE_DEFS, { verbose: false });
  let leased = false;
  let current: string | null = null;
  let stopping = false;

  // ---- runner loop: one job at a time, only while this process holds the lease ----
  const tick = async () => {
    if (stopping || runner.busy) return;
    try {
      if (!leased) leased = acquireLease(db, `control center ${process.pid}`);
      if (!leased) return;
      // Idle and holding the lease: any job still marked running is an orphan (crash, restart).
      for (const f of recover(db)) log(`recovered ${f} → interrupted`);
    } catch (e) {
      log(`runner: ${dbErrorMessage(e)}`);
      return;
    }
    const next = nextQueued(db);
    if (!next) return;
    current = next.id;
    log(`▸ ${next.id} (${next.video_id})`);
    try {
      const done = await runner.runJob(next.id);
      log(`  ${done.id}: ${JOB_LABEL[done.status]}${done.error ? ` — ${done.error.split('\n')[0]}` : ''}`);
    } catch (e) {
      log(`  ${next.id}: runner error ${dbErrorMessage(e)} (the job is marked interrupted on the next tick)`);
    } finally {
      current = null;
    }
  };
  const loop = setInterval(() => void tick(), 1500);
  // The heartbeat runs on its own timer, also while a job renders: a CLI runner must never
  // see this lease as stale mid-job (that would let two renders run at once).
  const beat = setInterval(() => {
    if (!leased) return;
    try {
      if (heartbeat(db)) return;
      leased = false;
      log('runner lease lost (another runner took it): stopping the current stage');
      if (runner.busy) runner.interrupt();
    } catch {
      // Busy database: the next beat retries (the lease goes stale only after 60 s).
    }
  }, 10_000);

  const single = (jobId: string, stage: StageName, force: boolean) => {
    if (runner.busy) throw Object.assign(new Error('the runner is busy with another job: try again when it finishes'), { status: 409 });
    if (!leased) throw Object.assign(new Error('another runner holds the lease'), { status: 409 });
    requeue(db, jobId);
    current = jobId;
    void runner
      .runJob(jobId, { only: stage, force: force ? [stage] : [] })
      .catch((e) => log(`  ${jobId}/${stage}: runner error ${dbErrorMessage(e)}`))
      .finally(() => (current = null));
    return { started: true };
  };

  const overview = () => ({
    ideas: listIdeas(db),
    jobs: listJobs(db).map((j) => {
      const runs = runsOf(db, j.id);
      const cur = j.status === 'running' && j.current_stage && isStage(j.current_stage) ? STAGES.indexOf(j.current_stage) : -1;
      const last = Object.fromEntries(STAGES.map((s, k) => [s, cur >= 0 && k > cur ? 'pending' : (runs.filter((r) => r.stage === s).at(-1)?.status ?? 'pending')]));
      return { ...j, label: JOB_LABEL[j.status], stages: last };
    }),
    kits: Object.values(KITS).map((k) => ({ id: k.id, label: k.label, arc: k.arc, preset: k.preset, seeds: k.seeds.length })),
    presets: Object.keys(PRESETS),
    stages: STAGES,
    runner: { lease: currentLease(db) ?? null, mine: leased, busy: runner.busy, current },
    events: eventsOf(db, null, 30),
  });

  const routes: Array<[string, RegExp, Handler]> = [
    ['GET', /^\/api\/overview$/, () => overview()],
    ['GET', /^\/api\/review$/, () => reviewView(db)],
    ['POST', /^\/api\/ideas$/, (_q, _s, _m, b) => createIdea(db, b as never)],
    ['PATCH', /^\/api\/ideas\/(idea-\d+)$/, (_q, _s, m, b) => updateIdea(db, m[1]!, b)],
    ['POST', /^\/api\/ideas\/(idea-\d+)\/start$/, (_q, _s, m, b) => startProduction(db, m[1]!, { reviewScript: Boolean(b.reviewScript) })],
    ['POST', /^\/api\/discover$/, async (_q, _s, _m, b) => discover(db, String(b.provider ?? 'playbooks'))],
    ['GET', /^\/api\/jobs\/(job-\d+)$/, (_q, _s, m) => jobView(db, m[1]!)],
    ['POST', /^\/api\/jobs\/(job-\d+)\/(resume|retry|rerun)$/, (_q, _s, m) => requeue(db, m[1]!)],
    ['POST', /^\/api\/jobs\/(job-\d+)\/cancel$/, (_q, _s, m) => requestCancel(db, m[1]!)],
    ['POST', /^\/api\/jobs\/(job-\d+)\/decision$/, (_q, _s, m, b) => decide(db, m[1]!, b.target === 'script' ? 'script' : 'video', b.decision as never, String(b.notes ?? ''), 'owner (Control Center)')],
    ['POST', /^\/api\/jobs\/(job-\d+)\/edit-script$/, (_q, _s, m, b) => (editScript(db, m[1]!, b as never), { ok: true })],
    ['POST', /^\/api\/jobs\/(job-\d+)\/edit-storyboard$/, (_q, _s, m, b) => (editStoryboard(db, m[1]!, b as never), { ok: true })],
    [
      'POST',
      /^\/api\/jobs\/(job-\d+)\/stage\/([a-z]+)$/,
      (_q, _s, m, b) => {
        if (!isStage(m[2]!)) throw Object.assign(new Error(`unknown stage ${m[2]}`), { status: 400 });
        return single(m[1]!, m[2] as StageName, Boolean(b.force));
      },
    ],
    [
      'GET',
      /^\/api\/jobs\/(job-\d+)\/log\/([a-z]+)$/,
      (_q, res, m) => {
        const job = getJob(db, m[1]!);
        if (!job || !isStage(m[2]!)) throw Object.assign(new Error('not found'), { status: 404 });
        const f = path.join(logDir(job), `${m[2]}.log`);
        const text = existsSync(f) ? readFileSync(f, 'utf8').split('\n').slice(-400).join('\n') : '(no log yet)';
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(text);
        return undefined;
      },
    ],
    ['GET', /^\/api\/insights$/, () => ({ ...insights(db), publications: db.prepare('SELECT * FROM publications ORDER BY id DESC').all(), metrics: db.prepare('SELECT * FROM metrics ORDER BY id DESC').all() })],
    ['POST', /^\/api\/publications$/, (_q, _s, _m, b) => ({ id: addPublication(db, String(b.jobId), b as never) })],
    ['POST', /^\/api\/metrics$/, (_q, _s, _m, b) => ({ id: addMetrics(db, Number(b.publicationId), b as never) })],
  ];

  const sendFile = (req: IncomingMessage, res: ServerResponse, file: string) => {
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    const size = statSync(file).size;
    const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1, 'cache-control': 'no-cache' });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes', 'cache-control': 'no-cache' });
    createReadStream(file).pipe(res);
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const p = decodeURIComponent(url.pathname);
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const origin = req.headers.origin;
        if (origin && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
          res.writeHead(403).end('cross-origin request refused');
          return;
        }
      }
      if (p.startsWith('/api/')) {
        for (const [method, re, h] of routes) {
          const m = p.match(re);
          if (!m || method !== req.method) continue;
          let body: Record<string, unknown> = {};
          if (req.method !== 'GET') {
            const chunks: Buffer[] = [];
            for await (const c of req) chunks.push(c as Buffer);
            const raw = Buffer.concat(chunks).toString();
            body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
          }
          const out = await h(req, res, m, body);
          if (out !== undefined && !res.headersSent) {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify(out));
          }
          return;
        }
        res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'no such endpoint' }));
        return;
      }
      if (p === '/tokens.css') {
        res.writeHead(200, { 'content-type': 'text/css; charset=utf-8' }).end(tokensCss());
        return;
      }
      if (p.startsWith('/fonts/')) return sendFile(req, res, path.join(ROOT, 'public', 'fonts', path.basename(p)));
      if (p.startsWith('/files/')) {
        const f = path.resolve(OUT, p.slice('/files/'.length));
        if (!f.startsWith(OUT + path.sep)) {
          res.writeHead(403).end('outside out/');
          return;
        }
        return sendFile(req, res, f);
      }
      // Home is the Review page (videos + decisions); everything else lives on /details.
      const asset = p === '/' ? 'index.html' : p === '/details' ? 'details.html' : path.basename(p);
      if (['index.html', 'review.js', 'review.css', 'details.html', 'details.js', 'details.css'].includes(asset)) return sendFile(req, res, path.join(DASH, asset));
      res.writeHead(404).end('not found');
    } catch (e) {
      const status = (e as { status?: number }).status ?? (e instanceof SyntaxError ? 400 : /database is locked|SQLITE_BUSY/i.test(String(e)) ? 503 : 400);
      if (!res.headersSent) res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: dbErrorMessage(e) }));
    }
  });
  server.listen(o.port, o.host ?? '127.0.0.1');

  const close = async () => {
    stopping = true;
    clearInterval(loop);
    clearInterval(beat);
    if (runner.busy) {
      runner.interrupt();
      for (let i = 0; i < 100 && runner.busy; i++) await new Promise((r) => setTimeout(r, 100));
    }
    if (leased) releaseLease(db);
    await new Promise((r) => server.close(r));
  };
  return { server, close, runner, tick };
}
