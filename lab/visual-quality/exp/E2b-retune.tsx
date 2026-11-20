/**
 * LAB ONLY — E2 re-tune + cheaper ways to get the same paper and tear (Phase 3, step 1).
 * The E2 chains cost 1.5–2.0 s/frame. Every variant here shows the same note, tuned look
 * (paper() amount 0.3, no drops; tear progress ≤ 1.1, rotation 6°), so only the cost changes:
 *
 *   e2r-paper-tuned     full chain per frame (paper + roughenEdges + dropShadow) — the reference
 *   e2r-paper-half      the same chain at pixelDensity 0.5 (a quarter of the pixels)
 *   e2r-paper-baked     PRE-RENDER: the paper plate baked once (e2r-plate-tight), then a plain
 *                       <Img> + CSS drop-shadow per frame
 *   e2r-tear-tuned      full chain per frame (DOM capture + paper + edges + tear + shadow)
 *   e2r-tear-img        the baked plate as <Img effects={[tear, dropShadow]}>: no DOM capture,
 *                       no paper()/roughenEdges() per frame
 *   e2r-tear-selective  SELECTIVE: baked plate (no effect) until the rip, tear only while it moves,
 *                       a baked final-state plate for the hold
 *   e2r-tear-seq        COMPOSITE: the whole tear pre-rendered once as a transparent PNG sequence
 *                       (e2r-plate-tear), played back as <Img> per frame
 *   e2r-tear-dom        NO EFFECT: the baked plate split by a seeded jagged clip-path, white fibre
 *                       edge, CSS drop-shadow; the seam opens from the top like a real tear
 *
 * Plates (transparent, sized to the object) render first into out/lab/visual-quality/plates/,
 * served to the lab bundle as /plates (render.ts). Geometry is shared through the pure helpers
 * below so plate and composite line up to the pixel.
 */
import { AbsoluteFill, HtmlInCanvas, Img, random, staticFile } from 'remotion';
import { dropShadow } from '@remotion/effects/drop-shadow';
import { paper } from '@remotion/effects/paper';
import { roughenEdges } from '@remotion/effects/roughen-edges';
import { tear } from '@remotion/effects/tear';
import { computeLayout } from '../../../src/brand/format.ts';
import { palette, type } from '../../../src/brand/tokens.ts';
import { ease, lerp, progress, sub, withAlpha } from '../../../src/remotion/lib/anim.ts';
import { useLayout, useTime } from '../../../src/remotion/lib/hooks.ts';
import { Stage } from '../shared.tsx';
import { Note } from './E2-materials.tsx';

// ---------------------------------------------------------------------------------------------
// Pure geometry (shared by plates and composites)

const U = computeLayout(1080, 1920).u;
export const NOTE = { w: 820 * U, h: 560 * U };
/** Plate margins: `tight` = room for the deckle edge, `wide` = room for the parted halves. */
export const MARGIN = { tight: 60 * U, wide: 220 * U };
export const plateSize = (m: number) => ({ w: Math.round(NOTE.w + 2 * m), h: Math.round(NOTE.h + 2 * m) });
export const PLATE = { tight: plateSize(MARGIN.tight), wide: plateSize(MARGIN.wide) };

/** Tear timeline (frames at 30 fps): pull, rip (resists then gives), drift, hold. */
export function tearTimeline(frame: number, f: (s: number) => number) {
  const rip = progress(frame, f(0.55), f(0.9), ease.snap);
  const drift = progress(frame, f(1.45), f(1.0), ease.glide);
  const tug = Math.sin(Math.PI * sub(frame, f(0.35), f(0.6))) * 6 * U;
  return { rip, drift, tug, p: Math.min(1.1, rip * 1.0 + drift * 0.1), live: frame >= f(0.55) && frame < f(2.45) };
}
export const TEAR = { angle: 6, rotation: 6, jaggedness: 14 * U } as const;
export const SHADOW = { radius: 24 * U, offsetX: 8 * U, offsetY: 22 * U, opacity: 0.48 };
const cssShadow = (s: { radius: number; offsetX: number; offsetY: number; opacity: number }) =>
  `drop-shadow(${s.offsetX.toFixed(2)}px ${s.offsetY.toFixed(2)}px ${(s.radius / 2).toFixed(2)}px ${withAlpha(palette.ink, s.opacity)})`;

/** The tuned paper: a quiet sheet, not granite (E2 verdict). */
export const paperTuned = (seed: number) =>
  paper({ amount: 0.3, colorFront: palette.paper, colorBack: palette.ui.surface, contrast: 0.3, roughness: 0.35, fiber: 0.45, fiberSize: 0.2, crumples: 0.15, crumpleSize: 0.4, folds: 0.35, foldCount: 2, drops: 0, seed, scale: 0.7 });
const edges = () => roughenEdges({ amount: 0.9, border: 9 * U, scale: 0.09, seed: 41 });

/** Where a plate of margin m sits on the 1080×1920 stage (centre of the live area). */
function placement(width: number, cy: number, m: number) {
  return { left: (width - NOTE.w) / 2 - m, top: cy - NOTE.h / 2 - m };
}

// ---------------------------------------------------------------------------------------------
// Plates (transparent compositions sized to the object; rendered once by render.ts)

const NoteCanvas: React.FC<{ m: number }> = ({ m }) => {
  const s = plateSize(m);
  return (
    <HtmlInCanvas width={s.w} height={s.h} style={{ position: 'absolute', left: 0, top: 0, width: s.w, height: s.h }} effects={[paperTuned(17), edges()]}>
      <AbsoluteFill style={{ padding: m }}>
        <Note u={U} w={NOTE.w} h={NOTE.h} />
      </AbsoluteFill>
    </HtmlInCanvas>
  );
};
export const PlateTight: React.FC = () => <NoteCanvas m={MARGIN.tight} />;
export const PlateWide: React.FC = () => <NoteCanvas m={MARGIN.wide} />;

const WIDE_SRC = () => staticFile('plates/e2r-plate-wide.png');
const TIGHT_SRC = () => staticFile('plates/e2r-plate-tight.png');

/** The tear on the baked plate (no DOM capture, no paper()). Used live and as the plate source. */
const TearImg: React.FC<{ p: number; style?: React.CSSProperties }> = ({ p, style }) => (
  <Img
    src={WIDE_SRC()}
    width={PLATE.wide.w}
    height={PLATE.wide.h}
    style={{ position: 'absolute', left: 0, top: 0, width: PLATE.wide.w, height: PLATE.wide.h, ...style }}
    effects={[tear({ progress: p, ...TEAR }), dropShadow({ ...SHADOW, color: palette.ink })]}
  />
);
export const PlateTear: React.FC = () => {
  const { frame, f } = useTime();
  return <TearImg p={tearTimeline(frame, f).p} />;
};

// ---------------------------------------------------------------------------------------------
// Paper composites

const PaperLive: React.FC<{ tag: string; pixelDensity?: number }> = ({ tag, pixelDensity }) => {
  const { frame, f } = useTime();
  const { safe, width } = useLayout();
  const m = 120 * U;
  const lift = progress(frame, f(0.2), f(1.4), ease.glide);
  const s = plateSize(m);
  const at = placement(width, safe.cy, m);
  return (
    <Stage tag={tag}>
      <HtmlInCanvas
        width={s.w}
        height={s.h}
        pixelDensity={pixelDensity}
        style={{ position: 'absolute', left: at.left, top: at.top - lift * 10 * U, width: s.w, height: s.h, transform: `rotate(${lerp(-2.2, -1.6, lift)}deg)` }}
        effects={[
          paperTuned(17),
          edges(),
          dropShadow({ radius: lerp(10, 34, lift) * U, offsetX: lerp(3, 12, lift) * U, offsetY: lerp(8, 30, lift) * U, opacity: lerp(0.55, 0.42, lift), color: palette.ink }),
        ]}
      >
        <AbsoluteFill style={{ padding: m }}>
          <Note u={U} w={NOTE.w} h={NOTE.h} />
        </AbsoluteFill>
      </HtmlInCanvas>
    </Stage>
  );
};
export const PaperTuned: React.FC = () => <PaperLive tag="E2R · paper() tuned · live chain" />;
export const PaperHalf: React.FC = () => <PaperLive tag="E2R · paper() tuned · pixelDensity 0.5" pixelDensity={0.5} />;

export const PaperBaked: React.FC = () => {
  const { frame, f } = useTime();
  const { safe, width } = useLayout();
  const lift = progress(frame, f(0.2), f(1.4), ease.glide);
  const at = placement(width, safe.cy, MARGIN.tight);
  const sh = { radius: lerp(10, 34, lift) * U, offsetX: lerp(3, 12, lift) * U, offsetY: lerp(8, 30, lift) * U, opacity: lerp(0.55, 0.42, lift) };
  return (
    <Stage tag="E2R · paper baked once · Img + CSS shadow">
      <Img
        src={TIGHT_SRC()}
        style={{ position: 'absolute', left: at.left, top: at.top - lift * 10 * U, width: PLATE.tight.w, height: PLATE.tight.h, transform: `rotate(${lerp(-2.2, -1.6, lift)}deg)`, filter: cssShadow(sh) }}
      />
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------
// Tear composites

export const TearTuned: React.FC = () => {
  const { frame, f } = useTime();
  const { safe, width } = useLayout();
  const t = tearTimeline(frame, f);
  const m = MARGIN.wide;
  const at = placement(width, safe.cy, m);
  return (
    <Stage tag="E2R · tear() tuned · live chain">
      <HtmlInCanvas
        width={PLATE.wide.w}
        height={PLATE.wide.h}
        style={{ position: 'absolute', left: at.left, top: at.top - t.tug, width: PLATE.wide.w, height: PLATE.wide.h, transform: 'rotate(-1.6deg)' }}
        effects={[paperTuned(17), edges(), tear({ progress: t.p, ...TEAR }), dropShadow({ ...SHADOW, color: palette.ink })]}
      >
        <AbsoluteFill style={{ padding: m }}>
          <Note u={U} w={NOTE.w} h={NOTE.h} />
        </AbsoluteFill>
      </HtmlInCanvas>
    </Stage>
  );
};

const useTearPlace = () => {
  const { frame, f } = useTime();
  const { safe, width } = useLayout();
  const t = tearTimeline(frame, f);
  const at = placement(width, safe.cy, MARGIN.wide);
  return { frame, f, t, base: { left: at.left, top: at.top - t.tug, transform: 'rotate(-1.6deg)' } as const };
};

export const TearOnImg: React.FC = () => {
  const { t, base } = useTearPlace();
  return (
    <Stage tag="E2R · tear() on the baked plate">
      <TearImg p={t.p} style={base} />
    </Stage>
  );
};

export const TearSelective: React.FC = () => {
  const { frame, f, t, base } = useTearPlace();
  const hold = frame >= f(2.45);
  return (
    <Stage tag="E2R · selective: effect only while it tears">
      {t.live ? (
        <TearImg p={t.p} style={base} />
      ) : (
        <Img
          src={hold ? staticFile(`plates/e2r-plate-tear/f-${String(f(2.45)).padStart(3, '0')}.png`) : WIDE_SRC()}
          style={{ position: 'absolute', width: PLATE.wide.w, height: PLATE.wide.h, ...base, filter: hold ? undefined : cssShadow(SHADOW) }}
        />
      )}
    </Stage>
  );
};

export const TearSequence: React.FC = () => {
  const { frame, base } = useTearPlace();
  return (
    <Stage tag="E2R · pre-rendered PNG sequence, composited">
      <Img src={staticFile(`plates/e2r-plate-tear/f-${String(frame).padStart(3, '0')}.png`)} style={{ position: 'absolute', width: PLATE.wide.w, height: PLATE.wide.h, ...base }} />
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------
// The tear without an effect: jagged clip-path halves (pure, seeded)

type P = { x: number; y: number };
/** The seam from the top edge to the bottom edge of the note (plate coordinates, margin m). */
export function seam(m: number, seed: number): P[] {
  // Two octaves, like torn paper: a slow wander (the tear's path) + a fine fibre jitter.
  const slope = Math.tan((TEAR.angle * Math.PI) / 180);
  const wanderStep = 46 * U;
  const wander = (y: number) => {
    const k = Math.floor(y / wanderStep);
    const a = (random(`${seed}-w-${k}`) - 0.5) * 2 * TEAR.jaggedness;
    const b = (random(`${seed}-w-${k + 1}`) - 0.5) * 2 * TEAR.jaggedness;
    const t = y / wanderStep - k;
    return lerp(a, b, t * t * (3 - 2 * t));
  };
  const pts: P[] = [];
  let y = 0;
  let i = 0;
  while (y < NOTE.h) {
    const fine = (random(`${seed}-x-${i}`) - 0.5) * 5 * U;
    pts.push({ x: m + NOTE.w / 2 + slope * (y - NOTE.h / 2) + wander(y) + fine, y: m + y });
    y += (3 + random(`${seed}-y-${i}`) * 5) * U;
    i++;
  }
  pts.push({ x: m + NOTE.w / 2 + slope * (NOTE.h / 2) + wander(NOTE.h), y: m + NOTE.h });
  // Extend past the deckle edge so the clip never shaves the rough border.
  return [{ x: pts[0]!.x, y: 0 }, ...pts, { x: pts[pts.length - 1]!.x, y: 2 * m + NOTE.h }];
}
/** The torn fibre: the seam pushed `side` (−1 left, +1 right) by a ragged 1.5–6 px. */
function fibre(s: P[], side: number, seed: number): P[] {
  return s.map((p, i) => ({ x: p.x + side * (2 + random(`${seed}-f-${i}`) * 6) * U, y: p.y }));
}
/** A thin ragged band along the seam on the given side (only within the note's height). */
const band = (inner: P[], side: number, seed: number): P[] => [...inner, ...fibre(inner, side, seed).reverse()];
const poly = (pts: P[]) => `polygon(${pts.map((p) => `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`).join(', ')})`;

export const TearDom: React.FC = () => {
  const { t, base } = useTearPlace();
  const m = MARGIN.wide;
  const W = PLATE.wide.w;
  const H = PLATE.wide.h;
  const s = seam(m, 7);
  const hinge = s[s.length - 2]!; // where the seam meets the bottom edge
  const inner = s.slice(1, -1); // the seam inside the note (no extension past the deckle)
  // Rip: the halves open as a wedge about the hinge (the top parts first, like a tear running
  // down). Drift: they let go of each other and part. Matches tear()'s p ≤ 1.1, rotation 6°.
  const halves = [
    { side: -1, clip: [{ x: 0, y: 0 }, ...s, { x: 0, y: H }], fib: band(inner, 1, 3) },
    { side: 1, clip: [{ x: W, y: 0 }, ...s, { x: W, y: H }], fib: band(inner, -1, 5) },
  ];
  if (t.rip === 0) {
    return (
      <Stage tag="E2R · no effect: clip-path halves + fibre + CSS shadow">
        <Img src={WIDE_SRC()} style={{ position: 'absolute', width: W, height: H, ...base, filter: cssShadow(SHADOW) }} />
      </Stage>
    );
  }
  return (
    <Stage tag="E2R · no effect: clip-path halves + fibre + CSS shadow">
      <div style={{ position: 'absolute', width: W, height: H, ...base }}>
        {halves.map((hv) => {
          const rot = hv.side * (t.rip * 2.4 + t.drift * 3.6);
          const dx = hv.side * (t.rip * 6 + t.drift * 46) * U;
          const dy = t.drift * 10 * U;
          return (
            <div
              key={hv.side}
              style={{ position: 'absolute', inset: 0, transformOrigin: `${hinge.x}px ${hinge.y}px`, transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`, filter: cssShadow(SHADOW) }}
            >
              <div style={{ position: 'absolute', inset: 0, background: palette.ui.surface, clipPath: poly(hv.fib), opacity: t.rip > 0 ? 1 : 0 }} />
              <Img src={WIDE_SRC()} style={{ position: 'absolute', inset: 0, width: W, height: H, clipPath: poly(hv.clip) }} />
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

/** Gallery label helper (type token for the tag size, kept here so E2b has no raw sizes). */
export const LABEL_SIZE = type.label.size;
