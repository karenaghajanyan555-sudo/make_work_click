import type { VideoSpec } from '../src/video/spec.ts';
import { library } from './videos/library.ts';
import { libraryAffiliate } from './videos/library-affiliate.ts';
import { v001Memory } from './videos/v001-memory.ts';
import { v001MemoryV2 } from './videos/v001-memory-v2.ts';
import { v002Meetings } from './videos/v002-meetings.ts';
import { v008BookingsRunThemselves } from './videos/v008-bookings-run-themselves.ts';
import { v009SaleDoesTheRest } from './videos/v009-sale-does-the-rest.ts';
import { PRODUCTIONS } from './productions/index.ts';

/** Every video the studio knows about. Register new content files here; PRODUCTIONS are the orchestrator's (generated). */
export const VIDEOS: readonly VideoSpec[] = [v001Memory, v001MemoryV2, v002Meetings, library, libraryAffiliate, ...PRODUCTIONS, v008BookingsRunThemselves, v009SaleDoesTheRest];

export function getVideo(id: string): VideoSpec {
  const spec = VIDEOS.find((v) => v.id === id);
  if (!spec) throw new Error(`Unknown video "${id}". Known: ${VIDEOS.map((v) => v.id).join(', ')}`);
  return spec;
}
