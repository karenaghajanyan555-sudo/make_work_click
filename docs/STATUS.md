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

## Milestone 3 — production orchestrator (2026-11-17)
| Step | State |
|---|---|
| Plan (docs/ORCHESTRATOR.md), SQLite store, 12 stages, runner (reuse by input hash, retry, resume, cancel, crash recovery, gates), CLI `npm run produce`, Control Center `npm run control`, kits + arcs writer, research verification, package, analytics model | **Built** (D29–D33), tests 105/105 |
| v003-invoices-chase-themselves (signature arc, idea-0001 via CLI) | **Approved by the owner, packaged** (job-0001, approval 4; gold take-01; `out/v003-invoices-chase-themselves/package/`) |
| v004-client-onboarding-runs (editorial arc, idea-0002 via the dashboard API) | **QA 24/24 PASS — awaiting the owner's approval** (job-0002) |
| job-0004, job-0005 (batch, kit seed ideas, script review requested) | **Waiting at script review** |
| Acceptance 6–7 (approve → package) | **Open: the owner approves** (my test approval was refused by the permission system: approval freezes the take as gold, so it is the owner's) |

## Phase 2.5 — production hardening (2026-11-17)
| Step | State |
|---|---|
| Audit (runner, leases, stages, cache keys, database, dashboard, tests) | **Done**: 12 defect groups found, all fixed (log below, D34–D38) |
| Reliability: lease heartbeat, reboot-safe recovery, atomic outputs, package copies, gold-take integrity | **Built**, crash-tested at every stage |
| Database: schema 2 (foreign keys, one active job per idea), transactions, `npm run db` backup/restore, auto-backup | **Built** (the real `data/studio.db` migrates on its next open, after an automatic backup) |
| Research support levels, editorial QA stage, 4 new technical QA checks, dashboard (Editorial tab, claim evidence, retry on the stage, decision history) | **Built** |
| Tests | **130/130** unit + integration; end to end (`npm run test:e2e`) **30/30 PASS** in 622 s |

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

## Affiliate videos (D42, D43)
| Video | State |
|---|---|
| `v008-bookings-run-themselves` — first systeme.io video (engine spec, signature arc) | **Posted by the owner 2026-11-18 (Instagram; post URL not recorded yet). Gold take-01 frozen, `status: 'final'`.** Posted file kept as-is: `out/v008-bookings-run-themselves/published/` (sha 761aa5eb…); the gold-take rebuild (QA 29/29) has identical audio, different video bytes (known render variance) |
| `v009-sale-does-the-rest` — second systeme.io video: the after-sale workflow for a course (D45) | **QA 29/29 PASS; verification 12/12 claims, 62/62 facts, links pass; package built — awaiting the owner's watch-through and approval** (draft take). Posting kit: https://claude.ai/code/artifact/162aed8f-91f8-41af-969d-85b0a96df947 |

## Next step
**Growth audit (2026-11-18) — awaiting the owner's approval of the plan.** Knowledge base in
`docs/growth/` (AUDIT, PLAYBOOK, HOOKS, COMPETITORS, LEARNINGS). Read PLAYBOOK.md before planning
any video. Nothing in CLAUDE.md, STORY.md, QA.md or code changed yet. Plan, in order:
- P0 owner, now: (1) **affiliate on Instagram is on hold** — Meta requires the paid partnership
  label for affiliate links ("All branded content must be disclosed using the paid partnership
  label") and the account's branded content tools are restricted: decide on v008 (live on
  Instagram without the label; archive is reversible), request a branded-content review in the
  app, and do not post v009 on Instagram until the label works (this overrides the v009 step
  below); (2) put v008's 24 h / 72 h / 7 d Insights numbers in LEARNINGS.md; (3) decide on
  real-tool demonstrations (PLAYBOOK.md § 8b); (4) brand colours: the owner's brief says #101827 /
  #B5F36B, the approved tokens are ink #0A0B0D / signal #C9F25D — which is right?
- P1 rules + workflow (docs, one project skill): CLAUDE.md growth rules + doc map; STORY.md story
  shapes and ending rules; QA.md Gate 2b (PLAYBOOK.md § 9); PLATFORMS.md hashtags ≤ 5 (+ the
  package's limit); `.claude/skills/` video-strategy skill running PLAYBOOK.md § 10.
- P2 engine, opt-in props (earlier videos unchanged): compact ending / payoff-integrated lockup;
  subject-first opening for hook/problem scenes; focus zoom for legible UI (≥ 30 u); brief fields
  `shape`, `hooks`, `hypothesis`; editorial QA checks (end-card share, words/s, information gaps,
  arc/hook repetition); learning loop that records engine videos with reach, non-follower %, skip
  rate, likes, sends, follows; `teardown` tool for screen-recorded reference reels.
- P3 only if the data asks for it: `capture` (real screen recording, after the § 8b decision) and
  a timed-race scene.
- P4 production: six weeks, three knowledge reels a week, one variable at a time (PLAYBOOK.md § 13).

**v009 (D45)** — the owner watches `out/v009-sale-does-the-rest/v009-sale-does-the-rest.mp4` on a
phone and posts by hand from `out/v009-sale-does-the-rest/publish/` (phone view:
https://claude.ai/code/artifact/162aed8f-91f8-41af-969d-85b0a96df947). Instagram: add the
online-courses link as a second profile link, keep v008's. TikTok only once the profile shows a link.
Verification valid to 2026-11-25. Once posted: `npm run approve-take -- v009-sale-does-the-rest draft`,
set `narration.take`, `status: 'final'`, `npm run voice`, `npm run make`; keep the posted file in
`out/<id>/published/` (do not re-run publish-pack over the posted package: its sha would no longer match
the posted file); record the post URLs here (v008's and v009's).

**v008 (D43, D44) — done 2026-11-18:** posted; take frozen (below kept for the record).
**v008 (D43, D44)** — the owner watches `out/v008-bookings-run-themselves/v008-bookings-run-themselves.mp4`
on a phone and posts by hand from the publishing package `out/v008-bookings-run-themselves/publish/`
(`post.md` + `instagram/`, `tiktok/` copy files; phone view:
https://claude.ai/code/artifact/e4059212-d5b3-4a0e-bd79-a636009004c0). The verification run is
valid 7 days (to 2026-11-25): after that, `npm run verify-affiliate` + `npm run publish-pack` again. Instagram first; TikTok only once the
profile shows a website link (1,000 followers or Business registration), v003 on TikTok meanwhile.
On approval: `npm run approve-take -- v008-bookings-run-themselves draft` (freezes the gold
take), set `narration.take`, `npm run voice`, `npm run make`, `npm run publish-pack`; record
the post URLs here.

**v003 round 2 (D40 + D41)** — review it on the Control Center's Review page
(http://127.0.0.1:4318): zooms kept and gliding (no glyph stepping), the reel opens moving,
the end card pushes to the last frame, neutral light without "pixels", true brand lime. v004 is parked in "changes requested" (owner: one video at a time); its fix
is the same opt-in `smooth` for the editorial arc's scenes (hook/problem/… not done yet).

**One place to review everything:** `npm run control` → http://127.0.0.1:4318 (Review page,
D39): v003 + v004 with buttons, the two waiting scripts, and v001 / v001-v2 / v002 (decided in
chat). Both waiting scripts are near-copies (job-0004 = v004's 7/7 lines, job-0005 = 5/7 of
v003's): reject or rewrite them rather than render duplicates.

**Gate (orchestrator):** the owner reviews v003 and v004 in the Control Center (`npm run control`,
http://127.0.0.1:4318) and approves, requests a revision or rejects. Approval runs the package
stage (freezes the take, cover + post sheet, platform copy, captions, sources, metadata) —
then check `out/<id>/package/`. Optionally review job-0004/job-0005 scripts.
After Phase 2.5 the first start migrates the database (backup first) and, once approved,
each job spends ~3 min re-checking (re-mix, 28-check QA, editorial report) before packaging;
the file and its sha256 stay the same.

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
### 2026-11-18 — growth audit and knowledge base (no code change)
- Owner: turn the studio into a research-driven engagement engine; audit first, then a plan for
  approval. Environment ready (`npm run doctor`).
- Verified on primary pages today (rendered in headless Chrome or fetched): Instagram Ranking
  Explained (2023-05-31: reshare, watch to the end, like, audio page; "majority text" reels less
  visible), Helping Creators Find New Audiences (2024-04-30: every eligible reel tested on a small
  non-follower audience), Recommendations guidelines, Trial reels (2024-12-10), branded content
  rules (affiliate → paid partnership label; eligibility needs an established presence), Content
  Monetization Policies. Reported, not primary: Mosseri's watch time / likes / sends per reach
  (2025-01-22), five-hashtag cap (Dec 2025; the Help Center still says 30), skip rate (Aug 2025).
  Data: Socialinsider (9.77M brand reels, skip 60.5–65.5 %), Metricool (avg watch 8.5 s). Studies:
  Loewenstein 1994, Berger & Milkman 2012, Dashlet (swipes early and at the end).
- 28 Instagram profiles rendered (followers + bios); no reel watched (posts need a login).
- Audit of v001-v2, v002, v003, v004, v008, v009 from specs and QA sheets: 13 findings
  (`docs/growth/AUDIT.md`) — one plot in all six, statement hooks answered by ~4 s, weak visual
  hook, low information gain, UI ~8 pt on a phone, 14–18 % of runtime on the end card, an empty
  learning loop (0 publications, 0 metrics; engine videos cannot be recorded), an affiliate
  compliance gap on Instagram (v008 live without the label), a stale hashtag limit.
- Written: `docs/growth/` AUDIT, PLAYBOOK (official guidance, studies, creator patterns,
  hypotheses, 7 story shapes on the scene library, topic scoring, Gate 2b, 10-step workflow,
  learning loop, 6-week test plan), HOOKS (112 hooks, scoring method), COMPETITORS, LEARNINGS.
- Not done: any rule, skill or code change (awaiting approval); per-reel competitor teardowns;
  Mosseri's primary videos; the in-app skip-rate definition.
### 2026-11-18 — v008 posted + gold; v009 "The sale that does the rest" (D45)
- Owner: posted v008, asked for one more video, different topic; picked the systeme.io angle "one sale,
  four things happen" and freezing v008's take. flowRun takes a trigger + 3 steps → "three more jobs".
- v008: `approve-take draft` → take-01 (10 files), `narration.take`, `status: 'final'`; timing lock
  identical but for its source line. Rebuild 644 s wall, peak 1.53 GB PSS, min 956 MB free (desktop apps
  held ~10 GB), swap +1.5 GB; QA 29/29. Upload sha 2b856c48… vs posted 761aa5eb…: AAC stream
  byte-identical (80ac1254…), video differs (known variance). Posted file + cover copied to
  `out/v008-bookings-run-themselves/published/`; v008's publish package left as posted.
- Research (live pages today, docs/affiliate/systeme-io.md § 12): course login email automatic and fixed
  wording (help 237/273); workflow New sale → Add to a pipeline stage → Delay days → Send an email
  (help 1542); free: 1 workflow + 1 rule (features), 1 course/500 students (online-courses), CRM free.
- Built: `content/videos/v009-sale-does-the-rest.ts` (Wren Studio, Maya Torres, Watercolor Foundations
  $49; email → goal → wait), opt-in flow-step icon `contact` (user-plus glyph; a drawn pipeline icon was
  dropped: illegible at node size), `Fact.pages` + `recordForPage` (package + verifier), 12 claims +
  4 course setup facts + 1 assumption, booking facts scoped. Tests 149/149 (2 new assertions groups).
- My review (20 stills, then the QA sheets): fixed "Stage · Customers" shown twice (detail note →
  "Source · New sale") and the icon. Draft voice 21.63 s spoken (39.6 s synthesis, peak 1.66 GB).
  Build 649 s wall, render 253.9 s, peak 1.54 GB PSS, min 1.2 GB free. QA **29/29**: 25.900 s,
  13.0 Mbps, −14.04 LUFS, −1.45 dBTP, sync 0.00 ms, longest still 0.60 s, deterministic. Upload sha
  9f3e694f…, 43.2 MB.
- verify-affiliate: first run 3 TikTok AI facts "not found" (help page not fully rendered; the quotes
  were on the page when re-read); second run claims 12/12, facts 62/62 + 1 by hand, links pass.
  publish-pack: no re-check flags; caption 941/2200.
- Not done: listening by ear (measured only); owner's approval of the v009 take; the free plan's
  workflow step limit (undocumented, untested); which Instagram profile link shows first. Nothing
  committed.
### 2026-11-18 — affiliate publishing package (Gate 3, D44)
- Owner: 10 requirements for every affiliate video's package; never claim "tested" without a test;
  four labels (verified / confirm in account / needs configuration / unverified).
- Built: `src/publishing/` (fact model, Instagram/TikTok/FTC rules, partner record + per-platform
  links, package builder), `content/affiliate/systeme-io.ts` (claim bank + program/link/tracking/
  plan/account/assumption facts), `src/pipeline/browser.ts` (rendered page text),
  `scripts/verify-affiliate.ts` (`npm run verify-affiliate`), publish-pack's affiliate branch,
  `spec.affiliate.claims` (v008: 8). Old `AFFILIATE_SETTINGS` removed. Tests 148/148
  (`tests/publishing.test.ts`: 5 new).
- v008 run (2026-11-18): claims 8/8 supported, facts 56/56 supported (2 negations read by hand,
  recorded), 1 by hand (FTC FAQ: 404 to scripts); links: instagram + tiktok HTTP 200, no redirect,
  parameters kept, affiliate cookie holds the ID, tag cookie = platform; control sets no affiliate
  cookie. Package: `out/v008-bookings-run-themselves/publish/` (post.md, 2× caption/bio/link,
  analytics.csv), no re-check flags.
- The run caught one source change between two runs: Instagram's "up to five websites" sentence
  came from the page's AI summary box, which does not always load; replaced with the article's own
  text (iPhone tab). Knowledge-video sheets regression-checked on v001 (only the intended lines).
- Found: TikTok requires AI labels for realistic audio (sheets updated); TikTok's own help page
  confirms the website-link rule; paid bookings need buyer setup (v008 caption reworded; the video
  is unchanged, no re-render). publish-pack.ts is in the orchestrator's package-stage hash: the
  package stage re-runs if a packaged job is ever re-run.
- Not done: orchestrator affiliate packages; Instagram AI-label tap path (no official page);
  sign-up credit (untestable without a third party). Nothing committed.
### 2026-11-18 — v008, the first affiliate video (D43)
- Owner: "give me the first video post … about systeme.io … perfecto", plus how to post.
  Checked first: environment ready, tests 142/142; v003 had been approved and packaged
  (job-0001) since the last STATUS entry; ids v005–v007 belong to orchestrator jobs → v008.
- Facts re-checked on the live pages (docs/affiliate/systeme-io.md § 10): payment up front
  and its free-plan availability, confirmation + call link, default reminders 24 h / 1 h
  (help centre), free grid (1 booking event, unlimited bookings, 2,000 contacts, 0 % fees,
  rendered in headless Chrome), no card, 60 % lifetime recurring.
- Built: `content/videos/v008-bookings-run-themselves.ts` (chaosToSystem → flowRun → endCard,
  smooth, `affiliate: { partner: 'systeme-io', page: 'booking-calendar' }`), opt-in
  `FlowStep.icon` (`card`) + validation + test, post-sheet tap paths for TikTok/Instagram
  (help pages checked today), partner `checked` 2026-11-18. Tests 143/143.
- My review (stills, then the upload): the payment step's return-arrow icon read as a refund →
  card icon; "Paid up front" appeared 3× in one frame → badge "Slot confirmed". Hook set by
  0.53 s, frame 0 shows "Booking one call" + the coral "6 MESSAGES" to-do; Ad tag readable at
  390 pt width; switch bloom at ×4 contrast: no rings or blocks.
- Draft voice 23.8 s synthesis (27.3 s wall, peak 1.65 GB). Final build: 513 s wall, render
  195.5 s (3/3 segments), peak 1.57 GB PSS, min 2.4 GB free, no swap growth. QA **29/29 PASS**:
  23.667 s, 13.1 Mbps, −14.04 LUFS, −1.41 dBTP, sync 0.00 ms, longest still 0.63 s,
  render.deterministic identical. Upload sha256 761aa5ebb4c1…, 39.7 MB.
- Found, not fixed: two full builds with identical render inputs gave different upload bytes
  (first: sha df409694…, 12.9 Mbps, longest still 0.47 s). Re-rendered stills of 8 unchanged
  frames are byte-identical across sessions, so the variance is inside video renders (cf. the
  ≤ 2-level session variance in QA.md); not investigated further.
- Posting facts: TikTok website link needs 1,000 followers or Business registration (TikTok
  business sources; the help page did not render); Instagram removes the paid partnership label
  if a tagged brand denies. Not verified: the in-app AI-label wording on both apps, whether the
  `?sa=` booking-page link tracks (check the affiliate dashboard after posting).
- Not done: listening by ear (measured only); the owner's approval of the take; orchestrator
  `StoryKit.affiliate` (still deferred, D43). Nothing committed.
### 2026-11-17 — affiliate videos, built into the engine (D42)
- Owner: affiliate videos approved ("we do not need boundaries"), disclosure in the
  description only was asked and refused with sources (FTC: description-only "not enough on
  its own"; TikTok toggle and Instagram label required). Agreed: the tag on the end card,
  not an ad read; dynamic for future partners; knowledge videos untouched; no disappointed
  viewers or buyers. Rules changed: CLAUDE.md (Process and ethics), STORY.md § Affiliate
  videos, QA.md #10, BRAND.md, PLATFORMS.md § Affiliate disclosure, DECISIONS D42.
- Built: `src/brand/partners.ts` (systeme.io), `src/video/affiliate.ts` (applyAffiliate,
  disclosure, guards), endCard `disclosure` prop + `AdDisclosure`, type role `disclosure`,
  `postText` disclosure line, publish-pack affiliate section (bio + settings),
  `library-affiliate` catalogue video, `tests/affiliate.test.ts` (10). Tests 142/142.
- Frames checked (`npm run render -- library-affiliate --stills …`): balanced two-line tag
  inside the safe zone (debug overlay); frame 42 no tag yet, frame 48 tag enters with
  "systeme.io"; last frame crisp. My review: readable, quiet, does not compete with the CTA.
- Not done / not measured: orchestrator kits (StoryKit.affiliate) — wiring it would re-run
  the script/spec stages of the jobs in review; lands with the first partner kit. No full
  affiliate video rendered, so publish-pack's affiliate sheet is untested end to end. No pixel
  comparison of an existing end card before/after (no baseline still; the code path without a
  disclosure is unchanged). src/video + src/brand changed → every video re-renders/re-mixes
  once on its next build (render cache key).
### 2026-11-17 — systeme.io affiliate research (no code change)
- Owner: "for some time we will create videos" promoting systeme.io (affiliate link, 60 %
  lifetime) for Instagram + TikTok. Research written to `docs/affiliate/systeme-io.md`:
  attribution rules, payouts, every plan limit (pricing grid rendered in headless Chrome),
  35 verbatim claim quotes (each re-checked against the fetched page), "do not say" list
  (systeme.io's own pages contradict each other on free-plan funnels and plan features),
  FTC / TikTok / Instagram disclosure rules with sources, 8 video angles.
- **Blocked on the owner:** this conflicts with hard rules (no affiliate links, no real brand
  names, no fake demos of real products; STORY.md, QA.md #10, D11, D23). Nothing produced
  until the owner decides how the rules change (`docs/affiliate/systeme-io.md` § 9).
- Not verified: TikTok bio-link eligibility, Instagram partner-tag approval, `?sa=` deep links.
### 2026-11-17 — v003 round 2: zoom that glides (D41)
- Owner: keep the zooms ("they make the reel alive") but the letters during the zoom are not
  real motion; the end card must zoom too; start and end are the most critical parts.
- Measured: during the push the headline stood still 8–10 frames, then jumped 1.00 px (Chrome
  snaps glyphs to whole pixels; HTML, SVG, canvas, geometricPrecision, tiny rotation all snap;
  lab test). Fix: `CameraRig smooth` moves a layer rasterised at 1:1 on every frame
  (useCompositorMove). Arming it once per mount failed in the video render (re-raster every
  ~10 frames; 2 tabs alternated ±0.4 px) — measured and fixed.
- Start: the camera path begins before frame 0 (the reel opens already moving). End: push from
  the click to ~1.047, still moving on the last frame. The click bloom now fades before the
  6.3 s cut (it popped off at the cut: top-right |Δ| up to 14.6 vs ~2 elsewhere).
- Upload measurements (round-2 render, before the bloom fix): headline vertical steps 0.01–0.18
  px every frame, no jumps (was 1 px every 8–10 frames); wordmark glides ~0.2 px/frame (step
  jitter 0.110 px); run→end cut |Δ| 2.25 = neighbours. Run: 662 s wall, peak 1.55 GB.
- Final render (bloom fix): QA **29/29 PASS** (render.deterministic identical, video.colour
  BT.709, 23.833 s, 12.9 Mbps, −14.07 LUFS, −1.42 dBTP, sync 0.00 ms). Headline step jitter
  0.031 px; wordmark 0.110 px; both cuts at neighbour level (1.42 vs 1.25/1.43; 2.50 vs
  2.48/2.36). Run 535 s wall, peak 1.62 GB, swap +0.3 GB. Upload sha256 78f9176e3a5c….
  Not checked: listening by ear; platform re-encodes.
### 2026-11-17 — v003 revision: premium light + motion (D40)
- Owner notes (Control Center decisions): v003 "last seconds zoom on the words isn't smooth,
  changes could be smoother and more premium"; v004 "zooms at the start and on the end card
  not smooth, I see images coming at me"; both: "light not premium, I see pixels". Owner: one
  video at a time → v003 first, v004 parked.
- Measured causes: hue rings + blocks in the wide lime glow come from H.264 4:2:0 (the PNG
  render is clean); master untagged BT.601 → Chrome showed lime 199,230,93 (true 201,242,93);
  camera stop-start at every key + linear segments; end-card push on type, wordmark popping in
  2–4 frames, flash + shockwave. Details and the encoder/synthetic experiments: D40.
- Built (opt-in `smooth` on chaosToSystem, flowRun, endCard; signature arc turns it on):
  `sampleCameraSmooth` + `CameraRig smooth`, `ease.glide`, `SoftLight`/`softRadial`/`withAlpha`,
  curved converge without trails, soft bloom, wordmark rise-into-focus, still lockup.
  Pipeline: `RENDER.colorSpace = 'bt709'`, delivery keeps the tags, QA `video.colour`.
- v003 re-run through job-0001 (voice reused, same take/script): 584.8 s wall, peak 1.86 GB
  PSS (1.34 GB free at start, min 0.95 GB, swap +1.8 GB); render 339.4 s, QA 243.3 s.
  QA **29/29 PASS**: 23.833 s, 12.9 Mbps, −14.07 LUFS, −1.42 dBTP, sync 0.00 ms,
  `video.colour` BT.709. Chrome draws the switch 201,242,100 (true 201,242,93). Light crop
  at ×4 contrast: neutral, no hue rings. Upload sha256 84eaeb309622….
- My frame review (every 2nd frame): ending = click with soft bloom, MAKE → WORK → CLICK rise
  out of a light blur over ~0.5 s, no ring, still; to-dos curve into the switch; camera drifts
  without pumping. Not checked: listening by ear; how platform re-encodes treat the new light.
- Side effect: render settings and scene code are in the render cache key, so every other
  video re-renders on its next build (pixels unchanged except the BT.709 matrix).
- Tests 132/132.
### 2026-11-17 — Control Center: Review page (D39)
- Owner: dashboard too noisy, a video "does not load". Measured cause: the view was rebuilt
  every 2.5 s with its `<video>`, restarting the player mid-load. Both upload files served
  fine (HTTP 206, faststart).
- New home page `/` = Review (videos to decide, scripts to read, in production, approved,
  earlier engine videos); old dashboard kept at `/details` with the video fix.
- Verified in headless Chrome (bundled chrome-headless-shell, CDP): all 5 players reach
  readyState 4, no media errors; a playing video keeps playing for 7 s with the same element
  on both pages (t = 6.97 s / 6.41 s). Screenshots checked at 1280 and 400 px.
- Real database migrated to schema 2 on the first start (backup
  `data/backups/studio-20261117-162726-pre-migration-1-to-2.db`).
- Found: job-0004's script repeats v004's 7/7 lines; job-0005's repeats 5/7 of v003's (the
  page flags it). Known nit: the auto-backup leaves `.part-shm`/`.part-wal` files in
  `data/backups/`.
- Tests 131/131.
### 2026-11-17 — Phase 2.5: production hardening (audit → fixes → tests)
Audit defects (all fixed; D34–D38):
1. Approved package MP4 was a hard link to the upload; ffmpeg rewrites that path in place →
   a later build changed an approved package (reproduced). Now a verified copy.
2. Control Center heartbeat only between jobs → after 60 s of rendering a CLI runner could
   take the lease and render a second job at once. Heartbeat now on its own timer.
3. `approve-take` built the gold take file by file; an interrupted package left a partial
   take that the next run accepted. Now `take-NN.part/` → renamed when verified;
   `frozenTake` requires an intact `approved.json`.
4. `recover()` trusted a live pid → after a reboot a reused pid kept a job "running"
   forever; a runner's own internal error also left jobs running until restart. Now
   lease/heartbeat based, run on every idle tick; cancel of a dead runner's job is immediate.
5. Package stage deleted the old package before building → a failure destroyed it. Now built
   beside and swapped; packages of earlier approvals archived.
6. Multi-row writes without transactions (research + sources + claims, idea + sources,
   decision + status, start's "one active job" check). Now `tx()`.
7. Orchestrator code not in stage inputs (a changed writer reused stale scripts unless a
   version was bumped). Now `STAGE_CODE`.
8. Mix key covered the sample manifest, not the samples. Now `assets/sound`.
9. Engine wrote upload, mix, master, timing lock, listening copy in place (truncated file
   reused after an interrupted write + input revert). Now written beside and renamed.
10. "Verified" = the page contains the quote. Now supported / partial / unverified /
    contradicted with confidence and limitations; v004's claim was broader than its source
    (40 % of terms) and was reworded (narration unchanged).
11. Foreign keys on 6 of 18 tables, no DB guard against two active jobs per idea, no backup.
12. A stage whose input failed left no stage record (error shown on the previous stage);
    approval did not re-check the file on disk; the first rerun of every job re-ran the script.
13. Found by the end-to-end test: `publish-pack` tied QA to the file by mtime (an identical
    re-delivery blocked packaging) and treated QA warnings as failures (a video with a
    warning could be approved but never packaged). Now by sha256; only FAIL blocks. It also
    caught my first package de-duplication (by manifest, which differs on every rebuild
    because of `packagedAt`): now one package row per approval. The dashboard screenshots
    caught an editorial heuristic miss ("chasing" not read as friction), fixed + tested.
Added: editorial QA stage (report only), 4 technical QA checks (`container.decode`,
`captions.timing`, `visual.emptyScene`, `assets.present`), `npm run db`, `npm run test:e2e`,
dashboard Editorial tab / claim evidence / retry on the failed stage / decision history.
Measured: 130/130 tests (6 s; 25 new incl. SIGKILL during each of the 13 stages, migration,
backup/restore, the dependency matrix with the real stage inputs). End to end in a throwaway
copy: 30/30 checks, 622 s wall (render 220 s incl. the killed attempt's restart, QA 204 s,
draft voice 27 s, packaging 5 s), peak 2.2 GB PSS; started with 2.5 GB free, min 1.3 GB,
swap +1.1 GB (a run started with 1.8 GB free swapped 2.6 GB: renders want ~3 GB free).
No regression: the four new QA checks pass on v001, v001-v2, v002, v003 and v004 (read-only
run on the existing uploads); re-mix and re-join are byte-identical (v002, v003, v004,
v001-v2), so v003/v004 keep their upload sha256 and the owner's approval applies unchanged
(dry run on a copy of the database: claims supported, no script review, voice/spec/render/
QA re-run without changing a byte, then package). The real `data/studio.db` is untouched
(a copy from before this work: `data/backups/studio-before-phase2.5.db`); it migrates to
schema 2 on its next open, after an automatic backup.

### 2026-11-17 — the production orchestrator (milestone 3)
- Built around the engine, no engine change (D29–D33): `src/orchestrator/` (SQLite store via
  node:sqlite, 12 stages, runner, CLI, Control Center), `content/kits/` (invoices, onboarding),
  `content/productions/` (generated specs). `content/index.ts` registers productions.
- v003 first pass (idea → awaiting approval): 704.8 s wall, peak 1.99 GB PSS (1.36 GB free at
  start, swap +2.1 GB). Research 1.0 s; voice 33.0 s (Kokoro 29.7 s); render stage 331.7 s
  (render 202.2 s, 3/3 segments; mix 16.2 s; delivery 111.7 s); QA 338.1 s, 24/24.
- My creative review of v003 found two defects (hook headline wrapped to 4 lines and touched a
  to-do; "Let the system follow up" drawn twice) → revision through the job (decision
  "revise"), fixed in the line breaker (3 × 16 characters, measured against v001) and the arc
  (scene-set lines carry no caption), regression tests added. Second pass: voice 25.4 s,
  render 304.2 s, QA 242.5 s → 24/24: 23.83 s, 12.8 Mbps, −14.07 LUFS, −1.42 dBTP, sync
  0.00 ms, longest still 0.47 s.
- v004: voice 42.7 s; **interrupted** by stopping the Control Center mid-render (stopped in
  1 s, child killed, 5/7 segments kept); resumed with an **injected render failure** (job
  Failed, nothing run); **retry**: render 59.5 s for 2/7 segments, mix 16.8 s, delivery
  108.8 s; QA 338.0 s → 24/24: 24.83 s, 13.9 Mbps, −14.08 LUFS, −1.44 dBTP, sync 0.00 ms,
  longest still 1.07 s.
- Reuse: re-running an unchanged job 0.6 s (10 stages reused, approval waits again). Title
  edit: 0.6 s, only idea → brief → spec re-ran; voice, render and QA reused, same file.
- Research: both kit quotes verified on the live pages; a deliberately wrong quote came back
  "uncertain" and flagged the idea without blocking (no line relies on it).
- Batch: two seed ideas (discovery) produced to the script-review gate in ~1 s each. Found and
  fixed a variety bug (variant picker gave every idea one of two scripts): per-line hashed
  choice; a job keeps the variants it already chose (no silent swaps on edit/approval).
- Regression: render inputs byte-identical to the commit. v002 rebuild 5.0 s, all cached,
  upload byte-identical. v001-v2's segment cache was stale since last session's Data-scene
  edit (not used by it); rebuilt: hook/end segments same size, run segment ≥ 50 dB PSNR vs the
  reviewed file (SSIM ≥ 0.991, only the soft glow below the window; no visible difference at
  3× zoom; glow-region mean luma equal within 0.02 levels — grain-level noise, not motion);
  two fresh sessions today render byte-identical stills. The rebuilt file passes QA 24/24
  (longest still 0.70 s vs 0.47 s: the metric reads that grain noise; warn is 1.2 s).
  Reviewed files kept in `out/v001-memory-v2/reviewed-2026-11-16/`.
- Tests: 105/105 (80 engine + 25 orchestrator); typecheck clean.
- Platform caption limits verified for the package: Instagram 2,200 chars / 30 hashtags,
  TikTok 2,200 UTF-16 units (PLATFORMS.md). Facebook not verified (held to 2,200).
- Not done: the owner's approvals (and so a real package folder); listening by ear.
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
