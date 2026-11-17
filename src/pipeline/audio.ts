/**
 * Audio building blocks on raw PCM, in Node (the bundled ffmpeg has no afade/sidechain/
 * limiter — see ffmpeg.ts). ffmpeg is used only for loudness measurement, resampling and
 * AAC encoding. Internal format: Float32Array, mono or interleaved stereo.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { applyGain, compress, highpass, limit, monoToStereo } from './dsp.ts';
import { ff } from './ffmpeg.ts';

export type Pcm = { sampleRate: number; channels: number; samples: Float32Array };

/** Read a PCM16 WAV (what the narration engine writes). */
export function readWav(file: string): Pcm {
  const b = readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file}: not a WAV`);
  let off = 12;
  let fmt: { channels: number; sampleRate: number; bits: number; format: number } | null = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    const body = off + 8;
    if (id === 'fmt ') {
      fmt = { format: b.readUInt16LE(body), channels: b.readUInt16LE(body + 2), sampleRate: b.readUInt32LE(body + 4), bits: b.readUInt16LE(body + 14) };
    } else if (id === 'data') {
      if (!fmt || fmt.format !== 1 || fmt.bits !== 16) throw new Error(`${file}: only PCM16 WAV is supported`);
      const n = Math.floor(size / 2);
      const samples = new Float32Array(n);
      for (let i = 0; i < n; i++) samples[i] = b.readInt16LE(body + i * 2) / 32768;
      return { sampleRate: fmt.sampleRate, channels: fmt.channels, samples };
    }
    off = body + size + (size % 2);
  }
  throw new Error(`${file}: no data chunk`);
}

/** Write PCM16 WAV with TPDF dither. */
export function writeWav(file: string, pcm: Pcm): void {
  const n = pcm.samples.length;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVEfmt ', 8, 'ascii');
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(pcm.channels, 22);
  b.writeUInt32LE(pcm.sampleRate, 24);
  b.writeUInt32LE(pcm.sampleRate * pcm.channels * 2, 28);
  b.writeUInt16LE(pcm.channels * 2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36, 'ascii');
  b.writeUInt32LE(n * 2, 40);
  let seed = 0x9e3779b9; // deterministic dither
  const rnd = () => ((seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) {
    const v = pcm.samples[i]! * 32767 + (rnd() - rnd());
    b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v))), 44 + i * 2);
  }
  writeFileSync(file, b);
}

/** Lay mono segments onto a silent mono timeline (seconds). Overlaps are summed. */
export function placeSegments(segments: ReadonlyArray<{ pcm: Pcm; at: number }>, sampleRate: number, totalSeconds: number): Pcm {
  const out = new Float32Array(Math.ceil(totalSeconds * sampleRate));
  for (const { pcm, at } of segments) {
    if (pcm.sampleRate !== sampleRate || pcm.channels !== 1) throw new Error('placeSegments expects mono at the timeline rate');
    const start = Math.round(at * sampleRate);
    for (let i = 0; i < pcm.samples.length && start + i < out.length; i++) out[start + i]! += pcm.samples[i]!;
  }
  return { sampleRate, channels: 1, samples: out };
}

export type Loudness = { integratedLufs: number; truePeakDbtp: number; lra: number };

/** EBU R128 loudness via ffmpeg loudnorm's measurement pass. */
export async function measureLoudness(file: string): Promise<Loudness> {
  const r = await ff('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'loudnorm=print_format=json', '-f', 'null', '-']);
  if (r.stderr.lastIndexOf('}') < 0) throw new Error(`measureLoudness(${file}): ${r.stderr.slice(-300)}`);
  const json = r.stderr.slice(r.stderr.lastIndexOf('{'), r.stderr.lastIndexOf('}') + 1);
  const m = JSON.parse(json) as Record<string, string>;
  return { integratedLufs: Number(m.input_i), truePeakDbtp: Number(m.input_tp), lra: Number(m.input_lra) };
}

/** Narration bus: rumble filter → gentle compression → loudness → brickwall limiter. */
export const VOICE_CHAIN = {
  highpassHz: 70,
  /** Compressor threshold relative to the voice's integrated loudness (dB above it). */
  compressor: { thresholdAboveLufs: 10, ratio: 2.5, kneeDb: 6, attackMs: 4, releaseMs: 120 },
  /** Sample-peak ceiling; 0.5 dB below the true-peak target leaves room for inter-sample peaks. */
  limiter: { ceilingDb: -2, attackMs: 1.5, releaseMs: 60 },
} as const;

/**
 * Master a mono voice track to stereo at `targetLufs` (measured on the stereo result).
 * Iterates the pre-limiter gain because limiting lowers loudness slightly.
 */
export async function masterVoice(mono: Pcm, targetLufs: number, workFile: string): Promise<{ pcm: Pcm; loudness: Loudness; iterations: number }> {
  if (mono.channels !== 1) throw new Error('masterVoice expects mono');
  const sr = mono.sampleRate;
  const stereo = (x: Float32Array): Pcm => ({ sampleRate: sr, channels: 2, samples: monoToStereo(x) });
  const hp = highpass(mono.samples, sr, VOICE_CHAIN.highpassHz);
  writeWav(workFile, stereo(hp));
  const raw = await measureLoudness(workFile);
  const c = VOICE_CHAIN.compressor;
  // Stereo duplicates the channel: +3.01 LU over the mono loudness the threshold refers to.
  const comp = compress(hp, sr, { thresholdDb: raw.integratedLufs - 3.01 + c.thresholdAboveLufs, ratio: c.ratio, kneeDb: c.kneeDb, attackMs: c.attackMs, releaseMs: c.releaseMs });
  writeWav(workFile, stereo(comp));
  let gainDb = targetLufs - (await measureLoudness(workFile)).integratedLufs;
  let out = comp;
  let loud = raw;
  let iterations = 0;
  while (iterations < 5) {
    iterations++;
    out = limit(applyGain(comp, gainDb), sr, VOICE_CHAIN.limiter);
    writeWav(workFile, stereo(out));
    loud = await measureLoudness(workFile);
    const miss = targetLufs - loud.integratedLufs;
    if (Math.abs(miss) < 0.15) break;
    gainDb += miss;
  }
  return { pcm: stereo(out), loudness: loud, iterations };
}

/** Encode a WAV to AAC-LC in .m4a (faststart) at 48 kHz. Channel layout is kept. */
export async function encodeAac(inFile: string, outFile: string, opts: { bitrateK: number }): Promise<void> {
  const r = await ff('ffmpeg', [
    '-hide_banner', '-y', '-i', inFile,
    // swr resampler (bundled build has no soxr); long filter for a clean 24 → 48 kHz.
    '-af', 'aresample=48000:filter_size=64:cutoff=0.97',
    '-c:a', 'libfdk_aac', '-b:a', `${opts.bitrateK}k`, '-movflags', '+faststart',
    '-f', 'mp4', outFile, // bundled build has no ipod muxer; .m4a = AAC in MP4
  ]);
  if (r.code !== 0) throw new Error(`encodeAac failed: ${r.stderr.slice(-400)}`);
}
