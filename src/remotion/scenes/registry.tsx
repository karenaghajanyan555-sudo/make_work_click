import type { SceneSpec, SceneType } from '../../video/spec.ts';
import { ChaosToSystem } from './ChaosToSystem.tsx';
import { Hook, Payoff, Problem, Statement } from './Editorial.tsx';
import { EndCard } from './EndCard.tsx';
import { FlowRun } from './FlowRun.tsx';
import { Comparison, Dashboard, Data, Notifications, Timeline } from './Product.tsx';

/**
 * Scene type → renderer. The mapped type forces every SceneType in spec.ts to have a
 * renderer here (typecheck fails otherwise). Models: src/video/scenes/registry.ts.
 * Catalogue: docs/ARCHITECTURE.md.
 */
type Renderer<T extends SceneType> = React.FC<{ scene: Extract<SceneSpec, { type: T }> }>;

export const SCENE_RENDERERS: { [T in SceneType]: Renderer<T> } = {
  chaosToSystem: ({ scene }) => <ChaosToSystem props={scene.props} duration={scene.duration} />,
  flowRun: ({ scene }) => <FlowRun props={scene.props} duration={scene.duration} />,
  endCard: ({ scene }) => <EndCard props={scene.props} duration={scene.duration} />,
  hook: ({ scene }) => <Hook props={scene.props} duration={scene.duration} />,
  statement: ({ scene }) => <Statement props={scene.props} duration={scene.duration} />,
  problem: ({ scene }) => <Problem props={scene.props} duration={scene.duration} />,
  payoff: ({ scene }) => <Payoff props={scene.props} duration={scene.duration} />,
  dashboard: ({ scene }) => <Dashboard props={scene.props} duration={scene.duration} />,
  notifications: ({ scene }) => <Notifications props={scene.props} duration={scene.duration} />,
  timeline: ({ scene }) => <Timeline props={scene.props} duration={scene.duration} />,
  comparison: ({ scene }) => <Comparison props={scene.props} duration={scene.duration} />,
  data: ({ scene }) => <Data props={scene.props} duration={scene.duration} />,
};

export const SceneRenderer: React.FC<{ scene: SceneSpec }> = ({ scene }) => {
  const R = SCENE_RENDERERS[scene.type] as Renderer<typeof scene.type>;
  return <R scene={scene} />;
};
