import { fonts, palette, radius, type } from '../../brand/tokens.ts';
import type { Rect } from '../../brand/format.ts';
import { mixColor } from '../lib/anim.ts';
import { ToggleMark } from '../brand/Mark.tsx';
import { FLOW_METRICS } from './Flow.tsx';

/** Visible region of the window, as insets (px) from its full rect. Default: fully visible. */
export type Reveal = { top: number; right: number; bottom: number; left: number; radius: number };

type Props = {
  rect: Rect;
  u: number;
  reveal?: Reveal;
  /** 0..1 header content visibility (lets the header settle in as the window opens). */
  headerIn?: number;
  workspace: { name: string; initials: string; breadcrumb: string };
  /** 0..1 automation switch (the brand click). */
  on: number;
  /** Extra content painted over the chrome, clipped to the window (e.g. LightSweep). */
  overlay?: React.ReactNode;
};

/**
 * App window surface: header (workspace, breadcrumb, automation switch) and canvas.
 * Content (nodes) is positioned by the scene in the same coordinate space, so items
 * can travel into and out of the window without re-parenting jumps.
 *
 * `reveal` lets a scene build the window at full opacity (never fade a light surface
 * over the dark ground — it passes through muddy grey). The shadow follows the
 * visible region so depth is correct while it grows.
 */
export const WindowChrome: React.FC<Props> = ({ rect, u, reveal, headerIn = 1, workspace, on, overlay }) => {
  const h = FLOW_METRICS.headerHeight * u;
  const r = reveal ?? { top: 0, right: 0, bottom: 0, left: 0, radius: radius.window * u };
  if (r.top + r.bottom >= rect.height) return null;
  return (
    <>
    <div
      style={{
        position: 'absolute',
        left: rect.x + r.left,
        top: rect.y + r.top,
        width: rect.width - r.left - r.right,
        height: rect.height - r.top - r.bottom,
        borderRadius: r.radius,
        boxShadow: [
          `0 ${30 * u}px ${60 * u}px ${-20 * u}px rgba(0,0,0,0.55)`,
          `0 ${90 * u}px ${160 * u}px ${-40 * u}px rgba(0,0,0,0.7)`,
          `0 0 ${120 * u}px ${-10 * u}px rgba(201,242,93,${0.22 * on})`,
        ].join(', '),
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        background: palette.ui.canvas,
        overflow: 'hidden',
        clipPath: `inset(${r.top}px ${r.right}px ${r.bottom}px ${r.left}px round ${r.radius}px)`,
        boxShadow: `0 0 0 ${1 * u}px rgba(255,255,255,0.65) inset`,
        fontFamily: fonts.sans,
      }}
    >
      <div
        style={{
          height: h,
          display: 'flex',
          alignItems: 'center',
          gap: 22 * u,
          padding: `0 ${32 * u}px`,
          borderBottom: `${1.5 * u}px solid ${palette.ui.border}`,
          background: 'linear-gradient(#FFFFFF, #FAF9F6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 * u, flex: 1, minWidth: 0, opacity: headerIn, transform: `translateY(${(1 - headerIn) * 14 * u}px)` }}>
        <div
          style={{
            width: 58 * u,
            height: 58 * u,
            borderRadius: 16 * u,
            background: 'linear-gradient(160deg, #EBDDC8, #D7C09F)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22 * u,
            fontWeight: 680,
            color: '#5B452C',
            letterSpacing: '-0.02em',
          }}
        >
          {workspace.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 29 * u, fontWeight: 620, letterSpacing: '-0.025em', color: palette.ui.text }}>{workspace.name}</div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 17 * u,
              fontWeight: 500,
              letterSpacing: type.label.tracking,
              color: palette.ui.textFaint,
              marginTop: 4 * u,
              textTransform: 'uppercase',
            }}
          >
            {workspace.breadcrumb}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 * u }}>
          <div style={{ fontSize: 21 * u, fontWeight: 600, color: mixColor(palette.ui.textFaint, '#3F5612', on) }}>{on > 0.5 ? 'Live' : 'Off'}</div>
          <ToggleMark on={on} height={34 * u} offTrack="#DCD9D2" offKnob="#FFFFFF" />
        </div>
        </div>
      </div>
      {overlay}
    </div>
    </>
  );
};

/** Where the automation switch sits inside the chrome (for ripples and light). */
export function switchCenter(rect: Rect, u: number): { x: number; y: number } {
  const toggleH = 34 * u;
  return { x: rect.x + rect.width - 32 * u - toggleH * 0.9, y: rect.y + (FLOW_METRICS.headerHeight * u) / 2 };
}
