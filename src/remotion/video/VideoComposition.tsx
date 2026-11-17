import { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { getVideo } from '../../../content/index.ts';
import { DEFAULT_PRESET, PRESETS } from '../../brand/presets.ts';
import { THEMES, type Theme } from '../../brand/theme.ts';
import type { TransitionSpec } from '../../video/spec.ts';
import { computeTimeline, TRANSITIONS } from '../../video/timeline.ts';
import { ease, progress } from '../lib/anim.ts';
import { PresetContext, SceneArrivalContext, ThemeContext, useLayout } from '../lib/hooks.ts';
import { Backdrop } from '../brand/Backdrop.tsx';
import { NarrationCaptions } from '../brand/Captions.tsx';
import { SafeZoneOverlay, SpecFrame } from '../brand/SpecFrame.tsx';
import { SceneRenderer } from '../scenes/registry.tsx';

export type VideoProps = {
  videoId: string;
  debug: boolean;
  /** Final mix (path under public/) for Studio preview. Renders pass null and mux the mix afterwards. */
  audio?: string | null;
};

/**
 * Renders any VideoSpec: global ground (with grain), scenes on the computed timeline
 * with their hand-off transitions, the signature frame, and (debug) the safe-zone overlay.
 */
export const VideoComposition: React.FC<VideoProps> = ({ videoId, debug, audio }) => {
  const spec = getVideo(videoId);
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const timeline = useMemo(() => computeTimeline(spec, fps), [spec, fps]);
  const preset = PRESETS[spec.preset ?? DEFAULT_PRESET];
  // The preset tunes the world (light, vignette); everything else in the theme stays.
  const theme: Theme = useMemo(() => {
    const base = THEMES[spec.theme];
    return { ...base, keyLight: { ...base.keyLight, strength: base.keyLight.strength * preset.world.keyLight }, vignette: preset.world.vignette };
  }, [spec.theme, preset]);
  const firstClick = Object.entries(timeline.cues).find(([k]) => k.endsWith('.click'))?.[1];
  const on = firstClick === undefined ? 0 : progress(frame, firstClick, Math.round(0.22 * fps), ease.inOut);

  return (
    <PresetContext.Provider value={preset}>
    <ThemeContext.Provider value={theme}>
      <AbsoluteFill
        style={{
          backgroundColor: theme.ground,
          WebkitFontSmoothing: 'antialiased',
          textRendering: 'geometricPrecision',
          fontKerning: 'normal',
        }}
      >
        <Backdrop />
        {timeline.entries.map((e) => (
          <Sequence key={e.scene.id} name={e.scene.id} from={e.from} durationInFrames={e.durationInFrames}>
            <Handoff duration={e.durationInFrames} transitionIn={e.transitionIn} transitionOut={e.transitionOut}>
              <SceneArrivalContext.Provider value={e.transitionIn?.type ?? 'cut'}>
                <SceneRenderer scene={e.scene} />
              </SceneArrivalContext.Provider>
            </Handoff>
          </Sequence>
        ))}
        {spec.narration && spec.captions?.enabled !== false && (
          <NarrationCaptions narration={spec.narration} totalSeconds={timeline.totalFrames / fps} align={preset.layout.align} />
        )}
        <SpecFrame series={spec.series} chapters={timeline.chapters} on={on} />
        {audio && <Audio src={staticFile(audio)} />}
        {debug && <SafeZoneOverlay />}
      </AbsoluteFill>
    </ThemeContext.Provider>
    </PresetContext.Provider>
  );
};

/**
 * Scene hand-offs (envelopes: TRANSITIONS in src/video/timeline.ts).
 *  focusPull  outgoing lifts out of focus; incoming resolves from soft focus (v001)
 *  fade       opacity only: for type-led scenes (never fade light UI over the dark ground)
 *  slide      a vertical push: both scenes move together, no opacity (safe for light UI)
 *  zoom       zoom-through: outgoing grows into blur, incoming settles from slightly small
 *  blur       a deep defocus between scenes (cinematic)
 *  wipe       a masked reveal: a hairline sweeps up, the incoming scene is under it
 */
const Handoff: React.FC<{
  duration: number;
  transitionIn: TransitionSpec | null;
  transitionOut: TransitionSpec | null;
  children: React.ReactNode;
}> = ({ duration, transitionIn, transitionOut, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { height, u } = useLayout();
  const tin = transitionIn?.type ?? 'cut';
  const tout = transitionOut?.type ?? 'cut';
  const f = (s: number) => Math.round(s * fps);

  const v001 = (t: string) => t === 'focusPull' || t === 'cut';
  if (v001(tin) && v001(tout)) {
    // The v001 path, unchanged (exact frame counts; `scale(1)` kept: identical pixels).
    const pullIn = tin === 'focusPull';
    const pullOut = tout === 'focusPull';
    const inP = pullIn ? progress(frame, 0, 12) : 1;
    const inOpacity = pullIn ? progress(frame, 0, 7) : 1;
    const outP = pullOut ? progress(frame, duration - 10, 10, ease.in) : 0;
    const blur = (1 - inP) * 12 + outP * 18;
    return (
      <AbsoluteFill style={{ opacity: inOpacity * (1 - outP), filter: blur > 0.05 ? `blur(${blur}px)` : undefined, transform: `scale(${1 + outP * 0.04 - (1 - inP) * 0.02})` }}>
        {children}
      </AbsoluteFill>
    );
  }

  const E = TRANSITIONS;
  const pin = tin === 'cut' ? 1 : progress(frame, 0, f(E[tin].in), tin === 'slide' || tin === 'wipe' ? ease.inOut : ease.out);
  const pout = tout === 'cut' ? 0 : progress(frame, duration - f(E[tout].out), f(E[tout].out), tout === 'slide' || tout === 'wipe' ? ease.inOut : ease.in);
  let opacity = 1, blur = 0, scale = 1, y = 0;
  let clip: string | undefined;
  let edge: number | null = null;
  switch (tin) {
    case 'fade': opacity *= pin; break;
    case 'slide': y += (1 - pin) * height; break;
    case 'zoom': scale *= 0.94 + 0.06 * pin; blur += (1 - pin) * 10; opacity *= Math.min(1, pin * 3); break;
    case 'blur': blur += (1 - pin) * 22; opacity *= Math.min(1, pin * 2); break;
    case 'wipe': clip = `inset(${(1 - pin) * 100}% 0 0 0)`; edge = pin < 1 ? (1 - pin) * height : null; break;
    case 'focusPull': { const p = progress(frame, 0, 12); blur += (1 - p) * 12; scale *= 1 - (1 - p) * 0.02; opacity *= progress(frame, 0, 7); break; }
  }
  switch (tout) {
    case 'fade': opacity *= 1 - pout; break;
    case 'slide': y -= pout * height; break;
    case 'zoom': scale *= 1 + pout * 0.14; blur += pout * 14; opacity *= 1 - Math.max(0, (pout - 0.6) / 0.4); break;
    case 'blur': blur += pout * 26; opacity *= 1 - pout; scale *= 1 + pout * 0.03; break;
    case 'wipe': clip = `inset(0 0 ${pout * 100}% 0)`; break;
    case 'focusPull': { const p = progress(frame, duration - 10, 10, ease.in); blur += p * 18; opacity *= 1 - p; scale *= 1 + p * 0.04; break; }
  }
  return (
    <AbsoluteFill
      style={{
        opacity,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        transform: y !== 0 || scale !== 1 ? `translateY(${y}px) scale(${scale})` : undefined,
        clipPath: clip,
      }}
    >
      {children}
      {edge !== null && <div style={{ position: 'absolute', left: 0, right: 0, top: edge, height: Math.max(1, 2 * u), background: 'rgba(243,241,236,0.55)' }} />}
    </AbsoluteFill>
  );
};
