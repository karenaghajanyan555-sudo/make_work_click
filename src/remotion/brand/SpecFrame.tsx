import { AbsoluteFill } from 'remotion';
import { palette, type } from '../../brand/tokens.ts';
import { chapterAt, type Timeline } from '../../video/timeline.ts';
import { ease, progress } from '../lib/anim.ts';
import { useLayout, useTheme, useTime } from '../lib/hooks.ts';
import { Label, ToggleMark } from './Mark.tsx';

/**
 * Brand signature: the spec frame. Registration marks at the corners of the live
 * area, plus technical annotations — series mark, running timecode and the current
 * chapter. It frames every video the same way, like a studio's plate or a blueprint
 * title block. Decorative only: nothing critical lives in it.
 */
export const SpecFrame: React.FC<{ series: string; chapters: Timeline['chapters']; on?: number }> = ({ series, chapters, on = 0 }) => {
  const { frame, fps, f } = useTime();
  const layout = useLayout();
  const theme = useTheme();
  const { u, safe } = layout;
  const arm = 26 * u;
  const line = Math.max(1, 2 * u);
  const inset = 9 * u;
  const L = safe.left - inset;
  const R = safe.right + inset;
  const T = safe.top - 28 * u;
  const B = safe.bottom + 28 * u;
  const labelSize = type.label.size * u;

  const seconds = Math.floor(frame / fps);
  const frames = frame % fps;
  const timecode = `00:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;

  const chapter = chapterAt(chapters, frame);
  const flip = chapter ? progress(frame, chapter.frame, f(0.4), ease.out) : 1;

  const corner = (x: number, y: number, dx: 1 | -1, dy: 1 | -1) => (
    <div style={{ position: 'absolute', left: x - (dx < 0 ? arm : 0), top: y - (dy < 0 ? arm : 0), width: arm, height: arm }}>
      <div style={{ position: 'absolute', [dy > 0 ? 'top' : 'bottom']: 0, left: 0, width: arm, height: line, background: theme.frameLine }} />
      <div style={{ position: 'absolute', [dx > 0 ? 'left' : 'right']: 0, top: 0, width: line, height: arm, background: theme.frameLine }} />
    </div>
  );

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {corner(L, T, 1, 1)}
      {corner(R, T, -1, 1)}
      {corner(L, B, 1, -1)}
      {corner(R, B, -1, -1)}

      <div style={{ position: 'absolute', left: L, top: T - 50 * u, display: 'flex', alignItems: 'center', gap: 14 * u }}>
        <ToggleMark on={on} height={20 * u} offTrack="#262A30" offKnob={palette.smoke} />
        <Label size={labelSize} color={palette.fog}>
          Make Work Click
        </Label>
        <Label size={labelSize} color={palette.smoke}>
          {series}
        </Label>
      </div>
      <div style={{ position: 'absolute', right: layout.width - R, top: T - 50 * u }}>
        <Label size={labelSize} color={palette.smoke}>
          {timecode}
        </Label>
      </div>
      {chapter && (
        <div
          style={{
            position: 'absolute',
            left: L,
            top: B + 22 * u,
            opacity: flip,
            transform: `translateY(${(1 - flip) * 10 * u}px)`,
          }}
        >
          <Label size={labelSize} color={chapter.index > 0 ? palette.signal : palette.fog}>
            {chapter.label}
          </Label>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** QA overlay: shades everything outside the live area (render with debug: true). */
export const SafeZoneOverlay: React.FC = () => {
  const { safe, width, height } = useLayout();
  const shade = 'rgba(255,0,80,0.28)';
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width, height: safe.top, background: shade }} />
      <div style={{ position: 'absolute', left: 0, top: safe.bottom, width, height: height - safe.bottom, background: shade }} />
      <div style={{ position: 'absolute', left: 0, top: safe.top, width: safe.left, height: safe.height, background: shade }} />
      <div style={{ position: 'absolute', left: safe.right, top: safe.top, width: width - safe.right, height: safe.height, background: shade }} />
      <div style={{ position: 'absolute', left: safe.left, top: safe.top, width: safe.width, height: safe.height, outline: '2px dashed rgba(255,0,80,0.9)' }} />
    </AbsoluteFill>
  );
};
