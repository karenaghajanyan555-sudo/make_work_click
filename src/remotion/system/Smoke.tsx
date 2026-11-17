import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { palette } from '../../brand/tokens.ts';

/** Toolchain check only (npm run doctor -- --render). Not brand content. */
export const Smoke: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.ink, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: 600, height: 8, background: '#222', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${(frame / Math.max(1, durationInFrames - 1)) * 100}%`, height: '100%', background: palette.signal }} />
      </div>
    </AbsoluteFill>
  );
};
