/**
 * Virtual camera keyframes (pure). A camera move is a list of keys in seconds;
 * between keys the camera eases with the motion language's in-out curve.
 */
export type CameraKey = {
  t: number;
  zoom: number;
  /** Pan in base units (positive x moves the view right, so content moves left). */
  x: number;
  y: number;
  /** Optional per-segment easing: 'inOut' (default) or 'linear' (constant drift). */
  ease?: 'inOut' | 'linear';
};

export type CameraState = { zoom: number; x: number; y: number };

// Cubic in-out matching the brand's precise, unhurried camera.
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function sampleCamera(keys: readonly CameraKey[], t: number): CameraState {
  if (keys.length === 0) return { zoom: 1, x: 0, y: 0 };
  const first = keys[0]!;
  if (t <= first.t) return { zoom: first.zoom, x: first.x, y: first.y };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (t <= b.t) {
      const raw = (t - a.t) / (b.t - a.t || 1);
      const k = b.ease === 'linear' ? raw : easeInOutCubic(raw);
      return { zoom: a.zoom + (b.zoom - a.zoom) * k, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
  }
  const last = keys[keys.length - 1]!;
  return { zoom: last.zoom, x: last.x, y: last.y };
}
