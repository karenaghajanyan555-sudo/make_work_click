# Sound

Status: **implemented** — narrator Bella × Nicole (D18, take-01 frozen), original score,
cue-driven effects, mastered mix, delivery encode (D19–D21). Built by `npm run mix -- <id>`
(or `npm run build`); report and stems in `out/<id>/mix/`.

## Narrator
- One narrator identity across all videos: **Bella × Nicole** (af_bella 60 % + af_nicole
  40 %, speed 1.0, seed 7) — warm, smooth, intimate, American English (D17, D18).
- Approved takes are gold: `npm run approve-take -- <id> <label>` freezes the exact audition
  take into `public/narration/<id>/take-NN/` with sha256s; tests fail on any change or on
  script drift. A better take is a new take-NN beside it; old takes are never edited.
  Defined once in `src/brand/voice.ts` (`NARRATOR`). Record a change in `docs/DECISIONS.md`;
  never change it silently.
- Engine: Kokoro-82M (local, Apache-2.0 weights). Setup: `npm run setup:voice`
  (`scripts/tts/setup.sh`: uv-managed Python 3.12.16, hash-locked packages, model files at a
  pinned revision, sha256-checked, self-test).
- The whole script is synthesised as **one utterance** (natural sentence-to-sentence
  prosody; Kokoro is weakest on very short inputs), then cut into lines in the pauses using
  Kokoro's word timestamps. Word timings are kept for caption sync.
- Seeded (Kokoro's decoder draws noise). Reproducible on one machine; approved takes are
  committed as assets so other machines never re-synthesise a different take.
- Auditions: `npm run voices -- <id>` → every candidate in `NARRATOR_CANDIDATES` reads the
  video's narration at the planned times, level-matched, with a report (pitch, rate,
  loudness). Pitch/rate are measurements; warmth/naturalness are judged by ear.
- Kokoro outputs 24 kHz mono; the mix is 48 kHz stereo.

## Voice bus (`VOICE_CHAIN`, src/pipeline/audio.ts)
High-pass 70 Hz → compressor (threshold 10 dB above the voice's loudness, 2.5:1, 6 dB knee,
4/120 ms) → gain to target → look-ahead limiter (−2 dBFS sample peak, 1.5/60 ms).
Measured on the v001 audition: crest factor 19–21 dB → 15.5–16.5 dB (moderate, not
squashed); loudness within 0.15 LU of target; true peak ≤ −1.79 dBTP after AAC.
In the final mix the voice bus stops after the compressor and gain (no voice limiter): the
master limiter catches the peaks of the whole mix at once.

## Music
- Original or licensed for commercial use with the licence vendored and logged in the
  asset ledger. No "free" track without a licence we can show.
- How it's built: an original score written as data (`content/scores/<id>.ts`,
  `ScoreSpec`: notes on cues or on bars/beats from an anchor cue) played by a sampler over
  real recordings — VCSL, CC0 (Steinway B piano, soft-mallet vibraphone, hand chimes;
  28 samples, 20 MB in `assets/sound/vcsl/`, fetched by `scripts/sound/fetch-samples.ts`
  from a pinned commit and checked by git blob hash). Slight humanising (seeded timing and
  velocity), chords rolled low → high, panned by register, then a procedural room reverb
  (FFT convolution, seeded impulse, RT60 2.2 s).
- v001: D major, 96 BPM, anchored on the hook's click. Low fifth + a falling line under the
  hook; D(add9) on the click; broken-chord pulse D – A/C♯ – Bm7 – Gmaj7 while the system
  runs; vibes lift when the customer returns; held chord at the pull-back; final chord on
  the end-card click; fades out 19.9 → 21.0 s.
- Supports, never competes: sparse, no vocals, ducks 6 dB under narration.
- **Composed scores (engine, D28):** a video can skip writing notes: `audio.compose` names a
  harmony (`clarity` = the v001 palette; `focus` = A minor → C, 90 BPM, cooler) and sections
  on cues — `intro` (low fifth + falling line), `pulse` (broken chords, one chord per bar),
  `lift` (pulse + vibraphone figure), `hold` (the pulse stops on a held chord), `home`
  (the final chord on the end click). Bar 1 lands on `anchor`. v002 uses it: intro under the
  hook, the pulse arrives with the system's summary, lift at the chart peak, hold under the
  payoff, home on the click.

## Sound effects
- Few and meaningful, each tied to a cue point — no decorative swooshes. The map lives in
  `sfxEvents()` (src/sound/score.ts) per scene type, so new videos get it for free:
  | Effect | Cue | Sound (level in `src/pipeline/sound/mix.ts`) |
  |---|---|---|
  | `flip` | each to-do flipping into a step | soft claves, −23 dB, pitch varied per card (0/+2/−1/+3 st) |
  | `click` | the brand switch (hook, end card) | claves −12 dB + a short procedural "thock" (155 → 72 Hz) + snap — the signature sound |
  | `sent` | email sent, follow-up sent | hand chime (D5 −13 dB, F♯5 −5 dB) |
  | `day` | schedule playhead lands on a day | soft woodblock −20.5 dB, 3 semitones down |
  | `check` | each to-do checked off | claves −21 dB, rising +5/+7/+9/+12 semitones |
  | `notify` | a notification lands | vibraphone A4 −22 dB; a system notice: C5 → E5 (−15/−18 dB) |
  | `tick` | an item lands, a value peaks | soft woodblock −24 dB, rising per item; the chart peak: claves +7 st −20 dB |
  | `open` | a detail opens | woodblock −23 dB, 5 st down |
  | `swell` | into a click or payoff | the D5 hand chime reversed, 0.9 s, rising envelope, ending exactly on its cue |
- Each scene type declares its sounds (`SceneModel.sounds`); a spec can add more on any cue
  (`scene.sounds`, e.g. v001-v2's swell into the end click). One library builds them all:
  `src/pipeline/sound/sfx.ts`.
- v001 has 15 effects in 21 s. Short shared reverb (RT60 0.9 s) puts them in one room.

## Levels (project targets — our decision, not a platform fact)
- Final mix: −14 LUFS integrated, true peak ≤ −1 dBTP, 48 kHz stereo AAC.
- Narration dominant; music bed sits well under it while narration plays; SFX felt more
  than heard except the click.
- Bus targets (`MIX`): voice −16 LUFS, music −25 LUFS before ducking (threshold −42 dB,
  depth 6 dB, 70/420 ms), master sample-peak ceiling −1.5 dBFS, loudness iterated to ±0.1 LU.
- Measured, v001 (stems before the master stage): voice −16.0 LUFS, music −29.7 LUFS
  (after ducking), sfx −27.4 LUFS; master −14.0 LUFS, LRA 2.4 LU. Upload file after AAC:
  −14.06 LUFS, −1.46 dBTP, audio/video sync 0.00 ms.
- History: the first mix had music at −35 LUFS (~20 dB under the voice, too quiet) and
  the sent chimes masked (peaks −24 and −33 dBFS); raised to the values above.
- Platform loudness normalisation values are NOT verified yet — verify against primary
  sources before quoting them.

## Implementation notes
- Bundled ffmpeg has `amix`, `adelay`, `volume`, `loudnorm`, `atrim`, `aresample`, `pan`
  and the libfdk_aac encoder, but no `afade`, `sidechaincompress`, `alimiter`, `ebur128` or
  soxr: envelopes, dynamics and ducking run in Node (`src/pipeline/dsp.ts`); ffmpeg does
  resampling, loudness measurement and AAC encoding.
- Its mono→stereo upmix (`-ac 2`) applies −3 dB per channel; convert with
  `monoToStereo()` instead. No ipod muxer: write `.m4a` with `-f mp4`.
- QA measures loudness and true peak on the upload file, and audio/video sync by
  cross-correlating the upload's audio with the mix at the first click (docs/QA.md).
- AAC priming: libfdk_aac decodes 2048 samples late and we ship without edit lists, so
  `deliver()` advances the mix by 2048 samples (D21).
