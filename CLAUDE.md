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
- No fake demos of real products, no real brand names or logos in product UI. Businesses,
  people and apps shown are fictional and unbranded.
- Most videos are knowledge videos: no partner, no link, no change. Affiliate videos (the
  owner's decision, 2026-11-17, D42) promote only an approved partner (`src/brand/partners.ts`)
  and only through `spec.affiliate`, which adds the disclosure (end-card "Ad" tag, caption's
  first line, platform settings on the post sheet). Never drop or hide it: the TikTok toggle,
  Instagram's paid partnership label and an in-video disclosure are required (FTC, platform
  policies: `docs/PLATFORMS.md`). Teach first: the video must be worth watching without the
  end card; the partner appears only there (and in the post copy); the link only in the bio.
  Claims about a partner only from its research doc's claim bank, re-checked on the live page.
- Every affiliate video ships a **publishing package** (docs/QA.md § Gate 3, owner's rule
  2026-11-18): claims re-verified against official pages, the affiliate URL tested with the ID
  kept, one tracking link per platform (documented parameters only), commission + payout terms,
  current Instagram/TikTok commercial and AI disclosure rules, free-plan limits + payment
  requirements, illustrative vs real interfaces, per-platform captions and bio, an analytics
  checklist. Every line is labelled Verified / Confirm in your account / Needs configuration /
  Unverified. Never write that a URL, tracking, setting or integration was tested unless a run
  tested it (`npm run verify-affiliate` records it). A human must be able to post from it
  without researching anything again.
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
| `docs/ORCHESTRATOR.md` | The production orchestrator: stages, database, Control Center, kits + arcs. |
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
   `narration.take`, `npm run voice`), add `publish` copy, `npm run publish-pack -- <id>`
   (affiliate videos: `npm run verify-affiliate -- <id>` first; the pack refuses without it).

## Producing from an idea (the orchestrator)

`npm run control` → http://127.0.0.1:4318: add an idea, Start production, review, approve.
The runner calls the engine stage by stage (docs/ORCHESTRATOR.md) and stops at the human
gates; nothing posts. Rules:
- The orchestrator never re-implements the engine. New production behaviour is a stage or
  a stage input; new visual behaviour is still an opt-in prop of a library scene.
- A stage reads only what its `input()` returns (it is hashed). Adding a read anywhere else
  breaks reuse: add it to the input.
- Stories come from **story kits** (`content/kits/`) and **arcs** (`src/orchestrator/
  storyboard.ts`). A new category = a new kit (fictional world, line variants with word
  pins, scene material, post copy, assumptions, references with exact quotes) + its tests.
  Never put a fact in a kit line unless it cites a reference research can verify.
- `content/productions/` and its timing locks are generated: change the idea, script or
  storyboard in the Control Center and re-run; never edit the file.
- Approval binds to the upload file's sha256; a failed QA can never be approved. Editorial
  QA informs, it never approves or blocks.
- A fact is stated only if research found it **supported** (exact quote + the claim's terms
  in the passage); partial / unverified / contradicted pause for script review. Word a kit
  claim to what its source actually says.
- Every output is written beside its target and renamed into place when complete; approved
  outputs are copies, never hard links; earlier approved packages are archived, not deleted.
- Tests use `:memory:` or temp databases (openDb refuses `data/studio.db` under node --test);
  `npm run test:e2e` runs the whole pipeline in a throwaway copy of the repo.

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
npm run verify-affiliate -- <id>      # affiliate videos, before publish-pack: claims, facts, link tests → verification.json
npm run voices -- <id>                # narrator audition → out/<id>/voices/
npm run approve-take -- <id> <label>  # freeze an audition take (or `draft`) → public/narration/<id>/take-NN/
npm run profile -- <label> -- <cmd>   # wall time + peak memory of any command (Linux)
npm run control [-- --port 4318]      # Production Control Center (dashboard + runner)
npm run produce -- idea add|list|discover|set …   # idea registry
npm run produce -- start <ideaId> [--run] [--review-script] [--fail-once <stage>]
npm run produce -- run [<jobId>] | status [<jobId>] | resume|retry|rerun|cancel <jobId>
npm run produce -- stage <jobId> <stage> [--force]  # one stage, upstream outputs kept
npm run produce -- approve|revise|reject <jobId> [--notes N] [--script]
npm run produce -- edit-line <jobId> <lineId> --text T [--caption C] [--pause S]
npm run produce -- batch <ideaId>… [--run] | publish <jobId> … | metrics <pubId> … | insights
npm run db -- backup [file] | list | check | restore <file>   # production database (restore: stop the Control Center first)
npm run test:e2e [-- --keep]          # full pipeline in a throwaway repo copy (~10 min, one real render)
```
