import { applyAffiliate } from '../../src/video/affiliate.ts';
import type { VideoSpec } from '../../src/video/spec.ts';

/**
 * The affiliate end card, rendered (D42): the signature lockup with the "Ad" tag an affiliate
 * video carries. Not a video to publish: the catalogue entry design reviews and QA look at
 * (`npm run render -- library-affiliate --stills …`). A real affiliate video sets the same
 * `affiliate` field and is otherwise an ordinary knowledge video.
 */
export const libraryAffiliate: VideoSpec = applyAffiliate({
  id: 'library-affiliate',
  title: 'Affiliate end card',
  series: 'Library',
  format: 'vertical',
  theme: 'ink',
  preset: 'editorial',
  status: 'prototype',
  captions: { enabled: false },
  affiliate: { partner: 'systeme-io' },
  scenes: [
    {
      id: 'outro',
      type: 'endCard',
      duration: 3,
      chapters: [{ cue: 'start', label: 'BrandOutroScene · affiliate' }],
      props: { cta: 'The tool I’d use for this:\n*systeme.io* · link in bio', burst: true, smooth: true },
    },
  ],
});
