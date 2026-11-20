/**
 * LAB ONLY — E2 physical materials through @remotion/effects 4.0.539 on <HtmlInCanvas>.
 * Each canvas is sized to its object (+ a margin for the shadow/curl), not the full frame:
 * the effect chain's cost scales with canvas area.
 *   e2-paper-effects    paper() + roughenEdges() + dropShadow() on a DOM note; the note lifts
 *   e2-tear-effects     the same note, tear() along a jagged seam
 *   e2-pageturn         an overdue invoice curls away (pageTurn) to show the paid one under it
 *   e2-toggle-current   ToggleMark + SoftLight (production)
 *   e2-toggle-material  the switch with bevelAlpha() + shine() sweep on the click + glow()
 * Baselines e2-paper-current / e2-tear-current are lab/paper-look's LookPage / LookTear.
 */
import { AbsoluteFill, HtmlInCanvas } from 'remotion';
import { bevelAlpha } from '@remotion/effects/bevel-alpha';
import { dropShadow } from '@remotion/effects/drop-shadow';
import { glow } from '@remotion/effects/glow';
import { pageTurn } from '@remotion/effects/page-turn';
import { paper } from '@remotion/effects/paper';
import { roughenEdges } from '@remotion/effects/roughen-edges';
import { shine } from '@remotion/effects/shine';
import { tear } from '@remotion/effects/tear';
import { fonts, palette, radius, type } from '../../../src/brand/tokens.ts';
import { ToggleMark } from '../../../src/remotion/brand/Mark.tsx';
import { ease, lerp, progress, sub, withAlpha } from '../../../src/remotion/lib/anim.ts';
import { useLayout, useTime } from '../../../src/remotion/lib/hooks.ts';
import { SoftLight } from '../../../src/remotion/motion/Signal.tsx';
import { Stage } from '../shared.tsx';

// ---------------------------------------------------------------------------------------------
// The note (DOM content that the effects turn into paper)

export const Note: React.FC<{ u: number; w: number; h: number; checked?: number }> = ({ u, w, h }) => (
  <div
    style={{
      width: w,
      height: h,
      background: palette.paper,
      padding: `${58 * u}px ${64 * u}px`,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 26 * u,
      color: palette.ui.text,
    }}
  >
    <div style={{ fontFamily: fonts.mono, fontSize: type.label.size * 1.25 * u, letterSpacing: type.label.tracking, color: palette.ui.textMuted, textTransform: 'uppercase' }}>
      To do · today
    </div>
    <div style={{ fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 74 * u, lineHeight: 1.04, letterSpacing: type.emphasis.tracking }}>
      Did Maya’s payment
      <br />
      clear?
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 * u, marginTop: 'auto' }}>
      <div style={{ width: 34 * u, height: 34 * u, borderRadius: 8 * u, border: `${3 * u}px solid ${palette.ui.textMuted}` }} />
      <div style={{ fontFamily: fonts.sans, fontSize: type.memo.size * u, fontWeight: type.memo.weight, letterSpacing: type.memo.tracking, color: palette.ui.textMuted }}>
        Check the dashboard, then send the login
      </div>
    </div>
  </div>
);

const paperLook = (seed: number) =>
  paper({ amount: 0.9, colorFront: palette.paper, colorBack: palette.ui.surface, contrast: 0.35, roughness: 0.35, fiber: 0.4, fiberSize: 0.25, crumples: 0.22, crumpleSize: 0.4, folds: 0.45, foldCount: 3, drops: 0.1, seed, scale: 0.7 });

export const PaperEffects: React.FC = () => {
  const { frame, f } = useTime();
  const { u, safe, width } = useLayout();
  const w = 820 * u;
  const h = 560 * u;
  const m = 120 * u; // canvas margin for the deckle edge and the shadow
  const lift = progress(frame, f(0.2), f(1.4), ease.glide);
  return (
    <Stage tag="E2 · B · experiment · paper() roughenEdges() dropShadow()">
      <HtmlInCanvas
        width={Math.round(w + 2 * m)}
        height={Math.round(h + 2 * m)}
        style={{ position: 'absolute', left: (width - w) / 2 - m, top: safe.cy - h / 2 - m - lift * 10 * u, width: w + 2 * m, height: h + 2 * m, transform: `rotate(${lerp(-2.2, -1.6, lift)}deg)` }}
        effects={[
          paperLook(17),
          roughenEdges({ amount: 0.9, border: 9 * u, scale: 0.09, seed: 41 }),
          dropShadow({ radius: lerp(10, 34, lift) * u, offsetX: lerp(3, 12, lift) * u, offsetY: lerp(8, 30, lift) * u, opacity: lerp(0.55, 0.42, lift), color: palette.ink }),
        ]}
      >
        <AbsoluteFill style={{ padding: m }}>
          <Note u={u} w={w} h={h} />
        </AbsoluteFill>
      </HtmlInCanvas>
    </Stage>
  );
};

export const TearEffects: React.FC = () => {
  const { frame, f } = useTime();
  const { u, safe, width } = useLayout();
  const w = 820 * u;
  const h = 560 * u;
  const m = 260 * u; // the halves rotate apart: more room than the static note
  // A tear resists, then gives: hesitant start, decisive finish (snap), then the halves drift.
  const rip = progress(frame, f(0.55), f(0.9), ease.snap);
  const drift = progress(frame, f(1.45), f(1.0), ease.glide);
  const tug = Math.sin(Math.PI * sub(frame, f(0.35), f(0.6))) * 6 * u; // the pull before it gives
  return (
    <Stage tag="E2 · D · experiment · tear()">
      <HtmlInCanvas
        width={Math.round(w + 2 * m)}
        height={Math.round(h + 2 * m)}
        style={{ position: 'absolute', left: (width - w) / 2 - m, top: safe.cy - h / 2 - m - tug, width: w + 2 * m, height: h + 2 * m, transform: 'rotate(-1.6deg)' }}
        effects={[
          paperLook(17),
          roughenEdges({ amount: 0.9, border: 9 * u, scale: 0.09, seed: 41 }),
          tear({ progress: rip * 1.04 + drift * 0.32, angle: 6, rotation: 9, jaggedness: 14 * u }),
          dropShadow({ radius: 24 * u, offsetX: 8 * u, offsetY: 22 * u, opacity: 0.48, color: palette.ink }),
        ]}
      >
        <AbsoluteFill style={{ padding: m }}>
          <Note u={u} w={w} h={h} />
        </AbsoluteFill>
      </HtmlInCanvas>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------
// Page turn: the before-state invoice curls away; the after-state is underneath.

const Invoice: React.FC<{ u: number; w: number; h: number; paid: boolean }> = ({ u, w, h, paid }) => {
  const accent = paid ? palette.signalOnLight : palette.friction;
  return (
    <div style={{ width: w, height: h, background: palette.ui.surface, borderRadius: radius.card * u, padding: 56 * u, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 22 * u, color: palette.ui.text, fontFamily: fonts.sans }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: fonts.mono, fontSize: type.label.size * 1.3 * u, letterSpacing: type.label.tracking, color: palette.ui.textMuted }}>INVOICE 0142</div>
        <div
          style={{
            fontSize: type.uiChip.size * 1.35 * u,
            fontWeight: type.uiChip.weight,
            padding: `${10 * u}px ${22 * u}px`,
            borderRadius: 999,
            background: paid ? palette.signal : withAlpha(palette.friction, 0.14),
            color: paid ? palette.signalInk : accent,
          }}
        >
          {paid ? 'Paid · reminder sent itself' : 'Overdue · 6 days'}
        </div>
      </div>
      <div style={{ fontSize: type.metric.size * 1.5 * u, fontWeight: type.metric.weight, letterSpacing: type.metric.tracking, fontVariantNumeric: 'tabular-nums' }}>$1,840.00</div>
      <div style={{ fontSize: type.uiBody.size * 1.5 * u, color: palette.ui.textMuted }}>Patel &amp; Co · Brand refresh</div>
      <div style={{ marginTop: 'auto', height: 2 * u, background: palette.ui.border }} />
      <div style={{ fontSize: type.uiBody.size * 1.4 * u, color: paid ? palette.signalOnLight : palette.ui.textMuted }}>
        {paid ? 'Paid Thursday 9:12 · nobody chased it' : 'You meant to chase this on Monday'}
      </div>
    </div>
  );
};

export const PageTurn: React.FC = () => {
  const { frame, f } = useTime();
  const { u, safe, width } = useLayout();
  const w = 900 * u;
  const h = 600 * u;
  const m = 90 * u;
  const turn = progress(frame, f(0.4), f(1.4), ease.inOut);
  // The fold line enters at the bottom-right corner and travels past the top-left one.
  const fx = lerp(1.08, -0.35, turn);
  const fy = lerp(1.08, -0.35, turn);
  const left = (width - w) / 2;
  const top = safe.cy - h / 2;
  return (
    <Stage tag="E2 · E · experiment · pageTurn()">
      <div style={{ position: 'absolute', left, top, filter: `drop-shadow(0 ${18 * u}px ${30 * u}px ${withAlpha(palette.ink, 0.6)})` }}>
        <Invoice u={u} w={w} h={h} paid />
      </div>
      <HtmlInCanvas
        width={Math.round(w + 2 * m)}
        height={Math.round(h + 2 * m)}
        style={{ position: 'absolute', left: left - m, top: top - m, width: w + 2 * m, height: h + 2 * m }}
        effects={[pageTurn({ foldPosition: [fx, fy], foldDirection: 315, foldRadius: 70 * u, lightDirection: -45, backPageOpacity: 0.12, paperColor: palette.ui.canvas, render: 'both' })]}
      >
        <AbsoluteFill style={{ padding: m }}>
          <Invoice u={u} w={w} h={h} paid={false} />
        </AbsoluteFill>
      </HtmlInCanvas>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------
// The brand switch: flat today vs. an object with an edge and light.

const CLICK = 0.5;

export const ToggleCurrent: React.FC = () => {
  const { frame, f } = useTime();
  const { u, safe, width } = useLayout();
  const on = progress(frame, f(CLICK), f(0.33), ease.snap);
  const bloom = progress(frame, f(CLICK), f(0.55), ease.glide);
  const hgt = 200 * u;
  return (
    <Stage tag="E2 · F · current · ToggleMark + SoftLight">
      <SoftLight x={width / 2} y={safe.cy} rx={820 * u} ry={640 * u} core={300 * u} bloom={bloom} signal={bloom} />
      <div style={{ position: 'absolute', left: width / 2 - hgt * 0.9, top: safe.cy - hgt / 2 }}>
        <ToggleMark on={on} height={hgt} />
      </div>
    </Stage>
  );
};

export const ToggleMaterial: React.FC = () => {
  const { frame, f } = useTime();
  const { u, safe, width } = useLayout();
  const on = progress(frame, f(CLICK), f(0.33), ease.snap);
  const bloom = progress(frame, f(CLICK), f(0.55), ease.glide);
  const sweep = progress(frame, f(CLICK + 0.12), f(0.7), ease.inOut);
  const hgt = 200 * u;
  const cw = 760 * u;
  const ch = 520 * u;
  return (
    <Stage tag="E2 · G · experiment · bevelAlpha() shine() glow()">
      <SoftLight x={width / 2} y={safe.cy} rx={820 * u} ry={640 * u} core={300 * u} bloom={bloom * 0.6} signal={bloom * 0.5} />
      <HtmlInCanvas
        width={Math.round(cw)}
        height={Math.round(ch)}
        style={{ position: 'absolute', left: width / 2 - cw / 2, top: safe.cy - ch / 2, width: cw, height: ch }}
        effects={[
          bevelAlpha({}),
          shine({ progress: lerp(0, 1, sweep), angle: 24, haloSigma: 70 * u, coreSigma: 18 * u, haloIntensity: 0.18 * Math.sin(Math.PI * sweep), coreIntensity: 0.45 * Math.sin(Math.PI * sweep) }),
          glow({ radius: 46 * u, intensity: 0.55 * bloom, threshold: 0.55, color: palette.signal }),
        ]}
      >
        <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ToggleMark on={on} height={hgt} />
        </AbsoluteFill>
      </HtmlInCanvas>
    </Stage>
  );
};
