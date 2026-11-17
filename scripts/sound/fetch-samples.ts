/**
 * Rebuild the vendored instrument samples in assets/sound/vcsl/ from assets/sound/manifest.json.
 * Only needed to regenerate them — the converted files are committed.
 *
 *   node scripts/sound/fetch-samples.ts
 *
 * Each source WAV is downloaded from the pinned VCSL commit, verified against its git blob
 * hash, converted to 48 kHz PCM16 by the bundled ffmpeg, then trimmed in Node: leading
 * silence removed (2 ms pre-roll kept), cut to `seconds`, 0.6 s fade-out.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readWav, writeWav } from '../../src/pipeline/audio.ts';
import { ff } from '../../src/pipeline/ffmpeg.ts';
import { ROOT } from '../../src/pipeline/paths.ts';

type Sample = { id: string; path: string; gitBlob: string; size: number; seconds: number };
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'assets/sound/manifest.json'), 'utf8')) as {
  source: { repo: string; commit: string };
  samples: Sample[];
};
const cache = path.join(ROOT, '.cache', 'vcsl');
const outDir = path.join(ROOT, 'assets', 'sound', 'vcsl');
mkdirSync(cache, { recursive: true });
mkdirSync(outDir, { recursive: true });

const gitBlobSha = (b: Buffer) => createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');

for (const s of manifest.samples) {
  const src = path.join(cache, `${s.id}.src.wav`);
  if (!existsSync(src) || gitBlobSha(readFileSync(src)) !== s.gitBlob) {
    const url = `https://raw.githubusercontent.com/${manifest.source.repo}/${manifest.source.commit}/${s.path.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${s.id}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (gitBlobSha(buf) !== s.gitBlob) throw new Error(`${s.id}: git blob hash mismatch`);
    writeFileSync(src, buf);
  }
  const tmp = path.join(cache, `${s.id}.48k.wav`);
  const r = await ff('ffmpeg', ['-hide_banner', '-y', '-v', 'error', '-i', src, '-af', 'aresample=48000:filter_size=64:cutoff=0.97', '-c:a', 'pcm_s16le', tmp]);
  if (r.code !== 0) throw new Error(`${s.id}: ffmpeg ${r.stderr.slice(-300)}`);
  const pcm = readWav(tmp);
  const ch = pcm.channels;
  const frames = pcm.samples.length / ch;
  // Onset: first frame above −50 dBFS (any channel), keep 2 ms pre-roll.
  const thr = 10 ** (-50 / 20);
  let onset = 0;
  while (onset < frames && Math.max(...Array.from({ length: ch }, (_, c) => Math.abs(pcm.samples[onset * ch + c]!))) < thr) onset++;
  const start = Math.max(0, onset - Math.round(0.002 * 48000));
  const len = Math.min(frames - start, Math.round(s.seconds * 48000));
  const fade = Math.min(len, Math.round(0.6 * 48000));
  const out = new Float32Array(len * ch);
  for (let i = 0; i < len; i++) {
    const g = i >= len - fade ? 0.5 * (1 + Math.cos((Math.PI * (i - (len - fade))) / fade)) : 1;
    for (let c = 0; c < ch; c++) out[i * ch + c] = pcm.samples[(start + i) * ch + c]! * g;
  }
  writeWav(path.join(outDir, `${s.id}.wav`), { sampleRate: 48000, channels: ch, samples: out });
  console.log(`  ✓ ${s.id}  ${ch}ch  onset ${(onset / 48000 * 1000).toFixed(0)} ms  ${(len / 48000).toFixed(2)} s`);
}
