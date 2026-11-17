# MAKE WORK CLICK — studio rules

A faceless, premium media brand: short vertical videos about AI tools, SaaS, automation
and productivity, made like a motion-design studio would make them. Pipeline:
**content spec → Remotion render → automated QA → creative review → human approval.**
One exceptional video beats ten mediocre ones.

These rules are hard rules. If a request conflicts with one, say so before acting.

## Start of every session

1. Fresh clone: `npm run setup`. Otherwise: `npm run doctor` (must print "Environment ready").
2. Read `docs/STATUS.md` — current milestone, what the user has approved, the next step.
   Never redo or silently change approved work.
3. Read the doc for the area you will touch (map below) before writing code.

## Hard rules

### Quality bar
- Premium or nothing. Forbidden: placeholder visuals, stock-template looks, emoji,
  clip-art, gradient blobs, tilted-device-mockup clichés, "AI slideshow" (static images
  with text), filler motion, karaoke word-by-word captions.
- Every scene earns its place in the story, has one focal point, and moves with intent.
- Inspect real rendered frames before presenting anything. If it looks generic, fix it
  first. Be your own harshest reviewer (`docs/QA.md` creative checklist).

### Brand system
- Use only `src/brand/tokens.ts` (colour, type roles, radii, durations) and the easings in
  `src/remotion/lib/anim.ts`. No raw colours, font sizes or easing curves in scenes or
  components. Scene geometry lives in the scene's pure layout block (tested).
- Signal lime means one thing: "the system did this for you". Coral only marks the
  "before" state (overdue, forgotten). Rules: `docs/BRAND.md`.
- Brand content always renders through `VideoComposition` (theme, spec frame, grain).
- One narrator for every video: `NARRATOR` in `src/brand/voice.ts` (Bella × Nicole, chosen
  by the user). Never change it without a new audition and the user's pick.
- Approved takes are **gold**: `public/narration/<id>/take-NN/` is immutable and hash-checked
  by the tests. Never edit, re-synthesise or delete one. A better take is a new take-NN
  beside it (`npm run voices`, then `npm run approve-take`), and only with the user's approval.
  Changing a spoken line means a new take. Another video may reuse an approved take
  (`take: '<video>/take-NN'`) only with an identical script. Draft takes (cache) are for
  review; a `final` video needs an approved one.

### Reuse before create (the engine)
- Before writing a component, check the catalogue in `docs/ARCHITECTURE.md`. Extend an
  existing primitive or scene type instead of duplicating it. Duplicates are bugs.
- A new video is a new spec in `content/videos/` (`npm run new-video`), built from library
  scenes, a visual preset and the shared brand, captions, hand-offs, sound and outro. Never
  hardcode video content in `src/`; new behaviour goes in as an opt-in prop of a library
  scene so earlier videos render unchanged.
- Time from the voice: write lines without `at`, scenes with `say`, beats as spoken words
  (`{ line, word }`). Hand-typed seconds only where no word fits.
- A new scene type only when no existing type can tell the story: pure model in
  `src/video/scenes/`, renderer in `src/remotion/scenes/`, registry entry, catalogue entry,
  tests. Same for primitives: add to the catalogue.

### Determinism and portability
- Nothing non-deterministic at render time: no `Math.random`, `Date`, network, system
  fonts. Use Remotion's seeded `random()`. QA re-renders a frame and compares bytes.
- Every asset is vendored with its licence and logged in the asset ledger
  (`docs/DECISIONS.md`): `public/` for files the render loads, `assets/` for pipeline-only
  inputs (sound samples). Commercial use must be allowed; record the source URL.
- Dependencies: exact pins (`.npmrc save-exact`), versions at least two weeks old, a
  reason in `docs/DECISIONS.md`. No new dependency without a real need.
- Media tooling uses the ffmpeg bundled with Remotion (`src/pipeline/ffmpeg.ts`), not a
  system ffmpeg. It lacks select/overlay/tile/drawtext/afade — read that file's header.

### Layout
- Critical text and UI sit inside the safe zone (`src/brand/format.ts`: 14% top, 35%
  bottom, 6% sides). Use `useLayout()`; sizes are base units × `u`.

### Verification
- After every change: `npm run check` (typecheck + tests).
- Before showing a video: `npm run qa -- <id>` must PASS, then review the sheets it writes
  against the creative checklist in `docs/QA.md`.
- Never claim something works without running it. Report measured numbers.
- Separate "verified" from "my judgement". Platform/vendor facts come from
  `docs/PLATFORMS.md` or a primary source checked now, with the URL.

### Performance
- Render concurrency 2 (measured best on the reference machine). Expect ~3 GB free RAM.
  Avoid full-frame heavy effects (large blurs on full-screen layers, `backdrop-filter`).
  Measure with `npm run profile -- <label> -- <command>`.

### Process and ethics
- Human approval before anything is published. Nothing auto-publishes.
- Do not commit or push unless the user asks in this session.
- Stop at the approval gates in `docs/STATUS.md`; show real rendered results.
- No fake demos of real products, no affiliate links, no real brand names or logos in
  product UI. Businesses, people and apps shown are fictional and unbranded.
- End every working session by updating `docs/STATUS.md`.

## Doc map

| Doc | Read when |
|---|---|
| `docs/STATUS.md` | Always, first. Milestones, approvals, next steps. |
| `docs/ARCHITECTURE.md` | Touching code. Layers, catalogue of reusable parts, how to add a video/scene/theme. |
| `docs/BRAND.md` | Anything visual. Identity, signature, type, colour, light, motion language. |
| `docs/STORY.md` | Scripts, scene order, captions, CTA. |
| `docs/storyboards/<id>.md` | The approved (or proposed) beat plan for one video. |
| `docs/SOUND.md` | Narration, music, SFX, levels. |
| `docs/QA.md` | Before presenting any render. |
| `docs/PLATFORMS.md` | Delivery specs, safe zones, licences (verified, with sources). |
| `docs/DECISIONS.md` | Why things are the way they are; dependency + asset ledger. |

## Making a video (the engine workflow)

1. `npm run new-video -- v003-slug "Title"` → spec template + placeholder timing lock,
   registered in `content/index.ts`.
2. Write the brief, the script (narration lines, ≤ 7-word caption phrases, `|` to split)
   and the scenes from the library (`docs/ARCHITECTURE.md` catalogue); pick a preset and a
   composer plan (`audio.compose`). Storyboard in `npm run studio` (timing is estimated).
3. `npm run voice -- <id>` → draft take with the narrator (cached by script) + timing lock
   `content/timing/<id>.ts`. Listen: `out/<id>/voice/draft.m4a`. Tune `pause`s, pin beats
   to words, re-run (instant when the script is unchanged).
4. `npm run render -- <id> --stills …` and review real frames; iterate.
5. `npm run make -- <id>` → render (only changed scene segments), mix, deliver, QA.
   Review the QA sheets and listen; fix and re-run (unchanged steps are skipped).
6. With the user: approve the take (`npm run approve-take -- <id> draft`, set
   `narration.take`, `npm run voice`), add `publish` copy, `npm run publish-pack -- <id>`.

## Commands

```bash
npm run setup                         # fresh clone: install, fetch Chrome, verify
npm run setup:voice                   # narration engine (Kokoro, uv + Python 3.12; optional)
npm run doctor [-- --render]          # environment check
npm run check                         # typecheck + unit tests
npm run studio                        # Remotion Studio (interactive preview)
npm run new-video -- <id> "Title"     # start a video from the engine template
npm run voice -- <id>                 # take (approved or cached draft) → timing lock
npm run make -- <id> [--force]        # voice → render → mix → deliver → QA, skipping what is unchanged
npm run build -- <id>                 # = make --no-qa
npm run render -- <id>                # picture master from cached scene segments
npm run render -- <id> --stills 0,60  # stills (add --debug for safe-zone overlay)
npm run mix -- <id>                   # final audio → public/generated/<id>/mix.wav + out/<id>/mix/
npm run deliver -- <id>               # master + mix → upload file
npm run qa -- <id> [--no-render]      # QA gate (builds first unless --no-render) → out/<id>/qa/
npm run publish-pack -- <id>          # cover + post sheet → out/<id>/publish/ (posts nothing)
npm run voices -- <id>                # narrator audition → out/<id>/voices/
npm run approve-take -- <id> <label>  # freeze an audition take (or `draft`) → public/narration/<id>/take-NN/
npm run profile -- <label> -- <cmd>   # wall time + peak memory of any command (Linux)
```
