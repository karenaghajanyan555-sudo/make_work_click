import type { CreativeRecord } from '../../src/creative/diversity.ts';
import { headlineOverChaos, lockup, NOT_RECORDED, transformation } from './_legacy.ts';

export const record: CreativeRecord = {
  id: 'v003-invoices-chase-themselves',
  seq: 3,
  title: 'Invoices that chase themselves',
  status: 'legacy',
  subject: { basis: 'observed', value: 'Automatic invoicing and payment reminders for finished jobs', source: 'content/productions/v003-invoices-chase-themselves.ts brief.topic' },
  opening: headlineOverChaos('content/productions/v003-invoices-chase-themselves.ts (chaosToSystem: headline + fragments)'),
  hook: { basis: 'observed', value: { kind: 'pain', description: 'A general truth about chasing payments', text: 'Getting paid shouldn’t depend on chasing.' }, source: 'content/productions/v003-invoices-chase-themselves.ts', note: 'category assigned in the 2026-11-18 audit' },
  structure: transformation('content/productions/v003-invoices-chase-themselves.ts (signature arc)'),
  visual: { basis: 'observed', value: { kind: 'todos-become-workflow', description: 'To-dos flip into flow steps, the switch clicks, the run resolves them.' }, source: 'content/productions/v003-invoices-chase-themselves.ts (chaosToSystem → flowRun)' },
  demonstration: { basis: 'observed', value: { kind: 'illustrative-ui-flow', description: 'A fictional invoicing workflow runs its steps.' }, source: 'content/productions/v003-invoices-chase-themselves.ts' },
  ending: lockup(false, 'content/productions/v003-invoices-chase-themselves.ts (endCard)'),
  intent: { basis: 'reconstructed', value: 'Produced by the orchestrator from the invoices story kit with the signature arc (the v001 look).', source: 'docs/STATUS.md milestone 3; src/orchestrator/storyboard.ts (signature arc)' },
  ...NOT_RECORDED,
};
