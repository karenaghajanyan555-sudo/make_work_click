/** LOOK TEST ONLY: the v010 paper look-test compositions (lab entry, not the production Root). */
import { Composition } from 'remotion';
import { loadBrandFonts } from '../../src/remotion/lib/fonts.ts';
import { LookOpening, LookPage, LookTear, LookThree, LookTurn } from './Look.tsx';

void loadBrandFonts();

const base = { fps: 30, width: 1080, height: 1920 } as const;

export const LookRoot: React.FC = () => (
  <>
    <Composition id="look-opening" component={LookOpening} durationInFrames={105} {...base} />
    <Composition id="look-three" component={LookThree} durationInFrames={1} {...base} />
    <Composition id="look-turn" component={LookTurn} durationInFrames={1} {...base} />
    <Composition id="look-page" component={LookPage} durationInFrames={1} {...base} />
    <Composition id="look-tear" component={LookTear} durationInFrames={120} {...base} />
  </>
);
