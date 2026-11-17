import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root, independent of the current working directory. */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const OUT = path.join(ROOT, 'out');

/** Output folder for one video: out/<videoId>/. */
export function videoOut(id: string): string {
  return path.join(OUT, id);
}

/** Picture master (CRF 16, no audio): out/<id>/<id>.master.mp4. */
export function masterPath(id: string): string {
  return path.join(OUT, id, `${id}.master.mp4`);
}

/** The upload file (tuned H.264 + AAC): out/<id>/<id>.mp4. */
export function deliveryPath(id: string): string {
  return path.join(OUT, id, `${id}.mp4`);
}

/** Final mix (rebuilt by npm run mix; gitignored): public/generated/<id>/mix.wav. */
export function mixPath(id: string): string {
  return path.join(ROOT, 'public', 'generated', id, 'mix.wav');
}
