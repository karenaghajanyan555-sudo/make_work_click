/**
 * Scene-segment rendering: the picture master is the concatenation of one segment per
 * scene (frame range from that scene's first frame to the next scene's first frame).
 * Each segment is cached under a key made of the render code and exactly the part of the
 * spec that can change those frames (the scenes overlapping it, their hand-offs, the
 * captions and chapter labels on screen, the global look). Edit one scene → only its
 * segment (and a neighbour sharing a hand-off) renders again. Segments are joined without
 * re-encoding (ffmpeg concat demuxer); the master is then the same as a full render.
 */
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { captionWindows } from '../video/narration.ts';
import type { VideoSpec } from '../video/spec.ts';
import type { Timeline } from '../video/timeline.ts';
import { RENDER_INPUTS, sha256, treeHash } from './cache.ts';
import { ff } from './ffmpeg.ts';
import { videoOut } from './paths.ts';
import { renderVideo, type Session } from './remotion.ts';

export type Segment = { index: number; scene: string; from: number; to: number; key: string; file: string };

export function planSegments(spec: VideoSpec, timeline: Timeline, codeHash = treeHash(RENDER_INPUTS)): Segment[] {
  const fps = timeline.fps;
  const dir = path.join(videoOut(spec.id), 'segments');
  const firstClick = Object.entries(timeline.cues).find(([k]) => k.endsWith('.click'))?.[1] ?? null;
  const captions = spec.narration && spec.captions?.enabled !== false ? captionWindows(spec.narration, timeline.totalFrames / fps) : [];
  const global = { id: spec.id, format: spec.format, theme: spec.theme, preset: spec.preset ?? null, series: spec.series, firstClick, captionsOn: spec.captions?.enabled !== false };
  return timeline.entries.map((e, i) => {
    const from = e.from;
    const to = (timeline.entries[i + 1]?.from ?? timeline.totalFrames) - 1;
    const overlapping = timeline.entries
      .filter((o) => o.from <= to && o.from + o.durationInFrames - 1 >= from)
      .map((o) => ({ scene: o.scene, from: o.from, dur: o.durationInFrames, tin: o.transitionIn, tout: o.transitionOut }));
    const caps = captions.filter((c) => Math.round(c.at * fps) <= to + 2 && Math.round(c.out * fps) + 12 >= from);
    // The chapter label on screen depends on the latest chapter at or before each frame.
    const chapters = timeline.chapters.filter((c, k) => c.frame <= to && (timeline.chapters[k + 1]?.frame ?? Infinity) >= from).map((c) => ({ ...c, index: timeline.chapters.indexOf(c) }));
    const key = sha256(JSON.stringify({ codeHash, global, range: [from, to], overlapping, caps, chapters })).slice(0, 20);
    return { index: i, scene: e.scene.id, from, to, key, file: path.join(dir, `${String(i).padStart(2, '0')}-${e.scene.id}-${key}.mp4`) };
  });
}

export type MasterResult = { segments: Array<Segment & { cached: boolean; seconds: number }>; concatSeconds: number };

/** Render missing segments (one at a time), then join them into `out`. */
export async function renderMaster(s: Session, spec: VideoSpec, timeline: Timeline, out: string, log = true): Promise<MasterResult> {
  const plan = planSegments(spec, timeline);
  const dir = path.join(videoOut(spec.id), 'segments');
  mkdirSync(dir, { recursive: true });
  const done: MasterResult['segments'] = [];
  for (const seg of plan) {
    const t0 = performance.now();
    const cached = existsSync(seg.file);
    if (!cached) {
      const tmp = `${seg.file}.part.mp4`;
      let last = -25;
      await renderVideo(s, spec.id, tmp, { videoId: spec.id, debug: false }, (p) => {
        const pct = Math.floor(p * 100);
        if (log && pct >= last + 25) {
          last = pct - (pct % 25);
          process.stdout.write(`  ${seg.scene} ${last}%\n`);
        }
      }, [seg.from, seg.to]);
      renameSync(tmp, seg.file);
    }
    const seconds = (performance.now() - t0) / 1000;
    if (log) console.log(`  segment ${seg.index} ${seg.scene} [${seg.from}–${seg.to}] ${cached ? 'cached' : `rendered ${seconds.toFixed(1)}s`}`);
    done.push({ ...seg, cached, seconds });
  }
  // Drop segments no longer part of this video.
  const keep = new Set(plan.map((p) => path.basename(p.file)));
  for (const f of readdirSync(dir)) if (!keep.has(f)) rmSync(path.join(dir, f), { force: true });

  const t0 = performance.now();
  const list = path.join(dir, 'concat.txt');
  writeFileSync(list, plan.map((p) => `file '${path.basename(p.file)}'`).join('\n') + '\n');
  mkdirSync(path.dirname(out), { recursive: true });
  const r = await ff('ffmpeg', ['-hide_banner', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', '-f', 'mp4', out]);
  if (r.code !== 0) throw new Error(`concat: ${r.stderr.slice(-500)}`);
  return { segments: done, concatSeconds: (performance.now() - t0) / 1000 };
}
