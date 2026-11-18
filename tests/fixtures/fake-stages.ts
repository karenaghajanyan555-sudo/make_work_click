/**
 * Fake production stages for runner tests: same order and contracts as the real ones,
 * no engine work. Each stage's output is a pure function of its input. A stage named in
 * `block` waits forever (until aborted), so a test can kill or interrupt the process there.
 */
import { STAGES, type StageName } from '../../src/orchestrator/model.ts';
import type { StageDef, StageSet } from '../../src/orchestrator/runner.ts';

export function fakeStages(o: { block?: StageName | null; runs?: Record<string, number>; extra?: Record<string, unknown> } = {}): StageSet {
  const set = {} as StageSet;
  for (const s of STAGES) {
    set[s] = {
      name: s,
      version: 1,
      input: (ctx) => ({ topic: ctx.idea.topic, upstream: STAGES.indexOf(s) > 0 ? ctx.out(STAGES[STAGES.indexOf(s) - 1]!) : null, extra: o.extra?.[s] ?? null }),
      run: (_in, ctx) => {
        if (o.runs) o.runs[s] = (o.runs[s] ?? 0) + 1;
        if (o.block === s) {
          process.stdout.write(`BLOCKED ${s}\n`);
          return new Promise((_res, rej) => ctx.signal.addEventListener('abort', () => rej(new Error('aborted'))));
        }
        return { stage: s, n: STAGES.indexOf(s) };
      },
    } as StageDef;
  }
  return set;
}
