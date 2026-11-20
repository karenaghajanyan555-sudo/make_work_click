# Session handoff

Updated: 2026-11-19 (Phase 3 visual quality, part 3) | Keep ≤ 60 lines. Verified facts only; history
lives in `docs/STATUS.md` (log) and `docs/DECISIONS.md`. Replace sections (skill `mwc-handoff`).

## In progress (unfinished)
**Phase 3: visual excellence.** Owner brief 2026-11-19: review E3/E5/E6, do E4 (compare loudness vs
word-timing lip sync, **do not run the Rhubarb binary**), do E7 sound, build a gallery of every
experiment (private Artifact), write `docs/quality/IMPLEMENTATION-ROADMAP.md`. For every experiment,
document quality, render cost, peak memory, determinism and complexity. End with the top-5
production improvements (reasons + trade-offs). Lab only: no production scenes, cache keys,
deps or caches touched. **The owner wants the complete gallery + roadmap before approving anything.**
- Done and verified: E1, E2, E2R, **E3/E5/E6 rendered + reviewed** (EXPERIMENT-RESULTS § E3, E5, E6).
  `npm run check` 160/160.
- Built, tsc OK, not yet reviewed: `exp/E4-character.tsx` + `e4-prep.ts` (tracks and `e4-sync.json`
  generated, deterministic); the E3 rack re-placement, `e3-whip-accum`, `e3-whip-mblur2` (fails like
  mblur); the E5 pointer fix; `e7-sound.ts` (not run); `render.ts` `peakPssMb` + `--mem` mode.
- Render of e3-rack-css, mblur2, accum + E4 **finished** (`e3b-e4.log`, EXIT 0, all det. identical):
  rack 332 ms/f, accum 437, E4 env 290 / g2v 276 / hybrid 221 / compare 228; mblur2 same error.
- Remaining, in order:
  1. Check `e3b-e4.log`. Review sheets: `node lab/visual-quality/sheet.ts <png> 300 4 e4-mouth e3-rack-css e3-whip-accum`
     (use absolute out paths in the ffmpeg helpers: `ff` runs in another cwd). Judge E4 A/B/C in the
     clips with sound.
  2. `node lab/visual-quality/render.ts --only=e5-demo-cursor,e3-rack-lens`. The lens clip takes about 7 min.
  3. E7: `npm run profile -- lab-vq-E7 -- node lab/visual-quality/e7-sound.ts`, then listen to the A/B pairs.
  4. Per-experiment memory: `node lab/visual-quality/render.ts --mem` (30-frame slices).
  5. Gallery: downscaled clips (sound on E4 and E7) + stills, A/B pairs, metrics table, published as a
     private Artifact (multi-file `files`).
  6. Write `IMPLEMENTATION-ROADMAP.md`: P0–P3; production / optional / reject; performance impact; top 5.
- Candidates / rejects so far: EXPERIMENT-RESULTS verdict columns (judgement).

## Objective and state
- v010 (D46): E2 "The other half" approved. **Waiting: owner's look-test approval**
  (`out/v010-the-23-minute-number/look/`). Phase 3 E2R results feed that decision.
- v009 built, QA 29/29, owner posts by hand; IG affiliate on hold. v008 posted (gold).

## Decisions that bind the next steps
- Phase 3 brief: preserve Remotion 4.0.539; lab isolated; owner approval before engine integration.
- `pageTurn` (WebGPU at 4.0.539) and `magnify` (4.0.542) need an upgrade: **not proposed**
  (`package-lock.json` is a render cache input).
- Approved takes are gold (E4 reads v008 take-01 hook read-only and hash-checks it). Nothing
  publishes. No commit/push unless asked.

## Pending and blockers (owner)
1. v010 look-test approval. 2. Growth P0 items (STATUS § Next step). 3. Whether to run the Rhubarb
binary (zip in the old scratchpad, sha256 a9a90748…): owner said "not yet". 4. Rive seat (only if E4 needs it).

## Exact next action
Remaining step 1: read `out/lab/visual-quality/e3b-e4.log`, then review the E4 and revised E3 stills/clips.

## Relevant files
`docs/quality/EXPERIMENT-RESULTS.md` (§ Pending has the E4 metrics) · `lab/visual-quality/{README.md,
manifest.ts,render.ts,e4-prep.ts,e7-sound.ts}` · `out/lab/visual-quality/results.json` ·
`out/profile/lab-vq-*.json`

## Constraints right now
- RAM: 0.9–2.4 GB available (owner apps). The E3/E5/E6 run swapped +1.1 GB. Keep concurrency 1.
- The lab bundle serves `out/lab/visual-quality/public/`; never write to ROOT/public.
- 29 uncommitted paths on `main` from several sessions. Don't revert other sessions' files.
