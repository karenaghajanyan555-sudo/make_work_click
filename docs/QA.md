# QA — acceptance gates

A video is only shown to the user when Gates 1, 2 and 2c pass (Gate 2c is checked before rendering too).

## Gate 1 — automated (`npm run qa -- <id>`)
Builds the video first (`npm run build`: render → mix → deliver) unless `--no-render`, then
checks the upload file `out/<id>/<id>.mp4`. Writes `out/<id>/qa/report.md|json` and review
sheets. Exit code 1 on any FAIL.

| Check | Rule |
|---|---|
| `spec.valid` | Content spec passes `validateSpec` |
| `container.faststart` | `moov` before `mdat` |
| `video.codec / size / fps / pixfmt` | H.264 High, 1080×1920, 30/1, yuv420p |
| `video.frames / duration` | Exactly the timeline's frame count; duration read from the video stream (± 1 frame) |
| `video.start` | First frame at t = 0 (B-frame reordering without edit lists can delay it) |
| `video.bitrate` | 8–20 Mbps: YouTube recommends ≥ 8 for 1080p30; above 20 the file is needlessly large |
| `container.editlists` | No `edts` box (YouTube recommendation) |
| `audio.codec / rate / channels / bitrate` | AAC-LC, 48 kHz, stereo, ≥ 128 kb/s — SKIP when the spec has no approved take |
| `audio.start / duration` | Audio starts at 0; ends within 50 ms after the video (AAC frame padding) |
| `audio.loudness` | −14 LUFS integrated ± 1 LU (measured on the upload file, after AAC) |
| `audio.truePeak` | ≤ −1 dBTP after AAC |
| `audio.sync` | Upload audio vs the mix, cross-correlated at the first click: ≤ 1 ms |
| `hook.firstFrame` | Frame 0 luma std ≥ 6 (content visible at frame 0) |
| `visual.black` | No black stretch > 0.2 s |
| `pacing.static` | No stretch without meaningful motion > 2.0 s (warn > 1.2 s). "Static" = frame difference within 0.08 of the video's own noise floor (5th percentile), so grain changes don't break it |
| `render.deterministic` | The click frame rendered twice is byte-identical |
| `container.decode` | Every video frame and audio sample of the upload decodes without a decoder error (catches truncated or corrupt files that a header probe misses) |
| `captions.timing` | Caption windows inside the video, in order, never two on screen at once (fail); each on screen ≥ max(0.5 s, 0.15 s × words) (warn) |
| `visual.emptyScene` | Every scene has at least one frame with visible content (luma detail ≥ 6, the `hook.firstFrame` threshold) |
| `assets.present` | The narration take files, the mix, fonts and textures the build read still exist |
Also unit tests (`npm run check`) include a safe-zone check of each scene's layout block
(safe areas are checked there and on `sheet-safezone.png`, not re-measured on the upload).
`report.json` records the sha256 of the file it checked; the orchestrator refuses a report
for any other file.

## Gate 1b — editorial QA (orchestrator productions)
A separate, structured report on the story (`out/<id>/qa/editorial.md|json`, stage
`editorial`, docs/ORCHESTRATOR.md): hook, clarity, progression, repetition, pacing, visual
variety, unsupported claims, CTA, brand consistency, each as ok / look / problem with the
measured value and its rule. It informs Gate 2 and the owner's decision; it never approves
and never blocks a job.
`npm run make` runs this gate as its last step (after voice → render → mix → deliver).

Determinism, measured: a frame rendered twice in one browser session is byte-identical (the
check above). Across fresh sessions, the first frame and frames in the middle of a 3D card
flip can differ by ≤ 2 levels in a few hundred pixels (v001 f0 and f467: three sessions,
three hashes, before and after the engine refactor). It is invisible after encoding; the
segment cache keys on inputs, not on output bytes.

Sheets: `sheet.png` (every 0.5 s), `sheet-cues.png` (every cue point),
`sheet-safezone.png` (cue frames with the safe-zone overlay).

## Gate 2 — creative review (a person or Claude, looking at the sheets and full-res stills)
Answer each in writing in the session report; any "no" means fix and re-run.
1. **Hook:** Is frame 0 already intriguing? Is the hook readable within 2 s?
2. **One idea:** Can the story be said in one sentence? Is there exactly one problem?
3. **Transformation:** Is the before → after visible without sound? Is the click moment
   unmistakable?
4. **Typography:** Correct roles only; no widows/orphans; emphasis used once per phrase;
   typographic quotes; nothing clipped; alignment on the gutter.
5. **Composition:** One focal point per moment; critical content inside the safe zone; no
   two text layers stacked during transitions.
6. **Motion:** Every movement has a reason; no bounce; transitions physical, not crossfades
   of light-over-dark; nothing passes through muddy grey; no dead air. Step through camera
   moves and reveals every 2nd frame: no stop-start at keys, no zoom pumping in and out, no
   word that appears in 1–2 frames (D40). Type under a camera push must glide, not step:
   track a headline edge frame by frame — no 1 px jumps after still frames (D41).
6b. **Light quality (D40):** crop the light and the dark ground from the **upload file** at
   1:1 with ×4 contrast: no hue rings, no blocks, no visible edge where a glow ends.
   `video.colour` must pass (BT.709 tagged) on new renders.
7. **Continuity:** Light, colour meaning (lime = system, coral = before) and spec frame
   consistent across scenes; chapter labels match the story.
8. **Generic check:** Would this frame be mistaken for a stock template, another brand — or one
   of our own earlier videos? Is any scene repetitive? If yes, redesign it (Gate 2c).
9. **Sound:** narration intelligible over music on phone speakers; click audible; every
   effect lands on its visual (stems in `out/<id>/mix/stems/` help); levels within
   `docs/SOUND.md` targets.
10. **Honesty:** Fictional, unbranded UI — or an authentic capture of a real product (demo
    account, fictional data, no credentials or personal data visible), or an accurate simulation
    labelled "illustrative"; never a simulation passed off as a capture (D46). No links in the
    video. Knowledge videos name no partner (validation). Affiliate videos (D42, docs/STORY.md §
    Affiliate videos): the "Ad" tag is readable on the last frames at phone size; covering the
    end card, the video still teaches something complete; every partner fact matches its claim
    bank and the live page today.

## Gate 2c — creative diversity (D46; before rendering, re-checked on the frames)
**Reuse the engine, not the creative experience.** For every video made after D46.

Before a full render (stills are fine before it):
1. The storyboard (`docs/storyboards/<id>.md`) holds three genuinely different directions,
   scored for suitability, the chosen one and why, the hooks, the opening second by second and
   the scene sheets; the creative record (`content/creative/<id>.ts`) mirrors it.
2. `npm run diversity -- <id> --stage render` passes → `out/<id>/qa/diversity.md`. It compares
   the video with the previous five, weighted: opening concept 3, narrative structure 3, hook
   mechanism, visual metaphor, demonstration method and ending 2.5 each; scene sequence 1;
   composition, pacing, animation language, sound 0.5 each. Brand constants (palette,
   typography, narrator, spec frame, grain, the mark) are never scored. FAIL: weighted
   similarity ≥ 0.60 to any of the five; the previous video's opening, structure or ending
   kind repeated; fewer than three directions or two of them alike (differ in < 2 of opening,
   structure, metaphor, demonstration); a stronger passing direction not chosen without a
   written reason; the review or the hypothesis missing. WARN: similarity ≥ 0.45; a core kind
   used by ≥ 3 of the last five; an unknown kind; thin data. Thresholds: `RULES` in
   `src/creative/diversity.ts` (a judgement, D46).
3. The owner approved the concept and storyboard, recorded as `approved: { date, note }` in the
   creative record (the check fails at the render stage without it).
4. The creative review, answered in the storyboard and the record — weak answers mean revise
   before rendering:
   1. What makes this video visually different from our last five videos?
   2. What makes its opening different?
   3. Why is this the right storytelling structure for this subject?
   4. What is the strongest moment?
   5. What will viewers learn?
   6. What would make someone share or save it?
   7. Is any scene unnecessary?
   8. Is the ending integrated into the story rather than another generic logo screen?
After the render: re-answer 1, 2, 4, 7 and 8 from the QA sheets and full-resolution stills.

**The render gate.** `npm run render` (and so `make`) refuses a full render of a video made
after D46 until point 2 passes. Never gated: stills, Studio, voice, mix, deliver, QA, publish-pack
— and nothing made before D46 (legacy records, the catalogue, orchestrator productions until
D46 phase 4). A resumed or recovered build asks again and gets the same answer; the gate writes
nothing but its own log.
**Override (exceptional).** Only with the owner's approval in the session, for a reason such as
a technical test or a deliberate, documented exception:
`npm run make -- <id> --creative-override "<reason, ≥ 10 characters>"` (or
`MWC_CREATIVE_OVERRIDE="<reason>"`). The render proceeds, prints the failed checks and appends
`{at, reason, verdict}` to `out/<id>/qa/creative-override.jsonl`. Record it in STATUS.md.

## Gate 3 — the affiliate publishing package (owner's rule, 2026-11-18; D44)
Every affiliate video. `npm run verify-affiliate -- <id>` then `npm run publish-pack -- <id>`;
the pack refuses unless a run from the last 7 days supports every claim and passes every link test.

| # | Requirement | Where it comes from | Checked by |
|---|---|---|---|
| 1 | Every product claim against official documentation | `spec.affiliate.claims` → claim bank `content/affiliate/<partner>.ts` (quote + URL) | the run: quote on the live page, its passage covers the claim (orchestrator `assessClaim`); blocks |
| 2 | Affiliate URL verified, ID preserved | links built from `src/brand/partners.ts` only; link rules in the record | the run: HTTP status, redirects, parameters kept, the partner's affiliate cookie holds our ID; a control without parameters sets none; blocks |
| 3 | One tracking link per platform, supported parameters only | `tracking` in the record (systeme.io: `tk`, documented) | the run: tag cookie per platform; blocks |
| 4 | Commission + payout | `program` facts | the run re-reads each quote |
| 5 | Instagram + TikTok commercial disclosure, the law | `src/publishing/platforms.ts`, `DISCLOSURE_LAW` | the run (raw / rendered pages; `manual` ones dated, flagged after 30 days) |
| 6 | AI-generated content disclosure | `platforms.ts` `ai` facts | the run |
| 7 | Free-plan limits, payment processor requirements | `plan` facts (`configure` = setup the buyer must do) | the run |
| 8 | Illustrative vs real interfaces | scene types (`CAPTURE_SCENE_TYPES` is empty: all UI is fictional); the caption line is added when missing | the pack |
| 9 | Per-platform captions + bio | `<platform>/caption.txt`, `bio.txt`, `link.txt`, each within that platform's limit | the pack; blocks |
| 10 | Post-publication analytics | metric names from the platforms' help pages + `analytics.csv` | the pack |

Labels: **Verified** (official source, dated by the run or "by hand"), **Tested** (only from the
run's own record), **Confirm in your account**, **Needs configuration**, **Unverified**. A fact
the run could not re-confirm is printed "NOT re-confirmed" and listed under re-check flags.
A test request may count as a click in the affiliate stats; no form is ever submitted, no sign-up
is attempted (self-referral is excluded by the partner's terms), so credit for a sign-up is
always listed as unverified.

Record the outcome and any accepted compromises in `docs/STATUS.md`.
