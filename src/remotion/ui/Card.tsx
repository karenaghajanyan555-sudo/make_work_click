import { fonts, palette, radius, type, type AvatarTone } from '../../brand/tokens.ts';
import { lerp } from '../lib/anim.ts';

/**
 * Product-world building blocks shared by the UI scenes (fictional, unbranded app).
 * Sizes are base units × `u`. Every component takes plain progress values; scenes own time.
 */

/** Light card surface; `active` 0..1 adds the signal focus ring (the system is working here). */
export function cardSurface(u: number, active = 0): React.CSSProperties {
  return {
    borderRadius: radius.card * u,
    background: palette.ui.surface,
    border: `${1.5 * u}px solid ${palette.ui.border}`,
    boxShadow: [
      `0 0 0 ${lerp(0, 5, active) * u}px rgba(201,242,93,${0.6 * active})`,
      `0 ${lerp(18, 22, active) * u}px ${lerp(40, 46, active) * u}px ${-14 * u}px rgba(10,12,16,${lerp(0.32, 0.4, active)})`,
    ].join(', '),
  };
}

/** Mono uppercase label in the product world (headings, times, units). */
export const UILabel: React.FC<{ u: number; children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ u, children, color = palette.ui.textFaint, style }) => (
  <span
    style={{
      fontFamily: fonts.mono,
      fontSize: type.label.size * u,
      fontWeight: type.label.weight,
      letterSpacing: type.label.tracking,
      textTransform: 'uppercase',
      color,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

/** Role-based UI text (uiTitle / uiBody / uiChip). */
export const UIText: React.FC<{ u: number; role: 'uiTitle' | 'uiBody' | 'uiChip'; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ u, role, color, children, style }) => {
  const r = type[role];
  return (
    <div
      style={{
        fontFamily: fonts.sans,
        fontSize: r.size * u,
        fontWeight: r.weight,
        letterSpacing: r.tracking,
        color: color ?? (role === 'uiBody' ? palette.ui.textMuted : palette.ui.text),
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Initials on a soft gradient tile (fictional people and workspaces). */
export const Avatar: React.FC<{ initials: string; size: number; tone?: AvatarTone; round?: boolean }> = ({ initials, size, tone = 'warm', round = true }) => {
  const [a, b, ink] = palette.avatar[tone];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: round ? size : size * 0.28,
        flexShrink: 0,
        background: `linear-gradient(160deg, ${a}, ${b})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.sans,
        fontSize: size * 0.38,
        fontWeight: 680,
        letterSpacing: '-0.02em',
        color: ink,
      }}
    >
      {initials}
    </div>
  );
};

/** Deterministic tone for a name (so the same person always gets the same colour). */
export function toneFor(name: string): AvatarTone {
  const tones: AvatarTone[] = ['peach', 'sage', 'sky', 'lilac', 'warm'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return tones[h % tones.length]!;
}

/**
 * DashboardCard: a light card with an optional mono heading row. Absolutely positioned by
 * the scene (px rect), so it can travel and morph without re-parenting.
 */
export const DashboardCard: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  u: number;
  title?: string;
  right?: React.ReactNode;
  active?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ x, y, width, height, u, title, right, active = 0, style, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, width, height, overflow: 'hidden', ...cardSurface(u, active), ...style }}>
    {title !== undefined && (
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 72 * u, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${28 * u}px`, borderBottom: `${1.5 * u}px solid ${palette.ui.border}` }}>
        <UILabel u={u}>{title}</UILabel>
        {right}
      </div>
    )}
    {children}
  </div>
);
