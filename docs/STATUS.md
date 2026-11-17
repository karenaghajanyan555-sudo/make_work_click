# Status

Update at the end of every working session. Newest entry on top of the log.

## Milestone 1 — one exceptional 20-second vertical video
Video: `v001-memory` — "Your business shouldn't depend on your memory."

| Step | State |
|---|---|
| 1. Architecture + foundation | Done (2026-11-16) |
| 2. Visual prototype (scene 1, 7 s, silent) | **Approved** by the user (2026-11-16): keep the identity, type, dark aesthetic, lime accents, dashboard |
| 3. Narration: pipeline + voice + script + storyboard | **Done**: narrator Bella × Nicole, take-01 frozen ("gold", D18); storyboard approved by the user 2026-11-16 ("go on and do all you need") |
| 4. Sound design + music + mix | **Done**: original score on VCSL CC0 samples, 15 cue-driven effects, master −14 LUFS (D20, D21) |
| 5. Full video (~21 s): flowRun + endCard scenes, final render + QA | **Done, awaiting the user's final approval**: QA 24/24 PASS; post pack ready |
| 6. Approval store (SQLite) + publish checklist | Not started (publish-pack + `spec.publish` are the first half, D23) |

## Milestone 2 — the reusable production engine (2026-11-16)
| Step | State |
|---|---|
| Engine: scene library (12 types), UI kit, motion + transitions, presets, voice-driven timing, score composer, effect library, cached pipeline (`npm run make`) | **Done** (D24–D28), tests 80/80, v001 unchanged (regression-checked) |
| `v001-memory-v2`: improved v001 (same gold take-01, same story) | **Built, QA 24/24 PASS — awaiting the user's review** |
| `v002-meetings`: second example (AI meeting summaries, `data` preset, composed score) | **Built, QA PASS — awaiting the user's review; its narration is a draft take (needs approval before final)** |

## User decisions (binding)
- Voice: **Bella × Nicole** (af_bella 60 % + af_nicole 40 %), chosen 2026-11-16 after two
  audition rounds (D14, D17, D18). "Always keep this version, it is gold": take-01 is
  immutable; improvements are new takes beside it, never replacements.
- Sound: no paid libraries/subscriptions. Free commercially usable assets + procedural where
  it fits; quality over quantity; no cheap/repetitive synthesis; music original or properly
  licensed for commercial use.
- Captions: phrase-based kinetic captions synced to narration; highlight important words
  selectively; never karaoke word-by-word.
- Premium bar: one exceptional video over ten mediocre ones; improve weak scenes before
  presenting; show real rendered frames.
- Process: incremental, measured, conservative on RAM; verify licensing/specs with official
  docs; no unnecessary downloads; do not commit or push unless asked.

## User requirements for the full video (2026-11-16, binding)
~20 s; keep the opening hook; dashboard with meaningful animated interactions; show the
welcome email being sent, the follow-up being scheduled, the customer returning; a
satisfying final transformation; end on MAKE WORK CLICK branding + a natural follow CTA.
Balanced music + subtle SFX, narration clearly audible, no cheap/repetitive synthesis.
Improve transitions, micro-interactions and timing without discarding the design.
1080×1920, 30 fps, H.264 + AAC; optimise file size without visible loss; validate final
duration and the audio stream. Do not rush the narration; no filler scenes; no
unapproved narrator.

## Next step
**Gate (engine):** the user reviews v001-v2 and v002. If v002's draft voice is approved:
`npm run approve-take -- v002-meetings draft`, set `narration.take`, `npm run voice`, then
`npm run make`. Decide which v001 to publish (v001 or v001-v2).

**Earlier gate: the user's final approval of v001** (review page
https://claude.ai/code/artifact/f5976da4-6889-418e-bb60-d3110467ca21: preview, frames,
measurements, post pack). Approved → the user posts by hand using
`out/v001-memory/publish/post.md` and we set `status: 'final'`. Changes requested → fix,
`npm run build`, `npm run qa -- v001-memory --no-render`, `npm run publish-pack`, re-review.
Not committed yet: take-01, `assets/sound/` and all code exist only on this machine until
the user asks for a commit.
Then step 6: approval store (SQLite, D4) recording approvals and post URLs.

## Log
### 2026-11-16 — the engine (milestone 2)
- Audit → refactor in place (no rewrite, no new dependencies): scene model contract +
  registries; 9 new scene types (hook, problem, statement, dashboard, notifications,
  timeline, comparison, data, payoff) beside the 3 existing; UI kit (DashboardCard,
  NotificationCard, MetricCard, Chart, Avatar, UIText/UILabel), BrandLockup, SectionLabel,
  Animate presets, 5 hand-offs added (fade, slide/push, zoom, blur, wipe), 5 visual presets.
- Timing from the voice (D25): timing locks + defineVideo(); split captions timed by word.
  Draft narration cache (D26): first synthesis 27.6 s / 1.6 GB, re-run 0.34 s.
- Score composer + scene-declared sounds (D28). Per-scene render segments + build cache (D27).
- Regression: v001 stills byte-identical except frames that already varied between fresh
  browser sessions (f0, f467: ≤ 2 levels; documented in QA.md).
- v001-memory-v2 (21.0 s): QA 24/24 PASS, 13.1 Mbps, −14.07 LUFS, −1.45 dBTP, sync 0.00 ms,
  longest static 0.47 s (v001: 0.67 s), 23 effects (v001: 15). Make: 834.5 s wall
  (render 227.6 s, mix 21.6 s, deliver 165.8 s, QA the rest), peak 1.77 GB (machine under
  load from other apps: load average ~18 on 8 cores, swap +2.7 GB).
- v002-meetings (23.2 s): first make 504.2 s, peak 1.62 GB. Code-change rebuild 391.6 s
  (7/7 segments, render 244 s). No-change rebuild 5.9 s (everything cached). One-scene edit
  (payoff: a fourth to-do) → 2/7 segments re-rendered (payoff + the end card sharing its
  hand-off), render 49.8 s instead of 244 s. That build warned on pacing (1.33 s still after
  the chart) → added a chart callout ("+41% vs W4"). Final build 587 s, peak 1.77 GB:
  QA 24/24 PASS (13.3 Mbps, −14.07 LUFS, −1.36 dBTP, sync 0.00 ms, longest static 1.07 s).
- ffprobe on both upload files: H.264 High 1080×1920 yuv420p 30/1, video start 0.000,
  AAC-LC 48 kHz stereo 320 kb/s; v001-v2 630 frames / 35.1 MB, v002 696 frames / 39.6 MB.
- `npm run new-video` scaffold tested (valid spec, only "run npm run voice" open), then removed.
- Review page: https://claude.ai/code/artifact/4d567f47-dde3-41bf-971b-bc5de94edd62
- Not done: listening by ear (measured only); v002 take not approved; nothing committed.
### 2026-11-16 — v001 built, QA PASS, post pack
- Built flowRun + endCard (as-built notes and deviations: docs/storyboards/v001-memory.md),
  original score + effects + mix (D20), delivery encode (D19, D21), pixel-matched cuts (D22).
- Upload file `out/v001-memory/v001-memory.mp4`: 21.000 s, 630 frames, 12.7 Mbps, 34.2 MB;
  AAC-LC 320k 48 kHz stereo, −14.06 LUFS, −1.46 dBTP, sync 0.00 ms. QA 24/24 PASS.
  Measured: render 172.5 s / 1.9 GB peak; mix 13 s / 335 MB; deliver 82 s / 650 MB.
- Post copy in the spec (`publish`), `npm run publish-pack` → cover (f75) + post sheet (D23).
  Platform rules checked: Meta requires the AI label for realistic synthetic audio; YouTube
  and TikTok rules don't cover a synthetic narrator; we label everywhere (PLATFORMS.md).
- Creative review (QA.md gate 2), my answers: hook readable by 2 s yes; one idea yes;
  transformation visible without sound yes (to-dos → workflow → checked to-dos); type
  clean, nothing clipped at rest (the resolved tags wipe in as their cards widen, ~0.2 s:
  kept as intended); one focal point per moment yes; no muddy crossfades (window drop
  replaced the collapse); continuity cuts invisible (D22); not generic; sound: by
  measurement only (voice −16 LUFS, music −29.7 after ducking, effect peaks −16…−20 dBFS,
  effect times from the cue map); not judged by ear; honesty: fictional bakery, caption says so and names the AI voice.
  Not done: a listening check on a phone speaker; the user's review covers it.
- Tests 60/60 (new: scenes, sound, publish, QA helpers).
### 2026-11-16 — narrator chosen, take-01 frozen
- User picked G, Bella × Nicole: "this is it… always keep this version, it is gold".
- `npm run approve-take` freezes an audition take into `public/narration/<id>/take-NN/`
  with sha256s; tests guard it (35/35). Recipe re-synthesis verified byte-identical.

### 2026-11-16 — narrator round 2 (female voices)
- User: "I guess Michael is good", then asked for 4 high-quality female voices too.
- Screened 6 female voices + 4 blends; audition A michael (reference) + E heart,
  F bella, G bella+nicole, H heart+kore (D17). All within 0.07 LU of −16 LUFS, true peak
  ≤ −1.85 dBTP; one line shifts 0.11 s in G. Michael's take re-synthesised with identical
  measurements (seeding works). Review page updated.

### 2026-11-16 — narration pipeline, audition, storyboard
- Prototype approved by the user. New requirements recorded above.
- Narration engine: Kokoro-82M local; uv Python 3.12.16, hash-locked lock, pinned model
  revision (D13); one-utterance synthesis cut by word timestamps (D15); voice bus with
  compressor + limiter in Node (D16). `npm run setup:voice`, `npm run voices -- <id>`.
- Screened 9 voices; audition A michael / B puck / C onyx / D michael+onyx blend (D14),
  level-matched to −16 LUFS (±0.15 LU), true peak ≤ −1.79 dBTP. Synthesis: 4 takes in
  58 s, peak RSS 1.7–2.1 GB for the whole audition.
- Script (42 words) in `content/videos/v001-memory.ts`; storyboard (7 beats, 21.0 s) in
  `docs/storyboards/v001-memory.md`. Tests 32/32.
- Open: prototype file encoded at ~45 Mb/s (grain) — bitrate tuning planned for the final.

### 2026-11-16 — prototype v2 + studio foundation
- Built layered architecture (docs/ARCHITECTURE.md): content specs, timeline with cue points,
  scene type `chaosToSystem`, motion primitives, UI kit, signature spec frame, render
  pipeline (Node API), QA gate with sheets, doctor/setup for new machines.
- Prototype choreography reworked twice after self-review: v1 cards piled up mid-flight and
  passed through grey; v2 = gather into a column → domino flip (face swap edge-on) → window
  builds → click. Header reveal fixed (no clipped text).
- Performance: grain moved into the ground layer (D9); render 54.1 s for 210 frames
  (3.9 fps at concurrency 2), QA run peak 1.8 GB.
- QA: PASS on all automated checks; creative review notes in the session report.
- Known gaps: no audio yet; only one scene type; multi-scene hand-off is unit-tested but not
  yet seen in a render; Facebook Reels spec unverified.

### 2026-11-16 — plan approved, direction reel v1 (superseded)
- User approved the architecture plan and gave the decisions above.
- Direction reel v1 (out/preview/, gitignored) established palette, type, signal accent.
