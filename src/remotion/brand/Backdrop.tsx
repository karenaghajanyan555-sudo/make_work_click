import { AbsoluteFill, random, staticFile } from 'remotion';
import { useTheme, useTime } from '../lib/hooks.ts';

// Film grain: a pre-baked 256px Gaussian noise tile (mean 128; scripts/make-textures.ts),
// re-positioned every frame with a seeded offset (deterministic). It lives in the ground
// layer with normal blending, under the light and all content: it dithers the gradients
// (no banding after H.264) while text and UI stay crisp.
// Measured: a full-frame `mix-blend-mode: overlay` grain cost ~300 ms/frame in headless
// Chrome (software GL); this costs ~100 ms. See docs/DECISIONS.md.
const GRAIN_TILE = staticFile('textures/grain-256.png');
const GRAIN_MEAN = 128;

/** Ground colour to paint *under* the grain so the perceived ground equals `ground`. */
function preGrainGround(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.max(0, Math.round((c - opacity * GRAIN_MEAN) / (1 - opacity))));
  return `rgb(${ch.join(',')})`;
}

/**
 * Brand-world ground: theme ground colour with film grain, a slowly drifting key light
 * and a vignette. Scene-specific light (e.g. the signal bounce after the click) is added
 * by scenes on top of this.
 */
export const Backdrop: React.FC = () => {
  const theme = useTheme();
  const { t, frame } = useTime();
  const keyX = 28 + Math.sin(t * 0.3) * 6;
  const keyY = 13 + Math.cos(t * 0.24) * 4;
  const { rgb, strength } = theme.keyLight;
  const gx = Math.floor(random(`grain-x-${frame}`) * 256);
  const gy = Math.floor(random(`grain-y-${frame}`) * 256);
  return (
    <AbsoluteFill style={{ backgroundColor: preGrainGround(theme.ground, theme.grain) }}>
      <AbsoluteFill style={{ backgroundImage: `url("${GRAIN_TILE}")`, backgroundPosition: `${gx}px ${gy}px`, opacity: theme.grain }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(1300px 1150px at ${keyX}% ${keyY}%, rgba(${rgb},${strength}), rgba(${rgb},${strength * 0.25}) 45%, transparent 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(140% 95% at 50% 42%, transparent 50%, rgba(0,0,0,${theme.vignette}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
