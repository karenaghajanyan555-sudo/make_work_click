import { sceneOf, type VideoSpec } from '../../src/video/spec.ts';
import { v001Memory } from './v001-memory.ts';

/**
 * Video 001, version 2 — the same story, voice (approved take-01, reused unchanged), score
 * and design as v001, rebuilt on the engine with the improvements from the review:
 *
 *   6–16 s     the camera breathes in on each step in focus and the signal light follows
 *              the active step (it used to hold still for 8 s)
 *   dashboard  the welcome email personalises itself ({first name} → Sam) and comes back
 *              "Opened"; Sam's repeat order counts up its value
 *   payoff     a counter over the to-dos ticks 1/4 → 4/4 "Done by the system" with each
 *              check-off, a lime sweep runs down the column, then the to-dos stream into
 *              the switch on light trails
 *   outro      a reversed-chime swell lands exactly on the click, which now sends a wide
 *              shockwave across the frame
 *   sound      a soft tick for each detail opening, the read receipt and the order arriving
 *
 * Everything new is an opt-in prop of the library scenes: v001 itself renders unchanged.
 */
const base: VideoSpec = v001Memory;
const hook = sceneOf(base, 'hook', 'chaosToSystem');
const run = sceneOf(base, 'run', 'flowRun');
const end = sceneOf(base, 'end', 'endCard');

export const v001MemoryV2: VideoSpec = {
  ...base,
  id: 'v001-memory-v2',
  status: 'draft',
  narration: { ...base.narration!, take: 'v001-memory/take-01' },
  scenes: [
    hook,
    {
      ...run,
      props: {
        ...run.props,
        camera: 'follow',
        glow: 'follow',
        trails: true,
        stamp: 'Done by the system',
        details: run.props.details.map((d) =>
          d?.kind === 'email'
            ? { ...d, mergeField: '{first name}', opened: 'Opened · 9:52 AM' }
            : d?.kind === 'goal'
              ? { ...d, amount: 14.5 }
              : d,
        ),
      },
      sounds: [
        { cue: 'open1', id: 'open' },
        { cue: 'open2', id: 'open' },
        { cue: 'open3', id: 'open' },
        { cue: 'merge1', id: 'tick', variant: 4 },
        { cue: 'opened1', id: 'notify' },
        { cue: 'order3', id: 'notify', variant: 1 },
        { cue: 'stamp', id: 'notify', variant: 1 },
      ],
    },
    {
      ...end,
      props: { ...end.props, burst: true },
      sounds: [{ cue: 'click', id: 'swell' }],
    },
  ],
};
