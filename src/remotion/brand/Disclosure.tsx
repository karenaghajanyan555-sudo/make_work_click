import { fonts, palette, radius, type } from '../../brand/tokens.ts';
import type { DisclosureTag } from '../../video/affiliate.ts';
import { useLayout } from '../lib/hooks.ts';
import { Animate } from '../motion/Animate.tsx';
import { Label } from './Mark.tsx';

/**
 * AdDisclosure: the paid-partner tag of an affiliate video (D42). A hairline pill with the mono
 * label ("AD"), then one plain sentence in paper. Never the signal (lime means "the system did
 * this"), never coral (the "before" state). Enters with the CTA that names the partner and
 * stays: once settled it carries no transform or filter (crisp, readable on every frame).
 */
export const AdDisclosure: React.FC<{ tag: DisclosureTag; at: number; align?: 'center' | 'left' }> = ({ tag, at, align = 'center' }) => {
  const { u } = useLayout();
  const t = type.disclosure;
  return (
    <Animate preset="rise" at={at} distance={12}>
      <div
        style={{
          textAlign: align,
          // Two even lines, never a lone last word.
          textWrap: 'balance',
          fontFamily: fonts.sans,
          fontSize: t.size * u,
          fontWeight: t.weight,
          letterSpacing: t.tracking,
          lineHeight: t.leading,
          color: palette.paper,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            verticalAlign: '0.12em',
            height: t.size * 1.05 * u,
            padding: `0 ${12 * u}px`,
            marginRight: 14 * u,
            border: `${Math.max(1, 1.5 * u)}px solid ${palette.hairlineStrong}`,
            borderRadius: radius.chip,
          }}
        >
          <Label size={type.label.size * u} color={palette.paper}>
            {tag.label}
          </Label>
        </span>
        {tag.text}
      </div>
    </Animate>
  );
};
