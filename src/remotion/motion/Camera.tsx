import { AbsoluteFill } from 'remotion';
import { sampleCamera, type CameraKey } from '../../video/camera.ts';
import { useLayout, usePreset, useTime } from '../lib/hooks.ts';

/**
 * Virtual camera. Wrap a scene's world in <CameraRig keys={…}> to get slow dollies,
 * settles and pans with the brand's in-out easing. Zoom pivots on the live-area
 * centre so safe-zone content stays put. The preset's camera intensity scales every
 * move (editorial = 1: as authored; minimal ≈ locked off). `locked` ignores the preset
 * where geometry must stay exact (continuity cuts, caption-band clearance).
 */
export const CameraRig: React.FC<{ keys: readonly CameraKey[]; locked?: boolean; children: React.ReactNode }> = ({ keys, locked, children }) => {
  const { t } = useTime();
  const layout = useLayout();
  const preset = usePreset();
  const k = locked ? 1 : preset.motion.camera;
  const raw = sampleCamera(keys, t);
  const cam = k === 1 ? raw : { zoom: 1 + (raw.zoom - 1) * k, x: raw.x * k, y: raw.y * k };
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${-cam.x * layout.u}px, ${-cam.y * layout.u}px) scale(${cam.zoom})`,
        transformOrigin: `${layout.safe.cx}px ${layout.safe.cy}px`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Depth planes for layered parallax and depth of field. */
export const DEPTH = {
  far: { scale: 0.78, blur: 4.5, opacity: 0.4, drift: 0.22 },
  mid: { scale: 1, blur: 0, opacity: 0.92, drift: 0.42 },
  near: { scale: 1.3, blur: 12, opacity: 0.5, drift: 0.8 },
} as const;

export type DepthPlane = keyof typeof DEPTH;
