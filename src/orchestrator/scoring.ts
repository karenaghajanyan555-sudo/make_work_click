/**
 * Idea scoring (pure). A transparent weighted score, not a prediction:
 *
 *   base     = 100 × (0.40 audience value + 0.35 engagement + 0.25 commercial) / 5
 *   fit      × 1.00 with a story kit for the category, × 0.60 without (cannot be produced
 *              automatically yet)
 *   research − 5 per flagged claim the script relies on (max −15)
 *   perf     × category performance once real metrics exist (manual entry): the category's
 *              mean completion rate vs the overall mean, half-weighted, clamped to 0.85–1.15,
 *              only with ≥ 3 measured posts in the category and ≥ 5 overall
 *   priority = round(base × fit × perf − research), unless the owner pinned a priority.
 * The weights are a judgement call (docs/ORCHESTRATOR.md); change them here, tests follow.
 */

export const SCORE_WEIGHTS = { audienceValue: 0.4, engagement: 0.35, commercial: 0.25 } as const;
export const PERF = { minCategory: 3, minOverall: 5, weight: 0.5, min: 0.85, max: 1.15 } as const;

export type ScoreInput = { audienceValue: number; engagement: number; commercial: number; hasKit: boolean; flaggedClaims: number; performance: number };
export type Score = { base: number; fit: number; research: number; performance: number; score: number; priority: number };

export function scoreIdea(i: ScoreInput): Score {
  const w = SCORE_WEIGHTS;
  const base = (100 * (w.audienceValue * i.audienceValue + w.engagement * i.engagement + w.commercial * i.commercial)) / 5;
  const fit = i.hasKit ? 1 : 0.6;
  const research = Math.min(15, 5 * i.flaggedClaims);
  const score = base * fit * i.performance - research;
  return { base: round1(base), fit, research, performance: i.performance, score: round1(score), priority: Math.round(score) };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Completion rate per published post, with its category. */
export type PostPerformance = { category: string; completionRate: number };

/** Category multiplier from measured posts (1 until there is enough data). */
export function categoryPerformance(category: string, posts: readonly PostPerformance[]): number {
  const mine = posts.filter((p) => p.category === category);
  if (mine.length < PERF.minCategory || posts.length < PERF.minOverall) return 1;
  const mean = (xs: readonly PostPerformance[]) => xs.reduce((s, p) => s + p.completionRate, 0) / xs.length;
  const overall = mean(posts);
  if (!(overall > 0)) return 1;
  const m = 1 + ((mean(mine) - overall) / overall) * PERF.weight;
  return Math.min(PERF.max, Math.max(PERF.min, Number(m.toFixed(3))));
}
