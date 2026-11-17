import { createContext, useContext, useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { computeLayout, type Layout } from '../../brand/format.ts';
import { DEFAULT_PRESET, PRESETS, type VisualPreset } from '../../brand/presets.ts';
import { THEMES, type Theme } from '../../brand/theme.ts';

/** Layout geometry for the current composition size (safe zone, gutters, units). */
export function useLayout(): Layout {
  const { width, height } = useVideoConfig();
  return useMemo(() => computeLayout(width, height), [width, height]);
}

/** Time helpers: work in seconds, render in frames. */
export function useTime() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return {
    frame,
    fps,
    /** Seconds → frames. */
    f: (seconds: number) => Math.round(seconds * fps),
    /** Current time in seconds. */
    t: frame / fps,
  };
}

export const ThemeContext = createContext<Theme>(THEMES.ink);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export const PresetContext = createContext<VisualPreset>(PRESETS[DEFAULT_PRESET]);

/** The video's visual preset (src/brand/presets.ts): motion tempo, camera intensity, layout. */
export function usePreset(): VisualPreset {
  return useContext(PresetContext);
}

/** How the current scene arrives (set by VideoComposition per scene). */
export const SceneArrivalContext = createContext<string>('cut');

/**
 * True when the scene is carried in by a moving hand-off (slide, wipe, zoom): it should
 * already be built at its first frame instead of also running its own entrance.
 */
export function useArrivesBuilt(): boolean {
  const t = useContext(SceneArrivalContext);
  return t === 'slide' || t === 'wipe' || t === 'zoom';
}
