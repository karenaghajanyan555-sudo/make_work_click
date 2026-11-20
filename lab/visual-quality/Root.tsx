/** LAB ONLY: the Phase 3 visual-quality experiment compositions (lab entry, not the production Root). */
import { Composition } from 'remotion';
import { loadBrandFonts } from '../../src/remotion/lib/fonts.ts';
import { LookPage, LookTear } from '../paper-look/Look.tsx';
import { PageTurn, PaperEffects, TearEffects, ToggleCurrent, ToggleMaterial } from './exp/E2-materials.tsx';
import { TypeCascade, TypeCurrent, TypeDepth } from './exp/E1-typography.tsx';
import { PaperBaked, PaperHalf, PaperTuned, PlateTear, PlateTight, PlateWide, TearDom, TearOnImg, TearSelective, TearSequence, TearTuned } from './exp/E2b-retune.tsx';
import { CamCurrent, RackCss, RackLens, TrailCss, TrailEffect, WhipAccum, WhipMblur, WhipMblur2, WhipNone, WhipSvg } from './exp/E3-cinematic.tsx';
import { MouthCompare, MouthEnv, MouthG2v, MouthHybrid } from './exp/E4-character.tsx';
import { DemoCurrent, DemoCursor } from './exp/E5-demo.tsx';
import { StackCss, StackThree } from './exp/E6-3d.tsx';
import { EXPERIMENTS, FPS } from './manifest.ts';

void loadBrandFonts();

const COMPONENTS: Record<string, React.FC> = {
  'e1-type-current': TypeCurrent,
  'e1-type-cascade': TypeCascade,
  'e1-type-depth': TypeDepth,
  'e2-paper-current': LookPage,
  'e2-paper-effects': PaperEffects,
  'e2-tear-current': LookTear,
  'e2-tear-effects': TearEffects,
  'e2-pageturn': PageTurn,
  'e2-toggle-current': ToggleCurrent,
  'e2-toggle-material': ToggleMaterial,
  'e2r-plate-tight': PlateTight,
  'e2r-plate-wide': PlateWide,
  'e2r-plate-tear': PlateTear,
  'e2r-paper-tuned': PaperTuned,
  'e2r-paper-half': PaperHalf,
  'e2r-paper-baked': PaperBaked,
  'e2r-tear-tuned': TearTuned,
  'e2r-tear-img': TearOnImg,
  'e2r-tear-selective': TearSelective,
  'e2r-tear-seq': TearSequence,
  'e2r-tear-dom': TearDom,
  'e3-cam-current': CamCurrent,
  'e3-rack-css': RackCss,
  'e3-rack-lens': RackLens,
  'e3-whip-none': WhipNone,
  'e3-whip-mblur': WhipMblur,
  'e3-whip-svg': WhipSvg,
  'e3-whip-mblur2': WhipMblur2,
  'e3-whip-accum': WhipAccum,
  'e3-trail-css': TrailCss,
  'e3-trail-effect': TrailEffect,
  'e4-mouth-env': MouthEnv,
  'e4-mouth-g2v': MouthG2v,
  'e4-mouth-hybrid': MouthHybrid,
  'e4-mouth-compare': MouthCompare,
  'e5-demo-current': DemoCurrent,
  'e5-demo-cursor': DemoCursor,
  'e6-stack-css': StackCss,
  'e6-stack-three': StackThree,
};

export const LabRoot: React.FC = () => (
  <>
    {EXPERIMENTS.filter((e) => COMPONENTS[e.id]).map((e) => (
      <Composition key={e.id} id={e.id} component={COMPONENTS[e.id]!} durationInFrames={e.frames} fps={FPS} width={e.width ?? 1080} height={e.height ?? 1920} />
    ))}
  </>
);
