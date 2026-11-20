import type { CreativeRecord } from '../../src/creative/diversity.ts';
import { headlineOverChaos, lockup, NOT_RECORDED, SHEETS, transformation } from './_legacy.ts';

export const record: CreativeRecord = {
  id: 'v008-bookings-run-themselves',
  seq: 5,
  title: 'The booking that runs itself',
  status: 'legacy',
  subject: { basis: 'observed', value: 'A booking link that takes the payment up front, sends the confirmation with the call link and the reminder by itself', source: 'content/videos/v008-bookings-run-themselves.ts brief.topic' },
  opening: headlineOverChaos(`${SHEETS} (v008: 0–3.5 s)`),
  hook: { basis: 'observed', value: { kind: 'before-after', description: 'Implied before/after in a number (ten messages → one link)', text: 'Booking one call shouldn’t take ten messages.' }, source: 'content/videos/v008-bookings-run-themselves.ts', note: 'category assigned in the 2026-11-18 audit' },
  structure: transformation(`${SHEETS} (v008)`),
  visual: { basis: 'observed', value: { kind: 'todos-become-workflow', description: 'To-dos flip into flow steps, the switch clicks, the run resolves them.' }, source: 'content/videos/v008-bookings-run-themselves.ts (chaosToSystem → flowRun)' },
  demonstration: { basis: 'observed', value: { kind: 'illustrative-ui-flow', description: 'A fictional booking workflow runs its steps (payment, confirmation, reminder).' }, source: 'content/videos/v008-bookings-run-themselves.ts' },
  ending: lockup(true, `${SHEETS} (v008: ~4.2 s end card with the Ad tag)`),
  intent: { basis: 'reconstructed', value: 'The first affiliate video: a knowledge video first, "same arc and motion as v003".', source: 'content/videos/v008-bookings-run-themselves.ts header comment; docs/DECISIONS.md D43' },
  ...NOT_RECORDED,
};
