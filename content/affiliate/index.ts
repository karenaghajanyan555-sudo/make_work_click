import type { PartnerId } from '../../src/brand/partners.ts';
import type { PartnerRecord } from '../../src/publishing/partner.ts';
import { systemeIoRecord } from './systeme-io.ts';

/** Publishing records per affiliate partner (docs/QA.md § Gate 3). One per entry in src/brand/partners.ts. */
export const PARTNER_RECORDS: Record<PartnerId, PartnerRecord> = {
  'systeme-io': systemeIoRecord,
};
