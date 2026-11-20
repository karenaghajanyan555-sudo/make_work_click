/**
 * LOOK TEST ONLY: renders the v010 paper look test through its own entry point
 * (lab/paper-look/index.ts) into out/v010-the-23-minute-number/look/. Touches no production
 * composition, cache key, segment or mix.
 *   node lab/paper-look/render.ts [--stills-only]
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { RENDER } from '../../src/pipeline/settings.ts';
import { ROOT } from '../../src/pipeline/paths.ts';

const out = path.join(ROOT, 'out/v010-the-23-minute-number/look');
mkdirSync(out, { recursive: true });
const stillsOnly = process.argv.includes('--stills-only');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

const t0 = performance.now();
const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'lab/paper-look/index.ts'), rootDir: ROOT, publicDir: path.join(ROOT, 'public'), enableCaching: true });
const browser = await openBrowser('chrome', { chromiumOptions: { gl: RENDER.gl } });
console.log(`bundled in ${((performance.now() - t0) / 1000).toFixed(1)} s`);

const stills: Array<[string, number, string]> = [
  ['look-opening', 0, '01-first-frame-0.0s'],
  ['look-opening', 36, '02-opening-1.2s'],
  ['look-opening', 100, '03-opening-3.33s'],
  ['look-three', 0, '04-reconstruction-3of5'],
  ['look-turn', 0, '05a-turn-4of5'],
  ['look-page', 0, '05-reconstruction-5of5'],
  ['look-tear', 0, '06-tear-0.0s'],
  ['look-tear', 20, '07-tear-0.67s'],
  ['look-tear', 48, '08-tear-1.6s'],
  ['look-tear', 110, '09-tear-hold-3.67s'],
];
try {
  for (const [id, frame, name] of stills) {
    if (only && !name.includes(only)) continue;
    const s = performance.now();
    const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser });
    await renderStill({ serveUrl, composition, frame, output: path.join(out, `${name}.png`), imageFormat: 'png', puppeteerInstance: browser, chromiumOptions: { gl: RENDER.gl } });
    console.log(`still ${name} ${((performance.now() - s) / 1000).toFixed(1)} s`);
  }
  if (!stillsOnly) {
    for (const id of ['look-opening', 'look-tear']) {
      if (only && !id.includes(only)) continue;
      const s = performance.now();
      const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser });
      await renderMedia({ serveUrl, composition, codec: 'h264', crf: 16, pixelFormat: 'yuv420p', imageFormat: 'jpeg', jpegQuality: 92, concurrency: RENDER.concurrency, puppeteerInstance: browser, chromiumOptions: { gl: RENDER.gl }, outputLocation: path.join(out, `${id}.mp4`), overwrite: true, muted: true });
      console.log(`clip ${id} ${((performance.now() - s) / 1000).toFixed(1)} s`);
    }
  }
} finally {
  await browser.close({ silent: true });
}
