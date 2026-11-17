import { fonts, palette, radius, type } from '../../brand/tokens.ts';
import { lerp, mixColor } from '../lib/anim.ts';
import { measureText } from '../lib/fonts.ts';
import { CheckIcon } from './icons.tsx';

/**
 * The owner's handwritten-to-do card (brand world, dark). Used where manual chaos is
 * shown (chaosToSystem) and where it is resolved (flowRun flip-back). Base units.
 */
export const MEMO = { padX: 28, height: 82, box: 28, gap: 20, tagPadX: 12, tagSize: 19 } as const;

export type MemoData = { text: string; tag?: string };

/** Card width for a to-do; `tag` defaults to the to-do's own tag. */
export function memoWidth(memo: MemoData, tag = memo.tag): number {
  const text = measureText(memo.text, `${type.memo.weight} ${type.memo.size}px Geist`, -0.015 * type.memo.size);
  const tagW = tag ? measureText(tag.toUpperCase(), `500 ${MEMO.tagSize}px "Geist Mono"`, 0.06 * MEMO.tagSize) + MEMO.tagPadX * 2 + MEMO.gap : 0;
  return MEMO.padX * 2 + MEMO.box + MEMO.gap + text + tagW;
}

/** Card surface (brand world). */
export function memoSurface(u: number): React.CSSProperties {
  return {
    borderRadius: radius.memo * u,
    background: palette.memoryCard,
    border: `${1.5 * u}px solid ${palette.hairline}`,
    boxShadow: `0 ${24 * u}px ${50 * u}px ${-20 * u}px rgba(0,0,0,0.8)`,
  };
}

type Resolution = {
  /** What the system did (lime tag), e.g. "Sent". */
  label: string;
  /** 0..1: checkbox fills lime and ticks. */
  check: number;
  /** 0..1: strike line draws across the text, text dims. */
  strike: number;
};

/** Card content: checkbox, to-do text, optional tag. With `resolved`, it gets ticked off. */
export const MemoContent: React.FC<{ memo: MemoData; u: number; resolved?: Resolution }> = ({ memo, u, resolved }) => {
  const check = resolved?.check ?? 0;
  const strike = resolved?.strike ?? 0;
  const lime = check > 0.5;
  const tag = resolved && lime ? resolved.label : memo.tag;
  const textW = measureText(memo.text, `${type.memo.weight} ${type.memo.size}px Geist`, -0.015 * type.memo.size);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: MEMO.gap * u, padding: `0 ${MEMO.padX * u}px`, fontFamily: fonts.sans, whiteSpace: 'nowrap' }}>
      <div
        style={{
          width: MEMO.box * u,
          height: MEMO.box * u,
          borderRadius: 8 * u,
          border: `${2.5 * u}px solid ${mixColor(palette.fog, palette.signal, check)}`,
          background: mixColor('rgba(201,242,93,0)', palette.signal, check),
          color: palette.signalInk,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${1 + Math.sin(check * Math.PI) * 0.18})`,
        }}
      >
        {check > 0.35 && (
          <div style={{ clipPath: `inset(0 ${(1 - Math.min(1, (check - 0.35) / 0.5)) * 100}% 0 0)` }}>
            <CheckIcon size={20 * u} strokeWidth={3} />
          </div>
        )}
      </div>
      <div style={{ position: 'relative', fontSize: type.memo.size * u, fontWeight: type.memo.weight, letterSpacing: type.memo.tracking, color: mixColor(palette.memoryText, palette.fog, strike) }}>
        {memo.text}
        {strike > 0 && (
          <div style={{ position: 'absolute', left: -4 * u, top: '54%', height: 2.5 * u, width: lerp(0, (textW + 8) * u, strike), background: palette.fog, borderRadius: 2 * u }} />
        )}
      </div>
      {tag && (
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: MEMO.tagSize * u,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: lime ? palette.signal : palette.friction,
            padding: `${6 * u}px ${MEMO.tagPadX * u}px`,
            borderRadius: 8 * u,
            background: lime ? 'rgba(201,242,93,0.14)' : 'rgba(255,138,101,0.12)',
          }}
        >
          {tag}
        </div>
      )}
    </div>
  );
};
