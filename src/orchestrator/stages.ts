/**
 * The twelve production stages. Each declares exactly what it reads (`input`, hashed by
 * the runner) and calls the existing engine for the heavy work. Stage order and the
 * dependency rules: docs/ORCHESTRATOR.md.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getKit, KITS } from '../../content/kits/index.ts';
import { FORMATS } from '../brand/format.ts';
import { PRESETS } from '../brand/presets.ts';
import { NARRATOR } from '../brand/voice.ts';
import { encodeAac, masterVoice, readWav, writeWav } from '../pipeline/audio.ts';
import { fileHash, MIX_INPUTS, sha256, treeHash } from '../pipeline/cache.ts';
import { DELIVERY } from '../pipeline/deliver.ts';
import { probe } from '../pipeline/ffmpeg.ts';
import { ensureDraft, narrationKey, timingLock, writeTimingLock } from '../pipeline/narration.ts';
import { deliveryPath, ROOT, videoOut } from '../pipeline/paths.ts';
import { planSegments } from '../pipeline/segments.ts';
import { defineVideo, type AuthoredVideo } from '../video/define.ts';
import { captionWindows } from '../video/narration.ts';
import type { VideoSpec } from '../video/spec.ts';
import { computeTimeline } from '../video/timeline.ts';
import type { TimingLock } from '../video/timing.ts';
import { fitVideo } from './assemble.ts';
import { editorialMarkdown, editorialReview, type EditorialReport } from './editorial.ts';
import { json, now, tx, type Db } from './db.ts';
import { stableStringify } from './model.ts';
import { platformCopy, srt, subtitleCues, vtt } from './publishcopy.ts';
import { httpFetcher, RESEARCH_PROVIDERS, type ClaimResult, type Fetcher, type SourceResult } from './research.ts';
import { Wait, type StageCtx, type StageDef, type StageSet } from './runner.ts';
import { categoryPerformance, scoreIdea, type PostPerformance, type Score } from './scoring.ts';
import { planStoryboard, type Storyboard, type StoryboardEdit } from './storyboard.ts';
import { decisionFor, ideaSources, latestComplete, latestEdit, saveRecord, updateIdea } from './store.ts';
import { CTA_LINE, DISCLOSURE, makeBrief, pickVariant, scriptBrief, writeScript, type Brief, type ClaimSummary, type IdeaFacts, type Script, type ScriptEdit } from './writer.ts';

const rel = (f: string) => path.relative(ROOT, f);
export const seriesOf = (videoId: string) => `N° ${videoId.slice(1, 4)}`;
const kitHash = (category: string) => sha256(stableStringify(getKit(category)));
export const PRODUCTIONS_DIR = path.join(ROOT, 'content', 'productions');
/**
 * The logic a stage's output depends on, as a content hash: editing the writer, storyboard
 * planner, fitter, research or copy code re-runs exactly the stages that use it (no manual
 * `version` bump needed). Downstream heavy stages still reuse their output when the result is
 * unchanged, because they hash that result, not this code.
 */
const ORCH = (files: string[]) => treeHash(files.map((f) => `src/orchestrator/${f}`));
export const STAGE_CODE = {
  idea: () => ORCH(['scoring.ts']),
  research: () => ORCH(['research.ts']),
  brief: () => ORCH(['writer.ts', 'kit.ts']),
  script: () => ORCH(['writer.ts', 'kit.ts']),
  storyboard: () => ORCH(['storyboard.ts', 'kit.ts']),
  voice: () => treeHash(['src/pipeline/narration.ts']),
  spec: () => ORCH(['assemble.ts', 'kit.ts']),
  editorial: () => ORCH(['editorial.ts']),
  package: () => treeHash(['src/orchestrator/publishcopy.ts', 'scripts/publish-pack.ts', 'scripts/approve-take.ts']),
} as const;

/** Completion rate of every measured post (latest metrics per publication), for scoring. */
export function postPerformance(db: Db): PostPerformance[] {
  return (
    db
      .prepare(
        `SELECT p.category AS category, m.completion_rate AS completionRate FROM publications p
         JOIN metrics m ON m.id = (SELECT id FROM metrics WHERE publication_id = p.id AND completion_rate IS NOT NULL ORDER BY captured_at DESC, id DESC LIMIT 1)`,
      )
      .all() as Array<{ category: string | null; completionRate: number }>
  ).map((r) => ({ category: r.category ?? '', completionRate: r.completionRate }));
}

// ---------------- idea ----------------
export type IdeaOut = { facts: IdeaFacts; score: Score; kit: string };
const idea: StageDef<{ facts: IdeaFacts; ratings: [number, number, number]; hasKit: boolean; performance: number; code: string }, IdeaOut> = {
  name: 'idea',
  version: 1,
  input: ({ db, idea: i }) => ({
    facts: { id: i.id, title: i.title, topic: i.topic, audience: i.audience, category: i.category, hook: i.hook, valueNote: i.value_note, arc: i.arc, preset: i.preset },
    ratings: [i.audience_value, i.engagement, i.commercial],
    hasKit: i.category in KITS,
    performance: categoryPerformance(i.category, postPerformance(db)),
    code: STAGE_CODE.idea(),
  }),
  run: (inp, ctx) => {
    const score = scoreIdea({ audienceValue: inp.ratings[0], engagement: inp.ratings[1], commercial: inp.ratings[2], hasKit: inp.hasKit, flaggedClaims: 0, performance: inp.performance });
    updateIdea(ctx.db, inp.facts.id, { score: score.score, priority: score.priority });
    ctx.log(`score ${score.score} (base ${score.base} × fit ${score.fit} × performance ${score.performance}) → priority ${score.priority}`);
    if (!inp.hasKit) throw new Error(`no story kit for category "${inp.facts.category}" (available: ${Object.keys(KITS).join(', ')}): this idea cannot be produced automatically yet`);
    return { facts: inp.facts, score, kit: inp.facts.category };
  },
};

// ---------------- research ----------------
/** The kit material research reads: references to verify, assumptions, what is fictional, creative options. */
function researchKit(category: string) {
  const k = getKit(category);
  const hooks = k.beats.find((b) => b.id === 'hook')?.lines.map((l) => `Hook option: "${l.text}"`) ?? [];
  return { references: k.references, assumptions: k.assumptions, illustrative: k.illustrative, suggestions: [`Angle: ${k.angle}`, ...hooks] };
}
export type ResearchOut = { researchId: number; status: 'supported' | 'flagged'; claims: ClaimSummary[]; detail: ClaimResult[]; sources: SourceResult[]; notes: string[]; provider: string };
/** Swappable for tests (no network). */
export const research_env: { fetcher: Fetcher } = { fetcher: httpFetcher };
const research: StageDef<{ provider: string; topic: string; category: string; audience: string; userSources: Array<{ url: string; claim: string; quote: string | null }>; kit: string; code: string }, ResearchOut> = {
  name: 'research',
  version: 3, // 2: evidence quoted in the page's own wording; 3: support levels (supported/partial/unverified/contradicted)
  input: (ctx) => {
    const f = ctx.out<IdeaOut>('idea').facts;
    return {
      provider: 'source-check',
      topic: f.topic,
      category: f.category,
      audience: f.audience,
      userSources: ideaSources(ctx.db, f.id).map((s) => ({ url: s.url, claim: s.claim, quote: s.quote ?? null })),
      // Only what research reads from the kit: a copy edit elsewhere never re-fetches sources.
      kit: sha256(stableStringify(researchKit(f.category))),
      code: STAGE_CODE.research(),
    };
  },
  run: async (inp, ctx, inputHash) => {
    const kit = getKit(inp.category);
    const provider = RESEARCH_PROVIDERS[inp.provider]!;
    const r = await provider.research({ topic: inp.topic, category: inp.category, audience: inp.audience, userSources: inp.userSources, ...researchKit(kit.id) }, research_env.fetcher);
    const facts = r.claims.filter((c) => c.kind === 'fact');
    const status = facts.every((c) => c.status === 'supported') ? 'supported' : 'flagged';
    const db = ctx.db;
    const count = (st: string) => facts.filter((c) => c.status === st).length;
    // One transaction: a crash never leaves a research row without its sources and claims.
    const rid = tx(db, () => {
      const id = Number(
        db.prepare('INSERT INTO research (job_id, idea_id, input_hash, provider, status, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          ctx.job.id,
          ctx.idea.id,
          inputHash,
          r.provider,
          status,
          `${count('supported')}/${facts.length} facts supported${count('partial') ? `, ${count('partial')} partial` : ''}${count('unverified') ? `, ${count('unverified')} unverified` : ''}${count('contradicted') ? `, ${count('contradicted')} contradicted` : ''}; ${r.claims.filter((c) => c.kind === 'assumption').length} assumptions; ${r.claims.filter((c) => c.kind === 'illustrative').length} illustrative; ${r.claims.filter((c) => c.kind === 'suggestion').length} creative suggestions`,
          now(),
        ).lastInsertRowid,
      );
      const sourceIds = new Map<string, number>();
      for (const s of r.sources) {
        const sid = db
          .prepare('INSERT INTO sources (research_id, url, title, fetched_at, http_status, content_sha256, ok, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, s.url, s.title, s.fetchedAt, s.httpStatus, s.contentSha256, s.ok ? 1 : 0, s.error).lastInsertRowid;
        sourceIds.set(s.url, Number(sid));
      }
      for (const c of r.claims) {
        db.prepare(
          'INSERT INTO claims (research_id, ref, text, kind, status, source_id, quote, evidence, required, note, support, confidence, quote_match, coverage, limitations, retrieved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          id,
          c.ref,
          c.text,
          c.kind,
          c.status,
          c.url ? (sourceIds.get(c.url) ?? null) : null,
          c.quote ?? null,
          c.evidence ?? null,
          c.required ? 1 : 0,
          c.note ?? null,
          c.kind === 'fact' ? c.status : null,
          c.confidence ?? null,
          c.quoteMatch ?? null,
          c.coverage ?? null,
          c.limitations ? JSON.stringify(c.limitations) : null,
          c.retrievedAt ?? null,
        );
      }
      return id;
    });
    updateIdea(db, ctx.idea.id, { researchStatus: status });
    for (const c of r.claims) ctx.log(`${c.status.padEnd(12)} ${c.confidence ? `${c.confidence.padEnd(6)} ` : ''}${c.ref}: ${c.text}${c.url ? ` — ${c.url}` : ''}${c.note ? ` (${c.note})` : ''}`);
    return {
      researchId: rid,
      status,
      claims: r.claims.map((c) => ({ ref: c.ref, text: c.text, kind: c.kind, status: c.status, ...(c.url ? { url: c.url } : {}), required: c.required })),
      detail: r.claims,
      sources: r.sources,
      notes: r.notes,
      provider: r.provider,
    };
  },
};

// ---------------- brief ----------------
const brief: StageDef<{ facts: IdeaFacts; claims: ClaimSummary[]; kit: string; code: string }, Brief & { recordId: number }> = {
  name: 'brief',
  version: 1,
  input: (ctx) => ({ facts: ctx.out<IdeaOut>('idea').facts, claims: ctx.out<ResearchOut>('research').claims, kit: kitHash(ctx.out<IdeaOut>('idea').kit), code: STAGE_CODE.brief() }),
  run: (inp, ctx, h) => {
    const b = makeBrief(inp.facts, getKit(inp.facts.category), inp.claims);
    for (const n of b.notes) ctx.log(`note: ${n}`);
    return { ...b, recordId: saveRecord(ctx.db, 'briefs', ctx.job.id, h, b) };
  },
};

// ---------------- script ----------------
const script: StageDef<{ brief: ReturnType<typeof scriptBrief>; kit: string; edit: ScriptEdit | null; sticky: Record<string, number> | null; code: string }, Script & { recordId: number }> = {
  name: 'script',
  version: 1,
  input: (ctx) => {
    const { recordId: _r, ...b } = ctx.out<Brief & { recordId: number }>('brief');
    // Variants this job already chose stay chosen (an edit never swaps the other lines).
    // Always the effective choice per beat (the seeded pick until a run chose one), so the
    // first rerun of a job sees the same input as the first run.
    const prev = latestComplete(ctx.db, ctx.job.id, 'script');
    const chosen = prev?.output ? Object.fromEntries((JSON.parse(prev.output) as Script).lines.map((l) => [l.id, l.variant])) : {};
    const sticky = Object.fromEntries(getKit(b.category).beats.map((beat) => [beat.id, chosen[beat.id] ?? pickVariant(b.seed, beat.id, beat.lines.length)]));
    return { brief: scriptBrief(b), kit: kitHash(b.category), edit: latestEdit<ScriptEdit>(ctx.db, ctx.job.id, 'script') ?? null, sticky, code: STAGE_CODE.script() };
  },
  run: (inp, ctx, h) => {
    const s = writeScript(inp.brief, getKit(inp.brief.category), inp.edit ?? undefined, inp.sticky);
    for (const l of s.lines) ctx.log(`${l.section.padEnd(11)} ${l.id.padEnd(8)} ${l.text}`);
    for (const f of s.flags) ctx.log(`flag: ${f}`);
    return { ...s, recordId: saveRecord(ctx.db, 'scripts', ctx.job.id, h, s) };
  },
};

// ---------------- storyboard (+ optional review gate) ----------------
export type StoryboardOut = Storyboard & { recordId: number; reviewHash: string };
const storyboard: StageDef<{ script: Script; kit: string; series: string; preset: Brief['preset']; harmony: Brief['harmony']; edit: StoryboardEdit | null; code: string }, StoryboardOut> = {
  name: 'storyboard',
  version: 1,
  input: (ctx) => {
    const { recordId: _r, ...s } = ctx.out<Script & { recordId: number }>('script');
    const b = ctx.out<Brief>('brief');
    return { script: s, kit: kitHash(b.category), series: seriesOf(ctx.job.video_id), preset: b.preset, harmony: b.harmony, edit: latestEdit<StoryboardEdit>(ctx.db, ctx.job.id, 'storyboard') ?? null, code: STAGE_CODE.storyboard() };
  },
  run: (inp, ctx, h) => {
    const sb = planStoryboard(inp.script, getKit(inp.script.kit), { series: inp.series, preset: inp.preset, harmony: inp.harmony, edit: inp.edit ?? undefined });
    for (const s of sb.scenes) ctx.log(`${s.id.padEnd(8)} ${s.type.padEnd(14)} says ${s.say.join(', ')} — ${s.purpose}`);
    return { ...sb, recordId: saveRecord(ctx.db, 'storyboards', ctx.job.id, h, sb), reviewHash: sha256(stableStringify({ script: inp.script, storyboard: sb })) };
  },
  gate: (out, ctx) => {
    const s = ctx.out<Script>('script');
    const wanted = Boolean(JSON.parse(ctx.job.options || '{}').reviewScript) || s.needsReview;
    if (!wanted) return null;
    const d = decisionFor(ctx.db, ctx.job.id, 'script', out.reviewHash);
    if (d?.decision === 'approved') return null;
    return { status: 'awaiting_review', message: s.needsReview ? `script needs review: ${s.flags.join('; ')}` : 'script + storyboard ready for review (requested)' };
  },
};

// ---------------- voice ----------------
export type VoiceOut = { kind: 'draft'; key: string; dir: string; lock: TimingLock; lockFile: string; spokenSeconds: number; synthesized: boolean; seconds: number; listen: string };
const voice: StageDef<{ videoId: string; lines: Array<{ id: string; text: string }>; key: string; code: string }, VoiceOut> = {
  name: 'voice',
  version: 1,
  input: (ctx) => {
    const lines = ctx.out<Script>('script').lines.map(({ id, text }) => ({ id, text }));
    return { videoId: ctx.job.video_id, lines, key: narrationKey(lines), code: STAGE_CODE.voice() };
  },
  run: async (inp, ctx) => {
    const n = { lines: inp.lines.map((l) => ({ ...l, at: 0 })) };
    const r = await ensureDraft(n);
    ctx.log(r.cached ? `draft take: cache hit (${rel(r.source.dir)})` : `draft take: synthesised in ${r.seconds.toFixed(1)} s → ${rel(r.source.dir)}`);
    const lock = timingLock(inp.videoId, n, r.source);
    const lockFile = writeTimingLock(lock);
    // Listening copy, level-matched like `npm run voice` (approve-take freezes it too).
    const dir = path.join(videoOut(inp.videoId), 'voice');
    mkdirSync(dir, { recursive: true });
    const m4a = path.join(dir, 'draft.m4a');
    const stamp = path.join(dir, 'draft.key');
    if (!existsSync(m4a) || !existsSync(stamp) || readFileSync(stamp, 'utf8') !== inp.key) {
      // The stamp goes first and comes back last: an interrupted encode never passes as current.
      rmSync(stamp, { force: true });
      const mastered = await masterVoice(readWav(path.join(r.source.dir, 'take.wav')), -16, path.join(dir, 'work.wav'));
      writeWav(path.join(dir, 'draft.wav'), mastered.pcm);
      await encodeAac(path.join(dir, 'draft.wav'), `${m4a}.part.m4a`, { bitrateK: 192 });
      renameSync(`${m4a}.part.m4a`, m4a);
      writeFileSync(stamp, inp.key);
    }
    return { kind: 'draft', key: inp.key, dir: rel(r.source.dir), lock, lockFile: rel(lockFile), spokenSeconds: r.source.take.takeDuration, synthesized: !r.cached, seconds: r.seconds, listen: rel(m4a) };
  },
  valid: (o) => existsSync(path.join(ROOT, o.dir, 'take.json')) && existsSync(path.join(ROOT, o.lockFile)) && readFileSync(path.join(ROOT, o.lockFile), 'utf8').includes(o.lock.scriptHash),
};

// ---------------- assets ----------------
type AssetEntry = { path: string; role: string; sha256: string; bytes: number; shared: boolean; usedBy: string[] };
export type AssetsOut = { recordId: number; hash: string; files: number; bytes: number; shared: number; renderHash: string; mixHash: string };
const ASSET_GROUPS: Array<{ dir: string; role: string; usedBy: string[]; shared: boolean }> = [
  { dir: 'public/fonts', role: 'brand fonts', usedBy: ['render'], shared: true },
  { dir: 'public/textures', role: 'grain texture', usedBy: ['render'], shared: true },
  { dir: 'assets/sound', role: 'sound samples (VCSL CC0)', usedBy: ['mix'], shared: true },
];
function listFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(ROOT, path.join(e.parentPath, e.name)))
    .sort();
}
const assets: StageDef<{ scenes: string[]; voiceDir: string; groups: Record<string, string> }, AssetsOut> = {
  name: 'assets',
  version: 1,
  input: (ctx) => ({
    scenes: [...new Set(ctx.out<Storyboard>('storyboard').scenes.map((s) => s.type))].sort(),
    voiceDir: ctx.out<VoiceOut>('voice').dir,
    groups: Object.fromEntries([...ASSET_GROUPS.map((g) => [g.dir, treeHash([g.dir])]), ['narration', treeHash([ctx.out<VoiceOut>('voice').dir])]]),
  }),
  run: (inp, ctx, h) => {
    const entries: AssetEntry[] = [];
    for (const g of [...ASSET_GROUPS, { dir: inp.voiceDir, role: 'narration take (draft cache)', usedBy: ['mix'], shared: false }]) {
      const files = listFiles(g.dir);
      if (!files.length) throw new Error(`missing assets: ${g.dir} is empty or absent`);
      for (const f of files) {
        const abs = path.join(ROOT, f);
        entries.push({ path: f, role: g.role, sha256: fileHash(abs), bytes: statSync(abs).size, shared: g.shared, usedBy: g.usedBy });
      }
    }
    const manifest = { scenes: inp.scenes, entries };
    const hash = sha256(stableStringify(manifest));
    const renderHash = sha256(stableStringify(entries.filter((e) => e.usedBy.includes('render'))));
    const mixHash = sha256(stableStringify(entries.filter((e) => e.usedBy.includes('mix'))));
    const bytes = entries.reduce((s, e) => s + e.bytes, 0);
    ctx.log(`${entries.length} files, ${(bytes / 1e6).toFixed(1)} MB; ${entries.filter((e) => e.shared).length} shared brand/sound assets reused; scene types: ${inp.scenes.join(', ')}`);
    return { recordId: saveRecord(ctx.db, 'asset_manifests', ctx.job.id, h, manifest), hash, files: entries.length, bytes, shared: entries.filter((e) => e.shared).length, renderHash, mixHash };
  },
};

// ---------------- spec ----------------
export type SpecOut = { file: string; fileSha: string; authored: AuthoredVideo; durationSeconds: number; coverAt: number; adjustments: string[]; scenes: Array<{ id: string; type: string; duration: number }> };
const spec: StageDef<
  { videoId: string; series: string; title: string; publish: Brief['publish']; meta: { topic: string; audience: string; cta: string }; script: Script; storyboard: Storyboard; lock: TimingLock; code: string },
  SpecOut
> = {
  name: 'spec',
  version: 1,
  input: (ctx) => {
    const b = ctx.out<Brief>('brief');
    const { recordId: _r, ...s } = ctx.out<Script & { recordId: number }>('script');
    const { recordId: _r2, reviewHash: _h, ...sb } = ctx.out<StoryboardOut>('storyboard');
    return { videoId: ctx.job.video_id, series: seriesOf(ctx.job.video_id), title: b.title, publish: b.publish, meta: { topic: b.topic, audience: b.audience, cta: b.cta }, script: s, storyboard: sb, lock: ctx.out<VoiceOut>('voice').lock, code: STAGE_CODE.spec() };
  },
  run: (inp, ctx) => {
    const fit = fitVideo(
      { id: inp.videoId, title: inp.title, series: inp.series, brief: { ...inp.meta, hook: inp.script.lines[0]!.text }, publish: inp.publish },
      inp.script,
      inp.storyboard,
      inp.lock,
    );
    for (const a of fit.adjustments) ctx.log(`fit: ${a}`);
    if (fit.errors.length) throw new Error(`spec does not validate after fitting:\n  ${fit.errors.join('\n  ')}`);
    const file = writeProduction(inp.videoId, fit.authored);
    const total = fit.spec.scenes.reduce((s, x) => s + x.duration, 0);
    ctx.log(`${rel(file)}: ${fit.spec.scenes.length} scenes, ~${total.toFixed(2)} s, cover at ${fit.authored.publish!.coverAt} s`);
    return {
      file: rel(file),
      fileSha: fileHash(file),
      authored: fit.authored,
      durationSeconds: Number(total.toFixed(3)),
      coverAt: fit.authored.publish!.coverAt,
      adjustments: fit.adjustments,
      scenes: fit.spec.scenes.map((s) => ({ id: s.id, type: s.type, duration: Number(s.duration.toFixed(3)) })),
    };
  },
  valid: (o) => existsSync(path.join(ROOT, o.file)) && fileHash(path.join(ROOT, o.file)) === o.fileSha,
};

/** A Markdown table cell. */
const cell = (x: string, max = 400) => x.replace(/\|/g, '/').replace(/\s+/g, ' ').slice(0, max);
const camel = (id: string) => id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** content/productions/<id>.ts (authored spec + its timing lock) and the registry. */
export function writeProduction(videoId: string, authored: AuthoredVideo): string {
  mkdirSync(PRODUCTIONS_DIR, { recursive: true });
  const file = path.join(PRODUCTIONS_DIR, `${videoId}.ts`);
  const body = [
    `// GENERATED by the production orchestrator (src/orchestrator/stages.ts, stage "spec"). Do not edit:`,
    `// change the idea, script or storyboard in the Control Center and re-run the job.`,
    "import { defineVideo, type AuthoredVideo } from '../../src/video/define.ts';",
    `import { timing } from '../timing/${videoId}.ts';`,
    '',
    `const authored = ${JSON.stringify(authored, null, 2)} as unknown as AuthoredVideo;`,
    '',
    'export const video = defineVideo(authored, timing);',
    '',
  ].join('\n');
  const tmp = `${file}.tmp`;
  if (!existsSync(file) || readFileSync(file, 'utf8') !== body) {
    writeFileSync(tmp, body);
    renameSync(tmp, file);
  }
  writeRegistry();
  return file;
}

export function writeRegistry(): void {
  const ids = existsSync(PRODUCTIONS_DIR)
    ? readdirSync(PRODUCTIONS_DIR)
        .filter((f) => /^v\d{3}-[a-z0-9-]+\.ts$/.test(f))
        .map((f) => f.slice(0, -3))
        .sort()
    : [];
  const body = [
    '// GENERATED by the production orchestrator: every video it has produced. Do not edit.',
    "import type { VideoSpec } from '../../src/video/spec.ts';",
    ...ids.map((id) => `import { video as ${camel(id)} } from './${id}.ts';`),
    '',
    `export const PRODUCTIONS: readonly VideoSpec[] = [${ids.map(camel).join(', ')}];`,
    '',
  ].join('\n');
  const file = path.join(PRODUCTIONS_DIR, 'index.ts');
  if (!existsSync(file) || readFileSync(file, 'utf8') !== body) {
    writeFileSync(`${file}.tmp`, body);
    renameSync(`${file}.tmp`, file);
  }
}

// ---------------- render (engine: render → mix → deliver) ----------------
export type RenderOut = { renderId: number; upload: string; sha256: string; bytes: number; videoSeconds: number; segments: { rendered: number; total: number; detail: string }; steps: Record<string, { seconds: number; cached: boolean; detail?: string }> };
/** The resolved spec the engine will render (same function the content file calls). */
export const resolvedSpec = (ctx: StageCtx): VideoSpec => defineVideo(ctx.out<SpecOut>('spec').authored, ctx.out<VoiceOut>('voice').lock);
const render: StageDef<{ videoId: string; segments: string[]; mix: string; deliver: string; assets: { render: string; mix: string } }, RenderOut> = {
  name: 'render',
  version: 1,
  input: (ctx) => {
    const s = resolvedSpec(ctx);
    const timeline = computeTimeline(s, FORMATS[s.format].fps);
    // What the picture and the mix depend on; title, status, brief and post copy do not.
    const { title: _t, status: _st, brief: _b, publish: _p, ...audible } = s;
    const v = ctx.out<VoiceOut>('voice');
    const a = ctx.out<AssetsOut>('assets');
    return {
      videoId: s.id,
      segments: planSegments(s, timeline).map((x) => x.key),
      mix: sha256(stableStringify({ spec: audible, code: treeHash(MIX_INPUTS), voice: treeHash([v.dir]) })),
      deliver: sha256(stableStringify({ DELIVERY, crf: s.export?.crf ?? DELIVERY.crf, code: fileHash(path.join(ROOT, 'src/pipeline/deliver.ts')) })),
      assets: { render: a.renderHash, mix: a.mixHash },
    };
  },
  run: async (inp, ctx, h) => {
    const t0 = performance.now();
    for (const step of ['render', 'mix', 'deliver']) await ctx.node(`scripts/${step}.ts`, [inp.videoId]);
    const upload = deliveryPath(inp.videoId);
    const sha = fileHash(upload);
    const p = await probe(upload);
    const seconds = Number(p.streams.find((x) => x.codec_type === 'video')?.duration ?? 0);
    // Fail fast on an incomplete file (QA decodes every frame later; this catches the obvious).
    const spec = resolvedSpec(ctx);
    const expected = computeTimeline(spec, FORMATS[spec.format].fps).totalFrames / FORMATS[spec.format].fps;
    const hasAudio = Boolean(spec.narration || spec.score || spec.audio?.compose);
    if (!p.streams.some((x) => x.codec_type === 'video')) throw new Error(`${rel(upload)} has no video stream`);
    if (hasAudio && !p.streams.some((x) => x.codec_type === 'audio')) throw new Error(`${rel(upload)} has no audio stream`);
    if (Math.abs(seconds - expected) > 0.1) throw new Error(`${rel(upload)} is ${seconds.toFixed(2)} s, the timeline is ${expected.toFixed(2)} s: incomplete or stale render`);
    const build = json<{ steps: Record<string, { seconds: number; cached: boolean; detail?: string }> }>(readFileSync(path.join(videoOut(inp.videoId), 'build.json'), 'utf8'), { steps: {} });
    const steps = Object.fromEntries(['render', 'mix', 'deliver'].map((k) => [k, build.steps[k]!]).filter(([, v]) => v));
    const detail = build.steps.render?.detail ?? '';
    const m = /(\d+)\/(\d+) segments rendered/.exec(detail);
    const rendered = m ? Number(m[1]) : 0;
    const total = m ? Number(m[2]) : 0;
    const bytes = statSync(upload).size;
    const buildSeconds = (performance.now() - t0) / 1000;
    const renderId = Number(
      ctx.db
        .prepare('INSERT INTO renders (job_id, video_id, input_hash, upload_path, upload_sha256, bytes, video_seconds, segments_rendered, segments_total, build_seconds, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(ctx.job.id, inp.videoId, h, rel(upload), sha, bytes, seconds, rendered, total, buildSeconds, JSON.stringify({ steps }), now()).lastInsertRowid,
    );
    ctx.log(`upload ${rel(upload)}: ${(bytes / 1e6).toFixed(1)} MB, ${seconds.toFixed(2)} s, sha256 ${sha.slice(0, 12)}; ${detail}`);
    return { renderId, upload: rel(upload), sha256: sha, bytes, videoSeconds: seconds, segments: { rendered, total, detail }, steps };
  },
  valid: (o) => existsSync(path.join(ROOT, o.upload)) && fileHash(path.join(ROOT, o.upload)) === o.sha256,
};

// ---------------- qa ----------------
export type QaOut = { qaId: number; pass: boolean; total: number; failed: string[]; warnings: string[]; report: string; sheets: string[]; checks?: Array<{ id: string; status: string; detail: string }> };
type QaReport = { upload?: { file: string; sha256: string }; checks: Array<{ id: string; status: string; detail: string }>; metrics: Record<string, unknown> };
const qa: StageDef<{ videoId: string; sha256: string; code: string }, QaOut> = {
  name: 'qa',
  version: 1,
  input: (ctx) => ({ videoId: ctx.job.video_id, sha256: ctx.out<RenderOut>('render').sha256, code: treeHash(['scripts/qa.ts', 'src/pipeline/qa.ts', 'src/pipeline/sheet.ts']) }),
  run: async (inp, ctx) => {
    const dir = path.join(videoOut(inp.videoId), 'qa');
    rmSync(path.join(dir, 'report.json'), { force: true });
    let crashed: Error | null = null;
    try {
      await ctx.node('scripts/qa.ts', [inp.videoId, '--no-render']);
    } catch (e) {
      crashed = e as Error;
    }
    const reportFile = path.join(dir, 'report.json');
    if (!existsSync(reportFile)) throw crashed ?? new Error('QA wrote no report');
    const r = JSON.parse(readFileSync(reportFile, 'utf8')) as QaReport;
    if (r.upload && r.upload.sha256 !== inp.sha256) throw new Error(`QA checked a different file (sha256 ${r.upload.sha256.slice(0, 12)}, expected ${inp.sha256.slice(0, 12)}): the upload changed during QA; resume to rebuild`);
    const failed = r.checks.filter((c) => c.status === 'fail').map((c) => c.id);
    const warnings = r.checks.filter((c) => c.status === 'warn').map((c) => `${c.id}: ${c.detail}`);
    const pass = failed.length === 0;
    const qaId = Number(
      ctx.db
        .prepare('INSERT INTO qa_reports (job_id, upload_sha256, pass, checks_total, checks_failed, report_path, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(ctx.job.id, inp.sha256, pass ? 1 : 0, r.checks.length, failed.length, rel(path.join(dir, 'report.md')), JSON.stringify(r), now()).lastInsertRowid,
    );
    ctx.log(`QA ${pass ? 'PASS' : 'FAIL'}: ${r.checks.length - failed.length}/${r.checks.length} checks${failed.length ? ` — failed: ${failed.join(', ')}` : ''}`);
    if (!pass) throw new Error(`QA failed: ${failed.join(', ')} (report ${rel(path.join(dir, 'report.md'))})`);
    return { qaId, pass, total: r.checks.length, failed, warnings, report: rel(path.join(dir, 'report.md')), sheets: ['sheet.png', 'sheet-cues.png', 'sheet-safezone.png'].map((f) => rel(path.join(dir, f))), checks: r.checks };
  },
  valid: (o) => existsSync(path.join(ROOT, o.report)),
};

// ---------------- editorial QA (report only: never approves, never blocks) ----------------
export type EditorialOut = { reportId: number; problems: number; attention: number; summary: string; report: string; json: string };
const editorial: StageDef<
  { videoId: string; sha256: string; script: Pick<Script, 'lines' | 'sections'>; storyboard: Storyboard['scenes']; scenes: SpecOut['scenes']; lock: { voice: string; lines: TimingLock['lines'] }; claims: ClaimResult[]; technical: Array<{ id: string; status: string; detail: string }>; preset: string; caption: string; code: string },
  EditorialOut
> = {
  name: 'editorial',
  version: 1,
  input: (ctx) => {
    const s = ctx.out<Script>('script');
    const v = ctx.out<VoiceOut>('voice');
    const q = ctx.out<QaOut>('qa');
    // QA outputs from before Phase 2.5 carry no checks: read them from the stored report.
    const technical = q.checks ?? json<QaReport>((ctx.db.prepare('SELECT data FROM qa_reports WHERE id = ?').get(q.qaId) as { data: string } | undefined)?.data, { checks: [], metrics: {} }).checks;
    return {
      videoId: ctx.job.video_id,
      sha256: ctx.out<RenderOut>('render').sha256,
      script: { lines: s.lines, sections: s.sections },
      storyboard: ctx.out<Storyboard>('storyboard').scenes,
      scenes: ctx.out<SpecOut>('spec').scenes,
      lock: { voice: v.lock.voice, lines: v.lock.lines },
      claims: ctx.out<ResearchOut>('research').detail,
      technical: technical.map(({ id, status, detail }) => ({ id, status, detail })),
      preset: ctx.out<Storyboard>('storyboard').preset, // the look actually rendered (a storyboard edit can change it)
      caption: ctx.out<Brief>('brief').publish.caption,
      code: STAGE_CODE.editorial(),
    };
  },
  run: (inp, ctx, h) => {
    const r: EditorialReport = editorialReview({
      script: inp.script,
      storyboard: { scenes: inp.storyboard },
      scenes: inp.scenes,
      lock: inp.lock,
      claims: inp.claims,
      technical: inp.technical,
      preset: inp.preset,
      publishCaption: inp.caption,
      brand: { cta: CTA_LINE, disclosure: DISCLOSURE, narrator: NARRATOR?.label ?? 'unknown', presets: Object.keys(PRESETS) },
    });
    const dir = path.join(videoOut(inp.videoId), 'qa');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'editorial.md'), editorialMarkdown(inp.videoId, r));
    writeFileSync(path.join(dir, 'editorial.json'), JSON.stringify(r, null, 2) + '\n');
    const reportId = Number(
      ctx.db.prepare('INSERT INTO editorial_reports (job_id, input_hash, upload_sha256, attention, problems, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(ctx.job.id, h, inp.sha256, r.attention, r.problems, JSON.stringify(r), now()).lastInsertRowid,
    );
    for (const i of r.items.filter((x) => x.status !== 'ok')) ctx.log(`${i.status.padEnd(8)} ${i.id}: ${i.measure} (rule: ${i.rule})`);
    ctx.log(r.summary);
    return { reportId, problems: r.problems, attention: r.attention, summary: r.summary, report: rel(path.join(dir, 'editorial.md')), json: rel(path.join(dir, 'editorial.json')) };
  },
  valid: (o) => existsSync(path.join(ROOT, o.report)),
};

// ---------------- approval (human) ----------------
export type ApprovalOut = { approvalId: number; decidedAt: string; notes: string | null; sha256: string };
const approval: StageDef<{ sha256: string; qaId: number; pass: boolean }, ApprovalOut> = {
  name: 'approval',
  version: 1,
  input: (ctx) => {
    const q = ctx.out<QaOut>('qa');
    return { sha256: ctx.out<RenderOut>('render').sha256, qaId: q.qaId, pass: q.pass };
  },
  run: (inp, ctx) => {
    if (!inp.pass) throw new Error('QA did not pass: a failed video can never be approved');
    const d = decisionFor(ctx.db, ctx.job.id, 'video', inp.sha256);
    if (d?.decision === 'approved') return { approvalId: d.id, decidedAt: d.decided_at, notes: d.notes, sha256: inp.sha256 };
    if (d?.decision === 'rejected') throw new Wait('rejected', d.notes ? `rejected: ${d.notes}` : 'rejected');
    if (d?.decision === 'revise') throw new Wait('revision', d.notes ? `revision requested: ${d.notes}` : 'revision requested');
    throw new Wait('awaiting_approval', `video ready for review (sha256 ${inp.sha256.slice(0, 12)}): approve, request a revision or reject`);
  },
};

// ---------------- package ----------------
export type PackageOut = { packageId: number; dir: string; files: Array<{ file: string; bytes: number; sha256: string }>; take: string };
const pkg: StageDef<
  { videoId: string; approvalId: number; sha256: string; title: string; publish: Brief['publish']; coverAt: number; claims: ClaimResult[]; sources: SourceResult[]; voiceDir: string; qaId: number; specFile: string; lock: string; code: string },
  PackageOut
> = {
  name: 'package',
  version: 1,
  input: (ctx) => {
    const b = ctx.out<Brief>('brief');
    const r = ctx.out<ResearchOut>('research');
    return {
      videoId: ctx.job.video_id,
      approvalId: ctx.out<ApprovalOut>('approval').approvalId,
      sha256: ctx.out<RenderOut>('render').sha256,
      title: b.title,
      publish: b.publish,
      coverAt: ctx.out<SpecOut>('spec').coverAt,
      claims: r.detail,
      sources: r.sources,
      voiceDir: ctx.out<VoiceOut>('voice').dir,
      qaId: ctx.out<QaOut>('qa').qaId,
      specFile: ctx.out<SpecOut>('spec').fileSha,
      lock: sha256(stableStringify(ctx.out<VoiceOut>('voice').lock)),
      code: STAGE_CODE.package(),
    };
  },
  run: async (inp, ctx) => {
    const id = inp.videoId;
    const upload = deliveryPath(id);
    // 0. What was approved must still be the file on disk (checked before anything is frozen).
    if (!existsSync(upload) || fileHash(upload) !== inp.sha256) throw new Error('the upload file changed after approval: re-run QA and approve again');
    // 1. Approved = gold: freeze the exact take (once), beside any earlier ones.
    let take = frozenTake(id, inp.voiceDir);
    if (!take) {
      await ctx.node('scripts/approve-take.ts', [id, 'draft']);
      take = frozenTake(id, inp.voiceDir);
    }
    if (!take) throw new Error('could not freeze the narration take');
    ctx.log(`narration frozen: public/narration/${id}/${take}`);
    // 2. Cover + post sheet (the existing post pack; refuses unless QA passed on this file).
    await ctx.node('scripts/publish-pack.ts', [id]);
    // 3. The package folder, assembled beside the current one and swapped in when complete:
    //    a failure never damages an existing package. Files are copies, never hard links
    //    (later builds rewrite out/<id>/<id>.mp4; the package keeps the approved bytes).
    const out = videoOut(id);
    const final = path.join(out, 'package');
    const dir = path.join(out, 'package.part');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const put = (name: string, from: string) => copyFileSync(from, path.join(dir, name));
    put(`${id}.mp4`, upload);
    if (fileHash(path.join(dir, `${id}.mp4`)) !== inp.sha256) throw new Error('the copy of the approved upload does not match its sha256 (disk error?)');
    put('cover.jpg', path.join(out, 'publish', 'cover.jpg'));
    put('post.md', path.join(out, 'publish', 'post.md'));
    const v = resolvedSpec(ctx);
    const total = v.scenes.reduce((s, x) => s + x.duration, 0);
    const lockLines = ctx.out<VoiceOut>('voice').lock.lines;
    const lines = v.narration!.lines.map((l) => ({ id: l.id, text: l.text, at: l.at, duration: lockLines.find((x) => x.id === l.id)?.duration ?? 1 }));
    const cues = subtitleCues(lines, captionWindows(v.narration!, total));
    writeFileSync(path.join(dir, 'captions.srt'), srt(cues));
    writeFileSync(path.join(dir, 'captions.vtt'), vtt(cues));
    const copy = platformCopy(inp.publish);
    writeFileSync(
      path.join(dir, 'platforms.md'),
      [
        `# ${inp.title} — copy per platform`,
        '',
        'Nothing is posted automatically. Upload the same file everywhere; turn the AI label on (see post.md).',
        '',
        ...copy.flatMap((c) => [`## ${c.name}`, '', ...(c.title ? ['Title:', '', '```text', c.title, '```', ''] : []), '```text', c.text, '```', '', `${c.length} / ${c.limit}: ${c.ok ? 'within limits' : '**over the limit**'}`, '', ...c.settings.map((s) => `- ${s}`), '']),
      ].join('\n'),
    );
    writeFileSync(path.join(dir, 'platforms.json'), JSON.stringify(copy, null, 2) + '\n');
    const facts = inp.claims.filter((c) => c.kind === 'fact');
    writeFileSync(
      path.join(dir, 'sources.md'),
      [
        `# Sources and claims — ${id}`,
        '',
        'Supported = the exact quote is on the cited page and the passage around it contains the claim\'s key terms (automatic word-overlap check, not a reading). Partial, unverified and contradicted claims paused the job for a script review. Confidence describes the evidence, not the truth.',
        '',
        '| Claim | Support | Confidence | Source | Retrieved | The page\'s words | Limitations |',
        '|---|---|---|---|---|---|---|',
        ...facts.map((c) => `| ${cell(c.text)} | ${c.status} | ${c.confidence ?? '—'} | ${c.url ?? '—'} | ${c.retrievedAt?.slice(0, 10) ?? '—'} | ${cell(c.evidence ?? c.note ?? '', 260)} | ${cell((c.limitations ?? []).join(' '), 260)} |`),
        '',
        '## Assumptions (not researched)',
        ...inp.claims.filter((c) => c.kind === 'assumption').map((c) => `- ${c.text}`),
        '',
        '## Illustrative (fictional on screen)',
        ...inp.claims.filter((c) => c.kind === 'illustrative').map((c) => `- ${c.text}`),
        '',
        '## Creative suggestions (options, not facts)',
        ...inp.claims.filter((c) => c.kind === 'suggestion').map((c) => `- ${c.text}`),
        '',
        '## Fetched sources',
        ...inp.sources.map((s) => `- ${s.url} — ${s.ok ? `HTTP ${s.httpStatus}` : `failed: ${s.error}`}, fetched ${s.fetchedAt}${s.contentSha256 ? `, sha256 ${s.contentSha256.slice(0, 12)}` : ''}`),
        '',
      ].join('\n'),
    );
    const p = await probe(upload);
    const vs = p.streams.find((s) => s.codec_type === 'video');
    const as = p.streams.find((s) => s.codec_type === 'audio');
    const qaRow = ctx.db.prepare('SELECT pass, checks_total, checks_failed, report_path FROM qa_reports WHERE id = ?').get(inp.qaId) as { pass: number; checks_total: number; checks_failed: number; report_path: string };
    const appr = ctx.db.prepare('SELECT * FROM approvals WHERE id = ?').get(inp.approvalId);
    writeFileSync(
      path.join(dir, 'metadata.json'),
      JSON.stringify(
        {
          video: id,
          title: inp.title,
          series: v.series,
          job: ctx.job.id,
          idea: ctx.idea.id,
          preset: v.preset,
          scenes: v.scenes.map((s) => ({ id: s.id, type: s.type, seconds: Number(s.duration.toFixed(3)) })),
          file: { name: `${id}.mp4`, sha256: inp.sha256, bytes: statSync(upload).size, seconds: Number(vs?.duration ?? 0), width: vs?.width, height: vs?.height, video: vs?.codec_name, audio: as?.codec_name },
          coverAt: inp.coverAt,
          narration: { voice: v.narration?.voice, take: `public/narration/${id}/${take}`, lines: v.narration?.lines.map((l) => l.text) },
          qa: { pass: Boolean(qaRow.pass), checks: qaRow.checks_total, failed: qaRow.checks_failed, report: qaRow.report_path },
          approval: appr,
          aiDisclosure: 'Narration voice is AI-generated (local Kokoro model). Businesses, people, apps and numbers are fictional.',
          packagedAt: now(),
        },
        null,
        2,
      ) + '\n',
    );
    const files = readdirSync(dir)
      .sort()
      .map((f) => ({ file: f, bytes: statSync(path.join(dir, f)).size, sha256: fileHash(path.join(dir, f)) }));
    writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ video: id, approvalId: inp.approvalId, files }, null, 2) + '\n');
    // Swap in. A package for an earlier approval is archived, never deleted (approved = gold).
    if (existsSync(final)) {
      const prevApproval = json<{ approval?: { id?: number } }>(existsSync(path.join(final, 'metadata.json')) ? readFileSync(path.join(final, 'metadata.json'), 'utf8') : '', {}).approval?.id;
      if (prevApproval && prevApproval !== inp.approvalId) {
        const archive = path.join(out, 'packages', `approval-${prevApproval}`);
        mkdirSync(path.dirname(archive), { recursive: true });
        rmSync(archive, { recursive: true, force: true });
        renameSync(final, archive);
        ctx.log(`earlier approved package kept: ${rel(archive)}`);
      } else rmSync(final, { recursive: true, force: true });
    }
    renameSync(dir, final);
    // One row per approval: a retry or rebuild of the same approval updates its row (the
    // folder was replaced, and metadata.json's packagedAt differs on every build).
    const manifest = JSON.stringify(files);
    const same = ctx.db.prepare('SELECT id FROM packages WHERE job_id = ? AND approval_id = ? ORDER BY id DESC LIMIT 1').get(ctx.job.id, inp.approvalId) as { id: number } | undefined;
    if (same) ctx.db.prepare('UPDATE packages SET dir = ?, manifest = ? WHERE id = ?').run(rel(final), manifest, same.id);
    const packageId = same?.id ?? Number(ctx.db.prepare('INSERT INTO packages (job_id, approval_id, dir, manifest, created_at) VALUES (?, ?, ?, ?, ?)').run(ctx.job.id, inp.approvalId, rel(final), manifest, now()).lastInsertRowid);
    ctx.log(`package ${rel(final)}: ${files.map((f) => f.file).join(', ')}`);
    return { packageId, dir: rel(final), files, take };
  },
  // Reused only if every packaged file is still byte-identical to the manifest.
  valid: (o) => existsSync(path.join(ROOT, o.dir, 'manifest.json')) && o.files.every((f) => existsSync(path.join(ROOT, o.dir, f.file)) && fileHash(path.join(ROOT, o.dir, f.file)) === f.sha256),
};

/**
 * An approved take of this video that is byte-identical to the draft (already frozen).
 * A take counts only when complete: approved.json present and every file it lists intact.
 */
export function frozenTake(videoId: string, draftDir: string, base = path.join(ROOT, 'public', 'narration', videoId)): string | null {
  if (!existsSync(base)) return null;
  const want = fileHash(path.resolve(ROOT, draftDir, 'take.json'));
  for (const t of readdirSync(base).filter((d) => /^take-\d{2}$/.test(d)).sort()) {
    const dir = path.join(base, t);
    const f = path.join(dir, 'take.json');
    const a = path.join(dir, 'approved.json');
    if (!existsSync(f) || !existsSync(a) || fileHash(f) !== want) continue;
    const approved = json<{ files?: Record<string, string> }>(readFileSync(a, 'utf8'), {});
    const broken = Object.entries(approved.files ?? {}).filter(([name, h]) => !existsSync(path.join(dir, name)) || fileHash(path.join(dir, name)) !== h);
    if (!approved.files || broken.length) throw new Error(`public/narration/${videoId}/${t} does not match its approved.json (${broken.map(([n]) => n).join(', ') || 'no file list'}): an approved take was changed; restore it from git, never edit it`);
    return t;
  }
  return null;
}

export const STAGE_DEFS: StageSet = { idea, research, brief, script, storyboard, voice, assets, spec, render, qa, editorial, approval, package: pkg };
