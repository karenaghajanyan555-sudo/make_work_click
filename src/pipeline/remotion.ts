/**
 * Remotion Node API wrapper: bundle once, open one browser, render many outputs.
 * Used by scripts/render.ts, scripts/qa.ts and scripts/doctor.ts.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, renderStill, selectComposition, type HeadlessBrowser } from '@remotion/renderer';
import { RENDER } from './settings.ts';
import { ROOT } from './paths.ts';

export type Session = {
  serveUrl: string;
  browser: HeadlessBrowser;
  close: () => Promise<void>;
};

export async function openSession(log = true): Promise<Session> {
  let last = -1;
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, 'src/remotion/index.ts'),
    rootDir: ROOT,
    publicDir: path.join(ROOT, 'public'),
    enableCaching: true,
    onProgress: (p) => {
      if (log && p >= last + 25) {
        last = p - (p % 25);
        process.stdout.write(`bundling ${last}%\n`);
      }
    },
  });
  const browser = await openBrowser('chrome', { chromiumOptions: { gl: RENDER.gl } });
  return { serveUrl, browser, close: () => browser.close({ silent: true }) };
}

export async function renderVideo(
  s: Session,
  id: string,
  outputLocation: string,
  inputProps: Record<string, unknown> = {},
  onProgress?: (p: number) => void,
  frameRange?: [number, number],
): Promise<void> {
  mkdirSync(path.dirname(outputLocation), { recursive: true });
  // Picture only: the final mix is muxed afterwards (src/pipeline/deliver.ts) at our levels.
  inputProps = { ...inputProps, audio: null };
  const composition = await selectComposition({ serveUrl: s.serveUrl, id, inputProps, puppeteerInstance: s.browser });
  await renderMedia({
    serveUrl: s.serveUrl,
    composition,
    inputProps,
    muted: true,
    codec: RENDER.codec,
    crf: RENDER.crf,
    pixelFormat: RENDER.pixelFormat,
    imageFormat: RENDER.imageFormat,
    jpegQuality: RENDER.jpegQuality,
    concurrency: RENDER.concurrency,
    chromiumOptions: { gl: RENDER.gl },
    puppeteerInstance: s.browser,
    outputLocation,
    overwrite: true,
    ...(frameRange ? { frameRange } : {}),
    onProgress: ({ progress }) => onProgress?.(progress),
  });
}

/** Renders PNG stills for the given frames. Returns written paths. */
export async function renderStills(
  s: Session,
  id: string,
  frames: number[],
  outDir: string,
  inputProps: Record<string, unknown> = {},
  prefix = 'frame',
): Promise<string[]> {
  mkdirSync(outDir, { recursive: true });
  inputProps = { ...inputProps, audio: null };
  const composition = await selectComposition({ serveUrl: s.serveUrl, id, inputProps, puppeteerInstance: s.browser });
  const written: string[] = [];
  for (const frame of frames) {
    const output = path.join(outDir, `${prefix}-${String(frame).padStart(4, '0')}.png`);
    await renderStill({
      serveUrl: s.serveUrl,
      composition,
      inputProps,
      frame,
      output,
      imageFormat: 'png',
      overwrite: true,
      puppeteerInstance: s.browser,
      chromiumOptions: { gl: RENDER.gl },
    });
    written.push(output);
  }
  return written;
}

export async function compositionInfo(s: Session, id: string) {
  const c = await selectComposition({ serveUrl: s.serveUrl, id, inputProps: { audio: null }, puppeteerInstance: s.browser });
  return { width: c.width, height: c.height, fps: c.fps, durationInFrames: c.durationInFrames };
}
