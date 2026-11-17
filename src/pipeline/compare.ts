/**
 * Objective picture comparison in Node (the bundled ffmpeg has no ssim/psnr filters).
 * SSIM on BT.709 luma, 8×8 windows with stride 4 (Wang et al. 2004 constants).
 */
import { decodeFrame } from './ffmpeg.ts';

function luma(rgb: Buffer): Float32Array {
  const n = rgb.length / 3;
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = 0.2126 * rgb[i * 3]! + 0.7152 * rgb[i * 3 + 1]! + 0.0722 * rgb[i * 3 + 2]!;
  return y;
}

export function ssim(a: Float32Array, b: Float32Array, width: number, height: number): number {
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  const W = 8, S = 4;
  let sum = 0, count = 0;
  for (let y = 0; y + W <= height; y += S) {
    for (let x = 0; x + W <= width; x += S) {
      let ma = 0, mb = 0;
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const k = (y + j) * width + x + i; ma += a[k]!; mb += b[k]!; }
      ma /= W * W; mb /= W * W;
      let va = 0, vb = 0, cov = 0;
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
        const k = (y + j) * width + x + i;
        const da = a[k]! - ma, db = b[k]! - mb;
        va += da * da; vb += db * db; cov += da * db;
      }
      va /= W * W - 1; vb /= W * W - 1; cov /= W * W - 1;
      sum += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      count++;
    }
  }
  return sum / count;
}

export function psnr(a: Float32Array, b: Float32Array): number {
  let e = 0;
  for (let i = 0; i < a.length; i++) e += (a[i]! - b[i]!) ** 2;
  return 10 * Math.log10((255 * 255) / (e / a.length || 1e-12));
}

/** Per-frame SSIM/PSNR (luma) of `test` against `reference` at the given frames. */
export async function compareVideos(reference: string, test: string, frames: number[], width: number, height: number) {
  const out: Array<{ frame: number; ssim: number; psnr: number }> = [];
  for (const f of frames) {
    const a = luma(await decodeFrame(reference, f, width, height));
    const b = luma(await decodeFrame(test, f, width, height));
    out.push({ frame: f, ssim: ssim(a, b, width, height), psnr: psnr(a, b) });
  }
  return out;
}
