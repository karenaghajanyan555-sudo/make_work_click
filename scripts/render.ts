/**
 * Render a video and/or stills.
 *
 *   npm run render -- <videoId>                    picture master → out/<id>/<id>.master.mp4
 *                                                  from per-scene segments: only scenes whose
 *                                                  inputs changed render again (src/pipeline/segments.ts)
 *                                                  (the upload file is made by npm run deliver / make)
 *   npm run render -- <videoId> --stills 0,60,120  stills only → out/<id>/stills/
 *   npm run render -- <videoId> --stills 0,60 --debug   stills with safe-zone overlay
 */
import path from 'node:path';
import { getVideo } from '../content/index.ts';
import { FORMATS } from '../src/brand/format.ts';
import { recordStep, fileHash } from '../src/pipeline/cache.ts';
import { openSession, renderStills } from '../src/pipeline/remotion.ts';
import { masterPath, videoOut } from '../src/pipeline/paths.ts';
import { renderMaster } from '../src/pipeline/segments.ts';
import { computeTimeline } from '../src/video/timeline.ts';

const args = process.argv.slice(2);
const id = args[0];
if (!id || id.startsWith('--')) {
  console.error('Usage: npm run render -- <videoId> [--stills 0,60,120] [--debug]');
  process.exit(2);
}
const stillsArg = args.indexOf('--stills');
const debug = args.includes('--debug');
const inputProps = { videoId: id, debug };

const started = performance.now();
const session = await openSession();
try {
  if (stillsArg !== -1) {
    const frames = (args[stillsArg + 1] ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n >= 0);
    const dir = path.join(videoOut(id), debug ? 'stills-debug' : 'stills');
    const files = await renderStills(session, id, frames, dir, inputProps);
    for (const f of files) console.log(f);
  } else {
    const spec = getVideo(id);
    const timeline = computeTimeline(spec, FORMATS[spec.format].fps);
    const out = masterPath(id);
    const r = await renderMaster(session, spec, timeline, out);
    const rendered = r.segments.filter((x) => !x.cached);
    recordStep(id, 'render', {
      key: fileHash(out),
      seconds: (performance.now() - started) / 1000,
      cached: rendered.length === 0,
      detail: `${rendered.length}/${r.segments.length} segments rendered (${rendered.map((x) => x.scene).join(', ') || 'none'}), concat ${r.concatSeconds.toFixed(1)}s`,
    });
    console.log(out);
  }
} finally {
  await session.close();
}
console.log(`done in ${((performance.now() - started) / 1000).toFixed(1)}s`);
