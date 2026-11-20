import type { CreativeRecord } from '../../src/creative/diversity.ts';
import { headlineOverChaos, lockup, NOT_RECORDED, SHEETS, transformation } from './_legacy.ts';

export const record: CreativeRecord = {
  id: 'v004-client-onboarding-runs',
  seq: 4,
  title: 'Client onboarding that runs itself',
  status: 'legacy',
  subject: { basis: 'observed', value: 'Automated client onboarding triggered by a signed contract', source: 'content/productions/v004-client-onboarding-runs.ts brief.topic' },
  opening: headlineOverChaos(`${SHEETS} (v004: 0–3.5 s)`),
  hook: { basis: 'observed', value: { kind: 'pain', description: 'A familiar repeated chore', text: 'Every new client asks the same questions.' }, source: 'content/productions/v004-client-onboarding-runs.ts', note: 'category assigned in the 2026-11-18 audit' },
  structure: transformation(`${SHEETS} (v004)`),
  visual: { basis: 'observed', value: { kind: 'todos-resolved-by-cards', description: 'Unanswered client questions stack; timeline, notification and comparison cards answer them; checked off.' }, source: 'content/productions/v004-client-onboarding-runs.ts scenes' },
  demonstration: { basis: 'observed', value: { kind: 'illustrative-ui-cards', description: 'Fictional timeline, notification and comparison cards.' }, source: 'content/productions/v004-client-onboarding-runs.ts scenes' },
  ending: lockup(false, `${SHEETS} (v004: ~3.8 s end card)`),
  intent: { basis: 'reconstructed', value: 'Produced by the orchestrator from the onboarding story kit with the editorial arc (the v002 sequence).', source: 'docs/STATUS.md milestone 3; src/orchestrator/storyboard.ts (editorial arc)' },
  ...NOT_RECORDED,
};
