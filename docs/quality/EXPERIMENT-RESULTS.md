# Experiment results (Phase 3, `lab/visual-quality/`)

Renderer: Remotion 4.0.539, Chrome Headless Shell 157.0.8080.0, `gl: swangle`, **concurrency 1**
(only 1.2–1.7 GB RAM free during the session: owner's Chrome/VS Code/Discord), 1080×1920, 30 fps.
Clips: H.264 CRF 18, BT.709, `out/lab/visual-quality/clips/<id>.mp4`; stills `…/stills/`;
numbers `…/results.json`; memory `out/profile/lab-vq-*.json`. Determinism = the same frame
rendered twice in two fresh tabs, PNG sha256 compared. Labels: **M** measured · **J** judgement.
Clip motion was judged from stills at key frames; real-time playback review is still open (J items).

## E1 — typography (DOM only, no dependency)
Same words as v009's hook.
| Id | Technique | ms/frame (clip) | Det. | Verdict (J) |
|---|---|---|---|---|
| e1-type-current | `KineticPhrase` rise (production) | 185 | ✔ | Clean but the stock blur-in (audit A3) |
| e1-type-cascade | Glyphs rise from line masks with a 62° flip, weight axis 470→620 "inks up", tracking settles 0.06→−0.045 em, the serif wipes in along its italic slant behind a hairline pen | 180 | ✔ | **Adopt (P0).** Same cost; reads designed, not generated. Kerning kept (glyphs at the kerned prefix advance; settled frame = CSS text, M). |
| e1-type-depth | CSS 3D camera flies through the to-dos (title type on planes), per-plane blur + fog, focus lands on the headline | 245 | ✔ | Promising as a *transition into* a headline; the plain grey planes are generic on their own. Needs content on the planes (memos, UI) to earn it. |

## E2 — physical materials (`@remotion/effects` on `<HtmlInCanvas>`, canvas sized to the object)
| Id | Technique | Still ms | ms/frame (clip) | Det. | Verdict (J) |
|---|---|---|---|---|---|
| e2-paper-current | paper-look CSS paper (baseline) | 1,763 | — | ✔ | Clean, premium, editorial |
| e2-paper-effects | `paper()` + `roughenEdges()` + `dropShadow()`, note lifts | 1,808–2,657 | **1,529** | ✔ | Deckle edge (roughenEdges) and the lifting shadow are convincing; **paper() at amount 0.9 reads as grey granite** (too much fibre/crumple/fold shading). Re-tune (amount ≈ 0.3, drops 0, colour from `palette.paper`) before a verdict. |
| e2-tear-current | paper-look SVG tear (baseline) | 2,055–3,446 | 591 | ✔ | Precise perforation tear; story-built |
| e2-tear-effects | `tear()` + paper + edges + shadow | 3,631–3,900 | **2,042** | ✔ | **The most physical result so far**: jagged seam, both halves shadowed. My params throw the halves out of frame: cap progress ≈ 1.1, rotation ≤ 6°. 3.5× the hand-built cost. |
| e2-pageturn | `pageTurn()` | — | — | — | **Cannot render**: WebGPU only at 4.0.539, no adapter under swangle (M). WebGL2 version arrives in 4.0.540. |
| e2-toggle-current | `ToggleMark` + `SoftLight` | 402–432 | 204 | ✔ | Flat but exact brand colour |
| e2-toggle-material | `bevelAlpha()` + `shine()` sweep on the click + `glow()` | — | **1,013** | ✔ | **Reject glow() on lime: it washes the signal to yellow (off-brand).** The shine sweep reads as gloss on the click (keep candidate); bevel is barely visible at default. |

Memory, E1+E2 run (M): peak process-tree PSS **1,521 MB** at concurrency 1; MemAvailable min
1,222 MB; swap grew 1,164 MB. Wall 535 s for 10 compositions (stills + det + clips).

### Cost model so far (M → J)
Effects run per frame on the CPU (SwiftShader): **paper/tear chains cost 1.0–2.0 s per frame
vs ~0.2 s for DOM**. A 2 s effect beat ≈ +60–120 s of render per video at concurrency 1: affordable
for one hero moment, not as a full-video look. Sizing the canvas to the object (not 1080×1920)
is already applied; `effectsOutputSize` (lower internal resolution) is untested.

## E2R — re-tune + cheaper routes to the same paper/tear (`exp/E2b-retune.tsx`, 2026-11-19)
Same note, tuned look (`paper()` amount 0.3, drops 0; tear progress ≤ 1.1, rotation 6°). ms/frame
from 60/90-frame clips (M); all 11 compositions byte-identical on re-render (M). Run: wall 738 s,
peak tree PSS **1,650 MB**, MemAvailable min 1,181 MB, swap +1,079 MB (`out/profile/lab-vq-E2R.json`).
| Id | Route | ms/frame | One-off | Verdict (J) |
|---|---|---|---|---|
| e2r-paper-tuned | live chain every frame | 1,712 | — | Reads as a quiet sheet now (granite gone) |
| e2r-paper-half | same, `pixelDensity={0.5}` | 639 | — | Deckle edge coarser; full-frame text softness **not yet checked** |
| e2r-paper-baked | **pre-render**: plate PNG once → `<Img>` + CSS drop-shadow | **183** | 1.4 s (plate) | Same look at DOM cost. **Adopt for any static/lifting paper.** |
| e2r-tear-tuned | live chain (capture + paper + edges + tear + shadow) | 2,199 | — | At p 1.1 the right half still reaches the frame edge: cap ≈ 1.04 |
| e2r-tear-img | `<Img src=plate effects={[tear, dropShadow]}>` | 1,075 | plate | −51 %: no DOM capture, no paper() per frame |
| e2r-tear-selective | plate → effect only frames 17–73 → final-state plate | 979 | plates | −55 %; saving grows with the hold length |
| e2r-tear-seq | **composite**: tear pre-rendered once as PNG sequence | **254** | 772 ms/frame × 90 | Pixel-equal to live; re-renders after story edits are cheap |
| e2r-tear-dom | **no effect**: seeded two-octave clip-path halves, fibre band, CSS shadow | **241** | plate | Finer, more paper-like seam than `tear()` (blocky zig-zag); halves stay in frame. **Best value.** |

Cost model (M → J): the cost is in the per-frame DOM capture + `paper()`; bake the material once
(plate), then move it with DOM. Keep a live effect only for what must change per frame (the
seam), and only on those frames — or pre-render that once and composite.

## E3 — cinematic motion (`exp/E3-cinematic.tsx`, 2026-11-19)
Run (M): `out/lab/visual-quality/e3e5e6.log`, wall 799 s for E3+E5+E6 (12 comps), peak tree PSS
**1,949 MB**, MemAvailable min 864 MB, swap +1,103 MB (`out/profile/lab-vq-E3E5E6.json`). Per-comp
peak memory: `render.ts` now samples it (`peakPssMb`, `--mem` slices) — not yet run for E1–E6.
| Id | Technique | Still ms | ms/frame | Det. | Verdict (J) |
|---|---|---|---|---|---|
| e3-cam-current | ScatterMemo + CameraRig push (baseline) | 633–861 | 258 | ✔ | Readable, flat |
| e3-rack-css | CSS 3D truck + per-plane blur from \|z − focus\| | 1,234–1,889 | 248 → 332 (fixed comp) | ✔ | v1 **broken**: the opening focus memo sat off frame in the bottom unsafe band, nothing sharp in the live area for 1.3 s (observed f10). Re-placed from the camera maths (near memo in frame, hero lands centred); re-render running, **not reviewed** |
| e3-rack-lens | `lensBlur()` per memo | 7,262–8,727 | **3,452** | ✔ | **Reject**: 14× CSS; on text without highlights the bokeh reads as a smear |
| e3-whip-none | DOM whip (baseline) | 524–589 | 176 | ✔ | Strobes on the fast frames |
| e3-whip-mblur | `HtmlInCanvasMotionBlur` 8 samples, only while fast | — | — | — | **Fails** in Chrome 157 headless: `captureElementImage`: "No cached paint record for element" (M) |
| e3-whip-mblur2 | same, always on | — | — | — | Same error → not the `disabled` toggle (M) |
| e3-whip-svg | velocity-scaled `feGaussianBlur σx` | 626–669 | **196** (+11 %) | ✔ | Reads as motion blur on a white card; **candidate** |
| e3-whip-accum | 8 sub-frame DOM samples, `plus-lighter` at 1/N | — | — | — | Built (true multi-sample, no canvas); rendering |
| e3-trail-css | `evolvePath` + tapered SVG comet | 517–575 | **183** | ✔ | Clean, precise; **candidate** |
| e3-trail-effect | `lightTrail()` on the route | 593–1,351 | 552 | ✔ | Barely visible on a thin path at 3× cost: reject |

## E5 — product demonstration (`exp/E5-demo.tsx`)
| Id | Technique | Still ms | ms/frame | Det. | Verdict (J) |
|---|---|---|---|---|---|
| e5-demo-current | DashboardScene (baseline) | 569–638 | 207 | ✔ | The 4-row card (audit A1) |
| e5-demo-cursor | browser window + own SVG pointer + typing + camera push/pull | 466–528 | **132** | ✔ | **Strongest E5**: a person sets the rule, the camera makes the UI readable, then the system works (answers audit A8). Flaw: the pointer came to rest on the last lime chip (f140) → moved below the card; re-render pending |

## E6 — 3D (`exp/E6-3d.tsx`)
| Id | Technique | Still ms | ms/frame | Det. | Verdict (J) |
|---|---|---|---|---|---|
| e6-stack-css | CSS `preserve-3d` slabs + normal shading | 535–607 | **281** | ✔ | Indistinguishable from three.js in the stills except contact shadows |
| e6-stack-three | `@remotion/three` + three 0.187 + R3F, key light, shadow maps | 1,438–1,837 | 430 (+53 %) | ✔ | Real slab-on-slab shadows; costs 3 deps + warnings (`PCFSoftShadowMap` removed → PCF). CSS wins on value. Both end as a lime wall (audit A11) |

## Pending (2026-11-19, end of session part 3)
- Running: `node lab/visual-quality/render.ts --only=e3-rack-css,e3-whip-mblur2,e3-whip-accum,E4`
  → `out/lab/visual-quality/e3b-e4.log`. Then: e5-demo-cursor (pointer fix), e3-rack-lens (same
  re-placement, 7 min), `--mem` pass for every experiment.
- E4: `exp/E4-character.tsx` (geometric character; tracks A loudness / B word timing / C hybrid,
  lab addition) + `e4-prep.ts` metrics → `out/lab/visual-quality/e4-sync.json` (M, before render):
  corr(opening, loudness) at lag 0: A 0.94 · B 0.02 · C 0.54; best lag 0 frames for all; bilabial
  closures shut A 1/2 · B 2/2 · C 2/2; rest in silent frames A 17/20 · B 6/20 · C 17/20. A's
  correlation is by construction (it *is* the loudness). Word-onset check is inconclusive in
  connected speech (±4 frames). Data generation deterministic (two runs byte-identical); gold take
  sha256 unchanged. Rhubarb binary **not run** (owner).
- E7: `lab/visual-quality/e7-sound.ts` built, tsc OK, **not run** (needs e3-whip-svg ✔,
  e5-demo-cursor, e4-mouth-hybrid clips): 5 A/B pairs (click weight, paper tear foley, whip air,
  demo person foley + room tone, room tone under narration); LUFS/TP, determinism, band shares.
- Then gallery (private Artifact) and `docs/quality/IMPLEMENTATION-ROADMAP.md`.
