# Animation research — exact capabilities at our pins (Phase 3)

2026-11-19. Builds on `docs/research/ANIMATION-SOURCES.md` (2026-11-18); this file records what
was checked against the **installed 4.0.539 packages** (`lab/visual-quality/node_modules`, read
from their `.d.ts` / `dist`) and primary sources fetched today. Labels: **V** verified (source
given) · **M** measured in our renderer (`docs/quality/EXPERIMENT-RESULTS.md`) · **J** judgement ·
**U** unverified.

## 1. Our renderer
- Remotion 4.0.539 renders with Chrome Headless Shell **157.0.8080.0**
  (`@remotion/renderer/dist/browser/get-chrome-download-url.js:41`) and always enables
  `CanvasDrawElement` (`open-browser.js:25`), so `<HtmlInCanvas>` works in renders (V, M).
- `gl: 'swangle'` = `--use-gl=angle --use-angle=swiftshader` (`open-browser.js`): WebGL2 in
  software; **no WebGPU adapter** (M: "No WebGPU adapter available").
- `<HtmlInCanvas>` limits ([docs](https://www.remotion.dev/docs/html-in-canvas), V): "The API is
  unstable"; cross-origin content omitted; CSS background images need same-origin/data URLs;
  premounting off since 4.0.537 (Chrome 157 crash). Open Chrome bugs
  ([list](https://www.remotion.dev/docs/html-in-canvas-bugs), V): runaway memory with nested
  canvases, crash on WebGL context loss, "opacity: 0 can crash" fixed only in 158.0.8118.0 (not
  ours); `backdrop-filter`, `mix-blend-mode`, masks under perspective and translucent groups at
  fractional scale may differ from the page. Its canvas takes no position: pass
  `style={{ position: 'absolute', … }}` (V, `remotion/dist/cjs/HtmlInCanvas.js:597`).

## 2. `@remotion/effects` 4.0.539 (V: installed dist)
- 94 entry points: **71 WebGL2**, **11 2D canvas**, **3 WebGPU** (`pageTurn`, `cylinder`,
  `sphere`). WebGPU ones **cannot render under swangle** (M). `pageTurn` gets a WebGL2 backend in
  4.0.540 (V, researcher: docs + dist diff).
- **Absent at 4.0.539** although listed in the 2026-11-18 research (that list was the monorepo
  main): `magnify` (AvailableFrom 4.0.542), `film-burn`, `iris-wipe`, `lightning`, `radial-wipe`,
  `rain-fall`, `snow-fall`, `uv-translate`, `xy-translate` (`translate` exists).
- Exact parameters (from `.d.ts`):
  | Effect | Parameters (defaults) | Notes |
  |---|---|---|
  | `tear` | progress 0.5 (0 intact, 1 opposite edge, >1 apart), angle 0°, rotation 20° (0–90), jaggedness 20 px | WebGL2 |
  | `paper` | amount 1, colorFront #9fadbc, colorBack #fff, contrast .3, roughness .4, fiber .3, fiberSize .2, crumples .3, crumpleSize .35, folds .65, foldCount 5 (0–15), drops .2, fade 0, seed 6 (0–1000), scale .6 | Multiplies the source colours (text survives); noise texture seeded (`DEFAULT_SEED`) |
  | `pageTurn` | foldPosition [.7,.7], foldDirection 315°, foldRadius 60 px, lightDirection −45°, render both/front/back, backPageOpacity .25, paperColor white | **WebGPU only at 4.0.539** |
  | `roughenEdges` | amount 1, border 26.5 px, scale .07, seed 231.2 | acts on the alpha edge |
  | `glow` | radius 20, intensity 1, threshold 0, color white | |
  | `lightTrail` | direction 180°, distance 80, intensity 1, decay .9, threshold 0, samples 32, color | "more GPU work" (docs) |
  | `lensBlur` | radius 10, irisShape hexagon (triangle…circle), roundness, rotation, aspect, highlightGain/Threshold/Saturation, repeatEdgePixels, samples 256 (16–2048), linearLight | "longer to render"; "sample pattern is deterministic" (docs) |
  | `cornerPin` | topLeft/topRight/bottomRight/bottomLeft UV | |
  | `shine` | progress .5 (**must be ≥ 0**, M), angle 30°, haloSigma 200, coreSigma 65, haloIntensity .3, coreIntensity .4 | |
  | `dropShadow` | radius 12, offsetX/Y 8, opacity .5, color black | follows the alpha (e.g. both torn halves) |
  | `bevelAlpha` | edgeThickness 2 (0–200), lightAngle −60°, lightColor white, lightIntensity .4 | |
  | `linearProgressiveBlur`, `radialProgressiveBlur` | UV start/end, radius | tilt-shift / focus falloff |

## 3. Other Remotion packages at 4.0.539 (V: installed `.d.ts`)
| Package | API | Fit (J) |
|---|---|---|
| `@remotion/motion-blur` | `<CameraMotionBlur shutterAngle samples>`, `<Trail layers lagInFrames trailOpacity>`, **`<HtmlInCanvasMotionBlur width height shutterAngle samples>`** | Docs: the first two are "not recommended anymore" and CameraMotionBlur is "destructive to colors"; use `HtmlInCanvasMotionBlur` (8 samples default, max 64). Cost ≈ samples × the subtree's render time. Children absolutely positioned; `useCurrentFrame()` inside. |
| `@remotion/paths` | `evolvePath`, `interpolatePath`, `getPointAtLength`… (already in root `node_modules` via the studio) | Draw-on lines, morphs: adopt when needed |
| `@remotion/rough-notation` | `Highlight`, `Underline`, `StrikeThrough`, `CrossedOff`, `Box`, `Bracket`, `Circle` (`progress`, `seed`, roughness options); depends on `roughjs` 4.6.6 (MIT) | Hand-drawn marks: only where a story is hand-made (BRAND.md has no hand-drawn language yet) |
| `@remotion/noise` | `noise2D/3D/4D(seed, …)` (simplex-noise 4.0.1, MIT) | Seeded drift |
| `@remotion/three` | `<ThreeCanvas width height>` (peer: three ≥ 0.137, @react-three/fiber ≥ 8) | Lab: three 0.187.0 + R3F 9.8.2 (React ≥ 19 < 19.4: ours 19.2.9) |
| `@remotion/lottie` | `<Lottie animationData>` (peer lottie-web ^5; 5.13.0, MIT) | Only for files we author |
| `@remotion/rive` | `<RemotionRiveCanvas>` (+ `@rive-app/canvas-advanced` 2.31.5, MIT) | Not installed: no Rive file; free exports carry a splash (2026-11-18) |
| `@remotion/mac-cursors` | `<MacOSCursor cursor>`, 70 names | **Do not use**: the 39 SVGs are Apple's OS X cursors — byte-identical to `daviddarnes/mac-cursors`, released "under the Apple User Agreement"; Remotion states no source or licence (V, researcher, sha256 compared). Draw our own cursor. |

## 4. Characters, lip sync, vector authoring
- **Open Peeps** (V): pay-what-you-want $0+ on [Gumroad](https://pablostanley.gumroad.com/l/openpeeps),
  "License: CC0" on the page; the "Flat Assets" ZIP (22,079,697 bytes) has "Separate Atoms":
  head 46, face 30, body 30, facial-hair 17, accessories 9, poses 34 SVGs. No licence file inside:
  the ledger must record the page + date as CC0 proof. Hand-drawn style (J: off our geometric brand
  unless a story wants a human hand).
- **Humaaans** (V/U): same terms; per-part SVG contents not checked (behind checkout).
- **Rhubarb Lip Sync 1.14.0** (V): Linux zip 87,225,003 bytes (binary 7.3 MB + `res/sphinx` 86 MB);
  glibc 2.29 / GLIBCXX 3.4.26 (this machine: 2.35 / 3.4.30); MIT + BSD-style PocketSphinx/CMU model,
  BSL, WTFPL, Unicode data. **Not deterministic by default** (multithreaded segmenting, maintainer
  on issue #42); `--threads 1` "should give deterministic results" (U until we run it twice).
- **Kokoro phonemes** (V, repo): Kokoro 0.9.4 exposes phonemes (`MToken.phonemes`) and per-phoneme
  durations (`Result.pred_dur`), but `scripts/tts/narrate.py:85-89` keeps only word text/start/end.
  Visemes from Kokoro = exact timing, no recogniser — but only for **new** takes (approved takes are
  gold and never re-synthesised).
- **Glaxnimate** (V): GPL-3.0-or-later app (output not covered: GNU GPL FAQ); 0.6.0 (2026-03-01),
  AppImage/Flathub; Lottie import/export with "not all features implemented"; **no bones/IK**, only
  layer parenting. J: fine for simple self-made Lottie, not for rigged characters.
- **Rive**: unchanged from 2026-11-18 (free export splash; Cadet $9/seat/mo). **Mixamo**: FAQ still
  403 (U).

## 5. Licence position (V)
[Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md): free for an
individual or a for-profit with ≤ 3 employees; automation ("code that programmatically calls"
render) is allowed under the free licence; above it, Remotion for Automators "$0.01 per render,
$100/mo minimum". Freelancers count toward the threshold; the planned 5.0 licence (PR #3750,
open) adds contractors. Remotion Elements fall under the same licence (no separate price).

## 6. Version note (J)
Several things we want land just after our pin: `pageTurn` WebGL2 (4.0.540, 17 days old today),
`magnify` (4.0.542, two weeks old on 2026-11-23), Chrome 158 with the opacity-crash fix. An upgrade
is **not** proposed here (owner rule: preserve 4.0.539 unless justified; `package-lock.json` is a
render cache input, so an upgrade re-renders every segment). Revisit only if a concept needs one of them.
