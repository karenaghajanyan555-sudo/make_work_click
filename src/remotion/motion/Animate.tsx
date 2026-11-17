import { duration as dur } from '../../brand/tokens.ts';
import { ease, progress } from '../lib/anim.ts';
import { useLayout, usePreset, useTime } from '../lib/hooks.ts';

/**
 * Entrance/exit presets for any element (the motion library's one primitive).
 *   rise    rises into focus, leaves upward out of focus (the brand default; = Reveal)
 *   fade    opacity only (type and dark surfaces; never a light surface over the ground)
 *   slideUp / slideLeft / slideRight   travels in from an edge, no blur
 *   scale   settles from 94 % with a slight defocus
 *   blur    resolves out of a deep defocus
 *   mask    slides up inside its own clip (no opacity: safe for light surfaces)
 * Durations follow the preset's tempo; the curves are the brand easings.
 */
export type AnimatePreset = 'rise' | 'fade' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale' | 'blur' | 'mask';

type Props = {
  preset?: AnimatePreset;
  /** Seconds (local) when the entrance starts. */
  at?: number;
  /** Seconds (local) when the exit starts. Omit to stay. */
  out?: number;
  /** Entrance length in seconds (before tempo). */
  duration?: number;
  /** Travel distance in base units. */
  distance?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export const Animate: React.FC<Props> = ({ preset = 'rise', at = 0, out, duration = dur.base, distance = 28, style, children }) => {
  const { frame, f } = useTime();
  const { u } = useLayout();
  const tempo = usePreset().motion.tempo;
  const pIn = progress(frame, f(at), f(duration * tempo), preset === 'mask' || preset.startsWith('slide') ? ease.snap : ease.out);
  const pOut = out === undefined ? 0 : progress(frame, f(out), f(dur.quick * tempo), ease.in);
  const d = distance * u;
  let opacity = 1, x = 0, y = 0, scale = 1, blur = 0;
  switch (preset) {
    case 'rise': opacity = pIn * (1 - pOut); y = (1 - pIn) * d - pOut * d * 0.6; blur = (1 - pIn) * 10 + pOut * 10; break;
    case 'fade': opacity = pIn * (1 - pOut); break;
    case 'slideUp': opacity = Math.min(1, pIn * 2) * (1 - pOut); y = (1 - pIn) * d * 3; break;
    case 'slideLeft': opacity = Math.min(1, pIn * 2) * (1 - pOut); x = (1 - pIn) * d * 3; break;
    case 'slideRight': opacity = Math.min(1, pIn * 2) * (1 - pOut); x = -(1 - pIn) * d * 3; break;
    case 'scale': opacity = pIn * (1 - pOut); scale = 0.94 + 0.06 * pIn; blur = (1 - pIn) * 6 + pOut * 8; break;
    case 'blur': opacity = Math.min(1, pIn * 1.6) * (1 - pOut); blur = (1 - pIn) * 22 + pOut * 18; break;
    case 'mask': {
      // Clip the travel inside the element's own box: no opacity anywhere.
      const shown = pIn * (1 - pOut);
      return (
        <div style={{ ...style, overflow: 'hidden' }}>
          <div style={{ transform: shown < 1 ? `translateY(${(1 - shown) * 102}%)` : undefined }}>{children}</div>
        </div>
      );
    }
  }
  const transform = x || y || scale !== 1 ? `translate(${x}px, ${y}px) scale(${scale})` : undefined;
  return <div style={{ ...style, opacity, transform, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>{children}</div>;
};

/** Staggered start for item `i` of a group (seconds). */
export function staggerAt(start: number, i: number, step = 0.08): number {
  return start + i * step;
}
