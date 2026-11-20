/**
 * The creative render gate (pure; D46). `npm run render -- <id>` (and so `npm run make`) asks it
 * before a full picture render. It protects new productions without touching anything that
 * already exists:
 *
 *   never gated   stills (`--stills`), Remotion Studio, mix, deliver, QA, publish-pack, voice
 *   exempt        videos made before D46 (legacy records, GATE_EXEMPT), the scene catalogue,
 *                 orchestrator productions (their gate lands with the orchestrator, D46 phase 4)
 *   gated         every other video: it needs a creative record whose evaluation at the render
 *                 stage is not FAIL (WARN renders and prints why)
 *   override      exceptional, owner-approved: `--creative-override "<reason>"` or
 *                 MWC_CREATIVE_OVERRIDE="<reason>" (≥ 10 characters). Renders anyway and is
 *                 logged to out/<id>/qa/creative-override.jsonl by the caller. docs/QA.md § Gate 2c.
 *
 * The gate never deletes or rewrites anything, so a resumed or recovered build asks again and
 * gets the same answer.
 */
import type { VideoSpec } from '../video/spec.ts';
import { evaluate, type CreativeRecord, type Evaluation } from './diversity.ts';

/** Videos made before D46 that have no creative record of their own. */
export const GATE_EXEMPT: Readonly<Record<string, string>> = {
  'v001-memory': 'made before D46 (the original of v001-memory-v2, which carries the record)',
  library: 'the scene catalogue, not a video for viewers',
  'library-affiliate': 'the affiliate scene catalogue, not a video for viewers',
};

export const OVERRIDE_MIN_CHARS = 10;

export type GateDecision = {
  allow: boolean;
  level: 'exempt' | 'pass' | 'warn' | 'override' | 'refuse';
  message: string;
  evaluation?: Evaluation;
};

export function gate(
  id: string,
  o: { records: readonly CreativeRecord[]; productions: ReadonlySet<string>; specs?: ReadonlyMap<string, VideoSpec>; override?: string | null },
): GateDecision {
  if (o.productions.has(id)) return { allow: true, level: 'exempt', message: `${id}: orchestrator production — the creative gate for productions lands with D46 phase 4` };
  if (GATE_EXEMPT[id]) return { allow: true, level: 'exempt', message: `${id}: ${GATE_EXEMPT[id]}` };
  const record = o.records.find((r) => r.id === id);
  if (record?.status === 'legacy') return { allow: true, level: 'exempt', message: `${id}: made before D46 (legacy record)` };
  const reason = o.override?.trim() ?? '';
  const overrideOk = reason.length >= OVERRIDE_MIN_CHARS;
  const fix = `docs/QA.md § Gate 2c; npm run diversity -- ${id}`;
  if (!record) {
    if (overrideOk) return { allow: true, level: 'override', message: `${id}: no creative record — rendered under override: ${reason}` };
    return { allow: false, level: 'refuse', message: `${id}: no creative record (content/creative/${id}.ts). New videos need three directions, a chosen one and the review answered before a full render (${fix}). Stills still render: --stills.${o.override !== undefined && o.override !== null ? ` Override refused: give a reason of ≥ ${OVERRIDE_MIN_CHARS} characters.` : ''}` };
  }
  const evaluation = evaluate(record, o.records, { stage: 'render', specs: o.specs });
  if (evaluation.verdict === 'FAIL') {
    const why = evaluation.findings.filter((f) => f.level === 'fail').map((f) => `  ✗ ${f.text}`).join('\n');
    if (overrideOk) return { allow: true, level: 'override', message: `${id}: creative check FAIL — rendered under override: ${reason}\n${why}`, evaluation };
    return { allow: false, level: 'refuse', message: `${id}: creative check FAIL at the render stage:\n${why}\nFix the record or the storyboard (${fix}). Stills still render: --stills.${o.override !== undefined && o.override !== null ? ` Override refused: give a reason of ≥ ${OVERRIDE_MIN_CHARS} characters.` : ''}`, evaluation };
  }
  if (evaluation.verdict === 'WARN') return { allow: true, level: 'warn', message: `${id}: creative check WARN:\n${evaluation.findings.filter((f) => f.level === 'warn').map((f) => `  △ ${f.text}`).join('\n')}`, evaluation };
  return { allow: true, level: 'pass', message: `${id}: creative check PASS`, evaluation };
}
