/**
 * Automated technical + visual QA for a rendered video. Produces a report and the
 * review sheets that the human creative review (docs/QA.md) is done from.
 * Checks are deliberately objective; taste is judged by a person looking at sheets.
 */
import { createHash } from 'node:crypto';
import { openSync, readFileSync, readSync, closeSync, statSync } from 'node:fs';
import { decodeLumaFrames, probe } from './ffmpeg.ts';

export type Status = 'pass' | 'fail' | 'warn' | 'skip';
export type Check = { id: string; status: Status; detail: string };

export const THRESHOLDS = {
  /** Frame 0 must show real content (luma std dev on a 108x192 thumbnail). */
  firstFrameMinStd: 6,
  /** A frame is "black" below this mean luma with almost no detail. */
  blackMean: 4,
  blackStd: 2,
  maxBlackSeconds: 0.2,
  /**
   * "Nothing meaningful moves" = frame difference (mean abs luma, 108x192 thumbnails)
   * within this margin of the video's own noise floor (5th percentile of differences,
   * i.e. grain + drift). Self-calibrating, so grain changes don't break the check.
   * v001 measured: floor ≈ 0.27, slow drift 0.37–0.6, action 0.7–3.6.
   */
  staticMarginOverFloor: 0.08,
  floorPercentile: 0.05,
  /** Longest allowed stretch without meaningful motion (pacing). */
  warnStaticSeconds: 1.2,
  maxStaticSeconds: 2.0,
} as const;

/** Top-level MP4 box order: faststart requires `moov` before `mdat`. */
export function topLevelBoxes(file: string): string[] {
  const fd = openSync(file, 'r');
  const size = statSync(file).size;
  const boxes: string[] = [];
  const head = Buffer.alloc(16);
  let pos = 0;
  try {
    while (pos + 8 <= size && boxes.length < 64) {
      readSync(fd, head, 0, 16, pos);
      let len = head.readUInt32BE(0);
      const kind = head.toString('latin1', 4, 8);
      if (len === 1) len = Number(head.readBigUInt64BE(8));
      else if (len === 0) len = size - pos;
      if (len < 8) break;
      boxes.push(kind);
      pos += len;
    }
  } finally {
    closeSync(fd);
  }
  return boxes;
}

export const QA_BITRATE = { minMbps: 8, maxMbps: 20 } as const;
export const QA_AUDIO = { targetLufs: -14, toleranceLu: 1, maxTruePeakDbtp: -1, maxTailSeconds: 0.05, maxLagMs: 1 } as const;

/** True if a box with this four-character code appears inside the moov box. */
export function hasBox(file: string, fourcc: string): boolean {
  const b = readFileSync(file);
  let off = 0;
  while (off + 8 <= b.length) {
    const size = b.readUInt32BE(off);
    const type = b.toString('ascii', off + 4, off + 8);
    if (type === 'moov') return b.subarray(off, off + size).includes(Buffer.from(fourcc, 'ascii'));
    if (size < 8) break;
    off += size;
  }
  return false;
}

/**
 * Lag (ms) of `test` behind `reference` around sample `at`, by cross-correlation over
 * `window` samples, searching −maxLag…+maxLag. Positive = test is late.
 */
export function audioLagMs(reference: Float32Array, test: Float32Array, at: number, window: number, maxLag: number, sampleRate: number): number {
  let best = -Infinity;
  let bestLag = 0;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let i = 0; i < window; i += 2) c += reference[at + i]! * (test[at + i + lag] ?? 0);
    if (c > best) {
      best = c;
      bestLag = lag;
    }
  }
  return (bestLag / sampleRate) * 1000;
}

export type Expected = { width: number; height: number; fps: number; durationInFrames: number; expectAudio: boolean };

export async function technicalChecks(file: string, exp: Expected): Promise<Check[]> {
  const checks: Check[] = [];
  const p = await probe(file);
  const v = p.streams.find((s) => s.codec_type === 'video') as Record<string, string | number> | undefined;
  const a = p.streams.find((s) => s.codec_type === 'audio') as Record<string, string | number> | undefined;
  const add = (id: string, ok: boolean, detail: string) => checks.push({ id, status: ok ? 'pass' : 'fail', detail });

  const boxes = topLevelBoxes(file);
  add('container.faststart', boxes.indexOf('moov') !== -1 && boxes.indexOf('moov') < boxes.indexOf('mdat'), `boxes: ${boxes.join(' ')}`);
  if (!v) {
    add('video.stream', false, 'no video stream');
    return checks;
  }
  // The bundled ffprobe reports the H.264 profile as profile_idc (100 = High).
  add('video.codec', v.codec_name === 'h264' && (v.profile === 'High' || Number(v.profile) === 100), `${v.codec_name} profile ${v.profile}`);
  add('video.size', v.width === exp.width && v.height === exp.height, `${v.width}x${v.height}`);
  add('video.fps', v.r_frame_rate === `${exp.fps}/1`, String(v.r_frame_rate));
  add('video.pixfmt', v.pix_fmt === 'yuv420p', String(v.pix_fmt));
  add('video.frames', Number(v.nb_frames) === exp.durationInFrames, `${v.nb_frames} frames (expected ${exp.durationInFrames})`);
  const vdur = Number(v.duration ?? p.format.duration);
  add('video.duration', Math.abs(vdur - exp.durationInFrames / exp.fps) < 1 / exp.fps, `${vdur.toFixed(3)}s (expected ${(exp.durationInFrames / exp.fps).toFixed(3)}s ± 1 frame)`);
  add('video.start', Math.abs(Number(v.start_time ?? 0)) < 0.001, `first frame at ${Number(v.start_time ?? 0).toFixed(3)}s`);
  const mbps = Number(v.bit_rate) / 1e6;
  const inRange = mbps >= QA_BITRATE.minMbps && mbps <= QA_BITRATE.maxMbps;
  checks.push({ id: 'video.bitrate', status: inRange ? 'pass' : 'warn', detail: `${mbps.toFixed(1)} Mbps (target ${QA_BITRATE.minMbps}–${QA_BITRATE.maxMbps}: YouTube recommends ≥ 8 for 1080p30; above ${QA_BITRATE.maxMbps} the file is needlessly large)` });
  add('container.editlists', !hasBox(file, 'edts'), hasBox(file, 'edts') ? 'edit list present (YouTube: none)' : 'none (YouTube recommendation)');

  if (!exp.expectAudio) {
    checks.push({ id: 'audio', status: 'skip', detail: a ? 'audio present but spec has no audio yet' : 'silent prototype: no audio track expected yet' });
  } else if (!a) {
    add('audio.stream', false, 'no audio stream');
  } else {
    add('audio.codec', a.codec_name === 'aac' && (a.profile === 'LC' || Number(a.profile) === 1), `${a.codec_name} profile ${a.profile} (AAC-LC)`);
    add('audio.rate', Number(a.sample_rate) === 48000, `${a.sample_rate} Hz`);
    add('audio.channels', Number(a.channels) === 2, `${a.channels} ch`);
    add('audio.bitrate', Number(a.bit_rate) >= 128000, `${Math.round(Number(a.bit_rate) / 1000)} kb/s (Instagram: ≥ 128)`);
    add('audio.start', Math.abs(Number(a.start_time ?? 0)) < 0.001, `starts at ${Number(a.start_time ?? 0).toFixed(3)}s`);
    const adur = Number(a.duration);
    add('audio.duration', adur >= vdur - 1 / exp.fps && adur <= vdur + QA_AUDIO.maxTailSeconds, `${adur.toFixed(3)}s vs video ${vdur.toFixed(3)}s (AAC frame padding ≤ ${QA_AUDIO.maxTailSeconds * 1000} ms)`);
  }
  return checks;
}

export type MotionProfile = { means: number[]; stds: number[]; diffs: number[] };

export async function motionProfile(file: string): Promise<MotionProfile> {
  const w = 108;
  const h = 192;
  const frames = await decodeLumaFrames(file, w, h);
  const means: number[] = [];
  const stds: number[] = [];
  const diffs: number[] = [0];
  frames.forEach((fr, i) => {
    let sum = 0;
    for (const v of fr) sum += v;
    const mean = sum / fr.length;
    let sq = 0;
    for (const v of fr) sq += (v - mean) ** 2;
    means.push(mean);
    stds.push(Math.sqrt(sq / fr.length));
    if (i > 0) {
      const prev = frames[i - 1]!;
      let d = 0;
      for (let k = 0; k < fr.length; k++) d += Math.abs(fr[k]! - prev[k]!);
      diffs.push(d / fr.length);
    }
  });
  return { means, stds, diffs };
}

function longestRun(flags: boolean[]): { length: number; start: number } {
  let best = { length: 0, start: 0 };
  let run = 0;
  flags.forEach((f, i) => {
    run = f ? run + 1 : 0;
    if (run > best.length) best = { length: run, start: i - run + 1 };
  });
  return best;
}

/** Frame-difference value below which a frame counts as static for this video. */
export function staticThreshold(m: MotionProfile): { floor: number; threshold: number } {
  const sorted = m.diffs.slice(1).sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * THRESHOLDS.floorPercentile)] ?? 0;
  return { floor, threshold: floor + THRESHOLDS.staticMarginOverFloor };
}

export function visualChecks(m: MotionProfile, fps: number): Check[] {
  const T = THRESHOLDS;
  const checks: Check[] = [];
  const firstStd = m.stds[0] ?? 0;
  checks.push({
    id: 'hook.firstFrame',
    status: firstStd >= T.firstFrameMinStd ? 'pass' : 'fail',
    detail: `frame 0 detail (luma std) ${firstStd.toFixed(1)} — must show content, not black`,
  });
  const black = longestRun(m.means.map((mean, i) => mean < T.blackMean && (m.stds[i] ?? 0) < T.blackStd));
  checks.push({
    id: 'visual.black',
    status: black.length / fps <= T.maxBlackSeconds ? 'pass' : 'fail',
    detail: black.length ? `longest black stretch ${(black.length / fps).toFixed(2)}s at f${black.start}` : 'no black frames',
  });
  const { floor, threshold } = staticThreshold(m);
  const still = longestRun(m.diffs.map((d, i) => i > 0 && d < threshold));
  const s = still.length / fps;
  checks.push({
    id: 'pacing.static',
    status: s > T.maxStaticSeconds ? 'fail' : s > T.warnStaticSeconds ? 'warn' : 'pass',
    detail: `longest stretch without meaningful motion ${s.toFixed(2)}s at f${still.start} (noise floor ${floor.toFixed(2)}, static < ${threshold.toFixed(2)}; warn >${T.warnStaticSeconds}s, fail >${T.maxStaticSeconds}s)`,
  });
  return checks;
}

export function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}
