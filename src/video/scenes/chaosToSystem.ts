/**
 * Scene type "chaosToSystem" — content model and beat map (pure, no React).
 *
 * Story shape: a hook headline over the owner's scattered manual to-dos (problem)
 * → the to-dos that matter line up and flip over, one by one, into the steps of an
 * automation flow (transformation) → the system switches on with the brand "click"
 * and starts running by itself (solution).
 *
 * Reusable for any "manual chaos → automated system" story: change the fragments,
 * flow steps and copy; the choreography stays.
 */

export type FlowStepKind = 'trigger' | 'email' | 'wait' | 'goal';

export type FlowStep = {
  kind: FlowStepKind;
  title: string;
  subtitle: string;
  /** Chip text once the step has run (e.g. "Sent", "Thu 9:00"). */
  chip: string;
  /** Chip text before the step runs (e.g. "Queued"). Defaults to `chip`. */
  chipBefore?: string;
  /** Chip text when the step completes in a full run (flowRun). Defaults to `chip`. */
  chipDone?: string;
};

export type Fragment = {
  /** The manual to-do as the owner would scribble it. */
  text: string;
  /** Optional friction tag, e.g. "Overdue · 2d". */
  tag?: string;
  /** Index of the flow step this to-do becomes. Omit for decorative fragments. */
  becomes?: number;
};

export type ChaosToSystemBeats = {
  /** Headline starts leaving. */
  hookOut: number;
  /** To-dos that matter start straightening into a column (the rest are dismissed). */
  gather: number;
  gatherTravel: number;
  gatherStagger: number;
  /** Column starts flipping, top to bottom: each to-do turns over into a flow step. */
  flip: number;
  flipStagger: number;
  flipDuration: number;
  /** The brand click: automation switches on. */
  click: number;
  /** Resolution caption starts entering. */
  caption: number;
  /** Resolution caption starts leaving (omit: it stays until the scene ends). */
  captionOut?: number;
  /** First step (trigger) fires. */
  run: number;
  /** Seconds between consecutive steps completing. */
  stepInterval: number;
};

export type ChaosToSystemProps = {
  /** Hook headline (caption markup, see src/captions/phrase.ts). */
  headline: string;
  /** Caption after the click (markup). */
  resolution: string;
  workspace: { name: string; initials: string; breadcrumb: string };
  /** Up to 7 fragments; positions come from the scene's composed scatter. */
  fragments: Fragment[];
  /** 2–4 flow steps. */
  flow: FlowStep[];
  beats?: Partial<ChaosToSystemBeats>;
};

export const CHAOS_TO_SYSTEM_DEFAULT_BEATS: ChaosToSystemBeats = {
  hookOut: 2.45,
  gather: 2.5,
  gatherTravel: 0.7,
  gatherStagger: 0.06,
  flip: 3.3,
  flipStagger: 0.09,
  flipDuration: 0.36,
  click: 4.15,
  caption: 4.0,
  run: 4.55,
  stepInterval: 0.75,
};

/** Composition (base units, 1080-wide frame). Checked against the safe zone in tests. */
export const CHAOS_TO_SYSTEM_LAYOUT = {
  headlineTop: 660,
  headlineLines: 3,
  captionTop: 300,
  captionLines: 2,
  window: { width: 900, top: 540 },
  flow: { nodeHeight: 112, nodeGap: 30, padX: 26, icon: 60, headerHeight: 112, bodyPad: 28 },
} as const;

/** Window rect in base units for a flow with `steps` steps. */
export function chaosToSystemWindow(steps: number, frameWidth = 1080) {
  const { window: w, flow } = CHAOS_TO_SYSTEM_LAYOUT;
  const height = flow.headerHeight + flow.bodyPad * 2 + steps * flow.nodeHeight + (steps - 1) * flow.nodeGap;
  return { x: (frameWidth - w.width) / 2, y: w.top, width: w.width, height };
}

export const CHAOS_TO_SYSTEM_LIMITS = { fragments: 7, flowMin: 2, flowMax: 4 } as const;

export function chaosToSystemBeats(props: ChaosToSystemProps): ChaosToSystemBeats {
  return { ...CHAOS_TO_SYSTEM_DEFAULT_BEATS, ...props.beats };
}

/** When the k-th gathered to-do (top to bottom) starts flipping. */
export function flipAt(b: ChaosToSystemBeats, k: number): number {
  return b.flip + k * b.flipStagger;
}

/** A step only runs inside this scene if it can resolve and be read before the scene ends. */
export const RUN_READ_SECONDS = 0.5;

/**
 * Named moments (seconds, scene-local) exposed for chapters and sound cues.
 * `stepN` cues exist only for steps that run inside the scene (see RUN_READ_SECONDS).
 */
export function chaosToSystemCuePoints(props: ChaosToSystemProps, duration = Infinity): Record<string, number> {
  const b = chaosToSystemBeats(props);
  const n = props.flow.length;
  const cues: Record<string, number> = {
    start: 0,
    hookOut: b.hookOut,
    gather: b.gather,
    aligned: b.gather + b.gatherTravel + (n - 1) * b.gatherStagger,
    flipped: flipAt(b, n - 1) + b.flipDuration,
    click: b.click,
    run: b.run,
  };
  for (let k = 0; k < n; k++) cues[`flip${k}`] = flipAt(b, k) + b.flipDuration / 2;
  for (let i = 1; i < n; i++) if (stepDoneAt(b, i) + RUN_READ_SECONDS <= duration) cues[`step${i}`] = stepDoneAt(b, i);
  return cues;
}

/** When step `i` (i ≥ 1) completes: the signal pulse arrives and the step resolves. */
export function stepDoneAt(b: ChaosToSystemBeats, i: number): number {
  return b.run + i * b.stepInterval;
}

export function validateChaosToSystem(props: ChaosToSystemProps): string[] {
  const errors: string[] = [];
  const { fragments, flow } = props;
  if (fragments.length > CHAOS_TO_SYSTEM_LIMITS.fragments) {
    errors.push(`at most ${CHAOS_TO_SYSTEM_LIMITS.fragments} fragments (got ${fragments.length})`);
  }
  if (flow.length < CHAOS_TO_SYSTEM_LIMITS.flowMin || flow.length > CHAOS_TO_SYSTEM_LIMITS.flowMax) {
    errors.push(`flow needs ${CHAOS_TO_SYSTEM_LIMITS.flowMin}-${CHAOS_TO_SYSTEM_LIMITS.flowMax} steps (got ${flow.length})`);
  }
  if (flow[0] && flow[0].kind !== 'trigger') errors.push('first flow step must be a trigger');
  const targets = fragments.map((f) => f.becomes).filter((b): b is number => b !== undefined);
  if (new Set(targets).size !== targets.length) errors.push('two fragments become the same flow step');
  for (const t of targets) {
    if (!Number.isInteger(t) || t < 0 || t >= flow.length) errors.push(`fragment target ${t} is not a flow step`);
  }
  if (targets.length !== flow.length) errors.push('every flow step must be fed by exactly one fragment');
  const b = chaosToSystemBeats(props);
  const aligned = b.gather + b.gatherTravel + (flow.length - 1) * b.gatherStagger;
  const flipped = flipAt(b, flow.length - 1) + b.flipDuration;
  if (!(b.hookOut <= b.gather && aligned <= b.flip + 0.1 && flipped <= b.click && b.click < b.run)) {
    errors.push('beats must be ordered: hookOut ≤ gather → aligned ≤ flip → flipped ≤ click < run');
  }
  if (b.captionOut !== undefined && b.captionOut <= b.caption) errors.push('captionOut must come after caption');
  return errors;
}
