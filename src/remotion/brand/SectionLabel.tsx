import { palette, type } from '../../brand/tokens.ts';
import { ease, progress } from '../lib/anim.ts';
import { useLayout, useTime } from '../lib/hooks.ts';
import { Label } from './Mark.tsx';

/**
 * SectionLabel: the brand's mono annotation used as an eyebrow over a statement or hook
 * ("N° 002 · Meetings"). A short rule draws, then the label rises. `lit` uses the signal
 * (only when the label names something the system did).
 */
export const SectionLabel: React.FC<{ text: string; at?: number; out?: number; lit?: boolean; align?: 'left' | 'center' }> = ({ text, at = 0, out, lit, align = 'left' }) => {
  const { frame, f } = useTime();
  const { u } = useLayout();
  const p = progress(frame, f(at), f(0.5));
  const rule = progress(frame, f(at), f(0.45), ease.inOut);
  const gone = out === undefined ? 0 : progress(frame, f(out), f(0.3), ease.in);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 * u, justifyContent: align === 'center' ? 'center' : 'flex-start', opacity: 1 - gone }}>
      <div style={{ width: 36 * u * rule, height: Math.max(1, 2 * u), background: lit ? palette.signal : palette.hairlineStrong }} />
      <div style={{ opacity: p, transform: `translateY(${(1 - p) * 10 * u}px)` }}>
        <Label size={type.label.size * u} color={lit ? palette.signal : palette.fog}>
          {text}
        </Label>
      </div>
    </div>
  );
};
