/**
 * Delivery encode: picture master (CRF 16, out/<id>/<id>.master.mp4) + final mix
 * (public/generated/<id>/mix.wav) → the one upload file for every platform.
 *
 * Settings follow YouTube's upload recommendations (the strictest; docs/PLATFORMS.md):
 * H.264 High, CABAC, closed GOP of half the frame rate, 2 consecutive B-frames, moov at
 * front, no edit lists, AAC-LC 48 kHz stereo. CRF chosen by measurement (DECISIONS D19).
 *
 * No edit lists means the AAC encoder delay cannot be hidden by the container, so the mix
 * is advanced by AAC_ENCODER_DELAY samples before encoding (measured: libfdk_aac LC at
 * 48 kHz decodes 2048 samples late). QA cross-correlates the result to prove sync.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { readWav, writeWav } from './audio.ts';
import { ff } from './ffmpeg.ts';

export const DELIVERY = {
  crf: 20,
  preset: 'slow',
  /** Closed GOP of half the frame rate, 2 B-frames (YouTube). */
  x264: 'keyint=15:min-keyint=15:open-gop=0:bframes=2:scenecut=0',
  audioBitrateK: 320,
  sampleRate: 48000,
  /** libfdk_aac AAC-LC priming at 48 kHz (measured 2026-11-16; QA re-measures every build). */
  aacEncoderDelay: 2048,
} as const;

export async function deliver(master: string, mixWav: string | null, out: string, work: string, opts: { crf?: number } = {}): Promise<{ seconds: number }> {
  const t0 = performance.now();
  mkdirSync(work, { recursive: true });
  mkdirSync(path.dirname(out), { recursive: true });
  let audio: string[] = [];
  let input: string[] = [];
  if (mixWav) {
    const mix = readWav(mixWav);
    if (mix.sampleRate !== DELIVERY.sampleRate || mix.channels !== 2) throw new Error('mix must be 48 kHz stereo');
    const d = DELIVERY.aacEncoderDelay * 2;
    const advanced = new Float32Array(mix.samples.length);
    advanced.set(mix.samples.subarray(d)); // trailing `d` values stay silent: same length
    const tmp = path.join(work, 'mix-advanced.wav');
    writeWav(tmp, { sampleRate: mix.sampleRate, channels: 2, samples: advanced });
    input = ['-i', tmp];
    audio = ['-map', '1:a:0', '-c:a', 'libfdk_aac', '-b:a', `${DELIVERY.audioBitrateK}k`, '-ar', String(DELIVERY.sampleRate), '-ac', '2'];
  }
  const r = await ff('ffmpeg', [
    '-hide_banner', '-y', '-v', 'error',
    '-i', master, ...input,
    '-map', '0:v:0',
    '-c:v', 'libx264', '-preset', DELIVERY.preset, '-profile:v', 'high', '-crf', String(opts.crf ?? DELIVERY.crf), '-pix_fmt', 'yuv420p',
    '-x264-params', DELIVERY.x264,
    ...audio,
    // No edit lists (YouTube). Negative composition offsets keep the first video frame at
    // t = 0 despite B-frame reordering (otherwise video starts 2 frames late: measured).
    '-movflags', '+faststart+negative_cts_offsets', '-use_editlist', '0',
    '-f', 'mp4', out,
  ]);
  if (r.code !== 0) throw new Error(`deliver: ${r.stderr.slice(-600)}`);
  return { seconds: (performance.now() - t0) / 1000 };
}
