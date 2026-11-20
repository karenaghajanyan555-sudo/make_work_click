import type { CreativeRecord } from '../../src/creative/diversity.ts';
import { headlineOverChaos, lockup, NOT_RECORDED, transformation } from './_legacy.ts';

export const record: CreativeRecord = {
  id: 'v001-memory-v2',
  seq: 1,
  title: 'Your business shouldn’t depend on your memory',
  status: 'legacy',
  subject: { basis: 'observed', value: 'A welcome-email series for a bakery that runs by itself instead of the owner remembering', source: 'docs/storyboards/v001-memory.md' },
  opening: headlineOverChaos('docs/storyboards/v001-memory.md beat 1 ("headline over 7 scattered memo cards")'),
  hook: { basis: 'observed', value: { kind: 'pain', description: 'A general truth about relying on memory', text: 'Your business shouldn’t depend on your memory.' }, source: 'content/videos/v001-memory.ts', note: 'category assigned in the 2026-11-18 audit (docs/growth/HOOKS.md)' },
  structure: transformation('docs/storyboards/v001-memory.md beats 1–7'),
  visual: { basis: 'observed', value: { kind: 'todos-become-workflow', description: 'Memo cards gather, domino-flip into flow nodes, the switch clicks Live; the run checks them off.' }, source: 'docs/storyboards/v001-memory.md beats 2–6' },
  demonstration: { basis: 'observed', value: { kind: 'illustrative-ui-flow', description: 'A fictional workflow window runs its steps (email, wait, goal).' }, source: 'content/videos/v001-memory.ts' },
  ending: lockup(false, 'content/videos/v001-memory-v2.ts (endCard, burst)'),
  intent: { basis: 'reconstructed', value: 'The owner asked to keep the opening hook, show the dashboard working and end on the brand with a follow CTA; v2 rebuilt the same story on the engine.', source: 'docs/STATUS.md "User requirements for the full video (2026-11-16)"; content/videos/v001-memory-v2.ts header' },
  ...NOT_RECORDED,
};
