import { AbsoluteFill } from 'remotion';
import { fonts, palette, type } from '../../brand/tokens.ts';
import { END_CARD_LAYOUT, type EndCardBeats } from '../../video/scenes/endCard.ts';
import { ease, mixColor, progress } from '../lib/anim.ts';
import { useLayout, useTime } from '../lib/hooks.ts';
import { CameraRig } from '../motion/Camera.tsx';
import { ClickRipple } from '../motion/Signal.tsx';
import { KineticPhrase } from './KineticPhrase.tsx';
import { ToggleMark } from './Mark.tsx';

/**
 * BrandOutro: the MAKE WORK CLICK lockup. The hero switch clicks on (signature), the
 * wordmark sets word by word out of a mask, a hairline, then the CTA. Used by the endCard
 * scene; any scene that ends on the brand renders this, never its own version.
 */
export const BrandLockup: React.FC<{ beats: EndCardBeats; cta: string; switchHandedOver?: boolean; burst?: boolean; duration?: number }> = ({ beats: b, cta, switchHandedOver, burst, duration }) => {
  const lockup = <Lockup beats={b} cta={cta} switchHandedOver={switchHandedOver} burst={burst} />;
  if (!burst) return lockup;
  // Burst: after the click, the lockup settles in on a slow push to the end of the scene.
  const end = Math.max(b.click + 1, duration ?? b.click + 3);
  return (
    <CameraRig keys={[{ t: 0, zoom: 1, x: 0, y: 0 }, { t: b.click, zoom: 1, x: 0, y: 0 }, { t: end, zoom: 1.035, x: 0, y: 0, ease: 'linear' }]}>{lockup}</CameraRig>
  );
};

const Lockup: React.FC<{ beats: EndCardBeats; cta: string; switchHandedOver?: boolean; burst?: boolean }> = ({ beats: b, cta, switchHandedOver, burst }) => {
  const { frame, f } = useTime();
  const layout = useLayout();
  const { u } = layout;
  const L = END_CARD_LAYOUT;
  const h = L.switchHeight * u;
  const cx = L.switchCx * u;
  const cy = L.switchCy * u;

  const enter = switchHandedOver ? 1 : progress(frame, 0, f(0.4));
  const on = progress(frame, f(b.click), f(0.22), ease.inOut);
  const flash = progress(frame, f(b.click), f(0.12)) * (1 - progress(frame, f(b.click + 0.1), f(0.7), ease.in));
  const mood = progress(frame, f(b.click), f(1.2), ease.out);
  const rule = progress(frame, f(b.wordmark + 0.45), f(0.5));
  const words = ['Make', 'Work', 'Click'];
  const ws = type.wordmark;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(${760 * u}px ${560 * u}px at 50% ${(cy / layout.height) * 100}%, rgba(201,242,93,${0.1 * mood + 0.18 * flash}), transparent 70%)` }} />

      <div style={{ position: 'absolute', left: cx - h * 0.9, top: cy - h / 2, opacity: enter, transform: `scale(${0.9 + 0.1 * enter})` }}>
        <ToggleMark on={on} height={h} />
      </div>
      <ClickRipple at={b.click} x={cx} y={cy} size={170 * u} />
      {burst && (
        <>
          <ClickRipple at={b.click + 0.04} x={cx} y={cy} size={760 * u} strength={0.32} />
          <AbsoluteFill style={{ background: `radial-gradient(${1300 * u}px ${1300 * u}px at 50% ${(cy / layout.height) * 100}%, rgba(201,242,93,${0.14 * flash}), transparent 60%)` }} />
        </>
      )}

      {/* Wordmark: each word rises out of a mask; CLICK takes the signal when on. */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: L.wordmarkTop * u, display: 'flex', justifyContent: 'center', gap: ws.size * 0.28 * u }}>
        {words.map((w, i) => {
          const p = progress(frame, f(b.wordmark + i * 0.09), f(0.6));
          return (
            <div key={w} style={{ overflow: 'hidden', paddingBottom: 6 * u }}>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: ws.size * u,
                  fontWeight: ws.weight,
                  letterSpacing: ws.tracking,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  color: i === 2 ? mixColor(palette.paper, palette.signal, on) : palette.paper,
                  transform: `translateY(${(1 - p) * 105}%)`,
                }}
              >
                {w}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', left: cx - 60 * u, top: L.ruleTop * u, width: 120 * u * rule, height: Math.max(1, 2 * u), background: palette.hairlineStrong, transform: `translateX(${(1 - rule) * 60 * u}px)` }} />

      <div style={{ position: 'absolute', left: layout.gutter, right: layout.gutter, top: L.ctaTop * u }}>
        <KineticPhrase markup={cta} role="lead" at={b.cta} align="center" />
      </div>
    </AbsoluteFill>
  );
};
