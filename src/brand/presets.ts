/**
 * Visual presets: how a video *moves and is arranged*, never what the brand *is*.
 *
 * Every preset keeps the MAKE WORK CLICK constants (palette, fonts, signal meaning, spec
 * frame, grain, easing curves). A preset only tunes the world (light, vignette), the motion
 * (tempo, camera intensity, default hand-off), and the composition (statement alignment and
 * size). Pick one per video (`spec.preset`); scenes read it through `usePreset()`.
 * Rules: docs/BRAND.md § Presets.
 */
import type { TransitionSpec } from '../video/spec.ts';

export type PresetName = 'editorial' | 'cinematic' | 'minimal' | 'data' | 'product';

export type VisualPreset = {
  name: PresetName;
  /** What it is for, in one line (catalogue + docs). */
  use: string;
  /** World: multipliers on the theme's key light and absolute vignette. */
  world: { keyLight: number; vignette: number; glow: number };
  motion: {
    /** Multiplies entrance durations (1 = brand default; > 1 slower, more cinematic). */
    tempo: number;
    /** Seconds between words in kinetic type. */
    wordStagger: number;
    /** Camera intensity: multiplies push/drift amounts of scene cameras (0 = locked off). */
    camera: number;
  };
  /** Default hand-off between scenes when a scene does not set `transitionOut`. */
  transition: TransitionSpec;
  layout: {
    /** Statements and hooks: left on the gutter (editorial) or centred. */
    align: 'left' | 'center';
    /** Type role for statements: display (largest) or title. */
    statementRole: 'display' | 'title';
  };
};

export const PRESETS: Record<PresetName, VisualPreset> = {
  editorial: {
    name: 'editorial',
    use: 'Premium editorial: the v001 look. Left-aligned display type, focus pulls, a gentle camera.',
    world: { keyLight: 1, vignette: 0.62, glow: 1 },
    motion: { tempo: 1, wordStagger: 0.1, camera: 1 },
    transition: { type: 'focusPull' },
    layout: { align: 'left', statementRole: 'display' },
  },
  cinematic: {
    name: 'cinematic',
    use: 'Cinematic SaaS: deeper vignette, more light, slower type, bigger camera moves, blur hand-offs.',
    world: { keyLight: 1.35, vignette: 0.72, glow: 1.3 },
    motion: { tempo: 1.15, wordStagger: 0.12, camera: 1.6 },
    transition: { type: 'blur' },
    layout: { align: 'left', statementRole: 'display' },
  },
  minimal: {
    name: 'minimal',
    use: 'Minimal typography: centred type, almost no camera, quiet fades. For statement-led videos.',
    world: { keyLight: 0.75, vignette: 0.55, glow: 0.6 },
    motion: { tempo: 1.1, wordStagger: 0.11, camera: 0.3 },
    transition: { type: 'fade' },
    layout: { align: 'center', statementRole: 'display' },
  },
  data: {
    name: 'data',
    use: 'Data visualisation: centred titles, snappier motion, slide hand-offs. For metrics and charts.',
    world: { keyLight: 0.9, vignette: 0.6, glow: 0.9 },
    motion: { tempo: 0.9, wordStagger: 0.08, camera: 0.6 },
    transition: { type: 'slide' },
    layout: { align: 'center', statementRole: 'title' },
  },
  product: {
    name: 'product',
    use: 'Product demonstration: UI-forward, push-in camera, zoom-through hand-offs.',
    world: { keyLight: 1.1, vignette: 0.64, glow: 1.15 },
    motion: { tempo: 1, wordStagger: 0.1, camera: 1.25 },
    transition: { type: 'zoom' },
    layout: { align: 'left', statementRole: 'title' },
  },
};

export const DEFAULT_PRESET: PresetName = 'editorial';
