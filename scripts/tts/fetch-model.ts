// Fetch the Kokoro model files listed in scripts/tts/model.json at the pinned revision into
// .cache/kokoro/<revision>/ (gitignored). Every file is sha256-verified; existing verified
// files are not re-downloaded. Run by scripts/tts/setup.sh.
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { ROOT } from '../../src/pipeline/paths.ts';

type ModelFile = { path: string; size: number; sha256: string };
type Manifest = { repo: string; revision: string; files: ModelFile[] };

const manifest = JSON.parse(readFileSync(path.join(ROOT, 'scripts/tts/model.json'), 'utf8')) as Manifest;
export const modelDir = path.join(ROOT, '.cache', 'kokoro', manifest.revision);

function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256');
    createReadStream(file).on('data', (c) => h.update(c)).on('error', reject).on('end', () => resolve(h.digest('hex')));
  });
}

let failed = false;
for (const f of manifest.files) {
  const dest = path.join(modelDir, f.path);
  if (existsSync(dest) && (await sha256File(dest)) === f.sha256) {
    console.log(`  ✓ ${f.path} (cached)`);
    continue;
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  const url = `https://huggingface.co/${manifest.repo}/resolve/${manifest.revision}/${f.path}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`  ✗ ${f.path}: HTTP ${res.status}`);
    failed = true;
    continue;
  }
  // Stream to disk while hashing (the weights are 327 MB — never hold them in memory).
  const h = createHash('sha256');
  let size = 0;
  const tap = new Transform({ transform(chunk: Buffer, _e, cb) { h.update(chunk); size += chunk.length; cb(null, chunk); } });
  await pipeline(Readable.fromWeb(res.body as never), tap, createWriteStream(dest + '.part'));
  const got = h.digest('hex');
  if (size !== f.size || got !== f.sha256) {
    rmSync(dest + '.part', { force: true });
    console.error(`  ✗ ${f.path}: size ${size}/${f.size}, sha256 ${got} ≠ ${f.sha256}`);
    failed = true;
    continue;
  }
  rmSync(dest, { force: true });
  renameSync(dest + '.part', dest);
  console.log(`  ✓ ${f.path} (${(size / 1e6).toFixed(1)} MB)`);
}
if (failed) process.exit(1);
