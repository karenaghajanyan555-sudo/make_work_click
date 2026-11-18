# Decisions

Each entry: what, why, evidence. Newest last. Change a decision by adding a new entry
that supersedes it — never silently.

## D1 — Remotion 4.0.539, exact pin (2026-11-16)
Latest was 4.0.544, released the same day; we pin the newest release at least two weeks old.
All `@remotion/*` packages must share one version (Remotion warns otherwise).

## D2 — Accept zod 4.5.4 advisory (2026-11-16)
`npm audit` flags zod < 4.6.6 (memory exhaustion on oversized input). Remotion pins zod
4.5.4 exactly; an override to 4.6.7 made every render print a version-mismatch warning.
Judgement: zod only validates locally authored props in Studio here, so the risk is
negligible; staying on the vendor-supported combination. Revisit on the next Remotion bump.

## D3 — Node native TypeScript, no tsx/ts-node (2026-11-16)
Node ≥ 22.18 strips types natively. Scripts and tests run `.ts` directly. Consequences:
`import type`, explicit `.ts` extensions, no enums/namespaces (`erasableSyntaxOnly`).

## D4 — Built-in `node:sqlite` when persistence lands (planned)
Verified working on Node 22.23 (SQLite 3.53.4, prints an ExperimentalWarning). Avoids a
native build dependency (better-sqlite3).

## D5 — Render concurrency 2 (2026-11-16, measured)
| Run | Frames | Wall | Peak tree PSS |
|---|---|---|---|
| smoke, c1 (cached bundle) | 600 | 43.8 s | 1350 MB |
| smoke, c2 | 600 | 24.5 s | 1485 MB |
| direction reel v1, c2 | 270 | 51.9 s | 1449 MB |
| direction reel v1, c3 | 270 | 53.9 s | 1640 MB |
| prototype v001 (QA run, render only), c2 | 210 | 54.1 s | 1822 MB (whole QA process) |
c3 was not faster (CPU-bound) and costs ~190 MB more. Reference machine: 8 cores,
11.4 GB RAM, ~3 GB typically free, no GPU.

## D6 — Bundled ffmpeg only (2026-11-16)
Remotion ships ffmpeg/ffprobe n7.1 for every platform; using it removes the system ffmpeg
dependency (the system one here is 4.4.2). Its build is minimal: no select/overlay/tile/
drawtext/detection/afade/sidechain filters and no rawvideo (de)muxer. We use `trim` for
frame-exact extraction (verified hash-identical to a full decode), `image2pipe` + rawvideo
codec for raw frames, and do analysis/compositing/PNG encoding in Node.

## D7 — Safe zone = Meta's 14% / 35% / 6% for all platforms (2026-11-16)
Strictest official numeric guidance found (docs/PLATFORMS.md). Enforced by layout tests.

## D8 — Content specs are JSON-compatible TypeScript (2026-11-16)
Type-checked authoring now; serialisable for future generation/storage. A test asserts
`JSON.parse(JSON.stringify(spec))` round-trips.

## D9 — Grain in the ground layer, pre-baked tile (2026-11-16, measured)
Per-frame cost (single tab, ms/frame, hook/gather/flip/run):
SVG-turbulence overlay grain 844/761/645/643 · same as pre-baked PNG 935/685/638/766 ·
normal-blend layer 620/519/421/470 · no grain 527/451/353/376.
The full-frame `mix-blend-mode: overlay` was the cost, not the SVG. Grain now sits in the
ground (normal blend 0.06, ground pre-darkened to keep perceived `#0A0B0D`); measured grain
std 2.6–2.8 levels in dark areas; no banding. Prototype render 64.1 s → 54.1 s.

## D10 — Light surfaces never fade over the dark ground (2026-11-16)
Opacity-fading a light UI over ink passes through muddy grey (seen in direction reel and
prototype v1). Windows build with a full-opacity reveal; cards flip and swap faces edge-on.

## D11 — Unbranded fictional product world (2026-11-16)
No real product names/logos/OS chrome. Fictional businesses (Juniper & Rye Bakery) and
people (Sam Rivera). Satisfies "realistic UI" without fake demos of real products.

## D12 — Pacing check is self-calibrating (2026-11-16)
A fixed frame-difference threshold broke when grain changed (floor moved 0.18 → 0.27).
Static = within 0.08 of the video's 5th-percentile difference.

## D13 — Narration engine environment: uv-managed Python 3.12.16, hash-locked (2026-11-16)
torch ≥ 2.13 needs Python ≥ 3.11, kokoro 0.9.4 needs < 3.13, and the system Python 3.10
is past end-of-life. uv installs Python 3.12.16 (released 2026-10-25, python.org).
`scripts/tts/requirements.txt` is a universal, hash-checked lock resolved with
`--exclude-newer` = 14 days ago (enforces the two-week rule); torch comes from the
official CPU-only index (`+cpu` on Linux/Windows, plain wheel on macOS). Model files:
`hexgrad/Kokoro-82M` at revision `f3ff357…`, sha256-checked (`scripts/tts/model.json`).
Measured: setup 2 min (fresh), venv 1.3 GB + model 316 MB; synthesis peak RSS 1.3–1.8 GB.

## D14 — Narrator audition: 4 candidates by grade + measured pitch (2026-11-16)
Screened all 7 usable American male voices + 2 blends on the v001 script. Kokoro's
VOICES.md grades only am_michael / am_fenrir / am_puck at C+ (others D or lower). Median
pitch (YIN): onyx 85 Hz, michael+onyx blend 103, puck 110, echo 114, michael 116,
liam 134, fenrir 143, eric 155. Brief = "deep" → candidates A michael, B puck, C onyx,
D michael 60 % + onyx 40 % (a custom voice instead of a stock one). Fenrir dropped (C+ but
highest pitch). Speeds 0.88–0.95 for an unhurried read (Kokoro reads at 2.8–4.0 words/s
by default). **The user picks; nothing is assumed.**

## D15 — One-utterance synthesis, cut by word timestamps (2026-11-16)
Lines synthesised separately lose sentence-to-sentence prosody, and Kokoro is weakest
on very short inputs (VOICES.md). The script is read as one utterance and cut at the
quietest 10 ms inside each inter-line pause; 8 ms fades. Alignment is verified
(alphanumeric count must match) or the take fails.

## D16 — Voice bus and loudness in Node (2026-11-16, measured)
The bundled ffmpeg has no compressor or limiter, and the raw takes have 19–21 dB crest
factors: linear gain to −16 LUFS would clip, and peak-limited gain left the takes at
−20 to −24 LUFS (measured). `VOICE_CHAIN` (docs/SOUND.md) brings every candidate within
0.15 LU of target at ≤ −1.79 dBTP. ffmpeg's mono→stereo upmix is −3 dB per channel, so
stereo conversion happens in Node.

## D17 — Narrator brief reopened: female round (2026-11-16)
After round 1 the user picked Michael provisionally ("I guess Michael is good") and asked
for four high-quality female voices with a brief of "very good, high quality, sexy;
you want to listen to it on and on". In production terms: warm, smooth, intimate,
not tiring on repeat. B puck, C onyx and D michael+onyx are dropped; A michael stays as
the reference. Screened af_heart, af_bella, af_nicole, af_aoede, af_kore, af_sarah plus
4 blends. Verified (VOICES.md): af_heart A, af_bella A-, af_nicole B-, the rest C+; every
American male voice is C+ or lower. Measured median pitch: nicole 147 Hz (but 2.15 words/s,
too slow for 21 s on its own), kore 156, heart+kore 178, heart+nicole 177, bella+nicole 183,
aoede 185, sarah 198, heart 200, bella 211. Candidates: E heart, F bella,
G bella 60 % + nicole 40 % (softer and slower), H heart 60 % + kore 40 % (lower and warmer).
**Gender and voice are still open until the user picks.**

## D18 — Narrator chosen: Bella × Nicole, take-01 frozen as "gold" (2026-11-16)
The user picked G (af_bella 60 % + af_nicole 40 %, speed 1.0, seed 7): "this is it… always
keep this version, it is gold". `NARRATOR` set (src/brand/voice.ts). Verified: re-running
the recipe reproduces take.wav and the line files byte-for-byte on the reference machine.
The exact take the user heard is frozen in `public/narration/v001-memory/take-01/` (take,
lines, word timings, the audition .m4a; 2.2 MB) with sha256s in approved.json;
tests/narration-assets.test.ts fails on any change to those files, on script drift, or
on placement problems (verified: editing one character of the script fails the suite).
Improvements become take-02 beside it; take-01 is never edited or deleted. Line "system"
moved 2.95 → 3.06 s so this take places without shifting. Model manifest trimmed to the
two voices the narrator blends.

## D19 — Delivery encode: CRF 20, one file for every platform (2026-11-16, measured)
Upload file = picture master (CRF 16) re-encoded with x264 preset slow, CRF 20, High, closed
GOP 15 (half the frame rate), 2 B-frames, faststart, no edit lists; AAC-LC 320 kb/s 48 kHz
(`src/pipeline/deliver.ts`). Measured on v001 (SSIM on luma in Node, `compare.ts`, vs the
master): CRF 18 = 32 Mbps, SSIM mean 0.979; **CRF 20 = 12.7 Mbps, SSIM mean 0.958, min
0.907** (the low frames are the dark, grainy ones: at 4× contrast only the grain softens,
no banding or blocking); CRF 22 = 4.8 Mbps, below YouTube's 8 Mbps recommendation —
rejected. Result 34.2 MB vs 113 MB master (−70 %). Meta's API page asks for a 2–5 s GOP;
we keep YouTube's (PLATFORMS.md, judgement). Cost: deliver ≈ 82 s, 650 MB peak.

## D20 — Sound: original score on CC0 recordings, built in Node (2026-11-16)
No paid libraries, no stock track. The score is data (`ScoreSpec`), composed for the video
and tied to its cue points; it plays real instrument recordings from VCSL (CC0, pinned
commit, git-blob verified, 28 samples / 20 MB in `assets/sound/`). Reverb, ducking,
compression and limiting run in Node because the bundled ffmpeg has none of them
(FFT convolution with a seeded procedural impulse; envelope follower ducking). Effects come
from a per-scene-type cue map, not hand-placed times. Pipeline-only inputs live in
`assets/` (the browser never loads them); render-time files stay in `public/`.
Cost: mix ≈ 13 s, 335 MB peak.

## D21 — Audio sync without edit lists (2026-11-16, measured)
YouTube asks for no edit lists, but libfdk_aac primes 2048 samples (42.7 ms at 48 kHz) that
an edit list would normally hide: measured decode lag 42.7 ms. `deliver()` advances the mix
by 2048 samples before encoding; QA cross-correlates the upload's audio with the mix at the
first click: 0.00 ms. B-frame reordering without an edit list started the video 2 frames
late (0.0667 s); `-movflags +negative_cts_offsets` puts the first frame at 0.000.
AAC frame padding leaves the audio 43 ms longer than the video; QA allows ≤ 50 ms.

## D22 — Continuity cuts are pixel-matched (2026-11-16, measured)
`hook → run` and `run → end` are hard cuts that must be invisible: the next scene opens on
the exact pixels the previous one left. A 1 px shift of the flow nodes at the first cut
(33k strongly changed pixels between f170 and f171) came from an extra wrapper div around
the node body in `flowRun`; clip paths, rounding and transform-origin changes made no
difference. Fix: render the node body unwrapped while its detail is closed. Now 2,964
changed pixels at the cut, fewer than a normal frame step (6,189); the end-card cut changes
0 pixels in the switch area. Rule: a scene that continues another one renders shared
elements with the same DOM structure, positioned in frame space.

## D23 — Post copy lives in the spec; AI label on everywhere (2026-11-16)
`spec.publish` holds the cover moment, title, caption and hashtags, validated (YouTube limits,
no links — the no-affiliate rule made mechanical). `npm run publish-pack` writes the cover
and a post sheet only for a file that passed QA; it never posts. AI label on every
platform plus a caption line: required by Meta for realistic synthetic audio (verified),
our transparency choice on YouTube/TikTok (PLATFORMS.md § Posting).

## D24 — The engine: specs over code, library scenes, opt-in improvements (2026-11-16)
v001 is the creative baseline; every later video reuses its brand system, captions,
hand-offs, narrator, sound pipeline and outro. A video is a spec; the reusable parts are a
scene library (12 types, each a pure model + a renderer behind two registries), a UI kit,
motion primitives and five visual presets. New behaviour is added as opt-in props of a
library scene, so earlier videos render unchanged (verified: 13/14 v001 frames byte-identical
after the refactor; frame 0 differs by ≤ 2 levels in 4 pixels and alternates between the same
two outputs across fresh browser sessions, before and after — a pre-existing first-paint
flake, not a change). No new dependencies.

## D25 — Time comes from the voice (timing locks) (2026-11-16)
Hand-timing every beat to word timestamps was the most expensive part of v001. Now a
committed timing lock (content/timing/<id>.ts, generated by `npm run voice`) records each
line's duration, its place in the one-utterance take and every word's start/end;
`defineVideo()` derives line starts (the take's own rhythm + `pause`), scene durations
(`say`), split-caption phrase times and any beat written as `{ line, word }`. The lock is a
TypeScript module so the same pure resolver runs in Node and in the Remotion bundle, with
no async metadata. A stale or missing lock fails validation (Studio still previews with an
estimate). v001 keeps its explicit times; v001-v2 and v002 use the resolver.

## D26 — Draft narration cache; approved takes stay gold (2026-11-16, measured)
Draft takes are cached in `.cache/narration/<key>`, key = sha256(script, narrator recipe,
model revision, narrate.py). Unchanged script → no synthesis (v002: 27.6 s / 1.6 GB peak the
first time, 0.34 s after). Kokoro synthesises the whole script as one utterance (D15), so
any script edit re-makes the whole take. A video may reuse another video's approved take
when its script is identical (`take: 'v001-memory/take-01'`). Approval of a draft freezes it
like an audition take (`npm run approve-take -- <id> draft`).

## D27 — Scene segments: render only what changed (2026-11-16)
The picture master is one H.264 segment per scene (frame range up to the next scene),
joined with the concat demuxer without re-encoding. A segment's key is the render code hash
plus exactly the spec slice that can change its frames (overlapping scenes and hand-offs,
captions and chapter labels on screen, the global look). Editing one scene's content
re-renders that scene and at most the neighbour sharing a hand-off (tested). Mix and
delivery are skipped when their input hashes match (out/<id>/build.json). Steps run one at
a time in fresh processes; Remotion's frame concurrency stays at 2 (D5).

## D28 — Composed scores, scene-declared sounds (2026-11-16)
v001's score was written note by note. `composeScore()` writes an original score from a
harmony preset (`clarity` D major 96 BPM from v001; `focus` A minor → C, 90 BPM) and a plan
of sections on cues (intro, pulse, lift, hold, home), all within ±3 semitones of a recorded
sample. Effects come from each scene model's `sounds()` plus optional per-scene extras in
the spec, built by one effect library (src/pipeline/sound/sfx.ts) from the CC0 samples;
new: notify (vibraphone), tick (woodblock), open, and swell (a reversed chime that lands on
its cue). A hand-written score still wins when a video deserves one.

## D29 — The orchestrator wraps the engine; SQLite via node:sqlite (2026-11-17)
Production is a sequence of twelve persistent stages (docs/ORCHESTRATOR.md) around the
existing engine; the engine is called, never re-implemented (voice functions in-process,
render/mix/deliver/QA/approve-take/publish-pack as child processes, one at a time). State
lives in `data/studio.db` through Node's built-in `node:sqlite` (D4: no native dependency;
prints an ExperimentalWarning, silenced in the npm scripts). No Redis, queue library or
worker pool: one runner process (a lease row + pid check) works the queue sequentially.
Generated specs are ordinary content files (`content/productions/<id>.ts` + timing lock)
registered beside the hand-made videos; render cache keys exclude `content/`, so this
cannot invalidate v001/v002 segments.

## D30 — Stage inputs are hashed; a stage sees only what it declares (2026-11-17)
Each stage builds an input object from upstream outputs and hashes it (sorted-key JSON,
plus a stage version). Same hash + artifacts present → the previous output is reused and
recorded as `reused`. Because a stage receives only that object, the hash covers exactly
what it uses: the script reads the brief without its title and post copy (a title edit
never touches the voice), the voice reads only line ids + texts (`narrationKey`), the render
reads segment keys + the spec minus title/status/brief/post copy + asset hashes. The engine
keeps its own finer caches underneath (segments, mix, delivery), so a rerun stage still
skips unchanged work. Tested with fake stages and with the real stage inputs.

## D31 — Writing without an LLM: story kits + arcs (2026-11-17)
No paid API is allowed and no local model is installed, so the default writer is
deterministic. A story kit (`content/kits/`) holds a category's fictional world, line
variants with word pins, scene material, post copy, assumptions and real-source references;
an arc (`src/orchestrator/storyboard.ts`) turns a script into library scenes: `signature`
(the v001-v2 look the owner liked: chaosToSystem → flowRun with every v2 opt-in → burst
outro) and `editorial` (the v002 sequence). The spec stage fits the result by adding pauses
between lines until the engine validates it — pauses move lines without changing the
recorded audio, so fitting never re-synthesises. Trade-off accepted: only categories with a
kit can be produced automatically, and two ideas in one kit share most of the visuals.
`WriterProvider` is the extension point for an optional model-based writer later.

## D32 — Research verifies sources narrowly and says so (2026-11-17)
"Verified" means: the cited page was fetched and contains the quoted text (normalised for
case, spacing, quotes and dashes). It does not prove the claim beyond that page. Everything
else is labelled for what it is: uncertain (unreachable, or quote not found), assumption
(stated by the kit), illustrative (fictional on screen). A script line that relies on a
claim which is not verified pauses the job for script review. Figures in the owner's hook
are refused (they would need a verified source). Sources are fetched once per research
input (the stage hash), with a plain user agent; no API keys.

## D33 — Approval binds to the file; approval freezes the take (2026-11-17)
A video decision is stored against the upload file's sha256; any re-render produces a new
file and waits for a new decision. A video whose QA failed cannot be approved (checked in
the action and again in the stage). Approving runs the package stage: it freezes the exact
draft take into `public/narration/<id>/take-NN/` (approve-take, hash-checked — "approved =
gold"), builds the post pack (cover + post sheet) and the package folder. Nothing posts.
The `affiliate_conversions` metric exists in the analytics model because it was asked for;
the house rule "no affiliate links" (D23) is unchanged, so it stays empty.

## D34 — One runner, proven by its heartbeat, not its pid (2026-11-17, Phase 2.5)
Audit: the Control Center sent its lease heartbeat only between jobs, so after 60 s of
rendering a CLI `run` could take the lease and render a second job beside it (≈ 2 GB each on
a ~3 GB machine); and `recover()` trusted `pidAlive(runner_pid)`, so after a reboot a reused
pid kept a job "running" forever. Now: the heartbeat runs on its own 10 s timer; a lease is
live only while its process exists *and* heartbeats (`leaseLive`); a runner that loses the
lease interrupts its stage; once a runner holds the lease, every other `running` row is an
orphan (`recover`, also on each idle tick) and its engine process is killed only if it is
really ours (cwd = repo, `scripts/*.ts`). Cancel of a job whose runner is gone cancels at
once. Tested with a real child process killed by SIGKILL in each of the 13 stages.

## D35 — Research reports support levels, not "verified" (2026-11-17, Phase 2.5)
"Verified" meant "the page contains the quote". That proves the quote exists, not that it
supports the claim (the onboarding kit's claim said more than HubSpot's sentence: 40 % of
its terms were in the passage). Now each fact is supported / partial / unverified /
contradicted by an explicit rule (exact quote + ≥ 60 % of the claim's terms in the passage,
no negation in its sentence), with confidence, the page's own words, retrieval date, quote
match, coverage and limitations stored per claim. It is deterministic and lexical, and says
so; anything but "supported" pauses the script for a person. The onboarding claim was
reworded to what the source says (the narration did not change); a signed contract as the
trigger is listed as illustrative. Rows written before keep their old status names.

## D36 — Editorial QA is its own stage and never decides (2026-11-17, Phase 2.5)
Technical QA (the file) and editorial QA (the story) are separate reports. Editorial QA is
pure and deterministic: measured proxies (hook length and time, reading ease, line length,
section order, repetition, scene lengths, scene variety, claim support, CTA, narrator,
preset, disclosure) against stated rules, each ok / look / problem. It has no gate and
cannot fail a job: only the owner approves. A long scene is "look", not "problem", because
the signature flow run is one continuous move (motion is measured separately).

## D37 — Outputs are swapped in whole; approved outputs are copies (2026-11-17, Phase 2.5)
Audit, reproduced: the package's MP4 was a hard link to `out/<id>/<id>.mp4`, and ffmpeg
rewrites that path in place, so a later build silently changed an approved package. Also:
`approve-take` built the gold take file by file (an interrupted package left a partial take
that the next run accepted), the package stage deleted the old package before building the
new one, and the upload, mix, master, timing lock and draft listening copy were written in
place. Now every one is written beside its target and renamed when complete; package files
are copies; a package for an earlier approval is moved to `packages/approval-<id>/`; a take
counts only with an intact `approved.json`; reused outputs are re-checked by sha256.

## D38 — Database integrity, backups and honest cache keys (2026-11-17, Phase 2.5)
Schema 2: foreign keys on every job record, one active job per idea enforced by a partial
unique index, CHECKs on approval targets/decisions, indexes for the per-job queries.
Multi-row writes are transactions (`tx`, BEGIN IMMEDIATE). Migrations back up first and run
in a transaction with `foreign_key_check`; a newer schema is refused. Backups: SQLite backup
API, verified by reopening (`npm run db`), automatic on every Control Center start (14 kept).
Tests cannot open `data/studio.db`. Cache keys: the pure stages hash their own code
(`STAGE_CODE`), so a changed writer cannot reuse stale scripts; the mix key covers every
sample file (`MIX_INPUTS` had only the manifest; the re-mix is byte-identical, measured on
v002 and v003, so no upload changed); the script's variant choice is part of its input from
the first run (the first rerun of every job used to re-run the script once).

## D39 — The Control Center opens on a Review page (2026-11-17)
The owner found the dashboard too noisy and a video "not loading". Cause (measured in headless
Chrome): the page rebuilt its whole view every 2.5 s, `<video>` included, so a player restarted
mid-load. Now `/` is a Review page (`src/orchestrator/review.ts` → `GET /api/review`,
`dashboard/review.js`): videos awaiting a decision (player, checks, narration, approve /
request changes / reject with a second-click confirm), scripts to read (flagged when ≥ half
their lines repeat another live job's script), jobs in production in plain words, approved
packages, and engine videos (hand-written specs, decided in chat). It re-renders only when
the data changes, never under a focused text box, and reuses each `<video>` element. The
full dashboard (ideas, stages, logs, research, metrics) is unchanged at `/details`, with the
same video-element fix. No new endpoint mutates anything; actions use the existing job API.

## D40 — Premium light and motion: neutral wide light, BT.709, one camera glide (2026-11-17)
Owner review of v003/v004: zooms "not smooth", "I see how images come to me", the light is
"not premium, I see pixels". Measured on v003 (upload, master and lossless PNG stills of the
same frames):
- **Pixels in the light come from encoding, not from Chrome.** The PNG render is smooth; the
  CRF 16 master and CRF 20 upload both show hue rings and blocks in the end-card glow at ×4
  contrast. Cause: a wide, faint *lime* gradient — the grain dithers brightness only, so the
  chroma steps of 8-bit 4:2:0 stay and the encoder blocks them. Synthetic test (30 frames of
  grain → x264 CRF 20 → temporal mean vs ideal, band-pass error): lime glow + mono grain
  0.272 (visible rings); + colour grain 0.217 but the grain itself turns into magenta/green
  blocks; **neutral wide bloom + tight lime core 0.188, no rings**. Encoder settings tried on
  the real frames (aq-mode 3, deadzones, CRF 18/12) changed little and up to doubled the bitrate:
  not adopted (platforms re-encode anyway). Fix: `SoftLight` (neutral key-light bloom,
  smoothstep falloff, lime core ≤ ~320 units) in the `smooth` scenes.
- **Colour matrix.** Remotion 4 encodes BT.601 and leaves the matrix untagged (primaries
  BT.709). Headless Chrome drew the brand lime from the v003 file as 199,230,93 (source
  201,242,93); a BT.709-tagged encode gave 201,242,100. Now `RENDER.colorSpace = 'bt709'`
  (Remotion's own option docs recommend it), delivery keeps the master's tags, QA
  `video.colour` warns on untagged files. All videos re-render on their next build (settings
  are in the render cache key); their pixels change only by the matrix.
- **Motion.** The camera eased in and out of *every* key (stop-start) and mixed linear
  segments (speed jumps, also at cuts); flowRun leaned in and out on each step; the end card
  zoomed on the type (glyphs re-rasterise every frame), the wordmark popped out of a mask in
  2–4 frames (`ease.out` is very front-loaded), and a full-frame flash + shockwave opened it.
  Opt-in `smooth` (chaosToSystem, flowRun, endCard; earlier videos unchanged): one monotone
  Hermite camera path (`sampleCameraSmooth`, tested: no overshoot, no speed jump at a key),
  flowRun's follow camera as one deepening glide, to-dos curving into the switch (no straight
  light trails), the click blooms instead of flashing, the wordmark rises into focus on
  `ease.glide`, the lockup holds still. The signature arc turns it on (v003, job-0005).

## D41 — Camera moves on a compositor layer: type glides instead of stepping (2026-11-17)
Owner on the D40 v003: likes the zooms ("they make the reel alive") but the letters during
the zoom are "not real motion"; the end card must zoom too (D40 had made it still).
Measured (sub-pixel edge tracking of the hook headline, frames 36–100 of the upload): during
the push the text stands still for 8–10 frames, then jumps 1.00 px. Chrome snaps glyphs to
whole pixels: a lab test in headless Chrome (same headline zoomed 1.000 → 1.035 in 40 steps)
gave the same steps for HTML, `text-rendering: geometricPrecision`, SVG `<text>`, canvas
`fillText` and a tiny rotation (half-pixel steps); a perspective dolly jittered ±0.5 px.
A persistent `will-change: transform` layer moved smoothly (step jitter 0.095 px vs 0.745) —
but only if the layer is first drawn untransformed: Remotion mounts a scene at its zoom, and
then the layer is rasterised at that scale and snaps again (measured: no change). So
Arming the layer once per mount was not enough in the video render: with animated content
inside, Chrome re-rasters the layer at the zoomed scale every ~10 frames (1 tab: 0.7 px jumps;
2 tabs: alternating ±0.4 px, step jitter 0.753). So `CameraRig smooth` (useCompositorMove) does
it on **every frame**, before capture (delayRender): drop the layer, create it untransformed
(raster 1:1), wait 3 animation frames for the raster threads, apply the camera transform.
Result on the real v003 hook through renderFrames at concurrency 2 (frames 50–90): vertical
step jitter 0.417 → 0.050 px, steady 0–0.16 px steps, no jumps; a fresh still and the same
frame from the sequence render agree (text edge 920.11 px in both, mean |Δ| 0.0000); a frame
rendered twice is byte-identical; text at 1:1 is not visibly softer (bilinear at ≤ 1.035). Motion: the hook path starts before frame 0 (the reel
opens already moving); the end card pushes from the click to ~1.047 at the last frame and is
still moving (the path ends 1.4 s past the scene). Opt-in with `smooth`: earlier videos unchanged.

## D42 — Affiliate videos: one opt-in field, disclosure built in, teach first (2026-11-17)
The owner joined the systeme.io affiliate program and decided some videos will promote it, and
other partners later; most videos stay pure knowledge videos. This replaces the old "no
affiliate links, ever" rule (D23's no-link caption check stays: the link lives in the bio).
- **Data:** `src/brand/partners.ts` (approved partners: name, aliases, bio link, deep links,
  research doc). Research + claim bank per partner: `docs/affiliate/<id>.md`.
- **One field:** `spec.affiliate = { partner, page? }`. `defineVideo` → `applyAffiliate` puts
  the "Ad" tag on the end card and holds the card until the tag has been up 2.4 s; `postText`
  leads the caption with "Ad: I earn a commission from <partner> through the link in my bio.";
  publish-pack adds the bio line ("Paid link: …" + link) and each platform's setting.
- **Why in the video, not only the caption:** the FTC says a description-only disclosure is
  not enough and platform tools alone may not be; TikTok requires the commercial toggle and
  Instagram the paid partnership label (sources: docs/PLATFORMS.md § Affiliate disclosure).
- **Why on the end card only (judgement):** the body is the knowledge video, so the partner is
  named only on the end card; a visual-only endorsement needs a visual disclosure (16 CFR
  255.0), so the narration stays free of an ad read. If a voice line names the partner, that
  line must say the disclosure (validation). The tag enters 0.45 s after the CTA, with the
  partner's name (measured on frames 42/48 of `library-affiliate`), never before the message.
- **Guards (validation):** a video without `affiliate` may not name a partner anywhere
  (narration, captions, scene text, post copy); an affiliate video ends on an endCard carrying
  exactly the derived tag; no partner on screen before the end card unless the voice disclosed
  it; partner names allowed in the caption (they look like domains), links never.
- **Look:** neutral pill + paper sentence, new type role `disclosure` (30 u), balanced lines,
  outside the end card's camera layer (never pushed), inside the safe zone (tested). No
  partner logos (our type only: no trademark artwork to vendor or alter).
- **Not done yet:** orchestrator kits (`StoryKit.affiliate` → brief → spec, platform copy);
  wiring it would re-run the script/spec stages of the jobs in review, so it lands with the
  first partner kit.

## D43 — The first affiliate video: v008, made with the engine (2026-11-18)
The owner asked for the first systeme.io video ("first one goes boom"), ready to post.
- **Story (judgement):** research angle 2 (booking + payment), the strongest fit for the
  signature arc and for systeme.io's conversion (the referral counts on a free signup, and
  every step shown is on the free plan). Hook "Booking one call shouldn't take ten messages."
  → one link that takes the payment up front, sends the confirmation with the call link and
  the reminder the day before → "Ten messages became one link." Coaches, consultants,
  freelancers. Covering the end card it still teaches the method.
- **Facts:** each step and every caption fact re-checked on the live pages today (claim rows
  in docs/affiliate/systeme-io.md § 10, the quotes in the spec header). Reminder timing from
  the help centre (default 24 h and 1 h before). Caption tip from the help centre (send the
  confirmation only after payment). Free-plan limits stated in the caption (1 booking event,
  unlimited bookings, processor fees apply).
- **Voice CTA (judgement):** "Set it up once. Link in bio." The voice names no product and gives
  no opinion; the end card carries the endorsement ("The tool I'd use for this: systeme.io")
  together with its "Ad" tag (visual endorsement → visual disclosure, 16 CFR 255.0). "Follow
  for more" was dropped: an affiliate video asks one thing.
- **Engine, not the orchestrator:** a hand-written spec (`content/videos/v008-…`). The
  orchestrator's `StoryKit.affiliate` is still not wired (D42); doing it now changes stage code
  under job-0004/0005. Id v008: v005 to v007 belong to orchestrator jobs.
- **New opt-in prop:** `FlowStep.icon` (`'card'`). The goal kind's return arrow next to "Paid up
  front" read as a refund. Default unchanged for every earlier video (tested).
- **Post sheet:** TikTok and Instagram rows now give the verified tap path (help pages checked
  today); partner `checked` 2026-11-18 (60 % lifetime recurring re-read on the program page).
- **Posting caveats found:** TikTok shows a clickable website link only with 1,000 followers
  or a registered Business account (TikTok business sources); Instagram removes the paid
  partnership label if a tagged brand denies the request.

## D44 — The affiliate publishing package: verified, tested, labelled (2026-11-18)
The owner set 10 requirements for every affiliate video's publishing package (CLAUDE.md, docs/QA.md
§ Gate 3) and one rule: never claim a URL, tracking mechanism, setting or integration was tested
unless it was. Built:
- **Data, outside the render inputs:** `content/affiliate/<partner>.ts` (claim bank, link rules,
  tracking, program, plan, account checks, assumptions) and `src/publishing/platforms.ts`
  (Instagram, TikTok, FTC). Every fact: verified (quote + URL + date) / account / configure /
  unverified. A re-check never re-renders a video (it took a full re-render on 2026-11-18 when
  the post-sheet text lived in `src/video`).
- **Verification run** `npm run verify-affiliate`: re-reads every quote (raw HTML, or rendered in
  the bundled headless Chrome: `src/pipeline/browser.ts`), with the orchestrator's `assessClaim`
  (no second quote matcher: the script is an orchestrator-side CLI like `produce`; the engine's
  `publish-pack` only reads its JSON, like a QA report). Link test per platform: HTTP status,
  redirects, parameters kept, the partner's cookie holding our ID and the platform tag; a control
  request without parameters must set no affiliate cookie. Not tested and always listed as such:
  that a sign-up is credited (needs someone else's real account).
- **Negations read by hand:** the support check flags any negation word in a quote's sentence.
  Two sentences hold one that belongs to another clause; `Source.negationReviewed` accepts that
  one word only, and the package says "a negation in the sentence read by hand".
- **Per-platform tracking:** systeme.io documents `&tk=<tag>` ("to track the traffic source";
  the tag is "added to all sales"); we use `tk=instagram` / `tk=tiktok`. The link test showed the
  server stores it (`tk_systemeio` cookie). Clicks per tag are not documented: read clicks in each
  platform's insights.
- **Gate:** publish-pack refuses an affiliate package without a run from the last 7 days in which
  every claim is supported and every link test passes; facts the run could not re-confirm are
  printed "NOT re-confirmed" and flagged. Facts that can only be checked by hand are flagged after
  30 days.
- **Found while building it:** TikTok's AI page requires labels for realistic audio (our narrator):
  knowledge-video sheets now say "required" for TikTok too. TikTok's own help page now confirms
  the website-link rule (1,000 followers or a Verified Business Account). A paid booking needs
  setup by the buyer (event, payment page, price plan, Stripe/PayPal): v008's caption now says
  "your own Stripe or PayPal account (you connect it)".
- Not done: the orchestrator does not build affiliate packages (kits still not wired, D42/D43).

---

# Dependency ledger
| Package | Version | Why |
|---|---|---|
| remotion, @remotion/cli, @remotion/bundler, @remotion/renderer | 4.0.539 | Rendering engine; bundler/renderer for the Node pipeline (bundle once, many renders) |
| react, react-dom | 19.2.9 | Remotion peer |
| typescript | 5.9.3 | Typecheck only |
| @types/react 19.2.18, @types/node 22.20.5 | — | Types |
Python narration env (`.venv`, `npm run setup:voice`; full hash-locked list in
`scripts/tts/requirements.txt`, 95 packages on Linux): kokoro 0.9.4, misaki[en] 0.9.4
(spaCy 3.8.18 + en_core_web_sm 3.8.0, espeakng-loader 0.2.4 + phonemizer-fork 3.3.2 as the
out-of-dictionary fallback — both GPL-3.0, used as local tools only, nothing of them ships
in a video), torch 2.14.1 CPU, transformers 5.22.1, numpy 2.5.4, soundfile 0.14.0.
Python 3.12.16 via uv (D13).

# Asset ledger
| Asset | Source | Licence |
|---|---|---|
| `public/fonts/Geist-Variable.ttf`, `GeistMono-Variable.ttf` | github.com/google/fonts `ofl/geist`, `ofl/geistmono` | SIL OFL 1.1 (`OFL-Geist*.txt`) |
| `public/fonts/InstrumentSerif-{Regular,Italic}.ttf` | github.com/google/fonts `ofl/instrumentserif` | SIL OFL 1.1 (`OFL-InstrumentSerif.txt`) |
| `public/textures/grain-256.png` | Generated in-repo: `node scripts/make-textures.ts` (seeded, byte-identical) | Original |
| Icons (`src/remotion/ui/icons.tsx`) | Drawn for this project | Original |
| Kokoro-82M weights + voices (not vendored; fetched to `.cache/kokoro/`, pinned + sha256) | huggingface.co/hexgrad/Kokoro-82M rev `f3ff357…` | Apache-2.0 (model card: "can be deployed anywhere from production environments to personal projects") |
| `public/narration/v001-memory/take-01/` (approved, immutable, hash-checked) | Synthesised in-repo with Kokoro (af_bella 60 % + af_nicole 40 %) | Original output; Apache-2.0 model |
| `assets/sound/vcsl/*.wav` (28 samples: Steinway B piano, vibraphone, hand chimes, claves, woodblock; trimmed, 48 kHz) | github.com/sgossner/VCSL @ c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e, per-file git blob SHA-1 in `assets/sound/manifest.json`; `node scripts/sound/fetch-samples.ts` | CC0 1.0 (README: "you can do whatever you want with these sounds (even make commercial software), no royalties, no credit, no special terms") |
| `content/scores/v001-memory.ts` (score), procedural click "thock", reverb impulses | Written in-repo | Original |

## D45 — v009, the second affiliate video; page-scoped package facts (2026-11-18)
**Context.** The owner posted v008 and asked for the next video on a different topic; picked
"One sale, four things happen" (systeme.io, § 7 angle 3) from four options.
**Decision.**
- Story: three jobs after a course sale (send the login, add the buyer to the pipeline, check in
  three days later) done by one workflow. flowRun allows a trigger + 3 steps, so the hook says
  "three more jobs", not four. Step order email → goal → wait (v008: goal → email → wait).
- Opt-in flow step icon `contact` (the existing user-plus glyph) for "Add to the pipeline". A drawn
  pipeline-board icon was tried and dropped: at node size its three outlined columns blurred into
  noise (frame 470 crop). Earlier videos render unchanged (no icon set; test).
- `Fact.pages` (opt-in): a publishing fact scoped to the affiliate pages it belongs to;
  `recordForPage` narrows the record for the package and the verifier. Booking setup facts are
  scoped to `booking-calendar` (v008's package unchanged: test), course setup to `online-courses`.
**Why.** The package must let a human post without researching again: a course video's setup list
  must not carry the paid-booking steps (and the reverse).
**Facts.** docs/affiliate/systeme-io.md § 12. Deep link `online-courses` (judgement: the viewer's job
  is selling a course; the page states the free course limits).
