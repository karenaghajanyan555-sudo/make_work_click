import { fonts, palette, radius, type } from '../../brand/tokens.ts';
import type { Notice } from '../../video/scenes/product.ts';
import { lerp } from '../lib/anim.ts';
import { UILabel, UIText } from './Card.tsx';
import { NOTICE_ICON } from './icons.tsx';

export const NOTICE_METRICS = { height: 150, icon: 64, padX: 26 } as const;

/**
 * A notification from a fictional app, floating on the dark ground. System notices (the
 * automation did something) get the ink tile with the signal glyph. `active` adds the
 * focus ring; `children` render below the head when the card is opened (expanded).
 */
export const NotificationCard: React.FC<{ n: Notice; u: number; width: number; height: number; active?: number; children?: React.ReactNode }> = ({
  n,
  u,
  width,
  height,
  active = 0,
  children,
}) => {
  const Icon = NOTICE_ICON[n.icon];
  const m = NOTICE_METRICS;
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: (radius.card + 4) * u,
        background: palette.ui.float,
        overflow: 'hidden',
        boxShadow: [
          `0 0 0 ${lerp(0, 5, active) * u}px rgba(201,242,93,${0.6 * active})`,
          `0 ${28 * u}px ${60 * u}px ${-18 * u}px rgba(0,0,0,0.65)`,
          `0 0 0 ${1 * u}px rgba(255,255,255,0.7) inset`,
        ].join(', '),
        fontFamily: fonts.sans,
      }}
    >
      <div style={{ position: 'absolute', left: m.padX * u, right: m.padX * u, top: 0, height: m.height * u, display: 'flex', alignItems: 'center', gap: 22 * u }}>
        <div
          style={{
            width: m.icon * u,
            height: m.icon * u,
            borderRadius: radius.icon * u,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: n.system ? palette.ui.text : palette.ui.well,
            color: n.system ? palette.signal : palette.ui.text,
          }}
        >
          <Icon size={30 * u} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16 * u }}>
            <UILabel u={u} color={n.system ? palette.signalOnLight : palette.ui.textFaint}>
              {n.app}
            </UILabel>
            <UILabel u={u}>{n.time}</UILabel>
          </div>
          <UIText u={u} role="uiTitle" style={{ marginTop: 6 * u, fontSize: (type.uiTitle.size - 2) * u }}>
            {n.title}
          </UIText>
          <UIText u={u} role="uiBody" style={{ marginTop: 4 * u }}>
            {n.body}
          </UIText>
        </div>
      </div>
      {children}
    </div>
  );
};
