# Visual audit — current production quality (Phase 3)

2026-11-19. Scope: the rendered videos v001-v2, v002, v003, v008 (posted), v009 (QA contact
sheets `out/<id>/qa/sheet.png`, 0.5 s steps), full 1080×1920 frames of v009 at 1.5 / 9.0 /
22.5 s, the engine source (tokens, Backdrop, KineticPhrase, ToggleMark, SOUND.md, mix QA).
Labels: **Observed** = seen in rendered frames · **Measured** = a number from a file or a run ·
**Code** = read in source · **Judgement** = my assessment.
Not checked: v004 frames; real-time playback with sound on a phone; platform analytics
(`docs/growth/LEARNINGS.md` has no v008 Insights yet).

## What is already premium (keep)
- Type rendering: Geist / Instrument Serif italic emphasis, tight tracking, crisp at 1080 (Observed).
- Grain that dithers the ground: no banding after H.264 (Observed; D-ledger).
- Sub-pixel camera on `smooth` scenes, BT.709-tagged colour (lime renders 201,242,93), byte-identical
  re-renders (v009 QA: `render.deterministic` PASS) (Measured).
- Mix: v009 −14.04 LUFS, −1.45 dBTP, LRA 3.3 LU, A/V sync 0.00 ms (Measured, `out/v009…/qa/report.md`).
- Product UI: clean, fictional, unbranded; zoomed card body text ≈ 30 px tall in frame (Observed).

## Ranked issues
Impact and audience: H / M / L. Difficulty and performance cost are for the fix, not the issue.

| # | Issue | Visual impact | Audience | Difficulty | Perf cost of fix |
|---|---|---|---|---|---|
| A1 | **One structure, one world.** v001-v2, v002, v003, v008, v009 have the same sequence: headline on ink with blurred to-do chips → "Let the … *x*." → a white 4-row app card whose rows flip to lime → week-strip calendar → "gone by the system" checklist → switch → wordmark end card (Observed, all five sheets). D46 now gates the *story*; the gap left is **capability**: the engine has one material and one way to show anything. | H | H | H (new capabilities) | — |
| A2 | **One material, one light.** Every frame is ink + grain + one drifting key light + vignette; every object is a flat light rectangle with a soft CSS shadow. No surface (paper, glass, metal), no directional light, no contact shadow, no bevel or specular (Observed; Code `Backdrop.tsx`). | H | M | M | effects: see EXPERIMENT-RESULTS E2 |
| A3 | **Every headline enters the same way**: words rise out of a 12 px blur, emphasis switches to the serif italic (Code `KineticPhrase.tsx`; Observed in all five openings). Blur-in is the most common generated-video text move; it is the first thing a viewer sees. | H | H | L (no dependency) | none (E1) |
| A4 | **Empty lower third.** Below y ≈ 1300 every frame is bare ground for the whole video (Observed). Keeping critical content out of the bottom 35 % is right (platform UI); leaving it *visually* empty makes frames top-heavy, especially on the profile grid and when the UI fades. | M | M | L | L |
| A5 | **Flat camera, little depth.** Camera moves are gentle pushes; depth is CSS blur on the opening chips only (`DEPTH` planes). No parallax through layers, no rack focus between subjects, no motion blur on fast travel (Observed). | M-H | M | M | motion blur ×N samples (E3) |
| A6 | **Transitions are utility.** Hand-offs are cut / blur / fade / push; continuity inside the card is good (D22), but there is no spatial transition (through an object, into depth, a match cut) (Observed; Code `TRANSITIONS`). | M | M | M | L-M |
| A7 | **Same ending every time.** Switch click + wordmark + CTA in all five, incl. the affiliate variant (Observed). Conflicts with CLAUDE.md "the ending belongs to the story". | M | M (loop/rewatch) | L-M | L |
| A8 | **No agent on screen.** No cursor, hand or character: UI changes state by itself, so demos lack "who did this?" and real-tool demos (D46 phase 2) have no interaction language (Observed). | M-H | M | M | L (cursor) – H (character) |
| A9 | **Small text that reads as decoration.** Spec-frame label 19u, UI chip 21u, UI body 22u (Code `tokens.ts`) ≈ 7–8 pt on a 390 pt-wide phone (Judgement: arithmetic 19/1080×390 = 6.9 pt). The card is enlarged by the camera, so its body text survives (≈ 30 px ≈ 11 pt, Observed); the frame chrome (timecode, chapter label, registration marks) does not and repeats on every frame of every video. | M | M | L | none |
| A10 | **Sound has one palette.** Every effect is pitched percussion from the same CC0 set (claves, woodblock, chime, vibraphone, piano; SOUND.md); no low-end weight on the turn, no material foley (paper, air), no room tone. Audio repeats as much as the picture does (Code; Judgement). | M | M | L-M (procedural DSP in Node) | L (offline) |
| A11 | **Lime becomes wallpaper by the end.** From ~13 s every row, chip and glow is lime in v008/v009 (Observed). Meaning stays correct ("the system did it"); contrast is spent before the payoff (Judgement). | L-M | L | L | none |
| A12 | Raw colours inside `ToggleMark` (`#2A2E35`, `rgba(201,242,93,…)`) break "tokens only" (Code `Mark.tsx:12,26`). | L | — | L | none |

## Patterns to retire (Judgement)
Blur-in word entrance as the default · the 4-row card as the only demonstration · the same calendar
week-strip · the switch end card as the only ending · glow as the only light.

## Where the fixes come from
P0–P3 in `docs/quality/IMPLEMENTATION-ROADMAP.md`, proven (or rejected) in
`docs/quality/EXPERIMENT-RESULTS.md` with stills and clips in `out/lab/visual-quality/`.
