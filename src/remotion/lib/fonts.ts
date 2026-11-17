import { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';

// Brand fonts are vendored in public/fonts (SIL OFL 1.1) so renders are offline and
// identical on every machine. Rendering waits until every face has loaded.
const FACES = [
  { family: 'Geist', file: 'fonts/Geist-Variable.ttf', weight: '100 900', style: 'normal' },
  { family: 'Geist Mono', file: 'fonts/GeistMono-Variable.ttf', weight: '100 900', style: 'normal' },
  { family: 'Instrument Serif', file: 'fonts/InstrumentSerif-Regular.ttf', weight: '400', style: 'normal' },
  { family: 'Instrument Serif', file: 'fonts/InstrumentSerif-Italic.ttf', weight: '400', style: 'italic' },
] as const;

let ready = false;
let loading: Promise<void> | null = null;

export function loadBrandFonts(): Promise<void> {
  if (loading) return loading;
  const handle = delayRender('Loading brand fonts');
  loading = Promise.all(
    FACES.map(async (f) => {
      const face = new FontFace(f.family, `url('${staticFile(f.file)}') format('truetype')`, {
        weight: f.weight,
        style: f.style,
      });
      await face.load();
      document.fonts.add(face);
    }),
  )
    .then(() => {
      ready = true;
      continueRender(handle);
    })
    .catch((err: unknown) => {
      cancelRender(err);
    });
  return loading;
}

/**
 * True once brand fonts are usable. Components that measure text must wait for
 * this, otherwise measurements come from fallback fonts and layouts drift.
 */
export function useFontsReady(): boolean {
  const [isReady, setReady] = useState(ready);
  const [handle] = useState(() => (ready ? null : delayRender('Waiting for fonts before measuring text')));
  useEffect(() => {
    if (isReady) return;
    void loadBrandFonts().then(() => {
      setReady(true);
      if (handle !== null) continueRender(handle);
    });
  }, [isReady, handle]);
  return isReady;
}

let canvas: HTMLCanvasElement | null = null;

/** Advance width of `text` in a CSS font shorthand, e.g. "500 31px Geist". */
export function measureText(text: string, font: string, letterSpacingPx = 0): number {
  canvas ??= document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * 16;
  ctx.font = font;
  return ctx.measureText(text).width + letterSpacingPx * text.length;
}
