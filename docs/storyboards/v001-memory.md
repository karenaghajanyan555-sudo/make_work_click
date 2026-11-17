# v001-memory — storyboard

Status: **approved by the user 2026-11-16** ("go on and do all you need"); **built**, QA PASS
(see "As built" below). The beat table is the approved plan, kept as the record.
Spoken lines + times live in `content/videos/v001-memory.ts` (`narration`).

## As built (2026-11-16)
Narrator Bella × Nicole, take-01. 21.0 s, 630 frames. Upload file `out/v001-memory/v001-memory.mp4`.

| Scene | Video s | Key moments (video s) |
|---|---|---|
| `hook` chaosToSystem | 0.0–5.7 | headline out 2.72 · gather 2.78 · flips 3.77–4.07 · caption 3.2 · **click 4.8** · caption out 5.0 |
| `run` flowRun | 5.7–17.7 | push 5.7 · trigger 5.95 · email 6.45 → **sent 7.85** · schedule 9.2 → days 9.9/10.3/10.83 → **sent 11.25** · customer 12.6 → goal 13.5 · loop + pull-back 14.7 · flip back 15.55 · checks 16.23–16.6 · converge 17.1 |
| `end` endCard | 17.7–21.0 | **click 17.85** · wordmark 18.0 · CTA 18.45 (on screen 2.55 s) |

Changes from the plan, and why:
- **No 1.28 push.** At 1.28 the unfolding details left the safe zone. The window stays put;
  the camera eases to 1.1 and the canvas inside it auto-scrolls to the step in focus.
- **Window exit:** a short drop instead of a clip reveal. The collapse read as a white
  "TV line" on the dark ground (f492).
- **Pull-back:** three lime "done" chips on the steps; the trigger's chip turns to "Returned".
- **Resolved labels:** Handled · Sent · Followed up · Came back (plan: "Scheduled" for the
  third).
- **Wordmark under the switch** (centred lockup: switch, wordmark, hairline, CTA), not beside it.
- **Click at 4.8 s** (planned ~4.65) so it lands in the breath after "remember" in take-01.
- **Sound:** not used: the gather "air", the sine sub, wine glasses. 15 effects instead of
  ~10 (three day-ticks and four check-offs). Music sits ~14 dB under the voice, not 18: the
  first mix had it ~20 dB under, too quiet to hear.
- **Primitives:** the planned CardFlip / EmailPreview / WeekStrip / OrderCard became `Memo`
  (one to-do card shared by both scenes) and `Details` (email / schedule / goal views).
  The loop connector lives inside `FlowRun`.
- Cuts between scenes are pixel-matched (D22). Render measured: 172.5 s, 1.9 GB peak.

- Length **21.0 s** (630 frames at 30 fps). The extra second over 20 comes from an unhurried
  read with the slowest candidate voice; the final cut fits the beats to the chosen take
  (±0.5 s).
- 42 spoken words; about 2 words/s overall, with breaths between lines.
- One continuous product world: the camera travels through the same dashboard instead of
  cutting to new screens. The approved prototype (beats 1–2) is kept.

## Beats

| # | Time (s) | Picture | Narration (starts) | Caption | Sound |
|---|---|---|---|---|---|
| 1 | 0.0–2.8 | **Hook** (approved): headline over 7 scattered memo cards, coral "Overdue · 2d" / "Forgot · 1w", slow drift. Chapter "01 — By memory". | 0.15 "Your business shouldn't depend on your memory." | headline (scene) | Room tone, one low unresolved piano note. No beat yet. |
| 2 | 2.8–4.9 | **Chaos → system** (approved): cards gather into a column, domino-flip into flow nodes, window builds, switch clicks **Live**. Chapter "02 — By system". | 2.95 "Let the system remember." | "Let the system **remember**." (scene) | Soft air on the gather; 4 dry wooden ticks on the flips (each pitched differently); **the click**. The music opens: the chord resolves and a quiet pulse begins. |
| 3 | 4.9–8.9 | **Welcome email**: camera pushes in (1.0 → 1.28) to the top of the flow. Sam's row slides into the trigger ("joined via website · 9:41"); a light pulse runs down the connector. The email node unfolds a compact preview: from Juniper & Rye → Sam, subject "Welcome to Juniper & Rye, Sam", two real body lines. Chip: Queued → Sending → **Sent ✓** (lime, one ripple) on "anyway". The preview folds back into the node. | 5.3 "You're busy. The welcome goes out anyway." | "You're busy. / The welcome goes out *anyway.*" | Quiet hand-chime confirm on Sent, in the key of the score. |
| 4 | 8.9–12.5 | **Follow-up scheduled**: camera glides down to the wait node. A week strip extends from it: Mon ✓ welcome · Tue · Wed · **Thu 9:00** follow-up (lime outline). A playhead sweeps Mon → Thu, slowing as it nears Thursday. At Thu 9:00, "Your first pastry is on us" sends: Waiting → **Sent ✓**. | 9.1 "Three days later, the follow-up sends itself." | "Three days later, / the follow-up **sends itself**." | Three soft ticks for the days (slowing), confirm on Sent. |
| 5 | 12.5–15.2 | **Customer returns**: camera to the goal node. An order slides in: "New order · Sam Rivera · Sourdough loaf, 2 croissants · first-pastry offer applied". Goal → **Goal reached ✓**. The connector carries on past the goal and arcs back up to the trigger: the loop closes. Camera pulls back: four lime checks. | 12.9 "And they come back." | "And they *come back.*" | Warm two-note vibraphone figure: the musical high point. |
| 6 | 15.2–17.9 | **Final transformation**: the four nodes domino-flip back (the hook's motion, reversed) into the original memory cards, now resolved. Each line is struck through and its coral tag becomes lime: Handled · Sent · Scheduled · Came back. The window recedes (clip reveal), leaving the resolved cards on ink. | 15.4 "You didn't have to remember a thing." | "You didn't have to / remember *a thing.*" | The wooden flip ticks return as a callback; the music thins to one held chord. |
| 7 | 17.9–21.0 | **End card**: the resolved cards slide into the switch, which grows to hero size and clicks on once more. The "Make Work Click" wordmark sets beside it, series "N° 001", CTA "Follow for more systems like this." Holds still ≥ 1 s: readable, and loops cleanly. | 18.0 "Follow for more systems like this." | CTA on the card | **The click** (reprise) + final chord; the tail ends by 21.0. |

## Changes to the approved prototype
- The headline holds until "memory" is spoken (exit 2.45 → ~2.75 s).
- The click moves 4.15 → ~4.65 s so it lands in the breath after "remember".
- The prototype's quick run-through of all four steps becomes beats 3–5.

## Scene architecture (reuse)
- `chaosToSystem` (existing): beats 1–2, timing via its `beats` override.
- `flowRun` (new): beats 3–6. Its first frame matches the last frame of `chaosToSystem`
  (shared window layout), so the hand-off is invisible. Each step kind has a detail
  moment: email preview, schedule strip, goal/order, plus the resolve flip-back. It works
  for any trigger → action → wait → goal automation.
- `endCard` (new): beat 7. It is the brand lockup + CTA reused by every video.
- New primitives go in the catalogue (`docs/ARCHITECTURE.md`): CardFlip (extracted from
  `chaosToSystem`), WeekStrip, EmailPreview, OrderCard, LoopConnector.

## Sound plan
- **Narrator**: the user's pick from the audition (`out/v001-memory/voices/`), on the
  narration bus (`VOICE_CHAIN`: high-pass, compressor, limiter).
- **Music**: an original score composed in-repo from CC0 recordings: VCSL upright piano,
  vibraphone, hand chimes, wine glasses (github.com/sgossner/VCSL, "Creative Commons 0",
  verified 2026-11-16), plus a sine sub for weight. Only the needed notes are vendored.
  The tempo locks to the click. The music sits about 18 dB under the voice while it speaks,
  with ducking done on PCM in Node. No stock track, so no Content ID claims.
- **SFX**: about 10 events, each tied to a cue; real wood/chime transients from VCSL. The
  signature click layers a wooden transient with a short low "thock" body.
- **Mix**: −14 LUFS integrated, ≤ −1 dBTP, 48 kHz stereo AAC. This is a project target,
  not a platform fact.

## Technical plan
- 1080×1920, 30 fps, H.264 High yuv420p, AAC-LC 48 kHz stereo, faststart.
- **File size**: the prototype encoded at about 45 Mb/s because film grain eats bitrate.
  Pick encoder settings by measurement: the smallest file whose frames stay visually
  identical to a CRF 16 master (SSIM computed in Node, since the bundled ffmpeg has no
  ssim filter, plus side-by-side crops).
- **QA additions**: audio stream present (AAC, 48 kHz, 2 ch); duration = 21.00 s ± 1 frame;
  loudness and true peak; narration placed without overlaps; captions inside the safe zone.
- **Render estimate**: 630 frames at ~3.5 fps ≈ 3 min (extrapolated, not measured).
