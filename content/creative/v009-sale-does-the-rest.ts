import type { CreativeRecord } from '../../src/creative/diversity.ts';
import { headlineOverChaos, lockup, NOT_RECORDED, transformation } from './_legacy.ts';

export const record: CreativeRecord = {
  id: 'v009-sale-does-the-rest',
  seq: 6,
  title: 'The sale that does the rest',
  status: 'legacy',
  subject: { basis: 'observed', value: 'One course sale that sends the login, adds the buyer to the pipeline and checks in three days later', source: 'content/videos/v009-sale-does-the-rest.ts brief.topic' },
  opening: headlineOverChaos('content/videos/v009-sale-does-the-rest.ts (chaosToSystem: headline + fragments)'),
  hook: { basis: 'observed', value: { kind: 'curiosity', description: 'A count of hidden work after a sale (also reads as money)', text: 'Every sale you make comes with three more jobs.' }, source: 'content/videos/v009-sale-does-the-rest.ts', note: 'category assigned in the 2026-11-18 audit' },
  structure: transformation('content/videos/v009-sale-does-the-rest.ts (chaosToSystem → flowRun → endCard)'),
  visual: { basis: 'observed', value: { kind: 'todos-become-workflow', description: 'To-dos flip into flow steps, the switch clicks, the run resolves them.' }, source: 'content/videos/v009-sale-does-the-rest.ts' },
  demonstration: { basis: 'observed', value: { kind: 'illustrative-ui-flow', description: 'A fictional after-sale workflow runs its steps (login, pipeline, check-in).' }, source: 'content/videos/v009-sale-does-the-rest.ts' },
  ending: lockup(true, 'content/videos/v009-sale-does-the-rest.ts (endCard + affiliate)'),
  intent: {
    basis: 'reconstructed',
    value: 'The owner picked the topic from four angles; the step count followed the scene type ("flowRun allows a trigger + 3 steps, so the hook says three more jobs").',
    source: 'docs/DECISIONS.md D45',
  },
  ...NOT_RECORDED,
  directions: { basis: 'unknown', note: 'four topic angles were offered (D45); no alternative creative directions were recorded' },
};
