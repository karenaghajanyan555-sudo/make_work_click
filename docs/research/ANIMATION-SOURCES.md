# Animation sources: what we can reuse instead of building

Research of 2026-11-18 (no code change, nothing installed). Purpose: before building a visual
capability (an effect, a hand-drawn mark, a character, 3D), check here for an existing,
licence-clean, deterministic source. Nothing here is approved for use: every addition still
follows CLAUDE.md (dependency ledger reason, exact pin, ≥ 2 weeks old, asset ledger, an opt-in
prop or new primitive, `npm run check`, a measured render).

Labels: **Verified** = checked on the primary source on the date above (link given).
**Judgement** = my recommendation, not a measured fact. **Unverified** = not checked yet.

## 1. Summary

| Need | Best source | Status |
|---|---|---|
| Paper, tear, page turn, rough edges (v010 E2, `lab/paper-look/`) | `@remotion/effects` `paper()`, `tear()`, `pageTurn()`, `roughenEdges()` | Verified available at 4.0.539; render cost + determinism not measured |
| Glow, light trail, lens blur, progressive blur, chromatic aberration, magnify, corner pin | `@remotion/effects` | Same |
| Line draw-on, morph, motion along a path | `@remotion/paths` | Verified available |
| Hand-drawn circle / underline / strike / highlight | `@remotion/rough-notation` | Verified available |
| Motion blur | `@remotion/motion-blur` | Verified available |
| Seeded organic drift | `@remotion/noise` | Verified available |
| Real macOS cursor (capture / demo scenes) | `@remotion/mac-cursors` | Available; cursor art origin unverified |
| 2D people / cartoon characters (free) | Open Peeps or Humaaans (CC0 SVG parts) + Rhubarb Lip Sync (MIT) | Licences verified; rig not built |
| 2D rigged characters (premium) | Rive + `@remotion/rive` | Verified: free exports show a splash; Cadet $9/seat/mo removes it |
| 3D characters | `@remotion/three` + react-three-fiber/drei + Quaternius (CC0) / Mixamo / three-vrm | Licences verified (Mixamo via search summary); cost not measured |
| Avatars in UI rows | DiceBear CC0 styles (Notionists, Lorelei, Open Peeps) | Verified |

## 2. Remotion first-party packages

**Verified (npm, 2026-11-18):** every package below exists at **4.0.539**, the version we pin,
published **2026-10-26** (> 2 weeks old). They must match the `remotion` version exactly. All are
under the Remotion License (free for individuals and for-profit companies with up to 3 employees:
[LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)), the licence we
already use. Install pattern: `npx remotion add @remotion/<name>` or `npm i --save-exact
@remotion/<name>@4.0.539`. The monorepo is at 4.0.545 on 2026-11-18.

| Package | First release | Use for us | Verdict (judgement) |
|---|---|---|---|
| `@remotion/effects` | 4.0.455 (2026-05-01) | See § 2.1 | **Adopt when a concept needs it.** Highest value. |
| `@remotion/paths` | 3.2.11 (2022) | `evolvePath` (draw a line on), `interpolatePath` (morph), point at length | Adopt when needed |
| `@remotion/rough-notation` | 4.0.490 (2026-07-16) | Hand-drawn annotations on teaching beats | Adopt when on-concept (check BRAND.md: hand-drawn is not yet in the motion language) |
| `@remotion/motion-blur` | 3.2.31 (2022) | Motion blur on fast travel | Adopt when needed; renders several sub-frames per frame (cost) |
| `@remotion/noise` | 3.2.32 (2022) | Seeded 2D/3D/4D noise for organic drift | Adopt when needed |
| `@remotion/mac-cursors` | 4.0.513 (2026-08-18) | Cursor in capture scenes (D46 phase 2) | Candidate; asset origin **unverified** (SVGs embedded as data URIs in `cursor-assets.ts`, no source stated) |
| `@remotion/rive` | 3.3.69 (2023) | Host for Rive characters (§ 3.2) | Only with the Rive decision |
| `@remotion/lottie` | 3.2.0 (2022) | Host for self-made Lottie files (§ 3.3) | Only for our own files |
| `@remotion/three` | 2021 | Host for react-three-fiber scenes (§ 3.4) | Only with a 3D concept |
| `@remotion/skia` | 2022 | React Native Skia drawing | No need found |
| `@remotion/transitions` | 4.0.53 (2023) | Presentations + shader transitions | **Skip** unless a shader transition is needed: duplicates our `Handoff` (duplicates are bugs) |
| `@remotion/layout-utils` | 4.0.52 (2023) | `measureText`, `fitText` | Possibly useful for caption fitting; we already lay out in tested pure blocks |
| `@remotion/animation-utils` | 4.0.90 (2024) | CSS-property interpolation helpers | We have `anim.ts`; skip |
| `@remotion/gsap` | 4.0.517 (2026-08-25) | Seeks a paused GSAP timeline to the frame (deterministic) | **Skip for now**: GSAP itself is proprietary (§ 4) and `KineticPhrase` + `@remotion/paths` cover most of it |
| `@remotion/light-leaks`, `@remotion/starburst` | 2026 | Light leak / ray burst | **Skip**: cheap look (judgement) |
| `@remotion/sfx` | 4.0.429 (2026-02-25) | 32 sounds (whip, whoosh, uiSwitch… and memes: vineBoom, bruh, wilhelmScream) | **Skip**: off-brand; per-sound licences; our library is better |
| `@remotion/svg-3d-engine` | 4.0.249 (2025) | 3D extrusion of SVG | Untested; docs page 404 on 2026-11-18 |
| `@remotion/rounded-text-box` | — | TikTok-style rounded caption box | **Skip**: we have our own caption system |
| `@remotion/animated-emoji` | — | Google animated emoji | **Forbidden** (no emoji) |

### 2.1 `@remotion/effects`
**Verified** ([docs](https://www.remotion.dev/docs/effects), docs source in
`remotion-dev/remotion/packages/docs/docs/effects/`):
- Effects apply through an `effects` prop, in order, only on canvas-based components: `<Solid>`,
  `<HtmlInCanvas>`, `<Video>`, `<Img>`, `<CanvasImage>`, `<AnimatedImage>`, `<Gif>`,
  `<RemotionRiveCanvas>`, `@remotion/shapes`. Our scenes are DOM: they would need
  `<HtmlInCanvas>` (draws a live DOM node into a canvas; experimental Chrome API, enabled in
  Remotion's own compiled Chrome for rendering from 4.0.455; nested from 4.0.534).
- WebGL effects need `--gl=angle`; with no GPU the docs recommend `--gl=swangle`. **Our renderer
  already uses `gl: 'swangle'`** (`src/pipeline/settings.ts:21`). This machine has an Intel Iris
  Plus (Ice Lake) iGPU and no NVIDIA GPU.
- `effectsOutputSize` (4.0.536) sets the effect chain's resolution.
- Custom effects: `createEffect()` (2D Canvas, WebGL2, WebGPU).

Relevant effects with the version they arrived in (all ≤ 4.0.539):
- `tear()` (4.0.523): rips along a zigzag seam in any direction (`progress`, `angle`, `rotation`,
  `jaggedness`); the pieces rotate apart, leaving a transparent opening.
- `paper()` (4.0.486): procedural paper (grain, fibres, crumples, folds, speckles; `seed`),
  keeps the source alpha. Based on Paper Shaders' paper texture (Apache-2.0).
- `pageTurn()` (4.0.537): curls content like a sheet, shaded fold, configurable back.
- `roughenEdges()`, `glow()`, `lightTrail()`, `lensBlur()`, `linearProgressiveBlur()`,
  `radialProgressiveBlur()`, `chromaticAberration()`, `magnify()`, `cornerPin()`, `shine()`,
  `dropShadow()`, `longShadows()`, `halftone()`, `duotone()`, `lut()`, `filmBurn()`, `shatter()`.

Full list (2026-11-18): barrel-distortion, bevel-alpha, blur, brightness, burlap, checkerboard,
chromatic-aberration, color-correction, color-key, contour-lines, contrast, corner-pin, curves,
cylinder, dot-grid, drop-shadow, duotone, emboss, evolve, exposure, film-burn, fisheye, flannel,
fractal-noise, glow, grayscale, gridlines, halftone, halftone-linear-gradient, hue, invert,
iris-wipe, lens-blur, levels, light-leak, light-trail, lightning, linear-gradient,
linear-gradient-tint, linear-progressive-blur, linear-progressive-pixelate, lines,
liquid-contours, long-shadows, lut, magnify, mirror, noise, noise-displacement, outline,
page-turn, paper, pattern, pixel-dissolve, pixelate, radial-progressive-blur,
radial-progressive-pixelate, radial-wipe, rain-fall, region-blur, rings, roughen-edges,
saturation, scale, scanlines, shadows-highlights, shatter, shine, shrinkwrap, skew, snow-fall,
speckle, sphere, starburst, tear, thermal-vision, tile, tint, turbulent-displace, tv-signal-off,
uv-translate, venetian-blinds, vibrance, vignette, wave, waves, white-balance, white-noise,
xy-translate, zigzag, zoom-blur.

**Unverified (must measure before any use):** byte-identical re-render under swangle (QA
determinism check), render time and peak RAM at concurrency 2 (`npm run profile`), whether
`<HtmlInCanvas>` around our scenes keeps sub-pixel type motion (D41) and grain.

Watch out (BRAND.md): many effects are exactly the forbidden looks (gradient tints, light leaks,
glitch, thermal). Use only what a concept needs.

### 2.2 Remotion Elements catalogue
**Verified** ([catalogue](https://www.remotion.dev/elements),
[docs](https://www.remotion.dev/docs/elements)): Studio copies an Element's source into the
project. Relevant: Paper Texture, Notebook Paper, Tear apart, Peel, Shine, Wiggling Callout,
Number Counter, bar/line/pie charts, Circle Marker, Crossed Off, Strike Through, Text Marker,
On-Screen Messages, News Article Highlight, Polaroid Pictures.
**Unverified:** licence and price (the page shows no licence; a "License + Pricing" link goes
elsewhere). Judgement: read them as reference implementations and rebuild with our tokens and
easings. Don't paste them in: they carry their own colours and timing.

### 2.3 Remotion Agent Skills
**Verified** ([docs](https://www.remotion.dev/docs/ai/skills)): `npx remotion skills add`
installs Remotion's skills for Claude Code (`/remotion-best-practices`, `/remotion-markup`,
`/remotion-create`, `/remotion-studio`), covering effects and the `<HtmlInCanvas>` lifecycle.
Source: `remotion-dev/remotion/packages/skills` (mirror `remotion-dev/skills`, no licence file
on the mirror). Judgement: read them for effects and HtmlInCanvas details. Don't install them
blindly: they would sit next to `mwc-video`, and CLAUDE.md wins every conflict (tokens, no
Tailwind, our easings).

## 3. People and cartoon characters

### 3.1 Free path (recommended first prototype, judgement)
Vector parts, rigged in React with our motion primitives, with mouths driven by the narration.
- **Open Peeps** ([site](https://www.openpeeps.com/)), **Verified:** "Free for commercial and
  personal use under CC0 License". Modular vector arms, legs and emotions (hair, eyewear,
  expressions, bodies, facial hair, standing/sitting poses); PNG and SVG downloads. By Pablo
  Stanley. Not checked: whether the full parts library comes as SVG.
- **Humaaans** ([site](https://www.humaaans.com/)), **Verified:** "Free for commercial or
  personal use", marked CC0; modular (hair, tops, pants; rotate/position freely); SVG assets.
- **Rhubarb Lip Sync** ([repo](https://github.com/DanielSWolf/rhubarb-lip-sync)), **Verified:**
  MIT; "the resulting lip sync data belongs to you alone". CLI, v1.14.0 (2025-04-03) with a
  Linux build; output TSV/XML/JSON; 6 basic mouth shapes A–F plus optional G, H, X (the
  Hanna-Barbera set); `--dialogFile` takes the script text for more reliable results (we always
  have the script); recogniser `pocketSphinx` for English.
  Fit (judgement): run it once per take as a pipeline step; the cues go into the timing lock
  next to word timings; a character's mouth swaps shapes by frame. Deterministic (data, not
  render-time). Alternative not checked: derive visemes from Kokoro/misaki phonemes directly
  (our narration code does not keep phonemes today).
- **DiceBear** ([licences](https://www.dicebear.com/licenses/)), **Verified:** code MIT; 42
  styles CC0 (incl. Notionists by Zoish, Lorelei by Lisa Wischofsky, Open Peeps by Pablo
  Stanley); 14 CC BY 4.0 (credit needed: Adventurer, Big Ears, Big Smile, Croodles, Dylan, Fun
  Emoji, Glyphs, Micah, Miniavs, Personas, Toon Head); Avataaars and Bottts are under the
  artist's own terms. Use for fictional customer avatars (today `Avatar` draws initials).

Cost (judgement): a `character` primitive (SVG part tree, pivot transforms, pose keys, mouth
cues) plus tests, a catalogue entry, and a pipeline step for Rhubarb (vendored binary, its
licence and sha in the ledgers). It is an opt-in addition, so it needs the owner's approval.

### 3.2 Premium path: Rive
- **Verified** ([pricing](https://rive.app/pricing)): free plan can export `.riv` but "Free
  exports play a Rive splash screen. Upgrade to remove it."; free limits: 3 collaborative files,
  1 project, 50 publishes/pushes a month, 10 MB per imported asset. Cheapest paid: **Cadet
  $9/seat/mo** (up to 3 seats), "Ship apps and games without the splash screen".
- **Verified:** runtime `rive-app/rive-wasm` MIT (GitHub API); `@remotion/rive` renders it
  (`<RemotionRiveCanvas>`, which also accepts `effects`).
- Strengths: bones, mesh deformation, state machines and inputs (e.g. a mouth input fed by
  Rhubarb cues). This is the quality level of the "creator character" look.
- Decision needed from the owner: a paid seat. (The owner's "no paid libraries/subscriptions"
  rule was given for sound; whether it extends to animation tools was not stated.)
- Unverified: licences of Rive community/marketplace files (they vary per file).

### 3.3 Lottie
- **Verified:** `airbnb/lottie-web` MIT (last push 2025-09-01); `LottieFiles/dotlottie-web` MIT;
  LottieFiles free animations under the [Lottie Simple License](https://lottiefiles.com/page/license):
  commercial use allowed, attribution not required, no compiling files into a competing service.
- Judgement: marketplace Lottie files are stock looks, which the quality bar forbids. Use Lottie
  only for files we author.
- Free authoring: **Glaxnimate** ([site](https://glaxnimate.org/)), an open-source vector
  animation desktop app that lists Lottie, animated SVG, GIF and WebP output. Unverified: its
  licence, rigging support, import vs export.

### 3.4 3D
- **Verified (GitHub API):** `pmndrs/react-three-fiber` MIT, `pmndrs/drei` MIT,
  `pixiv/three-vrm` MIT (VRM avatars with expression blendshapes, e.g. VRoid-made characters).
- **Quaternius** ([FAQ](https://quaternius.com/faq.html)), **Verified:** "All models are under
  the CC0 License"; no attribution needed; .blend / FBX. Not checked: which packs are rigged and
  animated humanoids.
- **Mixamo**: the [Adobe FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)
  returned 403 on 2026-11-18; via a search summary of that page: free with an Adobe ID,
  characters and animations royalty-free for commercial projects including films; raw files may
  not be redistributed; biped humanoids only. **Re-check the live page before use.**
- Judgement: heaviest option. WebGL under swangle is CPU-rendered; expect slow renders with ~3 GB
  free RAM. Measure with `npm run profile` before committing to a 3D concept.

### 3.5 Not recommended (judgement)
AI talking-head generators: they don't fit the faceless brand, look uncanny, and need a licence
check per model. Not researched further.

## 4. Libraries to read for ideas, not install

| Repo | Licence (verified) | ★ / last push (2026-11-18) | Why not install |
|---|---|---|---|
| greensock/GSAP | Webflow "Standard No Charge" ([licence](https://gsap.com/standard-license/)): commercial use free incl. SplitText/MorphSVG; prohibited for no-code visual animation builders competing with Webflow; revocable; terms can be amended | 30.9k / 2026-11-04 | Proprietary; if the Control Center ever becomes a visual animation builder it could fall under the prohibited use |
| motion-canvas/motion-canvas | MIT | 20.0k / 2026-07-02 | Separate engine; read its code-driven animation patterns |
| magicuidesign/magicui | MIT | 23.4k / 2026-11-17 | Web components on wall-clock motion; would need a frame-driven rewrite; many are stock looks |
| DavidHDev/react-bits | MIT + Commons Clause | 52.3k / 2026-11-16 | Same; Commons Clause forbids selling the software |
| codse/animata | MIT | 3.0k / 2026-11-03 | Same |
| pqoqubbw/icons (animated Lucide) | MIT | 8.3k / 2026-11-15 | Same; idea source for icon micro-motion |
| juliangarnier/anime | MIT | 74.9k / 2026-11-02 | Wall-clock; Remotion's `interpolate` + our easings do this |
| veltman/flubber | MIT | 7.0k / 2022-11-08 | Candidate only for morphing *different* shapes (`interpolatePath` needs the same structure) |
| steveruizok/perfect-freehand | MIT | 5.8k / 2026-04-13 | Candidate for a handwriting/ink stroke |
| rough-stuff/rough | MIT | 21.4k / 2024-07-28 | Sketchy shapes; `@remotion/rough-notation` covers annotations |
| shikijs/shiki | MIT | 13.9k / 2026-11-02 | Candidate for code/prompt scenes (also Remotion's `template-code-hike`) |
| liabru/matter-js | MIT | 18.7k / 2026-09-30 | Physics; deterministic only if simulated from frame 0 each frame (or cached); judgement |
| paper-design/shaders | Apache-2.0 | 4.0k / 2026-11-18 | Source of `paper()`; mostly mesh gradients (forbidden) |
| gl-transitions/gl-transitions | MIT | 2.3k / 2026-11-18 | Shader transitions; `@remotion/transitions` covers shader presentations |
| pixijs/pixijs | MIT | 48.8k / 2026-11-17 | 2D WebGL engine; no need found |
| lucide-icons/lucide (ISC), phosphor-icons/core (MIT) | — | 25.8k, 0.4k | Only if we stop drawing our own icons |
| theatre-js/theatre | Apache-2.0 (core) | 13.0k / 2024-08-14 | Inactive |
| dimforge/rapier.js | Apache-2.0 | archived | Archived |
| remotion-dev/github-unwrapped | none | 1.3k / 2026-07-06 | No licence: look, don't copy |

## 5. Open questions (to settle before use)
1. Do `paper()` / `tear()` in `<HtmlInCanvas>` render byte-identically under swangle, and what do
   they cost (time, peak RAM) at concurrency 2? (One still test in `lab/`, then a short range
   with `npm run profile`.)
2. Does `<HtmlInCanvas>` keep our type rendering (sub-pixel motion, D41), grain and safe zones?
3. Remotion Elements licence and price.
4. `@remotion/mac-cursors` artwork origin and licence.
5. Rive: will the owner pay for a seat (Cadet $9/seat/mo)?
6. Mixamo: re-read the live FAQ; Glaxnimate licence.
7. Lip sync: Rhubarb vs visemes from Kokoro phonemes (compare on one approved take).

## 6. Suggested next steps (judgement)
1. v010 E2 / `lab/paper-look/`: test `paper()` + `tear()` against the hand-built look (one still,
   then a measured range). Adopt `@remotion/effects` only if it wins on look and cost.
2. Characters: prototype one Open Peeps bust with Rhubarb mouth cues on an existing approved take
   (read-only use of the take), in `lab/`. Bring frames to the owner before any engine primitive.
3. Rive only after the owner decides on the seat.

## Sources (checked 2026-11-18)
- Remotion: [effects](https://www.remotion.dev/docs/effects) · [HtmlInCanvas](https://www.remotion.dev/docs/html-in-canvas) · [GSAP](https://www.remotion.dev/docs/gsap) · [sfx](https://www.remotion.dev/docs/sfx) · [Elements](https://www.remotion.dev/elements) · [Agent Skills](https://www.remotion.dev/docs/ai/skills) · [licence](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) · docs source `github.com/remotion-dev/remotion/tree/main/packages/docs/docs`
- npm registry (`npm view @remotion/<pkg> time`): versions and dates
- GitHub API (`gh api repos/<owner>/<repo>`): licences, stars, last push
- [GSAP licence](https://gsap.com/standard-license/) · [Rive pricing](https://rive.app/pricing) · [Lottie Simple License](https://lottiefiles.com/page/license)
- [Open Peeps](https://www.openpeeps.com/) · [Humaaans](https://www.humaaans.com/) · [DiceBear licences](https://www.dicebear.com/licenses/) · [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync)
- [Quaternius FAQ](https://quaternius.com/faq.html) · [Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) (403; search summary) · [Glaxnimate](https://glaxnimate.org/)
