import { fonts, palette, type } from '../../brand/tokens.ts';
import { lerp, mixColor } from '../lib/anim.ts';

/**
 * Brand mark: a switch flipping on — the "click" when a system starts running
 * by itself. `on` animates 0→1. Used in the wordmark, the signature frame and
 * product UI (where it is the automation's on/off switch).
 */
export const ToggleMark: React.FC<{ on: number; height: number; offTrack?: string; offKnob?: string }> = ({
  on,
  height,
  offTrack = '#2A2E35',
  offKnob = palette.fog,
}) => {
  const width = height * 1.8;
  const pad = height * 0.14;
  const knob = height - pad * 2;
  const k = Math.min(1, Math.max(0, on));
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: height,
        background: mixColor(offTrack, palette.signal, k),
        boxShadow: `0 0 ${height * 0.8}px rgba(201,242,93,${0.4 * k})`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: pad,
          left: lerp(pad, width - pad - knob, k),
          width: knob,
          height: knob,
          borderRadius: knob,
          background: mixColor(offKnob, palette.ink, k),
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }}
      />
    </div>
  );
};

export const Wordmark: React.FC<{ on: number; size: number }> = ({ on, size }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.42 }}>
    <ToggleMark on={on} height={size * 0.95} />
    <div style={{ fontFamily: fonts.sans, fontSize: size, fontWeight: 700, letterSpacing: '-0.015em', color: palette.paper, whiteSpace: 'nowrap' }}>
      MAKE WORK <span style={{ color: mixColor(palette.paper, palette.signal, on) }}>CLICK</span>
    </div>
  </div>
);

/** Mono metadata label — the brand's "technical annotation" voice. */
export const Label: React.FC<{ children: React.ReactNode; color?: string; size: number; style?: React.CSSProperties }> = ({
  children,
  color = palette.fog,
  size,
  style,
}) => (
  <div
    style={{
      fontFamily: fonts.mono,
      fontSize: size,
      fontWeight: type.label.weight,
      letterSpacing: type.label.tracking,
      textTransform: 'uppercase',
      color,
      whiteSpace: 'nowrap',
      fontVariantNumeric: 'tabular-nums',
      ...style,
    }}
  >
    {children}
  </div>
);
