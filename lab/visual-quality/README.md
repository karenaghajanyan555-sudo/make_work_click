# lab/visual-quality — Phase 3 experiments (LAB ONLY)

Isolated from production: own entry (`index.ts` → `Root.tsx`), own dependencies
(`package.json` here: `@remotion/{effects,motion-blur,noise,rough-notation,mac-cursors,three,lottie}`
4.0.539, `three` 0.187.0, `@react-three/fiber` 9.8.2, `lottie-web` 5.13.0; installed with
`--save-exact --legacy-peer-deps --before=2026-11-05`, 30 packages, 61 MB). `render.ts` aliases
`remotion`/`react`/`react-dom` to the root copies (the lab packages carry a duplicate `remotion`).
Root `package.json`, lockfile, tsconfig scope and cache keys (`RENDER_INPUTS`) are untouched.

```
cd lab/visual-quality && npm ci --legacy-peer-deps      # fresh clone only
npx tsc --noEmit -p lab/visual-quality/tsconfig.json    # from the repo root
node lab/visual-quality/render.ts --only=E2 [--stills-only] [--concurrency=1]
npm run profile -- lab-vq-E2 -- node lab/visual-quality/render.ts --only=E2   # + peak memory
node lab/visual-quality/sheet.ts <out.png> 360 3 <still-prefix>...             # review sheet
```
Output: `out/lab/visual-quality/{stills,clips,det}/`, numbers in `out/lab/visual-quality/results.json`,
memory in `out/profile/lab-vq-*.json`. Experiments are listed in `manifest.ts`.

## Status (2026-11-19)
| Group | Built | Rendered |
|---|---|---|
| E1 typography (`exp/E1-typography.tsx`) | current / glyph cascade / type in depth | ✔ stills, det, clips, profile |
| E2 materials (`exp/E2-materials.tsx`) | paper, tear, pageTurn, toggle (+ paper-look baselines) | ✔ (pageTurn ✘ WebGPU) |
| E2R re-tune + cheaper routes (`exp/E2b-retune.tsx`) | plates (pre-render), tuned live chain, pixelDensity 0.5, baked Img, tear on Img, selective, PNG-sequence composite, clip-path DOM tear | ✔ (see EXPERIMENT-RESULTS) |
| E3 cinematic (`exp/E3-cinematic.tsx`) | current push · CSS 3D parallax + rack focus · lensBlur · whip none/HtmlInCanvasMotionBlur/SVG blur · comet tail vs lightTrail | built, tsc OK; render queued |
| E4 character + lip sync | `e4-prep.ts` → `exp/E4-data.ts` (envelope + letter visemes from v008 take-01 hook, read-only) | component not built |
| E5 product / cursor (`exp/E5-demo.tsx`) | DashboardScene (current) · browser + our pointer + typing + camera push | built, tsc OK; render queued |
| E6 3D (`exp/E6-3d.tsx`) | same choreography: CSS 3D vs @remotion/three (three 0.187.0, R3F 9.8.2; `three-shim.d.ts`, no @types/three) | built, tsc OK; render queued |
| E7 sound (procedural layers) | not built | — |

Plates: `render.ts` bundles with a lab public dir `out/lab/visual-quality/public/` (symlinks to
`public/{fonts,textures,narration}` + `plates/`), never ROOT/public. Manifest `plate: 'still' |
'frames'` renders transparent PNGs there first (manifest order), timed as the one-off cost.

## Verified so far (measured here, concurrency 1, gl=swangle, Chromium 157.0.8080.0)
- `<HtmlInCanvas>` renders: Remotion launches Chrome with `--enable-features=…CanvasDrawElement`
  (`@remotion/renderer/dist/open-browser.js:25`). Its canvas has no position of its own: pass
  `style={{ position: 'absolute', left, top, … }}`.
- Byte-identical re-render (two fresh tabs) for every E1/E2 still incl. paper(), roughenEdges(),
  tear(), dropShadow() — the effects' noise is seeded (`paper.mjs`: `DEFAULT_SEED`).
- Still times (ms, 1080×1920 PNG): DOM type 400–580; paper-look CSS paper 1,763; paper() note
  1,808–2,657; paper-look tear 2,055–3,446; tear() 3,631–3,900.
- **WebGPU effects fail under swangle**: `pageTurn`, `cylinder`, `sphere` → "No WebGPU adapter
  available". The other 71 effects are WebGL2, 11 are 2D canvas.
- **Not in 4.0.539** (the 2026-11-18 research list came from the monorepo main): `magnify`,
  `film-burn`, `iris-wipe`, `lightning`, `radial-wipe`, `rain-fall`, `snow-fall`, `uv-translate`,
  `xy-translate` (there is `translate`).
- `shine()` rejects `progress` < 0 (validation error) — clamp to 0..1.
- Glyph-level animation keeps kerning when glyphs are placed at the kerned prefix advance
  (`measureText(text.slice(0,i))`): the settled cascade frame matches CSS text exactly.
  KineticPhrase sets the spaces between serif words in Geist; the cascade matches that.
- Free RAM on this machine during the session: 1.4–1.7 GB available (owner's Chrome, VS Code,
  Discord); experiments render at concurrency 1.
