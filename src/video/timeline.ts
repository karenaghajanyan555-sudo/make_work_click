/**
 * Turns a VideoSpec into absolute frame positions: scene placement, transition
 * overlaps, cue points and chapters. Everything that must stay in sync (visuals,
 * chapters, sound cues, captions) reads from this one calculation.
 */
import { DEFAULT_PRESET, PRESETS } from '../brand/presets.ts';
import { sceneCuePoints, type SceneSpec, type TransitionSpec, type VideoSpec } from './spec.ts';

/** Frames two scenes overlap during a focus-pull hand-off (outgoing is ~gone). */
export const FOCUS_PULL_OVERLAP_SECONDS = 0.13;

/**
 * Hand-off envelopes (seconds): how long the two scenes overlap, how long the outgoing
 * scene takes to leave and the incoming one to arrive. Rendered by Handoff
 * (src/remotion/video/VideoComposition.tsx). Overlaps stay short so two layers of text
 * never stack for long, and light surfaces never cross-fade over the dark ground.
 */
export const TRANSITIONS: Record<TransitionSpec['type'], { overlap: number; out: number; in: number }> = {
  cut: { overlap: 0, out: 0, in: 0 },
  focusPull: { overlap: FOCUS_PULL_OVERLAP_SECONDS, out: 0.33, in: 0.4 },
  fade: { overlap: 0.17, out: 0.3, in: 0.3 },
  // A push: both scenes travel together as one strip (same envelope), like a feed swipe.
  slide: { overlap: 0.4, out: 0.4, in: 0.4 },
  zoom: { overlap: 0.2, out: 0.33, in: 0.45 },
  blur: { overlap: 0.2, out: 0.4, in: 0.5 },
  wipe: { overlap: 0.5, out: 0.5, in: 0.5 },
};

export type TimelineEntry = {
  scene: SceneSpec;
  index: number;
  from: number;
  durationInFrames: number;
  transitionIn: TransitionSpec | null;
  transitionOut: TransitionSpec | null;
};

export type Timeline = {
  fps: number;
  totalFrames: number;
  entries: TimelineEntry[];
  /** Absolute frame of every cue, keyed "sceneId.cue". */
  cues: Record<string, number>;
  chapters: Array<{ frame: number; label: string }>;
};

export function toFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

function overlapFrames(t: TransitionSpec, fps: number): number {
  return toFrames(TRANSITIONS[t.type].overlap, fps);
}

/** The hand-off a scene uses: its own, else the video preset's default. */
export function transitionOf(spec: Pick<VideoSpec, 'preset'>, scene: SceneSpec): TransitionSpec {
  return scene.transitionOut ?? PRESETS[spec.preset ?? DEFAULT_PRESET].transition;
}

export function computeTimeline(spec: VideoSpec, fps: number): Timeline {
  const entries: TimelineEntry[] = [];
  const cues: Record<string, number> = {};
  const chapters: Timeline['chapters'] = [];
  let cursor = 0;

  spec.scenes.forEach((scene, index) => {
    const durationInFrames = toFrames(scene.duration, fps);
    const isLast = index === spec.scenes.length - 1;
    const transitionOut = isLast ? null : transitionOf(spec, scene);
    const prev = entries[index - 1];
    const transitionIn = prev?.transitionOut ?? null;
    const from = prev ? cursor - (transitionIn ? overlapFrames(transitionIn, fps) : 0) : 0;

    entries.push({ scene, index, from, durationInFrames, transitionIn, transitionOut });

    const local = sceneCuePoints(scene);
    for (const [name, t] of Object.entries(local)) cues[`${scene.id}.${name}`] = from + toFrames(t, fps);
    for (const c of scene.chapters ?? []) {
      const at = local[c.cue];
      if (at !== undefined) chapters.push({ frame: from + toFrames(at, fps), label: c.label });
    }
    cursor = from + durationInFrames;
  });

  chapters.sort((a, b) => a.frame - b.frame);
  return { fps, totalFrames: cursor, entries, cues, chapters };
}

/** The chapter label active at `frame` (or null before the first chapter). */
export function chapterAt(chapters: Timeline['chapters'], frame: number): { label: string; frame: number; index: number } | null {
  let active: { label: string; frame: number; index: number } | null = null;
  chapters.forEach((c, index) => {
    if (c.frame <= frame) active = { ...c, index };
  });
  return active;
}
