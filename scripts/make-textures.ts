/**
 * Generates the brand's procedural textures into public/textures/ (deterministic:
 * same bytes on every run and machine). Re-run only when changing a texture.
 *
 *   node scripts/make-textures.ts
 *
 * grain-256.png — film grain tile: seeded Gaussian luma noise, mean 128.
 * Pre-baked because an SVG feTurbulence filter re-rasterised every frame cost
 * ~300 ms/frame (~40% of render time) in headless Chrome.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { encodePng } from '../src/pipeline/ffmpeg.ts';
import { ROOT } from '../src/pipeline/paths.ts';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZE = 256;
const STD = 46;
const rand = mulberry32(0x6d77c); // "mwc"
const rgb = Buffer.alloc(SIZE * SIZE * 3);
for (let i = 0; i < SIZE * SIZE; i++) {
  // Box–Muller Gaussian
  const g = Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  const v = Math.max(0, Math.min(255, Math.round(128 + g * STD)));
  rgb[i * 3] = v;
  rgb[i * 3 + 1] = v;
  rgb[i * 3 + 2] = v;
}
const dir = path.join(ROOT, 'public/textures');
mkdirSync(dir, { recursive: true });
encodePng(rgb, SIZE, SIZE, path.join(dir, 'grain-256.png'));
console.log('wrote public/textures/grain-256.png');
