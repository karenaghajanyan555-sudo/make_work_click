import { useTime } from '../lib/hooks.ts';
import { ease, progress } from '../lib/anim.ts';
import { duration as dur } from '../../brand/tokens.ts';

type Props = {
  /** Seconds (local) when the entrance starts. */
  at?: number;
  /** Seconds (local) when the exit starts. Omit to stay. */
  out?: number;
  /** Rise distance in px. */
  distance?: number;
  /** Max blur during transition, px. */
  blur?: number;
  inDuration?: number;
  outDuration?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * Standard entrance/exit: rises into focus, leaves upward out of focus.
 * The default for any element that has no reason to move differently.
 */
export const Reveal: React.FC<Props> = ({
  at = 0,
  out,
  distance = 24,
  blur = 10,
  inDuration = dur.base,
  outDuration = dur.quick,
  style,
  children,
}) => {
  const { frame, f } = useTime();
  const pIn = progress(frame, f(at), f(inDuration));
  const pOut = out === undefined ? 0 : progress(frame, f(out), f(outDuration), ease.in);
  const opacity = pIn * (1 - pOut);
  const y = (1 - pIn) * distance - pOut * distance * 0.6;
  const b = (1 - pIn) * blur + pOut * blur;
  return (
    <div style={{ ...style, opacity, transform: `translateY(${y}px)`, filter: b > 0.05 ? `blur(${b}px)` : undefined }}>
      {children}
    </div>
  );
};
