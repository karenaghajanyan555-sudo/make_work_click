/**
 * Build cache: content hashes of what each step reads, and a per-video manifest
 * (out/<id>/build.json) so `npm run make` redoes only what changed:
 *   voice    script + narrator + model + engine        (.cache/narration/<key>/)
 *   render   per scene segment: render code + that segment's spec slice (out/<id>/segments/)
 *   mix      spec + narration audio + sound code + samples
 *   deliver  master + mix + delivery settings
 * Hashes are of file *contents*, so a fresh clone or a touched file hits the cache.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, videoOut } from './paths.ts';

export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function fileHash(file: string): string {
  return sha256(readFileSync(file));
}

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir).sort()) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
}

/** One hash over the contents of files and folders (paths relative to the repo). */
export function treeHash(paths: readonly string[]): string {
  const files: string[] = [];
  for (const rel of paths) {
    const p = path.join(ROOT, rel);
    if (!existsSync(p)) continue;
    if (statSync(p).isDirectory()) walk(p, files);
    else files.push(p);
  }
  const h = createHash('sha256');
  for (const f of files) h.update(path.relative(ROOT, f)).update('\0').update(readFileSync(f)).update('\0');
  return h.digest('hex');
}

/** Everything the picture depends on besides the spec itself. */
export const RENDER_INPUTS = ['src/remotion', 'src/brand', 'src/video', 'src/captions', 'public/fonts', 'public/textures', 'src/pipeline/settings.ts', 'src/pipeline/remotion.ts', 'package-lock.json'];
/** Everything the mix depends on besides the spec and the narration audio. */
export const MIX_INPUTS = ['src/sound', 'src/pipeline/sound', 'src/pipeline/audio.ts', 'src/pipeline/dsp.ts', 'src/video', 'assets/sound/manifest.json', 'package-lock.json'];

export type StepRecord = { key: string; seconds: number; cached: boolean; at: string; detail?: string };
export type BuildManifest = { video: string; steps: Record<string, StepRecord> };

export function readManifest(id: string): BuildManifest {
  const f = path.join(videoOut(id), 'build.json');
  return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as BuildManifest) : { video: id, steps: {} };
}

export function recordStep(id: string, step: string, rec: Omit<StepRecord, 'at'>): void {
  const m = readManifest(id);
  m.steps[step] = { ...rec, at: new Date().toISOString() };
  writeFileSync(path.join(videoOut(id), 'build.json'), JSON.stringify(m, null, 2) + '\n');
}

/** True if the step's last record has this key and its output still exists. */
export function upToDate(id: string, step: string, key: string, output: string): boolean {
  return readManifest(id).steps[step]?.key === key && existsSync(output);
}
