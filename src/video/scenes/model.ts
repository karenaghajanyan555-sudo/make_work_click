/**
 * The contract every scene type implements (pure, no React). A scene type is one model
 * (this contract + its props type + layout block) and one renderer
 * (src/remotion/scenes/<Type>.tsx), joined in the two registries. Catalogue and how to
 * add one: docs/ARCHITECTURE.md.
 */
import type { SfxId } from '../../sound/effects.ts';

export type SceneSound = { cue: string; id: SfxId; variant?: number };

export type SceneModel<P> = {
  /** Library name, e.g. "HookScene". */
  name: string;
  /** The story beat it tells, in one line. */
  story: string;
  /** Shortest duration (s) the choreography needs. */
  minDuration: number;
  /** Named moments (scene-local seconds) for chapters, sound and music. */
  cues: (props: P, duration: number) => Record<string, number>;
  validate: (props: P, duration: number) => string[];
  /** Which cues make which sound. Keep it few and meaningful. */
  sounds: (props: P, cues: Readonly<Record<string, number>>) => SceneSound[];
};

/** Validation helper: every cue inside the scene and beats in the order given. */
export function ordered(names: string[], cues: Readonly<Record<string, number>>): string[] {
  const errors: string[] = [];
  for (let i = 1; i < names.length; i++) {
    const a = cues[names[i - 1]!], b = cues[names[i]!];
    if (a !== undefined && b !== undefined && b < a) errors.push(`beat "${names[i]}" (${b.toFixed(2)}s) comes before "${names[i - 1]}" (${a.toFixed(2)}s)`);
  }
  return errors;
}

/** Validation helper: a list's length within bounds. */
export function count(what: string, n: number, min: number, max: number): string[] {
  return n < min || n > max ? [`${what}: ${min}–${max} needed (got ${n})`] : [];
}
