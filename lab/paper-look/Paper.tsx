/**
 * LOOK TEST ONLY: SVG renderer for torn printed paper (v010 "The other half").
 * Paper: base tone + one shared procedural texture (feTurbulence → diffuse lighting = fibre grain
 * lit by the key light; low-frequency formation), applied with multiply so the ink takes the
 * grain too. Torn edges: a frayed white fibrous band under the printed surface, plus loose
 * fibres. Shadows: a tight contact shadow and a soft ambient one, both growing with lift; a piece
 * placed later casts its contact shadow onto the pieces under it.
 */
import { fonts, palette } from '../../src/brand/tokens.ts';
import { random } from 'remotion';
import { mixColor, withAlpha } from '../../src/remotion/lib/anim.ts';
import { fbm, pathOf, type Fibre, type Outline, type V } from './geometry.ts';
import type { Mark, PageLayout, Run } from './page.ts';

/** Shadows fall down-right, away from the key light (top-left), like the brand Backdrop's key. */
export const LIGHT = { x: 0.5, y: 0.866 };
/** Paper under the key light: the brand paper tone lifted toward white (light, not a new colour). */
const PAPER = mixColor(palette.paper, palette.ui.surface, 0.45);
const BAND = mixColor(palette.paper, palette.ui.surface, 0.72);
const FIBRE = mixColor(palette.paper, palette.ui.surface, 0.85);

/** Shared filters. Regions are each element's own bounding box (cheap at macro scale); the noise
 *  is a function of user-space position, so pieces of one sheet show one continuous texture. */
export const PaperDefs: React.FC = () => (
  <defs>
    <filter id="paperTex" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={4} result="n" />
      <feDiffuseLighting in="n" surfaceScale={0.95} lightingColor="#ffffff" result="lit">
        <feDistantLight azimuth={225} elevation={50} />
      </feDiffuseLighting>
      <feColorMatrix in="lit" type="matrix" values="0.14 0 0 0 0.9  0.14 0 0 0 0.9  0.14 0 0 0 0.9  0 0 0 0 1" result="grain" />
      <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves={4} seed={9} result="f" />
      <feColorMatrix in="f" type="matrix" values="0.05 0 0 0 0.97  0.05 0 0 0 0.97  0.05 0 0 0 0.97  0 0 0 0 1" result="form" />
      <feComposite in="grain" in2="form" operator="arithmetic" k1={1} k2={0} k3={0} k4={0} />
    </filter>
    <filter id="fray" x="-0.03" y="-0.08" width="1.06" height="1.16">
      <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves={2} seed={2} result="t" />
      <feDisplacementMap in="SourceGraphic" in2="t" scale={2.8} xChannelSelector="R" yChannelSelector="G" />
    </filter>
    <filter id="ink" x="-0.01" y="-0.02" width="1.02" height="1.04">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={1} seed={6} result="t" />
      <feDisplacementMap in="SourceGraphic" in2="t" scale={0.6} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
);

export type Box = { x: number; y: number; w: number; h: number };
export function bbox(pts: V[], m = 0): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  return { x: x0 - m, y: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m };
}

export type Place = { dx: number; dy: number; rot: number; cx: number; cy: number; lift: number | ((p: V) => number); blur?: number };
export const placeT = (p: Place) => `translate(${p.dx.toFixed(3)} ${p.dy.toFixed(3)}) rotate(${p.rot.toFixed(4)} ${p.cx.toFixed(2)} ${p.cy.toFixed(2)})`;
const liftAt = (p: Place, q: V) => (typeof p.lift === 'function' ? p.lift(q) : p.lift);

function shadowPath(pts: V[], p: Place, k: number, base: number): string {
  return pathOf(pts.map((q) => {
    const h = base + liftAt(p, q) * k;
    return { x: q.x + LIGHT.x * h, y: q.y + LIGHT.y * h };
  }));
}

const Blur: React.FC<{ id: string; sd: number; box: Box }> = ({ id, sd, box: b }) => {
  const m = sd * 3.5 + 40;
  return (
    <filter id={id} filterUnits="userSpaceOnUse" x={b.x - m} y={b.y - m} width={b.w + 2 * m} height={b.h + 2 * m}>
      <feGaussianBlur stdDeviation={sd.toFixed(2)} />
    </filter>
  );
};

/** Ambient shadow on the ground (drawn before every piece). */
export const AmbientShadow: React.FC<{ id: string; o: Outline; place: Place; strength?: number }> = ({ id, o, place, strength = 1 }) => {
  const maxLift = Math.max(...o.fringe.map((q) => liftAt(place, q)));
  const sd = 3.6 + maxLift * 0.8;
  const a = (0.78 - Math.min(0.26, maxLift * 0.012)) * strength;
  return (
    <g transform={placeT(place)}>
      <defs><Blur id={`amb-${id}`} sd={sd} box={bbox(o.fringe)} /></defs>
      <path d={shadowPath(o.fringe, place, 1.35, 3.2)} fill={withAlpha('#000000', a)} filter={`url(#amb-${id})`} />
    </g>
  );
};

/** Contact shadow: tight, darkest where the paper touches; fades as the paper lifts. */
export const ContactShadow: React.FC<{ id: string; o: Outline; place: Place }> = ({ id, o, place }) => {
  const maxLift = Math.max(...o.fringe.map((q) => liftAt(place, q)));
  return (
    <g transform={placeT(place)}>
      <defs><Blur id={`con-${id}`} sd={0.8 + maxLift * 0.22} box={bbox(o.fringe)} /></defs>
      <path d={shadowPath(o.fringe, place, 0.5, 0.7)} fill={withAlpha('#000000', Math.max(0.12, 0.55 - maxLift * 0.035))} filter={`url(#con-${id})`} />
    </g>
  );
};

/** A soft graphite marker stroke: irregular edges, slanted ends (never a UI selection box). */
function markerPath(m: Mark, k: number, i: number): string {
  const x0 = m.x0 - 4;
  const x1 = x0 + (m.x1 - m.x0 + 7) * k;
  const top = m.y - m.size * 0.72;
  const bot = m.y + m.size * 0.2;
  const pts: string[] = [];
  for (let x = x0 + 3; x <= x1; x += 4) pts.push(`${x.toFixed(1)} ${(top + fbm(`mk${i}t`, x, [[30, 1.1], [7, 0.5]])).toFixed(2)}`);
  pts.push(`${(x1 + 2).toFixed(1)} ${((top + bot) / 2).toFixed(1)}`);
  for (let x = x1; x >= x0; x -= 4) pts.push(`${x.toFixed(1)} ${(bot + fbm(`mk${i}b`, x, [[30, 1.1], [7, 0.5]])).toFixed(2)}`);
  return `M${pts.join('L')}Z`;
}

export const TextLayer: React.FC<{ runs: Run[]; marks?: Mark[]; rules?: PageLayout['rules']; marked?: number }> = ({ runs, marks = [], rules = [], marked = 1 }) => (
  <g filter="url(#ink)">
    {marks.map((m, i) =>
      m.kind === 'band' ? (
        <path key={`m${i}`} d={markerPath(m, marked, i)} fill={withAlpha(palette.ui.text, 0.1)} />
      ) : null,
    )}
    {rules.map((r, i) => <rect key={`r${i}`} x={r.x0} y={r.y} width={r.x1 - r.x0} height={0.9} fill={withAlpha(palette.ui.text, 0.35)} />)}
    {runs.map((r, i) => (
      <text key={i} x={r.x} y={r.y} fontFamily={r.family} fontSize={r.size} fontWeight={r.weight} fontStyle={r.italic ? 'italic' : 'normal'} fill={r.color} style={{ letterSpacing: r.tracking ? `${r.tracking}px` : undefined, fontKerning: 'normal' }}>
        {r.text}
      </text>
    ))}
    {marks.map((m, i) => {
      if (m.kind !== 'underline') return null;
      const x1 = m.x0 + (m.x1 - m.x0) * marked;
      const pts: string[] = [];
      for (let x = m.x0; x <= x1; x += 3) pts.push(`${x.toFixed(1)},${(m.y + 5 + fbm(`ul${i}`, x, [[40, 0.45], [9, 0.2]])).toFixed(2)}`);
      return <polyline key={`u${i}`} points={pts.join(' ')} fill="none" stroke={withAlpha(palette.ui.text, 0.88)} strokeWidth={1.45} strokeLinecap="round" />;
    })}
  </g>
);

const FibreSet: React.FC<{ fibres: Fibre[]; color?: string }> = ({ fibres, color = FIBRE }) => (
  <g>
    {fibres.map((f, i) => (
      <path key={i} d={f.d} fill="none" stroke={withAlpha(color, f.a)} strokeWidth={f.w} strokeLinecap="round" />
    ))}
  </g>
);

/** Each piece lies at its own slight angle to the key light: a faint directional gradient. */
const Tilt: React.FC<{ id: string; box: Box }> = ({ id, box: b }) => {
  const a = random(`${id}/tilt-a`) * Math.PI * 2;
  const k = (random(`${id}/tilt-k`) - 0.5) * 0.09;
  const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const R = Math.max(b.w, b.h) / 2;
  const col = k > 0 ? '#ffffff' : '#000000';
  return (
    <>
      <defs>
        <linearGradient id={`tilt-${id}`} gradientUnits="userSpaceOnUse" x1={c.x - Math.cos(a) * R} y1={c.y - Math.sin(a) * R} x2={c.x + Math.cos(a) * R} y2={c.y + Math.sin(a) * R}>
          <stop offset="0" stopColor={col} stopOpacity={Math.abs(k)} />
          <stop offset="1" stopColor={col} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={`url(#tilt-${id})`} />
    </>
  );
};

/** One torn piece: white fibrous band, printed surface (paper + text + grain), loose fibres, light. */
export const Piece: React.FC<{
  id: string;
  o: Outline;
  place: Place;
  children?: React.ReactNode;
  tone?: string;
  embedded?: Fibre[];
  /** Extra shading over the surface (e.g. a lifted end catching more light). */
  sheen?: React.ReactNode;
}> = ({ id, o, place, children, tone = PAPER, embedded, sheen }) => {
  const r = bbox(o.fringe, 6);
  return (
  <g transform={placeT(place)} filter={place.blur ? `url(#dof-${id})` : undefined}>
    {place.blur ? <defs><Blur id={`dof-${id}`} sd={place.blur} box={r} /></defs> : null}
    <defs>
      <clipPath id={`clip-${id}`} clipPathUnits="userSpaceOnUse">
        <path d={pathOf(o.surface)} />
      </clipPath>
    </defs>
    {o.tearline.length ? <path d={pathOf(o.fringe)} fill={BAND} filter="url(#fray)" /> : null}
    <g clipPath={`url(#clip-${id})`}>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={tone} />
      {embedded ? <FibreSet fibres={embedded} color={palette.ui.text} /> : null}
      {children}
      <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#ffffff" filter="url(#paperTex)" style={{ mixBlendMode: 'multiply' }} />
      <Tilt id={id} box={r} />
      {sheen}
    </g>
    <FibreSet fibres={o.fibres} />
  </g>
  );
};

export { BAND, FIBRE, PAPER };
export const SERIF = fonts.serif;
