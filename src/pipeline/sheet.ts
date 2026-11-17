/**
 * Contact sheets for review: tiles of frames with frame/time labels, composed in
 * Node (the bundled ffmpeg has no tile/drawtext filters).
 */
import { decodeFrame, decodeImage, encodePng } from './ffmpeg.ts';

// 5x7 bitmap glyphs for labels ("f120  4.00s", "a-b", "x:y").
const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  f: ['00110', '01001', '01000', '11100', '01000', '01000', '01000'],
  s: ['00000', '00000', '01111', '10000', '01110', '00001', '11110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function drawText(buf: Buffer, bufW: number, x0: number, y0: number, text: string, scale: number): void {
  const w = (text.length * 6 + 1) * scale;
  const h = 9 * scale;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * bufW + (x0 + x)) * 3;
      buf[i] = Math.round(buf[i]! * 0.35);
      buf[i + 1] = Math.round(buf[i + 1]! * 0.35);
      buf[i + 2] = Math.round(buf[i + 2]! * 0.35);
    }
  }
  [...text].forEach((ch, n) => {
    const g = GLYPHS[ch] ?? GLYPHS[' ']!;
    g.forEach((row, gy) => {
      [...row].forEach((bit, gx) => {
        if (bit !== '1') return;
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = x0 + (1 + n * 6 + gx) * scale + sx;
            const py = y0 + (1 + gy) * scale + sy;
            const i = (py * bufW + px) * 3;
            buf[i] = 255;
            buf[i + 1] = 255;
            buf[i + 2] = 255;
          }
        }
      });
    });
  });
}

export type Tile = { rgb: Buffer; label: string };

export async function composeSheet(tiles: Tile[], tileW: number, tileH: number, columns: number, outFile: string): Promise<void> {
  const pad = 8;
  const rows = Math.ceil(tiles.length / columns);
  const W = columns * tileW + (columns + 1) * pad;
  const H = rows * tileH + (rows + 1) * pad;
  const sheet = Buffer.alloc(W * H * 3, 0x22);
  tiles.forEach((tile, n) => {
    const ox = pad + (n % columns) * (tileW + pad);
    const oy = pad + Math.floor(n / columns) * (tileH + pad);
    for (let y = 0; y < tileH; y++) {
      tile.rgb.copy(sheet, ((oy + y) * W + ox) * 3, y * tileW * 3, (y + 1) * tileW * 3);
    }
    drawText(sheet, W, ox + 6, oy + 6, tile.label, 3);
  });
  encodePng(sheet, W, H, outFile);
}

export function frameLabel(frame: number, fps: number): string {
  return `f${frame} ${(frame / fps).toFixed(2)}s`;
}

/** Sheet from frames of an encoded video (checks what viewers will actually see). */
export async function sheetFromVideo(video: string, frames: number[], fps: number, outFile: string, tileW = 360, columns = 6): Promise<void> {
  const tileH = Math.round((tileW * 16) / 9);
  const tiles: Tile[] = [];
  for (const fr of frames) tiles.push({ rgb: await decodeFrame(video, fr, tileW, tileH), label: frameLabel(fr, fps) });
  await composeSheet(tiles, tileW, tileH, columns, outFile);
}

/** Sheet from still PNGs. */
export async function sheetFromImages(files: Array<{ file: string; label: string }>, outFile: string, tileW = 360, columns = 6): Promise<void> {
  const tileH = Math.round((tileW * 16) / 9);
  const tiles: Tile[] = [];
  for (const f of files) tiles.push({ rgb: await decodeImage(f.file, tileW, tileH), label: f.label });
  await composeSheet(tiles, tileW, tileH, columns, outFile);
}
