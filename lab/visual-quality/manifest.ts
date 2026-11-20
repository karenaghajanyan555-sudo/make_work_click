/**
 * LAB ONLY (Phase 3 visual quality). Pure data: every experiment composition, the frames to
 * still, the frame used for the determinism check, and what it is compared against.
 * Shared by Root.tsx (browser) and render.ts (Node). Results: docs/quality/EXPERIMENT-RESULTS.md.
 */
export type Group = 'E1' | 'E2' | 'E2R' | 'E3' | 'E4' | 'E5' | 'E6';

export type Experiment = {
  id: string;
  group: Group;
  /** What the clip shows, one line. */
  title: string;
  /** `current` = what the engine does today (the baseline), `experiment` = the candidate. */
  variant: 'current' | 'experiment';
  /** Id of the composition this one is compared with. */
  versus?: string;
  /** The technique under test (package/effect or method). */
  technique: string;
  frames: number;
  stills: number[];
  /** Frame rendered twice for the byte-identity check. */
  detFrame: number;
  /** The clip carries sound (E4 narration). */
  audio?: boolean;
  /** Composition size when not 1080×1920 (plates are sized to their object). */
  width?: number;
  height?: number;
  /** A transparent plate rendered once into out/lab/visual-quality/plates/ (served as /plates):
   *  `still` → plates/<id>.png (frame 0) · `frames` → plates/<id>/f-NNN.png. Plates render
   *  before the compositions that use them (manifest order); no clip, no stage. */
  plate?: 'still' | 'frames';
};

export const FPS = 30;

export const EXPERIMENTS: Experiment[] = [
  // E1 — typography
  { id: 'e1-type-current', group: 'E1', variant: 'current', versus: 'e1-type-cascade', title: 'Headline today: words rise out of blur (KineticPhrase)', technique: 'KineticPhrase entrance="rise" (production component)', frames: 105, stills: [12, 30, 90], detFrame: 30 },
  { id: 'e1-type-cascade', group: 'E1', variant: 'experiment', versus: 'e1-type-current', title: 'Glyph cascade: characters rise from line masks, weight and tracking settle, the serif wipes in along its slant', technique: 'DOM + variable-font weight axis + clip-path; no dependency', frames: 105, stills: [12, 30, 90], detFrame: 30 },
  { id: 'e1-type-depth', group: 'E1', variant: 'experiment', title: 'Type in depth: the jobs fly past the camera, focus lands on the line', technique: 'CSS 3D perspective camera + per-plane depth of field (filter blur)', frames: 120, stills: [10, 50, 110], detFrame: 50 },

  // E2 — physical materials (@remotion/effects through <HtmlInCanvas>)
  { id: 'e2-paper-current', group: 'E2', variant: 'current', versus: 'e2-paper-effects', title: 'Paper today: the hand-built CSS paper of the v010 look test', technique: 'lab/paper-look (CSS gradients + SVG)', frames: 1, stills: [0], detFrame: 0 },
  { id: 'e2-paper-effects', group: 'E2', variant: 'experiment', versus: 'e2-paper-current', title: 'Paper note with procedural fibre, crumple, rough deckle edge and a real cast shadow', technique: '@remotion/effects paper() + roughenEdges() + dropShadow()', frames: 60, stills: [0, 59], detFrame: 30 },
  { id: 'e2-tear-current', group: 'E2', variant: 'current', versus: 'e2-tear-effects', title: 'Tear today: the hand-built tear of the v010 look test', technique: 'lab/paper-look (SVG clip paths)', frames: 120, stills: [0, 20, 48], detFrame: 20 },
  { id: 'e2-tear-effects', group: 'E2', variant: 'experiment', versus: 'e2-tear-current', title: 'The note rips in two along a jagged seam', technique: '@remotion/effects tear() + paper() + dropShadow()', frames: 75, stills: [0, 30, 50, 74], detFrame: 40 },
  { id: 'e2-pageturn', group: 'E2', variant: 'experiment', title: 'A page curls away to reveal the next state underneath', technique: '@remotion/effects pageTurn()', frames: 75, stills: [0, 30, 50, 74], detFrame: 40 },
  { id: 'e2-toggle-current', group: 'E2', variant: 'current', versus: 'e2-toggle-material', title: 'The brand switch today (ToggleMark + CSS bloom)', technique: 'ToggleMark (production component)', frames: 60, stills: [0, 30, 59], detFrame: 30 },
  { id: 'e2-toggle-material', group: 'E2', variant: 'experiment', versus: 'e2-toggle-current', title: 'The brand switch as an object: bevelled edge, a light sweep on the click, a lit glow', technique: '@remotion/effects bevelAlpha() + shine() + glow()', frames: 60, stills: [0, 30, 59], detFrame: 30 },

  // E2R — re-tune + cheaper routes to the same paper/tear (exp/E2b-retune.tsx). Plates first.
  // Plate sizes = note 820×560 + 2 × margin (tight 60, wide 220), see E2b-retune.tsx PLATE.
  { id: 'e2r-plate-tight', group: 'E2R', variant: 'experiment', plate: 'still', width: 940, height: 680, title: 'Plate: the tuned paper note, baked once (transparent)', technique: 'paper() amount 0.3 + roughenEdges() → PNG', frames: 1, stills: [0], detFrame: 0 },
  { id: 'e2r-plate-wide', group: 'E2R', variant: 'experiment', plate: 'still', width: 1260, height: 1000, title: 'Plate: the same note with room for the halves to part', technique: 'paper() amount 0.3 + roughenEdges() → PNG', frames: 1, stills: [0], detFrame: 0 },
  { id: 'e2r-plate-tear', group: 'E2R', variant: 'experiment', plate: 'frames', width: 1260, height: 1000, title: 'Plate: the whole tear pre-rendered as a transparent PNG sequence', technique: '<Img effects={[tear, dropShadow]}> → PNG sequence', frames: 90, stills: [], detFrame: 40 },
  { id: 'e2r-paper-tuned', group: 'E2R', variant: 'experiment', versus: 'e2-paper-current', title: 'Tuned paper (amount 0.3, no drops), live chain every frame', technique: '<HtmlInCanvas> paper() + roughenEdges() + dropShadow()', frames: 60, stills: [0, 59], detFrame: 30 },
  { id: 'e2r-paper-half', group: 'E2R', variant: 'experiment', versus: 'e2r-paper-tuned', title: 'Tuned paper, live chain at half pixel density', technique: '<HtmlInCanvas pixelDensity={0.5}>', frames: 60, stills: [0, 59], detFrame: 30 },
  { id: 'e2r-paper-baked', group: 'E2R', variant: 'experiment', versus: 'e2r-paper-tuned', title: 'Tuned paper baked once, then a plain image with a CSS lift shadow', technique: 'pre-rendered plate + <Img> + CSS drop-shadow', frames: 60, stills: [0, 59], detFrame: 30 },
  { id: 'e2r-tear-tuned', group: 'E2R', variant: 'experiment', versus: 'e2-tear-current', title: 'Tuned tear (progress ≤ 1.1, rotation 6°), live chain every frame', technique: '<HtmlInCanvas> paper + edges + tear() + dropShadow()', frames: 90, stills: [0, 30, 50, 89], detFrame: 40 },
  { id: 'e2r-tear-img', group: 'E2R', variant: 'experiment', versus: 'e2r-tear-tuned', title: 'Tear on the baked plate (no DOM capture, no paper() per frame)', technique: '<Img effects={[tear, dropShadow]}>', frames: 90, stills: [30, 89], detFrame: 40 },
  { id: 'e2r-tear-selective', group: 'E2R', variant: 'experiment', versus: 'e2r-tear-tuned', title: 'Effect only while the paper moves; baked plates before and after', technique: 'plate → <Img effects> during frames 17–73 → final-state plate', frames: 90, stills: [10, 30, 89], detFrame: 40 },
  { id: 'e2r-tear-seq', group: 'E2R', variant: 'experiment', versus: 'e2r-tear-tuned', title: 'The tear pre-rendered once, composited as an image sequence', technique: 'PNG sequence <Img> per frame', frames: 90, stills: [30, 89], detFrame: 40 },
  { id: 'e2r-tear-dom', group: 'E2R', variant: 'experiment', versus: 'e2r-tear-tuned', title: 'Tear without an effect: jagged clip-path halves, fibre edge, CSS shadow', technique: 'baked plate + seeded clip-path polygons + CSS drop-shadow', frames: 90, stills: [0, 30, 50, 89], detFrame: 40 },

  // E3 — cinematic motion (exp/E3-cinematic.tsx)
  { id: 'e3-cam-current', group: 'E3', variant: 'current', versus: 'e3-rack-css', title: 'Opening today: to-dos on fixed blur planes, a smooth push', technique: 'ScatterMemo + CameraRig smooth (production)', frames: 120, stills: [0, 60, 119], detFrame: 60 },
  { id: 'e3-rack-css', group: 'E3', variant: 'experiment', versus: 'e3-cam-current', title: 'A perspective camera trucks across three depths; focus racks to the hero to-do, which resolves', technique: 'CSS 3D perspective + per-plane CSS blur from |z − focus|', frames: 120, stills: [10, 50, 100], detFrame: 50 },
  { id: 'e3-rack-lens', group: 'E3', variant: 'experiment', versus: 'e3-rack-css', title: 'The same shot with lens bokeh instead of Gaussian blur', technique: '@remotion/effects lensBlur() on per-memo canvases', frames: 120, stills: [10, 50, 100], detFrame: 50 },
  { id: 'e3-whip-none', group: 'E3', variant: 'current', versus: 'e3-whip-mblur', title: 'A card whips in; a whip pan swaps it for the solved one (no blur)', technique: 'DOM transforms', frames: 75, stills: [6, 45, 74], detFrame: 6 },
  { id: 'e3-whip-mblur', group: 'E3', variant: 'experiment', versus: 'e3-whip-none', title: 'The same with true motion blur, only on the fast frames', technique: '@remotion/motion-blur HtmlInCanvasMotionBlur (8 samples, 180°)', frames: 75, stills: [6, 45], detFrame: 6 },
  { id: 'e3-whip-svg', group: 'E3', variant: 'experiment', versus: 'e3-whip-mblur', title: 'The same with a cheap velocity-scaled directional blur', technique: 'SVG feGaussianBlur stdDeviation="σx 0" from velocity', frames: 75, stills: [6, 45], detFrame: 6 },
  { id: 'e3-whip-mblur2', group: 'E3', variant: 'experiment', versus: 'e3-whip-mblur', title: 'HtmlInCanvasMotionBlur always on (isolates the capture error)', technique: '@remotion/motion-blur, no disabled toggle', frames: 75, stills: [6, 45], detFrame: 6 },
  { id: 'e3-whip-accum', group: 'E3', variant: 'experiment', versus: 'e3-whip-svg', title: 'True 8-sample motion blur from sub-frame DOM samples (no canvas)', technique: 'N × DOM at fractional frames, mix-blend-mode plus-lighter at 1/N, isolated group', frames: 75, stills: [6, 45], detFrame: 6 },
  { id: 'e3-trail-css', group: 'E3', variant: 'experiment', versus: 'e3-trail-effect', title: 'The signal runs the route through three steps: drawn path + comet tail', technique: '@remotion/paths evolvePath + SVG stroke segments', frames: 90, stills: [30, 45, 75], detFrame: 45 },
  { id: 'e3-trail-effect', group: 'E3', variant: 'experiment', versus: 'e3-trail-css', title: 'The same with a light trail along the tangent', technique: '@remotion/effects lightTrail() on a route-sized canvas', frames: 90, stills: [30, 45, 75], detFrame: 45 },

  // E4 — character + lip sync (exp/E4-character.tsx): same character, three mouth tracks, v008 hook audio (read-only)
  { id: 'e4-mouth-env', group: 'E4', variant: 'experiment', versus: 'e4-mouth-hybrid', audio: true, title: 'A · the mouth opens with the loudness (jaw only)', technique: 'RMS envelope → opening (zero dependency)', frames: 120, stills: [14, 37, 69, 100], detFrame: 69 },
  { id: 'e4-mouth-g2v', group: 'E4', variant: 'experiment', versus: 'e4-mouth-hybrid', audio: true, title: 'B · mouth shapes from the word timings + letter rules', technique: 'take.json word timing + letter→viseme, smoothed, closures forced', frames: 120, stills: [14, 37, 69, 100], detFrame: 69 },
  { id: 'e4-mouth-hybrid', group: 'E4', variant: 'experiment', versus: 'e4-mouth-g2v', audio: true, title: 'C · letter shapes scaled by loudness, word ends trimmed to the voice', technique: 'B shapes × A amplitude (zero dependency)', frames: 120, stills: [14, 37, 69, 100], detFrame: 69 },
  { id: 'e4-mouth-compare', group: 'E4', variant: 'experiment', audio: true, title: 'A / B / C side by side with a loudness-vs-opening timeline', technique: 'diagnostic composite', frames: 120, stills: [37, 69], detFrame: 69 },

  // E5 — product / software demonstration (exp/E5-demo.tsx)
  { id: 'e5-demo-current', group: 'E5', variant: 'current', versus: 'e5-demo-cursor', title: 'Demo today: the 4-row card, rows flip to lime by themselves', technique: 'DashboardScene (production)', frames: 150, stills: [30, 90, 149], detFrame: 90 },
  { id: 'e5-demo-cursor', group: 'E5', variant: 'experiment', versus: 'e5-demo-current', title: 'A person sets the rule once (cursor, typing, switch), the camera pushes in to read it, then the system works the list', technique: 'DOM browser window + our own SVG pointer + pure camera transform', frames: 150, stills: [10, 45, 75, 140], detFrame: 45 },

  // E6 — 3D (exp/E6-3d.tsx): same choreography, two renderers
  { id: 'e6-stack-css', group: 'E6', variant: 'experiment', versus: 'e6-stack-three', title: 'Five to-dos fan out as the camera orbits; each flips to what the system did', technique: 'CSS 3D preserve-3d + pure normal shading', frames: 120, stills: [0, 40, 75, 119], detFrame: 75 },
  { id: 'e6-stack-three', group: 'E6', variant: 'experiment', versus: 'e6-stack-css', title: 'The same with real slabs, a key light and soft shadow maps', technique: '@remotion/three + three 0.187.0 + R3F 9.8.2 (swangle)', frames: 120, stills: [0, 40, 75, 119], detFrame: 75 },
];

export const byId = (id: string): Experiment => {
  const e = EXPERIMENTS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown experiment ${id}`);
  return e;
};
