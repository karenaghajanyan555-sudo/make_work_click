/**
 * Delivery formats and layout geometry. Pure functions: safe to use from Node
 * (pipeline, tests) and from Remotion components.
 */

export type FormatId = 'vertical';

export type Format = {
  id: FormatId;
  width: number;
  height: number;
  fps: number;
};

export const FORMATS: Record<FormatId, Format> = {
  // Reels / TikTok / Shorts / Facebook Reels. See docs/PLATFORMS.md.
  vertical: { id: 'vertical', width: 1080, height: 1920, fps: 30 },
};

/**
 * Areas kept free of critical text/logos, as fractions of the frame.
 * Source: Meta Instagram Reels ad specs (14% top, 35% bottom, 6% sides) —
 * the strictest official numeric guidance found; applied to every platform.
 */
export const SAFE_FRACTIONS = { top: 0.14, bottom: 0.35, side: 0.06 } as const;

/**
 * Caption band (base units): narration captions sit here, over dark ground, in every
 * scene. Scenes must keep light surfaces below `bottom` (tested per scene layout).
 */
export const CAPTION_BAND = { top: 300, bottom: 500 } as const;

/** Base design width: 1u = 1px at this width. */
export const BASE_WIDTH = 1080;

export type Rect = { x: number; y: number; width: number; height: number };

export type Layout = {
  width: number;
  height: number;
  /** Scale factor from base units to pixels. */
  u: number;
  /** Live area: where every critical element must sit. */
  safe: { top: number; bottom: number; left: number; right: number; width: number; height: number; cx: number; cy: number };
  /** Editorial text margin (inside the safe sides). */
  gutter: number;
  /** Text column between gutters. */
  column: { left: number; right: number; width: number };
};

export function computeLayout(width: number, height: number): Layout {
  const u = width / BASE_WIDTH;
  const top = Math.round(height * SAFE_FRACTIONS.top);
  const bottom = Math.round(height * (1 - SAFE_FRACTIONS.bottom));
  const left = Math.round(width * SAFE_FRACTIONS.side);
  const right = width - left;
  const gutter = Math.round(88 * u);
  return {
    width,
    height,
    u,
    safe: { top, bottom, left, right, width: right - left, height: bottom - top, cx: width / 2, cy: (top + bottom) / 2 },
    gutter,
    column: { left: gutter, right: width - gutter, width: width - 2 * gutter },
  };
}

/** True if `r` lies entirely inside the live area. */
export function isInsideSafe(layout: Layout, r: Rect): boolean {
  const s = layout.safe;
  return r.x >= s.left && r.y >= s.top && r.x + r.width <= s.right && r.y + r.height <= s.bottom;
}
