/**
 * LAB ONLY — E3 cinematic motion. Same to-dos as v009 (the subject stays fixed; only the camera
 * language changes).
 *   e3-cam-current     production: ScatterMemo planes + CameraRig smooth push (today's openings)
 *   e3-rack-css        CSS 3D parallax: a real perspective camera trucks across three depths;
 *                      focus racks from a near to-do to the hero to-do, which then resolves;
 *                      depth of field = per-plane CSS blur from |z − focus| (no dependency)
 *   e3-rack-lens       the same shot, depth of field from lensBlur() (hexagonal bokeh, highlight
 *                      gain) on per-memo canvases instead of CSS blur
 *   e3-whip-none       a card whips in, then a whip pan swaps it for the next one (no blur)
 *   e3-whip-mblur      the same with HtmlInCanvasMotionBlur (8 samples, 180°), only while fast
 *   e3-whip-svg        the same with a velocity-scaled directional SVG blur (one pass)
 *   e3-whip-mblur2     HtmlInCanvasMotionBlur always on (no `disabled` toggle): isolates the capture error
 *   e3-whip-accum      true multi-sample blur without HtmlInCanvas: N sub-frame DOM samples summed with
 *                      `mix-blend-mode: plus-lighter` at 1/N inside an isolated group (the same
 *                      'lighter' + globalAlpha 1/N average the package draws on canvas), only while fast
 *   e3-trail-css       a lime signal runs a drawn path between three steps: SVG comet tail
 *   e3-trail-effect    the same with lightTrail() along the path's tangent
 */
import { evolvePath, getLength, getPointAtLength, getTangentAtLength } from '@remotion/paths';
import { HtmlInCanvasMotionBlur } from '@remotion/motion-blur';
import { lensBlur } from '@remotion/effects/lens-blur';
import { lightTrail } from '@remotion/effects/light-trail';
import { AbsoluteFill, HtmlInCanvas } from 'remotion';
import { fonts, palette, type } from '../../../src/brand/tokens.ts';
import { ease, lerp, progress, sub, withAlpha } from '../../../src/remotion/lib/anim.ts';
import { useLayout, useTime } from '../../../src/remotion/lib/hooks.ts';
import { CameraRig } from '../../../src/remotion/motion/Camera.tsx';
import { cardSurface, UILabel, UIText } from '../../../src/remotion/ui/Card.tsx';
import { MEMO, MemoContent, memoSurface, memoWidth, type MemoData } from '../../../src/remotion/ui/Memo.tsx';
import { ScatterMemo } from '../../../src/remotion/ui/Scatter.tsx';
import { Stage } from '../shared.tsx';

const TODOS: MemoData[] = [
  { text: 'Did Maya’s payment clear?', tag: 'Not checked' },
  { text: 'Add Maya to my customers' },
  { text: 'Check in with Maya Friday' },
  { text: 'Reply to Maya’s email' },
  { text: 'Send Maya her login', tag: 'Waiting 2h' },
  { text: 'Where’s the welcome PDF?' },
  { text: 'Update the sales sheet' },
];

// ---------------------------------------------------------------------------------------------
// Baseline

export const CamCurrent: React.FC = () => (
  <Stage tag="E3 · A · current · ScatterMemo + CameraRig smooth">
    <CameraRig
      smooth
      keys={[
        { t: 0, zoom: 1, x: 0, y: 0 },
        { t: 4, zoom: 1.12, x: 0, y: 0 },
      ]}
    >
      {TODOS.map((m, i) => (
        <ScatterMemo key={i} frag={m} index={i} leaveAt={99} />
      ))}
    </CameraRig>
  </Stage>
);

// ---------------------------------------------------------------------------------------------
// Parallax + rack focus (pure scene layout: memos placed in camera space, z toward the viewer)

const PERSPECTIVE = 1600;
type Placed = { memo: MemoData; x: number; y: number; z: number; rot: number; hero?: boolean };
/** Base units, 1080 × 1920 frame; centre of the live area ≈ (540, 758). Placement solved from the
 *  camera (2026-11-19 review: the first version put the opening focus subject, a near memo, off
 *  frame in the bottom unsafe band, so nothing in the live area was sharp for 1.3 s):
 *  - near memo (z 450, ×1.39 at the start) opens sharp at screen ≈ (110, 440), leaves left as the
 *    camera trucks right (parallax);
 *  - the hero (z 0) starts right of centre, blurred, and lands centred (≈ 540, 700) as focus arrives;
 *  - a second near memo crosses the top edge, out of focus (foreground depth only). */
const HERO_W = memoWidth(TODOS[4]!);
export const RACK_WORLD: Placed[] = [
  { memo: TODOS[0]!, x: -40, y: 300, z: -1400, rot: -3 },
  { memo: TODOS[1]!, x: 620, y: 420, z: -1400, rot: 2.5 },
  { memo: TODOS[2]!, x: 120, y: 1180, z: -1400, rot: 2 },
  { memo: TODOS[5]!, x: 660, y: 1060, z: -1400, rot: -2 },
  { memo: TODOS[4]!, x: 640 - HERO_W / 2, y: 709 - MEMO.height / 2, z: 0, rot: -1.5, hero: true },
  { memo: TODOS[3]!, x: 131, y: 529, z: 450, rot: 2.5 },
  { memo: TODOS[6]!, x: 610, y: 380, z: 620, rot: -4 },
];
/** Circle of confusion (px on screen) for a plane at z with the focus at zf. */
export const coc = (z: number, zf: number) => Math.min(20, Math.abs(z - zf) * 0.02);
const FOCUS = { near: 450, hero: 0 };

function useRack() {
  const { frame, f } = useTime();
  const truck = progress(frame, 0, f(4), ease.inOut);
  const rack = progress(frame, f(1.3), f(0.8), ease.inOut);
  return {
    camX: lerp(-100, 100, truck),
    camZ: lerp(0, 240, truck),
    focus: lerp(FOCUS.near, FOCUS.hero, rack),
    resolve: progress(frame, f(2.5), f(0.5), ease.snap),
    strike: progress(frame, f(2.8), f(0.5), ease.out),
  };
}

const Rack: React.FC<{ lens: boolean; tag: string }> = ({ lens, tag }) => {
  const { u, safe, width } = useLayout();
  const cam = useRack();
  return (
    <Stage tag={tag}>
      <AbsoluteFill style={{ perspective: PERSPECTIVE * u, perspectiveOrigin: `${width / 2}px ${safe.cy}px` }}>
        <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: `translate3d(${(-cam.camX * u).toFixed(2)}px, 0, ${(cam.camZ * u).toFixed(2)}px)` }}>
          {RACK_WORLD.map((p, i) => {
            // Blur in screen px → in plane px: the plane is magnified by P/(P − z_eff).
            const zEff = p.z + cam.camZ;
            const mag = PERSPECTIVE / (PERSPECTIVE - zEff);
            const blurScreen = coc(p.z, cam.focus);
            const blurPlane = (blurScreen / mag) * u;
            const w = memoWidth(p.memo) * u;
            const h = MEMO.height * u;
            const resolved = p.hero ? { label: 'Sent', check: cam.resolve, strike: cam.strike } : undefined;
            const body = (
              <div style={{ position: 'relative', width: w, height: h, ...memoSurface(u) }}>
                <MemoContent memo={p.memo} u={u} resolved={resolved} />
              </div>
            );
            const pad = Math.ceil(blurPlane * 2.2 + 30 * u);
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: p.x * u - pad,
                  top: p.y * u - pad,
                  transform: `translateZ(${p.z * u}px) rotate(${p.rot}deg)`,
                  opacity: p.z < -1000 ? 0.75 : 1,
                }}
              >
                {lens ? (
                  <HtmlInCanvas
                    width={Math.ceil(w + 2 * pad)}
                    height={Math.ceil(h + 2 * pad)}
                    style={{ position: 'absolute', left: 0, top: 0, width: Math.ceil(w + 2 * pad), height: Math.ceil(h + 2 * pad) }}
                    effects={[lensBlur({ radius: blurPlane, irisShape: 'hexagon', irisRoundness: 0.25, highlightGain: 0.35, highlightThreshold: 0.72, samples: 96, linearLight: true, disabled: blurPlane < 0.35 })]}
                  >
                    <AbsoluteFill style={{ padding: pad }}>{body}</AbsoluteFill>
                  </HtmlInCanvas>
                ) : (
                  <div style={{ padding: pad, filter: blurPlane >= 0.35 ? `blur(${blurPlane.toFixed(2)}px)` : undefined }}>{body}</div>
                )}
              </div>
            );
          })}
        </AbsoluteFill>
      </AbsoluteFill>
    </Stage>
  );
};
export const RackCss: React.FC = () => <Rack lens={false} tag="E3 · B · experiment · CSS 3D parallax + rack focus (CSS blur)" />;
export const RackLens: React.FC = () => <Rack lens tag="E3 · C · experiment · same shot, lensBlur() bokeh" />;

// ---------------------------------------------------------------------------------------------
// Whip: fast travel with and without motion blur

const CARD = { w: 760, h: 430 };
/** x (base units) of each card's left edge at frame t (pure; fractional frames allowed). */
export function whipX(t: number, fps: number): { a: number; b: number } {
  const centre = (1080 - CARD.w) / 2;
  const arrive = progress(t, 0, 0.5 * fps, ease.snap);
  const swap = progress(t, 1.35 * fps, 0.5 * fps, ease.snap);
  return { a: lerp(-1300, centre, arrive) + swap * 1500, b: lerp(-1300, centre, swap) };
}

const WhipCard: React.FC<{ title: string; rows: Array<[string, string, boolean]>; x: number; u: number; top: number; filter?: string }> = ({ title, rows, x, u, top, filter }) => (
  <div style={{ position: 'absolute', left: x * u, top, width: CARD.w * u, height: CARD.h * u, ...cardSurface(u), overflow: 'hidden', filter }}>
    <div style={{ height: 76 * u, display: 'flex', alignItems: 'center', padding: `0 ${30 * u}px`, borderBottom: `${1.5 * u}px solid ${palette.ui.border}` }}>
      <UILabel u={u}>{title}</UILabel>
    </div>
    {rows.map(([a, b, done], i) => (
      <div key={i} style={{ height: 112 * u, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${30 * u}px`, borderBottom: i < rows.length - 1 ? `${1.5 * u}px solid ${palette.ui.border}` : undefined }}>
        <UIText u={u} role="uiTitle">
          {a}
        </UIText>
        <div style={{ fontFamily: fonts.sans, fontSize: type.uiChip.size * 1.3 * u, fontWeight: type.uiChip.weight, padding: `${8 * u}px ${18 * u}px`, borderRadius: 999, background: done ? palette.signal : palette.ui.well, color: done ? palette.signalInk : palette.ui.textMuted }}>{b}</div>
      </div>
    ))}
  </div>
);

const WhipWorld: React.FC<{ frame: number; fps: number; svg?: boolean }> = ({ frame, fps, svg }) => {
  const { u, safe } = useLayout();
  const p = whipX(frame, fps);
  const prev = whipX(frame - 1, fps);
  const top = safe.cy - (CARD.h * u) / 2;
  // Directional blur sized to the distance travelled during a 180° shutter (half a frame).
  const sigma = (dx: number) => Math.min(60, Math.abs(dx) * u * 0.5 * 0.5);
  const fA = svg && sigma(p.a - prev.a) > 0.5 ? `url(#mb-a)` : undefined;
  const fB = svg && sigma(p.b - prev.b) > 0.5 ? `url(#mb-b)` : undefined;
  return (
    <AbsoluteFill>
      {svg ? (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <filter id="mb-a" x="-40%" y="0" width="180%" height="100%">
            <feGaussianBlur stdDeviation={`${sigma(p.a - prev.a).toFixed(2)} 0`} />
          </filter>
          <filter id="mb-b" x="-40%" y="0" width="180%" height="100%">
            <feGaussianBlur stdDeviation={`${sigma(p.b - prev.b).toFixed(2)} 0`} />
          </filter>
        </svg>
      ) : null}
      <WhipCard u={u} top={top} x={p.a} filter={fA} title="Today · by hand" rows={[['Payment check', 'To do', false], ['Send login', 'To do', false], ['Add to customers', 'To do', false]]} />
      <WhipCard u={u} top={top} x={p.b} filter={fB} title="Today · by the system" rows={[['Payment check', 'Done 9:12', true], ['Send login', 'Sent 9:12', true], ['Add to customers', 'Added', true]]} />
    </AbsoluteFill>
  );
};

/** Frame-driven child for HtmlInCanvasMotionBlur (it re-renders the subtree at fractional frames). */
const WhipFromFrame: React.FC = () => {
  const { frame, fps } = useTime();
  return <WhipWorld frame={frame} fps={fps} />;
};

export const WhipNone: React.FC = () => (
  <Stage tag="E3 · D · whip, no motion blur">
    <WhipFromFrame />
  </Stage>
);

export const WhipMblur: React.FC = () => {
  const { frame, fps, f } = useTime();
  const { width, height } = useLayout();
  // Selective: blur only while something moves fast (arrival 0–0.5 s, swap 1.35–1.85 s).
  const fast = frame < f(0.55) || (frame >= f(1.33) && frame < f(1.9));
  void fps;
  return (
    <Stage tag="E3 · E · HtmlInCanvasMotionBlur 8 samples (only while fast)">
      <HtmlInCanvasMotionBlur width={width} height={height} samples={8} shutterAngle={180} disabled={!fast}>
        <WhipFromFrame />
      </HtmlInCanvasMotionBlur>
    </Stage>
  );
};

export const WhipSvg: React.FC = () => {
  const { frame, fps } = useTime();
  return (
    <Stage tag="E3 · F · velocity-scaled directional SVG blur">
      <WhipWorld frame={frame} fps={fps} svg />
    </Stage>
  );
};

export const WhipMblur2: React.FC = () => {
  const { width, height } = useLayout();
  return (
    <Stage tag="E3 · E2 · HtmlInCanvasMotionBlur, always on">
      <HtmlInCanvasMotionBlur width={width} height={height} samples={8} shutterAngle={180}>
        <WhipFromFrame />
      </HtmlInCanvasMotionBlur>
    </Stage>
  );
};

/** Sub-frame sample offsets (frames) for an N-sample, `angle`° shutter centred on the frame. */
export const shutterOffsets = (n: number, angle: number) => Array.from({ length: n }, (_, k) => ((k + 0.5) / n - 0.5) * (angle / 360));

export const WhipAccum: React.FC = () => {
  const { frame, fps, f } = useTime();
  const fast = frame < f(0.55) || (frame >= f(1.33) && frame < f(1.9));
  const offsets = fast ? shutterOffsets(8, 180) : [0];
  return (
    <Stage tag="E3 · G · 8 sub-frame DOM samples, plus-lighter average (only while fast)">
      <AbsoluteFill style={{ isolation: 'isolate' }}>
        {offsets.map((o, k) => (
          <AbsoluteFill key={k} style={offsets.length > 1 ? { mixBlendMode: 'plus-lighter', opacity: 1 / offsets.length } : undefined}>
            <WhipWorld frame={frame + o} fps={fps} />
          </AbsoluteFill>
        ))}
      </AbsoluteFill>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------
// The signal runs the steps: comet tail vs lightTrail()

const STEPS = ['Payment clears', 'Login sent', 'Customer added'];
/** The route through the three steps (base units). */
export const TRAIL_PATH = 'M 240 420 C 560 420, 760 560, 760 760 S 420 980, 300 1100';
const STEP_AT = [0, 0.5, 1];
/** The route's bounds + 120 for the trail (base units). */
const BOX = { x: 120, y: 300, w: 760, h: 920 };

const TrailWorld: React.FC<{ comet: boolean; part?: 'all' | 'route' | 'steps' }> = ({ comet, part = 'all' }) => {
  const { frame, f } = useTime();
  const { u } = useLayout();
  const run = progress(frame, f(0.4), f(2.0), ease.inOut);
  const len = getLength(TRAIL_PATH);
  const head = getPointAtLength(TRAIL_PATH, run * len) ?? { x: 0, y: 0 };
  const drawn = evolvePath(run, TRAIL_PATH);
  const tailSegs = 14;
  return (
    <>
      {part === 'steps' ? null : <svg width={1080 * u} height={1920 * u} viewBox="0 0 1080 1920" style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d={TRAIL_PATH} fill="none" stroke={palette.hairlineStrong} strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round" />
        <path d={TRAIL_PATH} fill="none" stroke={withAlpha(palette.signal, 0.55)} strokeWidth={3} strokeDasharray={drawn.strokeDasharray} strokeDashoffset={drawn.strokeDashoffset} strokeLinecap="round" />
        {comet
          ? Array.from({ length: tailSegs }, (_, k) => {
              // Segment k covers [run − (k+1)·L, run − k·L] of the path; brighter and wider near the head.
              const L = 0.012;
              const a = Math.max(0, run - (k + 1) * L);
              const b = Math.max(0, run - k * L);
              if (b <= a || run <= 0) return null;
              const fade = 1 - k / tailSegs;
              return <path key={k} d={TRAIL_PATH} fill="none" stroke={palette.signal} strokeOpacity={fade * 0.9} strokeWidth={2 + 7 * fade} strokeLinecap="butt" strokeDasharray={`${((b - a) * len).toFixed(2)} ${(2 * len).toFixed(0)}`} strokeDashoffset={(-a * len).toFixed(2)} />;
            })
          : null}
        {run > 0 && run < 1 ? <circle cx={head.x} cy={head.y} r={9} fill={palette.signal} /> : null}
      </svg>}
      {part === 'route' ? null : STEPS.map((s, i) => {
        const pt = getPointAtLength(TRAIL_PATH, STEP_AT[i]! * len) ?? { x: 0, y: 0 };
        const lit = run >= STEP_AT[i]! - 0.001 && run > 0;
        const k = sub(run, STEP_AT[i]! - 0.02, STEP_AT[i]! + 0.06);
        return (
          <div key={s} style={{ position: 'absolute', left: (pt.x + 34) * u, top: (pt.y - 34) * u, height: 68 * u, display: 'flex', alignItems: 'center', gap: 16 * u, padding: `0 ${26 * u}px`, borderRadius: 18 * u, background: palette.memoryCard, border: `${1.5 * u}px solid ${lit ? withAlpha(palette.signal, 0.6 * k) : palette.hairline}`, fontFamily: fonts.sans, fontSize: type.memo.size * u, fontWeight: type.memo.weight, letterSpacing: type.memo.tracking, color: palette.memoryText, whiteSpace: 'nowrap' }}>
            <div style={{ width: 14 * u, height: 14 * u, borderRadius: 99, background: lit ? palette.signal : palette.smoke }} />
            {s}
          </div>
        );
      })}
    </>
  );
};

export const TrailCss: React.FC = () => (
  <Stage tag="E3 · G · evolvePath + SVG comet tail">
    <TrailWorld comet />
  </Stage>
);

export const TrailEffect: React.FC = () => {
  const { frame, f } = useTime();
  const { u, width, height } = useLayout();
  const run = progress(frame, f(0.4), f(2.0), ease.inOut);
  const len = getLength(TRAIL_PATH);
  const tan = getTangentAtLength(TRAIL_PATH, Math.min(len, run * len)) ?? { x: 1, y: 0 };
  // The trail streams behind the head: opposite to the direction of travel (degrees, screen).
  const dir = (Math.atan2(-tan.y, -tan.x) * 180) / Math.PI;
  const speed = run > 0 && run < 1 ? 1 : 0;
  return (
    <Stage tag="E3 · H · evolvePath + lightTrail()">
      {/* Canvas sized to the route's bounds (+ room for the trail), not the frame. */}
      <HtmlInCanvas
        width={Math.round(BOX.w * u)}
        height={Math.round(BOX.h * u)}
        style={{ position: 'absolute', left: BOX.x * u, top: BOX.y * u, width: Math.round(BOX.w * u), height: Math.round(BOX.h * u) }}
        effects={[lightTrail({ direction: dir, distance: 110 * u * speed, intensity: 0.9, decay: 0.92, threshold: 0.6, samples: 32, color: palette.signal, disabled: speed === 0 })]}
      >
        <div style={{ position: 'absolute', left: -BOX.x * u, top: -BOX.y * u, width, height }}>
          <TrailWorld comet={false} part="route" />
        </div>
      </HtmlInCanvas>
      <TrailWorld comet={false} part="steps" />
    </Stage>
  );
};
