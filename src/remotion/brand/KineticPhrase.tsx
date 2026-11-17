import { Fragment, useMemo } from 'react';
import { parsePhrase, tokenEnterFrames } from '../../captions/phrase.ts';
import { fonts, palette, type } from '../../brand/tokens.ts';
import { ease, progress } from '../lib/anim.ts';
import { useLayout, usePreset, useTheme, useTime } from '../lib/hooks.ts';

export type PhraseRole = 'display' | 'title' | 'caption' | 'lead';

type Props = {
  /** Phrase markup, see src/captions/phrase.ts. */
  markup: string;
  role?: PhraseRole;
  /** Seconds (local) when the first word starts entering. May be negative (already in at frame 0). */
  at?: number;
  /** Seconds (local) when the phrase starts leaving. Omit to stay. */
  out?: number;
  align?: 'left' | 'center';
  /**
   * rise (default): words rise into focus. mask: words slide up out of a line mask
   * (TextReveal). none: static, already set (HighlightedText).
   */
  entrance?: 'rise' | 'mask' | 'none';
  /** Text colour override (default: theme text). */
  color?: string;
};

/**
 * Phrase-based kinetic type (headlines and captions — never word-by-word karaoke).
 * Words rise into focus in sequence; emphasis words switch to the serif italic;
 * signal words also take the accent. Exit: the phrase lifts and defocuses as one.
 */
export const KineticPhrase: React.FC<Props> = ({ markup, role = 'display', at = 0, out, align = 'left', entrance = 'rise', color }) => {
  const { frame, f } = useTime();
  const { u } = useLayout();
  const theme = useTheme();
  const preset = usePreset();
  const r = type[role];
  const size = r.size * u;
  const tokens = useMemo(() => parsePhrase(markup), [markup]);
  const staggerFrames = f(preset.motion.wordStagger);
  const wordFrames = f(0.55 * preset.motion.tempo);
  const enters = useMemo(() => tokenEnterFrames(tokens, staggerFrames), [tokens, staggerFrames]);
  const exit = out === undefined ? 0 : progress(frame, f(out), f(0.33), ease.in);

  return (
    <div
      style={{
        fontFamily: fonts.sans,
        fontSize: size,
        fontWeight: r.weight,
        letterSpacing: r.tracking,
        lineHeight: r.leading,
        color: color ?? theme.text,
        textAlign: align,
        opacity: 1 - exit,
        transform: `translateY(${-exit * size * 0.22}px)`,
        filter: exit > 0 ? `blur(${exit * 12}px)` : undefined,
      }}
    >
      {tokens.map((tok, i) => {
        const p = entrance === 'none' ? 1 : progress(frame, f(at) + (enters[i] ?? 0), wordFrames);
        const serif = tok.emphasis !== 'none';
        const masked = entrance === 'mask';
        const word = (
            <span
              style={{
                display: 'inline-block',
                opacity: masked ? 1 : p,
                transform: masked ? `translateY(${(1 - p) * 110}%)` : `translateY(${(1 - p) * 0.42}em)`,
                filter: !masked && p < 1 ? `blur(${(1 - p) * 12}px)` : undefined,
                ...(serif && {
                  fontFamily: fonts.serif,
                  fontStyle: 'italic',
                  fontWeight: type.emphasis.weight,
                  fontSize: `${type.emphasis.scale}em`,
                  lineHeight: 0,
                  letterSpacing: type.emphasis.tracking,
                  paddingRight: '0.04em',
                }),
                ...(serif && masked && { lineHeight: r.leading / type.emphasis.scale }),
                ...(tok.emphasis === 'signal' && { color: palette.signal }),
              }}
            >
              {tok.text}
            </span>
        );
        return (
          <Fragment key={i}>
            {tok.newLine ? <br /> : i > 0 && !tok.glued ? ' ' : null}
            {masked ? <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', lineHeight: r.leading, paddingBottom: '0.16em', marginBottom: '-0.16em' }}>{word}</span> : word}
          </Fragment>
        );
      })}
    </div>
  );
};
