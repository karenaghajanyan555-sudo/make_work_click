/**
 * Creative records (D46): one per video, data only. Read by `npm run diversity` and the render
 * gate (src/creative/gate.ts). Not imported by the composition, outside every cache key: a
 * record change never re-renders anything. New records: `npm run new-video` scaffolds one.
 */
import type { CreativeRecord } from '../../src/creative/diversity.ts';
import { record as v001MemoryV2 } from './v001-memory-v2.ts';
import { record as v002Meetings } from './v002-meetings.ts';
import { record as v003InvoicesChaseThemselves } from './v003-invoices-chase-themselves.ts';
import { record as v004ClientOnboardingRuns } from './v004-client-onboarding-runs.ts';
import { record as v008BookingsRunThemselves } from './v008-bookings-run-themselves.ts';
import { record as v009SaleDoesTheRest } from './v009-sale-does-the-rest.ts';
import { record as v010The23MinuteNumber } from './v010-the-23-minute-number.ts';

export const RECORDS: readonly CreativeRecord[] = [v001MemoryV2, v002Meetings, v003InvoicesChaseThemselves, v004ClientOnboardingRuns, v008BookingsRunThemselves, v009SaleDoesTheRest, v010The23MinuteNumber];

export function getRecord(id: string): CreativeRecord | undefined {
  return RECORDS.find((r) => r.id === id);
}
