import { palette } from '../../brand/tokens.ts';
import { ease, progress } from '../lib/anim.ts';
import { useTime } from '../lib/hooks.ts';

/**
 * Brand signature micro-interaction: the click ripple. Fires at `at` seconds,
 * centred on (x, y). Use only when the system does something on its own.
 */
export const ClickRipple: React.FC<{ at: number; x: number; y: number; size?: number; strength?: number }> = ({
  at,
  x,
  y,
  size = 120,
  strength = 1,
}) => {
  const { frame, f } = useTime();
  const p = progress(frame, f(at), f(0.6), ease.out);
  const core = progress(frame, f(at), f(0.18), ease.out) * (1 - progress(frame, f(at + 0.12), f(0.3), ease.in));
  if (frame < f(at) || p >= 1) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, pointerEvents: 'none' }}>
      {[0, 0.12].map((delay, i) => {
        const q = progress(frame, f(at + delay), f(0.6), ease.out);
        const d = size * (0.25 + q * 1.1);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: -d / 2,
              top: -d / 2,
              width: d,
              height: d,
              borderRadius: d,
              border: `${2.5 - i}px solid ${palette.signal}`,
              opacity: (1 - q) * 0.9 * strength * (q > 0 ? 1 : 0),
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: -size,
          top: -size,
          width: size * 2,
          height: size * 2,
          borderRadius: size * 2,
          background: `radial-gradient(circle, rgba(201,242,93,${0.45 * strength}) 0%, rgba(201,242,93,0) 60%)`,
          opacity: core,
        }}
      />
    </div>
  );
};

/**
 * Light sweep: a soft diagonal sheen crossing its (overflow-hidden) parent once.
 * Marks the moment a surface "comes alive".
 */
export const LightSweep: React.FC<{ at: number; duration?: number; width?: number; opacity?: number }> = ({
  at,
  duration = 0.7,
  width = 260,
  opacity = 0.5,
}) => {
  const { frame, f } = useTime();
  const p = progress(frame, f(at), f(duration), ease.inOut);
  if (p <= 0 || p >= 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: '-20%',
        bottom: '-20%',
        left: `${-30 + p * 160}%`,
        width,
        transform: 'skewX(-18deg)',
        background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%)',
        opacity: opacity * Math.sin(p * Math.PI),
        mixBlendMode: 'soft-light',
        pointerEvents: 'none',
      }}
    />
  );
};

/** Small busy indicator: a rotating arc (UI micro-interaction). */
export const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = 'currentColor' }) => {
  const { frame } = useTime();
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ transform: `rotate(${frame * 22}deg)` }}>
      <circle cx="10" cy="10" r="7.5" fill="none" stroke={color} strokeOpacity={0.2} strokeWidth="2.4" />
      <path d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
};
