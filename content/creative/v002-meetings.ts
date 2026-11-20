import type { CreativeRecord } from '../../src/creative/diversity.ts';
import { headlineOverChaos, lockup, NOT_RECORDED, SHEETS, transformation } from './_legacy.ts';

export const record: CreativeRecord = {
  id: 'v002-meetings',
  seq: 2,
  title: 'Every meeting ends the same way',
  status: 'legacy',
  subject: { basis: 'observed', value: 'AI meeting summaries: decisions, owners and deadlines sent automatically after every meeting', source: 'content/videos/v002-meetings.ts brief.topic' },
  opening: headlineOverChaos(`${SHEETS} (v002: 0–3 s)`),
  hook: { basis: 'observed', value: { kind: 'curiosity', description: 'A generalised observation about meetings', text: 'Every meeting ends the same way.' }, source: 'content/videos/v002-meetings.ts', note: 'category assigned in the 2026-11-18 audit (weak curiosity)' },
  structure: transformation(`${SHEETS} (v002)`),
  visual: { basis: 'observed', value: { kind: 'todos-resolved-by-cards', description: 'Unanswered questions stack; notification, timeline and chart cards answer them; the to-dos are checked off.' }, source: 'content/videos/v002-meetings.ts scenes' },
  demonstration: { basis: 'observed', value: { kind: 'illustrative-ui-cards', description: 'Fictional notification, timeline and data cards, one per line.' }, source: 'content/videos/v002-meetings.ts scenes' },
  ending: lockup(false, `${SHEETS} (v002: ~3.2 s end card)`),
  intent: { basis: 'reconstructed', value: 'An engine example: same brand, captions, hand-offs, audio pipeline and outro as v001; different story, scenes, preset and music.', source: 'content/videos/v002-meetings.ts header comment' },
  ...NOT_RECORDED,
};
