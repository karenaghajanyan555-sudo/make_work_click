import type { StoryKit } from '../../src/orchestrator/kit.ts';
import { invoicesKit } from './invoices.ts';
import { onboardingKit } from './onboarding.ts';

/** Story kits by category id. An idea's category must name one to be produced automatically. */
export const KITS: Readonly<Record<string, StoryKit>> = { invoices: invoicesKit, onboarding: onboardingKit };

export function getKit(category: string): StoryKit {
  const k = KITS[category];
  if (!k) throw new Error(`no story kit for category "${category}" (available: ${Object.keys(KITS).join(', ')}). Add one in content/kits/.`);
  return k;
}
