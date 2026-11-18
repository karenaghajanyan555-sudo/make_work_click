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

/**
 * Smooth camera (opt-in, `CameraRig smooth`): one continuous path through the keys instead
 * of a stop-start ease per segment. Monotone cubic Hermite per channel (Fritsch–Butland
 * tangents): the speed never jumps at a key, the path never overshoots a key (no bounce),
 * it starts and ends at rest, and it comes to rest only where the move reverses or holds.
 * Per-key `ease` is ignored.
 */
export function sampleCameraSmooth(keys: readonly CameraKey[], t: number): CameraState {
  const ks = keys.filter((k, i) => i === 0 || k.t > keys[i - 1]!.t);
  if (ks.length === 0) return { zoom: 1, x: 0, y: 0 };
  const first = ks[0]!;
  const last = ks[ks.length - 1]!;
  if (t <= first.t) return { zoom: first.zoom, x: first.x, y: first.y };
  if (t >= last.t) return { zoom: last.zoom, x: last.x, y: last.y };
  let i = 1;
  while (ks[i]!.t < t) i++;
  const a = ks[i - 1]!;
  const b = ks[i]!;
  const h = b.t - a.t;
  const s = (t - a.t) / h;
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
  const h10 = s ** 3 - 2 * s ** 2 + s;
  const h01 = -2 * s ** 3 + 3 * s ** 2;
  const h11 = s ** 3 - s ** 2;
  const at = (c: 'zoom' | 'x' | 'y') => h00 * a[c] + h10 * h * tangent(ks, i - 1, c) + h01 * b[c] + h11 * h * tangent(ks, i, c);
  return { zoom: at('zoom'), x: at('x'), y: at('y') };
}

function tangent(ks: readonly CameraKey[], i: number, c: 'zoom' | 'x' | 'y'): number {
  if (i === 0 || i === ks.length - 1) return 0;
  const h0 = ks[i]!.t - ks[i - 1]!.t;
  const h1 = ks[i + 1]!.t - ks[i]!.t;
  const d0 = (ks[i]![c] - ks[i - 1]![c]) / h0;
  const d1 = (ks[i + 1]![c] - ks[i]![c]) / h1;
  if (d0 * d1 <= 0) return 0;
  const w1 = 2 * h1 + h0;
  const w2 = h1 + 2 * h0;
  return (w1 + w2) / (w1 / d0 + w2 / d1);
}
