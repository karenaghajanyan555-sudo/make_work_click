import { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, continueRender, delayRender } from 'remotion';
import { sampleCamera, sampleCameraSmooth, type CameraKey } from '../../video/camera.ts';
import { useLayout, usePreset, useTime } from '../lib/hooks.ts';

/**
 * Virtual camera. Wrap a scene's world in <CameraRig keys={…}> to get slow dollies,
 * settles and pans with the brand's in-out easing. Zoom pivots on the live-area
 * centre so safe-zone content stays put. The preset's camera intensity scales every
 * move (editorial = 1: as authored; minimal ≈ locked off). `locked` ignores the preset
 * where geometry must stay exact (continuity cuts, caption-band clearance). `smooth` (opt-in)
 * glides through the keys on one continuous path (sampleCameraSmooth) instead of easing in
 * and out of every key, and moves the picture like a real camera (D41): Chrome snaps text to
 * whole pixels, so a slow push on type stutters (measured: still for 8–10 frames, then a 1 px
 * jump). A layer rasterised at 1:1 and transformed by the compositor moves by fractions of a
 * pixel (useCompositorMove).
 */
export const CameraRig: React.FC<{ keys: readonly CameraKey[]; locked?: boolean; smooth?: boolean; children: React.ReactNode }> = ({ keys, locked, smooth, children }) => {
  const { t } = useTime();
  const layout = useLayout();
  const preset = usePreset();
  const k = locked ? 1 : preset.motion.camera;
  const raw = smooth ? sampleCameraSmooth(keys, t) : sampleCamera(keys, t);
  const cam = k === 1 ? raw : { zoom: 1 + (raw.zoom - 1) * k, x: raw.x * k, y: raw.y * k };
  const transform = `translate(${-cam.x * layout.u}px, ${-cam.y * layout.u}px) scale(${cam.zoom})`;
  const ref = useCompositorMove(Boolean(smooth), transform);
  return (
    <AbsoluteFill
      ref={ref}
      style={{
        // Smooth: transform and will-change are set by useCompositorMove, not by React.
        ...(smooth ? {} : { transform }),
        transformOrigin: `${layout.safe.cx}px ${layout.safe.cy}px`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * Compositor-moved layer, re-rasterised at 1:1 on every frame (D41). Chrome keeps a
 * `will-change: transform` layer's raster scale only until it decides otherwise: with animated
 * content inside, it re-rasters at the zoomed scale every ~10 frames and the type jumps again
 * (measured; two render tabs then alternate). So each frame: drop the layer and the transform,
 * create the layer untransformed (raster 1:1), then apply the camera transform; the frame is
 * captured only after that (delayRender, called while rendering the frame).
 */
const RASTER_SETTLE_FRAMES = 3;

function useCompositorMove(enabled: boolean, transform: string) {
  const { frame } = useTime();
  const el = useRef<HTMLDivElement>(null);
  const handles = useRef(new Map<number, number>());
  if (enabled && !handles.current.has(frame)) handles.current.set(frame, delayRender(`CameraRig: 1:1 raster, frame ${frame}`));
  useLayoutEffect(() => {
    const node = el.current;
    const handle = handles.current.get(frame);
    if (!enabled || !node) return;
    if (handle === undefined) {
      // Re-render within an already captured frame: just keep the transform current.
      node.style.willChange = 'transform';
      node.style.transform = transform;
      return;
    }
    const raf: number[] = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      handles.current.delete(frame);
      continueRender(handle);
    };
    // Animation frames to wait after each step: raster runs on its own threads, and a layer
    // whose 1:1 tiles are not ready when the transform lands is rastered at the zoomed scale.
    const after = (n: number, fn: () => void) => {
      const tick = (k: number) => raf.push(requestAnimationFrame(() => (k <= 1 ? fn() : tick(k - 1))));
      tick(n);
    };
    node.style.willChange = 'auto';
    node.style.transform = 'none';
    after(1, () => {
      node.style.willChange = 'transform';
      after(RASTER_SETTLE_FRAMES, () => {
        node.style.transform = transform;
        after(1, finish);
      });
    });
    return () => {
      raf.forEach(cancelAnimationFrame);
      if (!done) {
        node.style.willChange = 'transform';
        node.style.transform = transform;
      }
      finish();
    };
  }, [enabled, frame, transform]);
  return el;
}

/** Depth planes for layered parallax and depth of field. */
export const DEPTH = {
  far: { scale: 0.78, blur: 4.5, opacity: 0.4, drift: 0.22 },
  mid: { scale: 1, blur: 0, opacity: 0.92, drift: 0.42 },
  near: { scale: 1.3, blur: 12, opacity: 0.5, drift: 0.8 },
} as const;

export type DepthPlane = keyof typeof DEPTH;
