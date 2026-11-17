/**
 * Scene type → model (pure). The mapped type forces every SceneType in spec.ts to have a
 * model here; the renderer registry (src/remotion/scenes/registry.tsx) does the same for
 * React. Library names (HookScene, …) are what docs and briefs use.
 */
import type { SceneSpec, SceneType } from '../spec.ts';
import { chaosToSystemCuePoints, validateChaosToSystem } from './chaosToSystem.ts';
import { hookModel, payoffModel, problemModel, statementModel } from './editorial.ts';
import { endCardCuePoints, validateEndCard } from './endCard.ts';
import { flowRunCuePoints, validateFlowRun } from './flowRun.ts';
import type { SceneModel, SceneSound } from './model.ts';
import { comparisonModel, dashboardModel, dataModel, notificationsModel, timelineModel } from './product.ts';

type PropsOf<T extends SceneType> = Extract<SceneSpec, { type: T }>['props'];

export const SCENE_MODELS: { [T in SceneType]: SceneModel<PropsOf<T>> } = {
  hook: hookModel,
  problem: problemModel,
  statement: statementModel,
  dashboard: dashboardModel,
  flowRun: {
    name: 'WorkflowScene',
    story: 'The automation runs: each step shows what it did (email sent, schedule kept, customer back).',
    minDuration: 6,
    cues: (p) => flowRunCuePoints(p),
    validate: (p) => validateFlowRun(p),
    sounds: (p, cues) => {
      const out: SceneSound[] = [];
      let sent = 0;
      p.flow.forEach((step, i) => {
        if (i === 0) return;
        if (step.kind === 'email' || step.kind === 'wait') out.push({ cue: `done${i}`, id: 'sent', variant: sent++ });
        for (let k = 1; cues[`day${i}_${k}`] !== undefined; k++) out.push({ cue: `day${i}_${k}`, id: 'day', variant: k - 1 });
      });
      p.flow.forEach((_, k) => out.push({ cue: `check${k}`, id: 'check', variant: k }));
      return out;
    },
  },
  chaosToSystem: {
    name: 'AutomationScene',
    story: 'Manual chaos becomes a system: the to-dos line up, flip into flow steps, the switch clicks on.',
    minDuration: 4,
    cues: (p, d) => chaosToSystemCuePoints(p, d),
    validate: (p) => validateChaosToSystem(p),
    sounds: (p) => [...p.flow.map((_, k) => ({ cue: `flip${k}`, id: 'flip' as const, variant: k })), { cue: 'click', id: 'click' }],
  },
  notifications: notificationsModel,
  timeline: timelineModel,
  comparison: comparisonModel,
  data: dataModel,
  payoff: payoffModel,
  endCard: {
    name: 'BrandOutroScene',
    story: 'The brand lockup every video ends on: the switch clicks on, wordmark, one CTA line.',
    minDuration: 2.4,
    cues: (p) => endCardCuePoints(p),
    validate: (p, d) => validateEndCard(p, d),
    sounds: () => [{ cue: 'click', id: 'click' }],
  },
};

export function sceneModel(scene: SceneSpec): SceneModel<SceneSpec['props']> {
  return SCENE_MODELS[scene.type] as SceneModel<SceneSpec['props']>;
}
