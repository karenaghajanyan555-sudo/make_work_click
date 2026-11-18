/**
 * Scene type "flowRun" — content model and beat map (pure, no React).
 *
 * Story shape: an automation runs inside the product window, one step at a time. Each
 * step opens a detail that shows what it actually did (the email it sent, the schedule
 * it kept, the order that came back); the signal travels back up to the trigger (the
 * loop closes); the camera pulls back; the steps flip back into the owner's original
 * to-dos — now resolved — and converge into the brand switch, handing over to endCard.
 *
 * Continuity: the first frame matches the last frame of chaosToSystem (same window rect,
 * switch on, idle chips, camera zoom), so the cut between them is invisible.
 * Reusable for any trigger → action(s) → wait → goal automation.
 */
import { CAPTION_BAND } from '../../brand/format.ts';
import { chaosToSystemWindow, CHAOS_TO_SYSTEM_LAYOUT, type FlowStep } from './chaosToSystem.ts';

export type EmailDetail = {
  kind: 'email';
  to: string;
  from: string;
  subject: string;
  body: string;
  deliveredAt: string;
  /** Shown in place of the first name until it fills in (personalisation), e.g. "{first name}". */
  mergeField?: string;
  /** Read receipt shown a moment after delivery, e.g. "Opened · 9:52 AM". */
  opened?: string;
};
export type ScheduleDetail = {
  kind: 'wait';
  /** Day columns, e.g. ["Mon", …]; `dates` the matching day numbers. */
  days: string[];
  dates: string[];
  /** Column where the sequence started (shows `startLabel`, already done). */
  startDay: number;
  startLabel: string;
  /** Column where the follow-up sends (shows `sendTime`, then sends). */
  sendDay: number;
  sendTime: string;
};
export type GoalDetail = {
  kind: 'goal';
  initials: string;
  customer: string;
  items: string;
  time: string;
  note: string;
  badge: string;
  /** Order value counting up as the order lands (money). */
  amount?: number;
};
export type StepDetail = EmailDetail | ScheduleDetail | GoalDetail;

/** The owner's original to-do for a step, and what the system did about it. */
export type ResolvedTodo = { text: string; tag?: string; resolved: string };

export type FlowRunBeats = {
  /** Camera pushes in toward the flow. */
  push: number;
  /** The trigger fires. */
  trigger: number;
  /** For flow[1..]: the signal arrives (step in focus, detail opens) and the step completes. */
  steps: Array<{ arrive: number; done: number }>;
  /** Signal travels back up to the trigger: the loop closes. */
  loop: number;
  /** Camera pulls back to the whole flow. */
  pullBack: number;
  /** Steps flip back into the original to-dos (domino, top to bottom). */
  resolve: number;
  /** Resolved to-dos converge into the brand switch (hand-off to endCard). */
  converge: number;
};

export type FlowRunProps = {
  workspace: { name: string; initials: string; breadcrumb: string };
  /** Same steps as the preceding chaosToSystem scene (author them once in the content file). */
  flow: FlowStep[];
  /** Per flow step: what it shows when in focus (null for the trigger). */
  details: Array<StepDetail | null>;
  /** Per flow step, in order. */
  resolved: ResolvedTodo[];
  /** Timing is narration-driven, so it is always authored (seconds, scene-local). */
  beats: FlowRunBeats;
  /** hold (v001): fixed focus zoom. follow: the camera breathes in on each step in focus. */
  camera?: 'hold' | 'follow';
  /** fixed (v001): signal light under the window. follow: the light tracks the active step. */
  glow?: 'fixed' | 'follow';
  /** Counter over the resolved to-dos, ticking with each check-off ("Done by the system · 3/4"). */
  stamp?: string;
  /** The resolved to-dos stream into the switch on light trails. */
  trails?: boolean;
  /**
   * Premium motion (opt-in, v003+): one continuous camera glide (a slow push that deepens step
   * by step, drifting toward each side, then one pull-back) instead of leaning in and out on
   * every step; soft light (neutral bloom, tight lime core); the to-dos curve into the switch
   * and settle into it instead of accelerating in a straight line.
   */
  smooth?: boolean;
};

/** Composition (base units). Window rect is chaosToSystem's — continuity. */
export const FLOW_RUN_LAYOUT = {
  detailHeight: { email: 262, wait: 170, goal: 176 },
  /** Canvas height (below the header) that stays inside the safe zone at focus zoom. */
  visibleCanvas: 548,
  /** lean: the follow camera's step-in-focus zoom (with a 6-unit lift: tested against the caption band and safe bottom). */
  zoom: { focus: 1.1, lean: 1.12, overview: 1.0 },
} as const;

/** Motion constants (seconds). */
export const FLOW_RUN_TIMING = {
  pushTravel: 0.9,
  detailOpen: 0.45,
  detailClose: 0.4,
  scroll: 0.6,
  /** Schedule playhead: first hop and growth per hop (slows towards the send day). */
  hop: 0.26,
  hopGrowth: 0.38,
  hopRest: 0.06,
  loopTravel: 0.7,
  pullBackTravel: 0.8,
  flipStagger: 0.09,
  flipDuration: 0.36,
  collapse: 0.6,
  checkStagger: 0.12,
  converge: 0.55,
} as const;

export const FLOW_RUN_LIMITS = { flowMin: 2, flowMax: 4 } as const;

/** Detail open moment for step i ≥ 1. */
export function detailOpenAt(b: FlowRunBeats, i: number): number {
  return b.steps[i - 1]!.arrive + 0.12;
}

/** Detail close moment for step i ≥ 1: before the next step arrives (last: before the loop). */
export function detailCloseAt(b: FlowRunBeats, i: number): number {
  const next = b.steps[i];
  return (next ? next.arrive : b.loop) - FLOW_RUN_TIMING.detailClose - 0.15;
}

/** Schedule playhead hops: [start, end] of each day-to-day hop, slowing as it goes. */
export function scheduleHops(b: FlowRunBeats, stepIndex: number, d: ScheduleDetail): Array<[number, number]> {
  const T = FLOW_RUN_TIMING;
  const hops: Array<[number, number]> = [];
  let t = detailOpenAt(b, stepIndex) + T.detailOpen * 0.7;
  for (let k = 0; k < d.sendDay - d.startDay; k++) {
    const len = T.hop * (1 + T.hopGrowth * k);
    hops.push([t, t + len]);
    t += len + T.hopRest;
  }
  return hops;
}

export function checkAt(b: FlowRunBeats, k: number): number {
  const T = FLOW_RUN_TIMING;
  return b.resolve + 3 * T.flipStagger + T.flipDuration + 0.05 + k * T.checkStagger;
}

/** Named moments (seconds, scene-local) for chapters and sound cues. */
export function flowRunCuePoints(props: FlowRunProps): Record<string, number> {
  const b = props.beats;
  const T = FLOW_RUN_TIMING;
  const n = props.flow.length;
  const cues: Record<string, number> = { start: 0, push: b.push, trigger: b.trigger };
  b.steps.forEach((s, j) => {
    const i = j + 1;
    cues[`arrive${i}`] = s.arrive;
    cues[`done${i}`] = s.done;
    const d = props.details[i];
    if (d?.kind === 'wait') scheduleHops(b, i, d).forEach(([, end], k) => (cues[`day${i}_${k + 1}`] = end));
  });
  for (let i = 1; i < n; i++) {
    const d = props.details[i];
    if (!d) continue;
    cues[`open${i}`] = detailOpenAt(b, i);
    if (d.kind === 'email' && d.mergeField) cues[`merge${i}`] = mergeAt(b, i);
    if (d.kind === 'email' && d.opened) cues[`opened${i}`] = openedAt(b, i);
    if (d.kind === 'goal' && d.amount !== undefined) cues[`order${i}`] = orderAt(b, i);
  }
  cues.loop = b.loop;
  cues.loopDone = b.loop + T.loopTravel;
  cues.pullBack = b.pullBack;
  cues.resolve = b.resolve;
  for (let k = 0; k < n; k++) {
    cues[`flipBack${k}`] = b.resolve + k * T.flipStagger + T.flipDuration / 2;
    cues[`check${k}`] = checkAt(b, k);
  }
  if (props.stamp) cues.stamp = checkAt(b, n - 1);
  cues.converge = b.converge;
  cues.formed = b.converge + T.converge;
  return cues;
}

/** Personalisation fills in (email detail). */
export const mergeAt = (b: FlowRunBeats, i: number) => detailOpenAt(b, i) + 0.55;
/** Read receipt lands, after delivery. */
export const openedAt = (b: FlowRunBeats, i: number) => b.steps[i - 1]!.done + 0.55;
/** The customer's order slides in (goal detail). */
export const orderAt = (b: FlowRunBeats, i: number) => b.steps[i - 1]!.arrive + 0.35;

/** Window rect (base units) — identical to chaosToSystem's for the same step count. */
export function flowRunWindow(steps: number, frameWidth = 1080) {
  return chaosToSystemWindow(steps, frameWidth);
}

/** Scroll (base units) that keeps step i, expanded, inside the visible canvas. */
export function focusScroll(stepIndex: number, detailHeight: number): number {
  const m = CHAOS_TO_SYSTEM_LAYOUT.flow;
  const bottom = m.bodyPad + stepIndex * (m.nodeHeight + m.nodeGap) + m.nodeHeight + detailHeight;
  return Math.max(0, bottom - FLOW_RUN_LAYOUT.visibleCanvas);
}

export function validateFlowRun(props: FlowRunProps): string[] {
  const errors: string[] = [];
  const { flow, details, resolved, beats: b } = props;
  const T = FLOW_RUN_TIMING;
  if (flow.length < FLOW_RUN_LIMITS.flowMin || flow.length > FLOW_RUN_LIMITS.flowMax) {
    errors.push(`flow needs ${FLOW_RUN_LIMITS.flowMin}-${FLOW_RUN_LIMITS.flowMax} steps (got ${flow.length})`);
  }
  if (flow[0] && flow[0].kind !== 'trigger') errors.push('first flow step must be a trigger');
  if (details.length !== flow.length) errors.push('details: one entry per flow step');
  if (details[0]) errors.push('the trigger has no detail (null)');
  details.forEach((d, i) => {
    if (d && flow[i] && d.kind !== flow[i]!.kind) errors.push(`detail ${i} is "${d.kind}" but step ${i} is "${flow[i]!.kind}"`);
    if (d?.kind === 'wait') {
      if (d.days.length !== d.dates.length) errors.push('schedule: days and dates differ in length');
      if (!(d.startDay >= 0 && d.sendDay > d.startDay && d.sendDay < d.days.length)) errors.push('schedule: need 0 ≤ startDay < sendDay < days');
      const s = b.steps[i - 1];
      const hops = scheduleHops(b, i, d);
      if (s && hops.length && hops.at(-1)![1] > s.done - 0.15) errors.push(`schedule: playhead reaches the send day after it sends (${hops.at(-1)![1].toFixed(2)}s > ${s.done}s)`);
    }
  });
  if (resolved.length !== flow.length) errors.push('resolved: one to-do per flow step');
  if (b.steps.length !== flow.length - 1) errors.push('beats.steps: one entry per step after the trigger');
  const seq = [b.push, b.trigger, ...b.steps.flatMap((s) => [s.arrive, s.done]), b.loop, b.pullBack, b.resolve, b.converge];
  for (let i = 1; i < seq.length; i++) if (!(seq[i]! >= seq[i - 1]!)) errors.push(`beats out of order at position ${i} (${seq[i - 1]} → ${seq[i]})`);
  b.steps.forEach((s, j) => {
    if (s.done - s.arrive < 0.8) errors.push(`step ${j + 1}: needs ≥ 0.8 s between arrive and done`);
    if (detailCloseAt(b, j + 1) < s.done + 0.3) errors.push(`step ${j + 1}: its result must stay readable ≥ 0.3 s before the detail closes`);
  });
  if (b.pullBack < b.loop) errors.push('pullBack must not start before the loop');
  if (b.resolve < b.pullBack + T.pullBackTravel * 0.8) errors.push('resolve must wait for the pull-back');
  if (b.converge < checkAt(b, flow.length - 1) + 0.3) errors.push('converge must wait until the last to-do is checked');
  return errors;
}

/** Layout facts checked by tests: light surfaces stay below the caption band. */
export function flowRunWindowTopAtZoom(zoom: number, safeCy: number): number {
  const w = flowRunWindow(4);
  return safeCy + (w.y - safeCy) * zoom;
}
export const FLOW_RUN_CAPTION_BOTTOM = CAPTION_BAND.bottom;
