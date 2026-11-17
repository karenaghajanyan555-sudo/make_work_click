import { Composition } from 'remotion';
import { VIDEOS } from '../../content/index.ts';
import { FORMATS } from '../brand/format.ts';
import { computeTimeline } from '../video/timeline.ts';
import { loadBrandFonts } from './lib/fonts.ts';
import { Smoke } from './system/Smoke.tsx';
import { VideoComposition, type VideoProps } from './video/VideoComposition.tsx';

void loadBrandFonts();

/** One composition per registered VideoSpec (content/index.ts), plus the toolchain smoke test. */
export const Root: React.FC = () => (
  <>
    {VIDEOS.map((spec) => {
      const format = FORMATS[spec.format];
      return (
        <Composition<Record<string, unknown> & VideoProps, Record<string, unknown> & VideoProps>
          key={spec.id}
          id={spec.id}
          component={VideoComposition}
          durationInFrames={computeTimeline(spec, format.fps).totalFrames}
          fps={format.fps}
          width={format.width}
          height={format.height}
          defaultProps={{ videoId: spec.id, debug: false, audio: spec.narration?.take ? `generated/${spec.id}/mix.wav` : null }}
        />
      );
    })}
    <Composition id="smoke" component={Smoke} durationInFrames={60} fps={30} width={1080} height={1920} />
  </>
);
