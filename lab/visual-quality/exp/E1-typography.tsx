/**
 * LAB ONLY — E1 typography. Same line as v009's hook ("Every sale / comes with / three more jobs.")
 * so the current engine and the candidates are judged on identical words.
 *   e1-type-current  KineticPhrase (production) — the baseline
 *   e1-type-cascade  glyph cascade: kerning-preserving per-glyph rise from line masks, weight axis
 *                    "inks up", tracking settles, the serif wipes in along its italic slant
 *   e1-type-depth    type in depth: the jobs fly past a perspective camera, focus lands on the line
 */
import { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { fonts, palette, type } from '../../../src/brand/tokens.ts';
import { KineticPhrase } from '../../../src/remotion/brand/KineticPhrase.tsx';
import { ease, lerp, progress, sub, withAlpha } from '../../../src/remotion/lib/anim.ts';
import { measureText, useFontsReady } from '../../../src/remotion/lib/fonts.ts';
import { useLayout, useTheme, useTime } from '../../../src/remotion/lib/hooks.ts';
import { Stage } from '../shared.tsx';

const HEADLINE = 'Every sale\ncomes with\n*three more jobs.*';

export const TypeCurrent: React.FC = () => {
  const { u, column, safe } = useLayout();
  return (
    <Stage tag="E1 · A · current · KineticPhrase">
      <div style={{ position: 'absolute', left: column.left, top: safe.cy - 190 * u, width: column.width }}>
        <KineticPhrase markup={HEADLINE} role="display" at={0.1} out={2.95} />
      </div>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------
// Glyph cascade

type Line = { text: string; serif: boolean };
const LINES: Line[] = [
  { text: 'Every sale', serif: false },
  { text: 'comes with', serif: false },
  { text: 'three more jobs.', serif: true },
];

/** Pure layout: kerned x of every glyph (prefix advance, so pairs like "Ev" keep their kerning). */
function glyphOffsets(text: string, font: string): number[] {
  return [...text].map((_, i) => measureText(text.slice(0, i), font));
}

export const TypeCascade: React.FC = () => {
  const { frame, f } = useTime();
  const { u, column, safe } = useLayout();
  const theme = useTheme();
  const ready = useFontsReady();
  const d = type.display;
  const size = d.size * u;
  const serifSize = size * type.emphasis.scale;
  const finalTrackEm = parseFloat(d.tracking); // -0.045
  const serifTrackEm = parseFloat(type.emphasis.tracking);

  const offsets = useMemo(
    () =>
      ready
        ? LINES.map((l) =>
            l.serif
              ? // Production sets the spaces between serif words in Geist (KineticPhrase): match it.
                glyphOffsets(l.text, `italic ${type.emphasis.weight} ${serifSize}px "Instrument Serif"`).map(
                  (x, i) => x + [...l.text.slice(0, i)].filter((c) => c === ' ').length * (measureText(' ', `${d.weight} ${size}px Geist`) - measureText(' ', `italic ${type.emphasis.weight} ${serifSize}px "Instrument Serif"`)),
                )
              : glyphOffsets(l.text, `${d.weight} ${size}px Geist`),
          )
        : null,
    [ready, size, serifSize, d.weight],
  );
  if (!offsets) return <Stage tag="E1 · B · experiment · glyph cascade">{null}</Stage>;

  const lineStart = [f(0.07), f(0.33), f(0.72)];
  const exitStart = f(2.95);
  const top = safe.cy - 190 * u;

  return (
    <Stage tag="E1 · B · experiment · glyph cascade">
      {LINES.map((line, li) => {
        const start = lineStart[li]!;
        // The line contracts into its final tracking as its glyphs land (glide = long silk settle).
        const track = progress(frame, start, f(1.0), ease.glide);
        const trackEm = line.serif ? lerp(0.05, serifTrackEm, track) : lerp(0.06, finalTrackEm, track);
        const fs = line.serif ? serifSize : size;
        const exit = progress(frame, exitStart + (LINES.length - 1 - li) * 2, f(0.45), ease.in);
        const y = top + li * size * d.leading + (line.serif ? -0.06 * size : 0);
        const chars = [...line.text];
        // Serif line: a slanted wipe (the italic's own angle) carried by a hairline "pen".
        const wipe = line.serif ? progress(frame, start, f(0.9), ease.glide) : 1;
        const slant = 0.22 * fs; // horizontal run of the italic slant over one line height
        const lineWidth = (offsets[li]![chars.length - 1] ?? 0) + fs * 0.6 + chars.length * trackEm * fs;
        const wipeX = lerp(-slant, lineWidth + slant, wipe);
        return (
          <div
            key={li}
            style={{
              position: 'absolute',
              left: column.left,
              top: y,
              width: column.width + 40 * u,
              height: fs * 1.3,
              overflow: 'hidden', // the line mask
              transform: `translateY(${-exit * 0.5 * fs}px)`,
              opacity: 1 - sub(exit, 0.4, 1),
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                clipPath: line.serif ? `polygon(0 0, ${wipeX + slant}px 0, ${wipeX}px 100%, 0 100%)` : undefined,
              }}
            >
              {chars.map((ch, ci) => {
                const at = start + (line.serif ? ci * 0.6 : ci * 1.15);
                const p = line.serif ? progress(frame, at, f(0.8), ease.glide) : progress(frame, at, f(0.62), ease.out);
                const ink = progress(frame, at + 2, f(0.7), ease.glide);
                const x = offsets[li]![ci]! + ci * trackEm * fs;
                return (
                  <span
                    key={ci}
                    style={{
                      position: 'absolute',
                      left: x,
                      top: 0.12 * fs,
                      fontFamily: line.serif ? fonts.serif : fonts.sans,
                      fontStyle: line.serif ? 'italic' : 'normal',
                      fontSize: fs,
                      lineHeight: 1,
                      whiteSpace: 'pre',
                      color: theme.text,
                      fontWeight: line.serif ? type.emphasis.weight : Math.round(lerp(470, d.weight, ink) - exit * 160),
                      transform: line.serif
                        ? `translateX(${(1 - p) * -0.12 * fs}px)`
                        : `translateY(${(1 - p) * 108}%) rotateX(${(1 - p) * 62}deg)`,
                      transformOrigin: '50% 100%',
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
            {line.serif && wipe > 0 && wipe < 1 ? (
              // the pen: a hairline on the slanted wipe edge, fading at both ends of its travel
              <div
                style={{
                  position: 'absolute',
                  left: wipeX,
                  top: 0,
                  width: 2 * u,
                  height: '100%',
                  background: withAlpha(palette.paper, 0.55 * Math.sin(Math.PI * wipe)),
                  transform: `skewX(${-Math.atan2(slant, fs * 1.3) * (180 / Math.PI)}deg)`,
                  transformOrigin: '0 100%',
                }}
              />
            ) : null}
          </div>
        );
      })}
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------
// Type in depth

const JOBS = ['Send Maya her login', 'Add her to the pipeline', 'Check in on Friday', 'Did the payment clear?'];

export const TypeDepth: React.FC = () => {
  const { frame, f } = useTime();
  const { u, column, safe, width } = useLayout();
  const theme = useTheme();
  const focal = 1300 * u; // perspective distance
  // The camera travels forward through the jobs and settles on the headline plane.
  const travel = progress(frame, 0, f(3.3), ease.glide);
  const camZ = lerp(0, 5200 * u, travel);
  const camX = lerp(-60 * u, 0, travel);
  const planes = JOBS.map((text, i) => ({ text, z: -(900 + i * 1100) * u, x: (i % 2 === 0 ? -1 : 1) * 150 * u, y: (i - 1.5) * 170 * u }));
  const headZ = -5200 * u;

  const plane = (z: number) => {
    const rel = z + camZ; // 0 = on the focus plane, > 0 = past the focus plane toward the camera
    const blur = Math.min(26, Math.abs(rel) / (95 * u));
    const fog = rel < 0 ? Math.max(0, 1 - -rel / (4200 * u)) : Math.max(0, 1 - rel / (700 * u));
    return { rel, blur, fog };
  };

  return (
    <Stage tag="E1 · C · experiment · type in depth">
      <AbsoluteFill style={{ perspective: focal, perspectiveOrigin: `50% ${safe.cy}px`, overflow: 'hidden' }}>
        {planes.map((p, i) => {
          const s = plane(p.z);
          if (s.rel > 1100 * u) return null;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                width,
                top: safe.cy + p.y - 50 * u,
                textAlign: 'center',
                fontFamily: fonts.sans,
                fontWeight: type.title.weight,
                fontSize: type.title.size * u,
                letterSpacing: type.title.tracking,
                color: palette.memoryText,
                opacity: s.fog * 0.85,
                filter: s.blur > 0.3 ? `blur(${s.blur.toFixed(2)}px)` : undefined,
                transform: `translate3d(${p.x + camX}px, 0, ${s.rel}px)`,
                whiteSpace: 'nowrap',
              }}
            >
              {p.text}
            </div>
          );
        })}
        {(() => {
          const s = plane(headZ);
          return (
            <div
              style={{
                position: 'absolute',
                left: column.left,
                top: safe.cy - 190 * u,
                width: column.width,
                opacity: Math.min(1, s.fog * 1.4),
                filter: s.blur > 0.3 ? `blur(${s.blur.toFixed(2)}px)` : undefined,
                transform: `translate3d(${camX}px, 0, ${s.rel}px)`,
                fontFamily: fonts.sans,
                fontWeight: type.display.weight,
                fontSize: type.display.size * u,
                letterSpacing: type.display.tracking,
                lineHeight: type.display.leading,
                color: theme.text,
              }}
            >
              Every sale
              <br />
              comes with
              <br />
              <span style={{ fontFamily: fonts.serif, fontStyle: 'italic', fontWeight: type.emphasis.weight, fontSize: `${type.emphasis.scale}em`, letterSpacing: type.emphasis.tracking }}>
                three more jobs.
              </span>
            </div>
          );
        })()}
      </AbsoluteFill>
    </Stage>
  );
};
