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
