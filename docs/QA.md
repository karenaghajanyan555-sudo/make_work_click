# QA — acceptance gates

A video is only shown to the user when **both** gates pass.

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
Also unit tests (`npm run check`) include a safe-zone check of each scene's layout block.
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
   of light-over-dark; nothing passes through muddy grey; no dead air.
7. **Continuity:** Light, colour meaning (lime = system, coral = before) and spec frame
   consistent across scenes; chapter labels match the story.
8. **Generic check:** Would this frame be mistaken for a stock template or another brand?
   Is any scene repetitive? If yes, redesign it.
9. **Sound:** narration intelligible over music on phone speakers; click audible; every
   effect lands on its visual (stems in `out/<id>/mix/stems/` help); levels within
   `docs/SOUND.md` targets.
10. **Honesty:** Fictional, unbranded UI; no claims about real products; no affiliate links.

Record the outcome and any accepted compromises in `docs/STATUS.md`.
