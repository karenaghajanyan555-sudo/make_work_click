/**
 * defineVideo(): author a video against its narration, get an exact VideoSpec (pure).
 *
 *   export const v002 = defineVideo({ …scenes with `say`, beats as TimeRefs… }, timing);
 *
 * Resolution order: narration lines (take rhythm + pauses) → caption phrases → scene starts
 * and durations (from what each scene says) → beats (TimeRefs → scene-local seconds).
 * Problems are reported in `timingIssues` (validateSpec fails on them) instead of thrown,
 * so Studio can still preview a storyboard before the voice exists.
 */
import { FORMATS } from '../brand/format.ts';
import type { NarrationLine, NarrationSpec } from './narration.ts';
import { sceneModel } from './scenes/registry.ts';
import type { SceneSpec, VideoSpec } from './spec.ts';
import { TRANSITIONS, transitionOf } from './timeline.ts';
import { estimateLock, isTimeRef, scriptHash, wordOffset, type LockLine, type Timed, type TimeRef, type TimingLock } from './timing.ts';

/** Defaults for narration-driven layout (seconds). */
export const AUTO_TIMING = {
  /** Silence before the first word. */
  lead: 0.25,
  /** A scene starts this long before its first spoken line (the picture leads the voice). */
  sceneLead: 0.35,
  /** The last scene holds this long after the last word. */
  tail: 0.7,
} as const;

export type AuthoredLine = Omit<NarrationLine, 'at' | 'phrases'> & {
  /** Explicit start (video s). Omit to follow the take's rhythm. */
  at?: number;
  /** Extra silence before this line, on top of the take's natural pause. */
  pause?: number;
};

type AuthoredProps<P> = { [K in keyof P]: K extends 'beats' ? Timed<P[K]> : P[K] };
type Authored<S> = S extends { props: infer P }
  ? Omit<S, 'duration' | 'props'> & { duration?: number; props: AuthoredProps<P> }
  : never;
export type AuthoredScene = Authored<SceneSpec>;

export type AuthoredVideo = Omit<VideoSpec, 'scenes' | 'narration' | 'timingIssues'> & {
  scenes: AuthoredScene[];
  narration?: Omit<NarrationSpec, 'lines'> & { lines: AuthoredLine[] };
};

const round = (x: number, step: number) => Number((Math.round(x / step) * step).toFixed(4));
/** Spoken words in a caption phrase (Kokoro's word list has no punctuation tokens). */
const words = (markup: string) => markup.replace(/\*+/g, '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

export function defineVideo(v: AuthoredVideo, lock?: TimingLock): VideoSpec {
  const issues: string[] = [];
  const fps = FORMATS[v.format].fps;
  const frame = 1 / fps;
  const auto = Boolean(
    v.narration?.lines.some((l) => l.at === undefined || l.caption?.includes('|')) ||
      v.scenes.some((s) => s.duration === undefined || JSON.stringify((s.props as { beats?: unknown }).beats ?? {}).includes('"line":')),
  );

  // ---- 1. which timing to use ----
  let timing: TimingLock | undefined;
  if (v.narration) {
    const script = v.narration.lines.map(({ id, text }) => ({ id, text }));
    if (lock && lock.scriptHash === scriptHash(script)) timing = lock;
    else {
      if (auto) issues.push(lock ? `timing lock is stale (the script changed): run npm run voice -- ${v.id}` : `no timing lock: run npm run voice -- ${v.id}`);
      timing = estimateLock(v.id, script);
    }
    if (lock && v.narration.take && lock.source.kind !== 'approved') issues.push(`narration uses ${v.narration.take} but the timing lock was made from a draft: run npm run voice -- ${v.id}`);
  }
  const lockLine = (id: string): LockLine => {
    const l = timing?.lines.find((x) => x.id === id);
    if (!l) throw new Error(`timing: no line "${id}"`);
    return l;
  };

  // ---- 2. narration lines + caption phrases ----
  let narration: NarrationSpec | undefined;
  const lineAt = new Map<string, number>();
  if (v.narration) {
    const lines: NarrationLine[] = [];
    v.narration.lines.forEach((l, k) => {
      const src = lockLine(l.id);
      const prev = lines[k - 1];
      const at =
        l.at ?? round((prev ? prev.at + (src.sourceStart - lockLine(prev.id).sourceStart) : AUTO_TIMING.lead) + (l.pause ?? 0), 0.01);
      lineAt.set(l.id, at);
      const { pause: _pause, ...rest } = l;
      const line: NarrationLine = { ...rest, at };
      if (l.caption?.includes('|')) {
        const parts = l.caption.split('|').map((p) => p.trim());
        let wi = 0;
        line.phrases = parts.map((markup, j) => {
          const w = src.words[Math.min(wi, src.words.length - 1)];
          const t = j === 0 ? at : at + (w ? w[1] : 0);
          wi += words(markup);
          return { markup, at: round(t, 0.01) };
        });
      }
      lines.push(line);
    });
    narration = { ...v.narration, lines };
  }
  const ends = [...lineAt].map(([id, at]) => at + lockLine(id).duration);
  const lastWord = ends.length ? Math.max(...ends) : 0;

  const refTime = (ref: TimeRef): number => {
    const at = lineAt.get(ref.line);
    if (at === undefined) throw new Error(`timing: no narration line "${ref.line}"`);
    return at + wordOffset(lockLine(ref.line), ref) + (ref.offset ?? 0);
  };

  // ---- 3. scene starts + durations ----
  const desired = v.scenes.map((s, k) => (k === 0 ? 0 : s.say?.length ? (lineAt.get(s.say[0]!) ?? NaN) - (s.lead ?? AUTO_TIMING.sceneLead) : undefined));
  const scenes: SceneSpec[] = [];
  let cursor = 0;
  v.scenes.forEach((s, k) => {
    const start = cursor;
    const overlap = k < v.scenes.length - 1 ? TRANSITIONS[transitionOf(v, s as SceneSpec).type].overlap : 0;
    let duration = s.duration;
    if (duration === undefined) {
      const next = desired[k + 1];
      if (k === v.scenes.length - 1) duration = Math.max(sceneMin(s), lastWord + AUTO_TIMING.tail - start);
      else if (next !== undefined && Number.isFinite(next)) duration = next - start + overlap;
      else {
        issues.push(`scene "${s.id}": needs a duration, or the next scene needs \`say\``);
        duration = sceneMin(s);
      }
    }
    duration = Math.max(frame, round(duration, frame));
    const props = resolveBeats(s.props, (ref) => refTime(ref) - start, (e) => issues.push(`scene "${s.id}": ${e}`));
    scenes.push({ ...s, duration, props } as SceneSpec);
    cursor = start + duration - overlap;
  });

  const { scenes: _s, narration: _n, ...rest } = v;
  return { ...rest, scenes, ...(narration ? { narration } : {}), ...(issues.length ? { timingIssues: issues } : {}) };
}

function sceneMin(s: AuthoredScene): number {
  return sceneModel(s as SceneSpec).minDuration;
}

/** Replace every TimeRef inside `props.beats` with scene-local seconds. */
function resolveBeats<P>(props: P, toLocal: (r: TimeRef) => number, fail: (e: string) => void): P {
  const walk = (x: unknown): unknown => {
    if (isTimeRef(x)) {
      try {
        return Math.round(toLocal(x) * 1000) / 1000;
      } catch (e) {
        fail((e as Error).message);
        return 0;
      }
    }
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, walk(v)]));
    return x;
  };
  const p = props as Record<string, unknown>;
  return ('beats' in p ? { ...p, beats: walk(p.beats) } : props) as P;
}
