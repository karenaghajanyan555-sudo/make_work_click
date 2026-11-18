import { AbsoluteFill } from 'remotion';
import { duration as D, fonts, palette, type } from '../../brand/tokens.ts';
import { disclosureAt, END_CARD_LAYOUT, type EndCardBeats } from '../../video/scenes/endCard.ts';
import { ease, mixColor, progress } from '../lib/anim.ts';
import { useLayout, useTime } from '../lib/hooks.ts';
import { CameraRig } from '../motion/Camera.tsx';
import { ClickRipple, SoftLight } from '../motion/Signal.tsx';
import type { DisclosureTag } from '../../video/affiliate.ts';
import { AdDisclosure } from './Disclosure.tsx';
import { KineticPhrase } from './KineticPhrase.tsx';
import { ToggleMark } from './Mark.tsx';

/**
 * BrandOutro: the MAKE WORK CLICK lockup. The hero switch clicks on (signature), the
 * wordmark sets word by word out of a mask, a hairline, then the CTA. Used by the endCard
 * scene; any scene that ends on the brand renders this, never its own version.
 */
export const BrandLockup: React.FC<{ beats: EndCardBeats; cta: string; switchHandedOver?: boolean; burst?: boolean; smooth?: boolean; duration?: number; disclosure?: DisclosureTag }> = ({ beats: b, cta, switchHandedOver, burst, smooth, duration, disclosure }) => {
  const lockup = <Lockup beats={b} cta={cta} switchHandedOver={switchHandedOver} burst={burst} smooth={smooth} />;
  // Affiliate videos: the ad tag sits outside the camera layer, so the push never moves or
  // rescales it (it stays exactly where the safe-zone test measured it).
  const tag = disclosure ? <DisclosureLayer tag={disclosure} at={disclosureAt(b)} /> : null;
  if (!burst) return tag ? <AbsoluteFill>{lockup}{tag}</AbsoluteFill> : lockup;
  if (smooth) {
    // Smooth: from the click a slow push that is still moving on the last frame (the path ends
    // past the scene), on the compositor-moved camera layer (no glyph stepping: D41).
    const end = Math.max(b.click + 1, duration ?? b.click + 3);
    const rig = (
      <CameraRig smooth keys={[{ t: 0, zoom: 1, x: 0, y: 0 }, { t: b.click, zoom: 1, x: 0, y: 0 }, { t: end + 1.4, zoom: 1.06, x: 0, y: 0 }]}>
        {lockup}
      </CameraRig>
    );
    return tag ? <AbsoluteFill>{rig}{tag}</AbsoluteFill> : rig;
  }
  // Burst: after the click, the lockup settles in on a slow push to the end of the scene.
  const end = Math.max(b.click + 1, duration ?? b.click + 3);
  const rig = (
    <CameraRig keys={[{ t: 0, zoom: 1, x: 0, y: 0 }, { t: b.click, zoom: 1, x: 0, y: 0 }, { t: end, zoom: 1.035, x: 0, y: 0, ease: 'linear' }]}>{lockup}</CameraRig>
  );
  return tag ? <AbsoluteFill>{rig}{tag}</AbsoluteFill> : rig;
};

/** The ad disclosure under the CTA (END_CARD_LAYOUT.disclosureTop), centred in the gutters. */
const DisclosureLayer: React.FC<{ tag: DisclosureTag; at: number }> = ({ tag, at }) => {
  const layout = useLayout();
  const { u } = layout;
  return (
    <div style={{ position: 'absolute', left: layout.gutter, right: layout.gutter, top: END_CARD_LAYOUT.disclosureTop * u }}>
      <AdDisclosure tag={tag} at={at} />
    </div>
  );
};

const Lockup: React.FC<{ beats: EndCardBeats; cta: string; switchHandedOver?: boolean; burst?: boolean; smooth?: boolean }> = ({ beats: b, cta, switchHandedOver, burst, smooth }) => {
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

  // Smooth: the light blooms in after the click and settles (no flash), the switch's own
  // ripple stays (signature), the wide shockwave goes.
  const bloom = progress(frame, f(b.click), f(D.base), ease.glide);
  const swell = bloom * (1 - 0.35 * progress(frame, f(b.click + D.base), f(D.travel * 1.5), ease.inOut));
  return (
    <AbsoluteFill>
      {smooth ? (
        <SoftLight x={cx} y={cy} rx={820 * u} ry={640 * u} core={300 * u} bloom={swell} signal={swell} />
      ) : (
        <AbsoluteFill style={{ background: `radial-gradient(${760 * u}px ${560 * u}px at 50% ${(cy / layout.height) * 100}%, rgba(201,242,93,${0.1 * mood + 0.18 * flash}), transparent 70%)` }} />
      )}

      <div style={{ position: 'absolute', left: cx - h * 0.9, top: cy - h / 2, opacity: enter, transform: `scale(${0.9 + 0.1 * enter})` }}>
        <ToggleMark on={on} height={h} />
      </div>
      <ClickRipple at={b.click} x={cx} y={cy} size={170 * u} strength={smooth ? 0.6 : 1} />
      {burst && !smooth && (
        <>
          <ClickRipple at={b.click + 0.04} x={cx} y={cy} size={760 * u} strength={0.32} />
          <AbsoluteFill style={{ background: `radial-gradient(${1300 * u}px ${1300 * u}px at 50% ${(cy / layout.height) * 100}%, rgba(201,242,93,${0.14 * flash}), transparent 60%)` }} />
        </>
      )}

      {/* Wordmark: each word rises out of a mask; CLICK takes the signal when on. */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: L.wordmarkTop * u, display: 'flex', justifyContent: 'center', gap: ws.size * 0.28 * u }}>
        {words.map((w, i) => {
          // Smooth: each word rises a third of its height into focus (blur → sharp) on the glide
          // curve; settled words carry no transform or filter (crisp, same path as at rest).
          const p = smooth ? progress(frame, f(b.wordmark + i * 0.12), f(D.slow), ease.glide) : progress(frame, f(b.wordmark + i * 0.09), f(0.6));
          const rise = smooth && p < 1;
          return (
            <div key={w} style={smooth ? { paddingBottom: 6 * u } : { overflow: 'hidden', paddingBottom: 6 * u }}>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: ws.size * u,
                  fontWeight: ws.weight,
                  letterSpacing: ws.tracking,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  color: i === 2 ? mixColor(palette.paper, palette.signal, on) : palette.paper,
                  ...(smooth
                    ? { opacity: p, transform: rise ? `translateY(${(1 - p) * 34}%)` : undefined, filter: rise && p < 0.98 ? `blur(${(1 - p) * 9 * u}px)` : undefined }
                    : { transform: `translateY(${(1 - p) * 105}%)` }),
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
