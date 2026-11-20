/** LAB ONLY: the stage every experiment sits on (the production ground) and a gallery tag. */
import { AbsoluteFill } from 'remotion';
import { Backdrop } from '../../src/remotion/brand/Backdrop.tsx';
import { fonts, palette, type } from '../../src/brand/tokens.ts';
import { useLayout } from '../../src/remotion/lib/hooks.ts';

/**
 * Production ground (grain, drifting key light, vignette) + content. `tag` is drawn low in the
 * bottom unsafe band (where the platform UI sits) so A/B clips are labelled without touching the
 * live area being judged.
 */
export const Stage: React.FC<{ tag?: string; children: React.ReactNode; ground?: boolean }> = ({ tag, children, ground = true }) => {
  const { u, safe } = useLayout();
  return (
    <AbsoluteFill>
      {ground ? <Backdrop /> : null}
      {children}
      {tag ? (
        <div
          style={{
            position: 'absolute',
            left: safe.left,
            bottom: 96 * u,
            fontFamily: fonts.mono,
            fontSize: type.label.size * u,
            letterSpacing: type.label.tracking,
            color: palette.smoke,
            textTransform: 'uppercase',
          }}
        >
          {tag}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
