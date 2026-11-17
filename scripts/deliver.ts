/**
 * Make the upload file from the picture master and the final mix.
 *
 *   npm run deliver -- <videoId>      → out/<id>/<id>.mp4
 * Needs out/<id>/<id>.master.mp4 (npm run render) and the mix (npm run mix).
 * `npm run build -- <id>` runs render → mix → deliver.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { getVideo } from '../content/index.ts';
import { fileHash, recordStep, sha256, upToDate } from '../src/pipeline/cache.ts';
import { deliver, DELIVERY } from '../src/pipeline/deliver.ts';
import { deliveryPath, masterPath, mixPath, videoOut } from '../src/pipeline/paths.ts';

const id = process.argv[2];
if (!id || id.startsWith('--')) {
  console.error('Usage: npm run deliver -- <videoId>');
  process.exit(2);
}
const spec = getVideo(id);
const hasAudio = Boolean(spec.narration || spec.score || spec.audio?.compose);
for (const [what, file, how] of [['picture master', masterPath(id), 'npm run render'], ...(hasAudio ? [['mix', mixPath(id), 'npm run mix'] as const] : [])] as const) {
  if (!existsSync(file)) {
    console.error(`Missing ${what}: ${file} — run: ${how} -- ${id}`);
    process.exit(1);
  }
}
const crf = spec.export?.crf ?? DELIVERY.crf;
const key = sha256(JSON.stringify({ master: fileHash(masterPath(id)), mix: hasAudio ? fileHash(mixPath(id)) : null, DELIVERY, crf, code: sha256(readFileSync(new URL('../src/pipeline/deliver.ts', import.meta.url))) }));
if (!process.argv.includes('--force') && upToDate(id, 'deliver', key, deliveryPath(id))) {
  recordStep(id, 'deliver', { key, seconds: 0, cached: true });
  console.log(`✓ ${deliveryPath(id)}  unchanged (cached)`);
} else {
  const { seconds } = await deliver(masterPath(id), hasAudio ? mixPath(id) : null, deliveryPath(id), path.join(videoOut(id), 'deliver'), { crf });
  const mb = statSync(deliveryPath(id)).size / 1e6;
  recordStep(id, 'deliver', { key, seconds, cached: false, detail: `${mb.toFixed(1)} MB, CRF ${crf}` });
  console.log(`✓ ${deliveryPath(id)}  ${mb.toFixed(1)} MB  (CRF ${crf}, AAC ${DELIVERY.audioBitrateK}k)  ${seconds.toFixed(1)} s`);
}
