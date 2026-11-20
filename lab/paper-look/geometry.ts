/**
 * LOOK TEST ONLY (not production, not in any cache key): torn-paper geometry for the v010 "paper"
 * prototype. Seeded and deterministic (Remotion `random`). All units are page pixels.
 *
 * A tear is a line a→b displaced along its normal n = rot90(b − a) by fractal value noise. Two
 * pieces that share a tear use the same samples, so their edges match exactly. Each side gets:
 *  - a surface edge (the printed top layer), pulled back into the piece where a white fibrous
 *    band is exposed (the band alternates sides along the tear, as real tears do);
 *  - a fringe edge, slightly beyond the tear line (loose fibres), drawn under the surface;
 *  - protruding fibres.
 */
import { random } from 'remotion';

export type V = { x: number; y: number };
export const v = (x: number, y: number): V => ({ x, y });
const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k });

function vnoise(seed: string, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = random(`${seed}:${i}`) * 2 - 1;
  const b = random(`${seed}:${i + 1}`) * 2 - 1;
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

/** Sum of value-noise octaves: [wavelength, amplitude] pairs. */
export function fbm(seed: string, s: number, oct: ReadonlyArray<readonly [number, number]>): number {
  let out = 0;
  oct.forEach(([wl, amp], k) => {
    out += vnoise(`${seed}#${k}`, s / wl) * amp;
  });
  return out;
}

export type Tear = { id: string; a: V; b: V; amp: number; taper?: boolean };
export type Sample = { p: V; s: number; n: V; L: number };

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Points along the tear (step in page px), each with its arc position s and the +normal. */
export function sampleTear(t: Tear, step = 1.2): Sample[] {
  const dx = t.b.x - t.a.x;
  const dy = t.b.y - t.a.y;
  const L = Math.hypot(dx, dy);
  const d = { x: dx / L, y: dy / L };
  const n = { x: -d.y, y: d.x };
  const N = Math.max(2, Math.ceil(L / step));
  const out: Sample[] = [];
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * L;
    let off = fbm(t.id, s, [[150, t.amp], [44, t.amp * 0.5], [13, t.amp * 0.22], [4, t.amp * 0.1], [1.5, t.amp * 0.045]]);
    if (t.taper) off *= smooth(s / 18) * smooth((L - s) / 18);
    out.push({ p: add(add(t.a, mul(d, s)), mul(n, off)), s, n, L });
  }
  return out;
}

/** The tear point at arc position s (interpolated), e.g. where another tear starts. */
export function tearAt(t: Tear, s: number): V {
  const pts = sampleTear(t);
  const L = pts[pts.length - 1]!.L;
  const k = Math.min(pts.length - 2, Math.max(0, Math.floor((s / L) * (pts.length - 1))));
  const a = pts[k]!;
  const b = pts[k + 1]!;
  const f = (s - a.s) / (b.s - a.s || 1);
  return { x: a.p.x + (b.p.x - a.p.x) * f, y: a.p.y + (b.p.y - a.p.y) * f };
}

/** One edge of a piece: a straight cut to a point, or part of a tear. */
export type Edge =
  | { kind: 'cut'; to: V }
  /** side: +1 if the piece lies on the tear's +n side. from/to: arc range, traversed in that order. */
  | { kind: 'tear'; tear: Tear; side: 1 | -1; from: number; to: number };

export type Fibre = { d: string; w: number; a: number };
export type Outline = { surface: V[]; fringe: V[]; tearline: V[][]; fibres: Fibre[] };

/** White band width on a side at arc s: alternates sides (shared noise), plus a hairline everywhere. */
function band(t: Tear, side: 1 | -1, s: number): number {
  const g = fbm(`${t.id}/band`, s, [[70, 4.2], [22, 1.8], [6, 0.7]]);
  return Math.max(0, g * side) + 0.5;
}
function fringe(t: Tear, side: 1 | -1, s: number): number {
  return Math.max(0, fbm(`${t.id}/fr${side}`, s, [[9, 1.0], [3, 0.5]])) + 0.25;
}

/** Build the outlines of a piece that starts at `start` and follows `edges` clockwise. */
export function outline(start: V, edges: Edge[], fibreDensity = 1): Outline {
  const surface: V[] = [start];
  const fr: V[] = [start];
  const tearline: V[][] = [];
  const fibres: Fibre[] = [];
  for (const e of edges) {
    if (e.kind === 'cut') {
      surface.push(e.to);
      fr.push(e.to);
      continue;
    }
    const all = sampleTear(e.tear);
    const lo = Math.min(e.from, e.to);
    const hi = Math.max(e.from, e.to);
    let pts = all.filter((q) => q.s >= lo && q.s <= hi);
    if (e.to < e.from) pts = pts.reverse();
    const line: V[] = [];
    for (const q of pts) {
      const b = band(e.tear, e.side, q.s);
      const f = fringe(e.tear, e.side, q.s);
      surface.push(add(q.p, mul(q.n, e.side * b)));
      fr.push(add(q.p, mul(q.n, -e.side * f)));
      line.push(q.p);
    }
    tearline.push(line);
    // Fibres: short curved strands leaving the tear outward, a few long ones.
    const count = Math.floor(((hi - lo) / 2.6) * fibreDensity);
    for (let i = 0; i < count; i++) {
      const key = `${e.tear.id}/fib${e.side}/${i}`;
      const s = lo + random(`${key}/s`) * (hi - lo);
      const base = tearAt(e.tear, s);
      const n = pts[0]!.n;
      const out = mul(n, -e.side);
      const ang = (random(`${key}/a`) - 0.5) * 1.6;
      const dir = { x: out.x * Math.cos(ang) - out.y * Math.sin(ang), y: out.x * Math.sin(ang) + out.y * Math.cos(ang) };
      const r = random(`${key}/l`);
      const len = 0.8 + r * r * r * r * 5.5;
      const bend = (random(`${key}/b`) - 0.5) * len * 0.35;
      const p0 = add(base, mul(out, -0.6));
      const p2 = add(p0, mul(dir, len));
      const p1 = add(add(p0, mul(dir, len * 0.5)), { x: -dir.y * bend, y: dir.x * bend });
      fibres.push({ d: `M${p0.x.toFixed(2)} ${p0.y.toFixed(2)} Q${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`, w: 0.22 + random(`${key}/w`) * 0.38, a: 0.3 + random(`${key}/o`) * 0.45 });
    }
  }
  return { surface, fringe: fr, tearline, fibres };
}

export function pathOf(pts: V[]): string {
  return `M${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('L')}Z`;
}

/** Fibres embedded in the sheet (visible only in macro): faint short strands. */
export function embeddedFibres(seed: string, w: number, h: number, count: number): Fibre[] {
  const out: Fibre[] = [];
  for (let i = 0; i < count; i++) {
    const k = `${seed}/emb/${i}`;
    const x = random(`${k}/x`) * w;
    const y = random(`${k}/y`) * h;
    const a = random(`${k}/a`) * Math.PI;
    const len = 4 + random(`${k}/l`) * 14;
    const bend = (random(`${k}/b`) - 0.5) * len * 0.6;
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len;
    out.push({ d: `M${x.toFixed(1)} ${y.toFixed(1)} q${(dx / 2 - dy * bend / len).toFixed(1)} ${(dy / 2 + dx * bend / len).toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}`, w: 0.3 + random(`${k}/w`) * 0.5, a: 0.03 + random(`${k}/o`) * 0.06 });
  }
  return out;
}
