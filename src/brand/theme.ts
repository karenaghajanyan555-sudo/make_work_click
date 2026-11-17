import { palette } from './tokens.ts';

/**
 * Themes vary the *world* of a video (ground colour, light, texture) while the
 * brand constants (fonts, signal accent, signature frame, motion) never change.
 * Add a theme here to give a future video its own look. See docs/BRAND.md.
 */
export type Theme = {
  name: ThemeName;
  ground: string;
  text: string;
  textMuted: string;
  /** Key light colour (rgb triplet) and strength (0..1). */
  keyLight: { rgb: string; strength: number };
  /** Vignette darkness at the edges (0..1). */
  vignette: number;
  /** Film grain opacity in the ground layer (normal blend over a mean-128 noise tile). */
  grain: number;
  frameLine: string;
};

export type ThemeName = 'ink';

export const THEMES: Record<ThemeName, Theme> = {
  ink: {
    name: 'ink',
    ground: palette.ink,
    text: palette.paper,
    textMuted: palette.fog,
    keyLight: { rgb: '226,230,238', strength: 0.085 },
    vignette: 0.62,
    grain: 0.06,
    frameLine: palette.hairlineStrong,
  },
};
