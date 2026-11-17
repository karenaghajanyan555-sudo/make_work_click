/**
 * Composed scatter for to-do cards around a headline (base units, 1080-wide frame), hand-
 * placed for balance; slot i holds card i. Shared by chaosToSystem and hook so every video
 * opens in the same visual language. Depth planes: src/remotion/motion/Camera.tsx DEPTH.
 */
export type ScatterSlot = { x: number; y: number; plane: 'far' | 'mid' | 'near'; rotate: number };

export const SCATTER: readonly ScatterSlot[] = [
  { x: 96, y: 318, plane: 'mid', rotate: -2.5 },
  { x: 548, y: 452, plane: 'far', rotate: 3 },
  { x: -40, y: 505, plane: 'near', rotate: -4 },
  { x: 640, y: 236, plane: 'near', rotate: 5 },
  { x: 150, y: 1120, plane: 'mid', rotate: 2 },
  { x: 560, y: 1290, plane: 'far', rotate: -3 },
  { x: 30, y: 1420, plane: 'near', rotate: 3.5 },
];
