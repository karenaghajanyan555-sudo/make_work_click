import { CAPTION_BAND } from '../../brand/format.ts';
import { captionWindows, type NarrationSpec } from '../../video/narration.ts';
import { useLayout } from '../lib/hooks.ts';
import { KineticPhrase } from './KineticPhrase.tsx';

/**
 * Narration captions: phrase-based (never word-by-word), one phrase at a time, in the
 * caption band above every scene. Timing from the spec (src/video/narration.ts).
 * Lines without `caption` are captioned by their scene (e.g. the hook headline).
 */
export const NarrationCaptions: React.FC<{ narration: NarrationSpec; totalSeconds: number; align?: 'left' | 'center' }> = ({ narration, totalSeconds, align = 'left' }) => {
  const layout = useLayout();
  return (
    <>
      {captionWindows(narration, totalSeconds).map((c) => (
        <div key={c.id} style={{ position: 'absolute', left: layout.gutter, right: layout.gutter, top: CAPTION_BAND.top * layout.u }}>
          <KineticPhrase markup={c.markup} role="caption" at={c.at} out={c.out} align={align} />
        </div>
      ))}
    </>
  );
};
