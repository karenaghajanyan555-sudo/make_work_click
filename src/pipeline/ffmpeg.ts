/**
 * Access to the ffmpeg/ffprobe binaries that ship with Remotion (same version on
 * every machine; no system ffmpeg needed). Note: that build is minimal — it has
 * scale/crop/format/trim and audio mixing/loudnorm, but no overlay, tile,
 * drawtext, select or detection filters. Image analysis and compositing therefore happen
 * in Node on raw pixel buffers. It also lacks the rawvideo (de)muxer: raw frames
 * are read through `image2pipe` + rawvideo codec, and PNGs are written in Node.
 *
 * The binaries run with their own directory as cwd: always pass absolute paths.
 */
import { RenderInternals } from '@remotion/renderer';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

type Result = { stdout: Buffer; stderr: string; code: number | null };

/** Absolute path of Remotion's bundled binary for this platform. */
export function binaryPath(bin: 'ffmpeg' | 'ffprobe'): string {
  return RenderInternals.getExecutablePath({ type: bin, indent: false, logLevel: 'error', binariesDirectory: null });
}

export function ff(bin: 'ffmpeg' | 'ffprobe', args: string[], stdin?: Buffer): Promise<Result> {
  return new Promise((resolve, reject) => {
    const exe = binaryPath(bin);
    const cwd = path.dirname(exe);
    // Same environment rules Remotion uses (macOS needs the library path explicitly).
    const env = process.platform === 'darwin' ? { ...process.env, DYLD_LIBRARY_PATH: cwd } : process.env;
    const child = spawn(exe, args, { cwd, env });
    const out: Buffer[] = [];
    let err = '';
    child.stdout.on('data', (d: Buffer) => out.push(d));
    child.stderr.on('data', (d: Buffer) => (err += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ stdout: Buffer.concat(out), stderr: err, code }));
    if (stdin) child.stdin.end(stdin);
    else child.stdin.end();
  });
}

async function ffOk(bin: 'ffmpeg' | 'ffprobe', args: string[], stdin?: Buffer): Promise<Buffer> {
  const r = await ff(bin, args, stdin);
  if (r.code !== 0) throw new Error(`${bin} ${args.join(' ')} failed (${r.code}): ${r.stderr.slice(-800)}`);
  return r.stdout;
}

export type Probe = {
  streams: Array<Record<string, unknown> & { codec_type?: string }>;
  format: Record<string, unknown>;
};

export async function probe(file: string): Promise<Probe> {
  const out = await ffOk('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', path.resolve(file)]);
  return JSON.parse(out.toString()) as Probe;
}

/** Decode one image file to RGB24 at the given size. */
export async function decodeImage(file: string, width: number, height: number): Promise<Buffer> {
  return ffOk('ffmpeg', ['-v', 'error', '-i', path.resolve(file), '-vf', `scale=${width}:${height}:flags=lanczos`, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
}

/** Decode one frame (by index) of a video to RGB24 at the given size. */
export async function decodeFrame(video: string, frame: number, width: number, height: number): Promise<Buffer> {
  return ffOk('ffmpeg', [
    '-v', 'error', '-i', path.resolve(video),
    '-vf', `trim=start_frame=${frame}:end_frame=${frame + 1},scale=${width}:${height}:flags=lanczos`,
    '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ]);
}

/** Decode every frame of a video as 8-bit luma at a small size (for analysis). */
export async function decodeLumaFrames(video: string, width: number, height: number): Promise<Buffer[]> {
  const raw = await ffOk('ffmpeg', ['-v', 'error', '-i', path.resolve(video), '-vf', `scale=${width}:${height},format=gray`, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'gray', '-']);
  const size = width * height;
  const frames: Buffer[] = [];
  for (let o = 0; o + size <= raw.length; o += size) frames.push(raw.subarray(o, o + size));
  return frames;
}

/** Encode an RGB24 buffer as PNG (pure Node: zlib deflate + crc32). */
export function encodePng(rgb: Buffer, width: number, height: number, outFile: string): void {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(outFile, png);
}
