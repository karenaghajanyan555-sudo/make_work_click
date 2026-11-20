# MAKE WORK CLICK — studio rules

Faceless, premium short vertical videos about AI tools, SaaS, automation and productivity, made
like a motion-design studio. Pipeline: **content spec → Remotion render → automated QA → creative
review → human approval.** One exceptional video beats ten mediocre ones.
These are hard rules: if a request conflicts with one, say so before acting. Detail lives in the
docs named in brackets; read them when the task touches that area, not before.

## Start of a session
- "Continue MAKE WORK CLICK" / resume → skill `mwc-continue` (git check, `docs/SESSION-HANDOFF.md`,
  verify, load only what the next action needs). New video → skill `mwc-video`.
- Fresh clone: `npm run setup`. Before the first pipeline run of a session: `npm run doctor`
  ("Environment ready").
- Never redo or silently change approved work (handoff; full record in `docs/STATUS.md`).

## Hard rules

**Creative (D46, the owner's core principle)** [docs/STORY.md, docs/growth/PLAYBOOK.md, skill `mwc-video`]
- Reuse the engine (rendering, components, type, brand, sound, motion, caching, narration), never the
  creative experience (story structure, opening, metaphor, scene order, pacing, demonstration,
  transitions, ending). Library parts are building blocks; a new topic in an old structure is the same video.
- Every new video starts in its storyboard (`docs/storyboards/<id>.md`): what the subject deserves,
  then three genuinely different directions, the strongest chosen *for the subject*; then map it to
  library parts. A missing capability is a proposed opt-in addition, never a reason to bend the story.
- A full render needs the creative record (`content/creative/<id>.ts`) passing `npm run diversity --
  <id> --stage render` and Gate 2c answered [docs/QA.md]. `--creative-override` only with the owner's
  approval in the session. Stills always work.
- Frame 0 is already happening: never a headline on black, the narration verbatim on screen, floating
  text, a logo intro or a slow lead-in. The ending belongs to the story, not a generic logo screen.
- Records of earlier videos state only what was observed or written then; unknown stays unknown.

**Quality** [docs/QA.md creative checklist]
- Premium or nothing. Forbidden: placeholder visuals, stock-template looks, emoji, clip-art, gradient
  blobs, tilted-device mockups, "AI slideshow", filler motion, karaoke word-by-word captions.
- Every scene earns its place, has one focal point, moves with intent. Inspect real rendered frames
  before presenting anything; if it looks generic, fix it first.

**Brand** [docs/BRAND.md, docs/SOUND.md]
- Only `src/brand/tokens.ts` and the easings in `src/remotion/lib/anim.ts`: no raw colours, font sizes
  or easing curves. Scene geometry in the scene's tested pure layout block. Render through `VideoComposition`.
- Signal lime = "the system did this for you". Coral = only the "before" state.
- One narrator: `NARRATOR` in `src/brand/voice.ts` (Bella × Nicole); change only after an audition + the user's pick.
- Approved takes `public/narration/<id>/take-NN/` are **gold**: immutable, hash-checked; never edit,
  re-synthesise or delete. A better take is a new take-NN with the user's approval; a changed line is a
  new take; reuse (`take: '<video>/take-NN'`) only with an identical script; `final` needs an approved take.

**Engine** [docs/ARCHITECTURE.md — check its catalogue before writing any component]
- Extend an existing primitive or scene type; duplicates are bugs. New behaviour = an opt-in prop, so
  earlier videos render unchanged. No video content in `src/`; a video is a spec in `content/videos/`.
- Time from the voice: lines without `at`, scenes with `say`, beats as `{ line, word }`; hand-typed
  seconds only where no word fits.
- A new scene type only when none can tell the story: model + renderer + registries + catalogue + tests.

**Determinism, assets, performance** [docs/DECISIONS.md ledgers, docs/PLATFORMS.md]
- Nothing non-deterministic at render time (no `Math.random`, `Date`, network, system fonts; seeded
  `random()`). QA re-renders a frame and compares bytes.
- Every asset vendored with its licence and source URL in the asset ledger; commercial use allowed.
  `public/` = files the render loads; `assets/` = pipeline-only inputs (sound samples).
- Dependencies: exact pins, ≥ 2 weeks old, a reason in the dependency ledger, a real need.
- ffmpeg is the Remotion-bundled one (`src/pipeline/ffmpeg.ts`: no select/overlay/tile/drawtext/afade).
- Safe zone `src/brand/format.ts` (14 % top, 35 % bottom, 6 % sides); `useLayout()`, sizes × `u`.
- Render concurrency 2, ~3 GB free RAM; no full-frame heavy effects (large full-screen blurs,
  `backdrop-filter`); measure with `npm run profile -- <label> -- <command>`.

**Verification**
- After every change `npm run check`. Before showing a video `npm run qa -- <id>` PASS, then its sheets
  against docs/QA.md. Never claim something works without running it; report measured numbers.
- Label "verified" vs "my judgement". Platform/vendor facts from docs/PLATFORMS.md or a primary source
  checked now, with the URL.

**Process and ethics** [docs/STORY.md § honesty, docs/QA.md § Gate 3, D42–D46]
- Human approval before anything is published; nothing auto-publishes. Stop at the approval gates.
- No commit or push unless the user asks in this session.
- Real products only through authentic captures (our recordings, demo account, fictional data). Never
  credentials (the owner records logged-in screens), real customer data or personal information on
  screen, in files or logs. Never invent an interface or feature; a simulated UI is unbranded or
  labelled "illustrative". Product claims from vendor docs checked now; captures in the asset ledger;
  capture tooling (scene type `capture`) only when a specific video needs it (D46 phase 2).
  Everything else shown is fictional and unbranded.
- Knowledge videos name no partner. Affiliate videos: only an approved partner (`src/brand/partners.ts`)
  through `spec.affiliate`; its disclosure (end-card "Ad", caption's first line, platform labels) is never
  dropped or hidden; teach first (partner only on the end card + post copy, link only in the bio); partner claims
  only from the claim bank, re-checked live; each ships the Gate 3 publishing package (never "tested"
  without a `npm run verify-affiliate` run).
- Orchestrator changes follow docs/ORCHESTRATOR.md § Rules for changing the orchestrator.

## Context efficiency
- Read only what the task needs; never dump whole files unless asked. Large docs (`STATUS.md`,
  `DECISIONS.md`, storyboards, `docs/affiliate/*`, `docs/research/*`): `grep -n "^## "` first, then
  read only that range. Do not reread a file you just wrote or edited, or one already read this session
  unless it changed.
- Don't repeat or re-explain what the docs already hold; no duplicate docs. Persist decisions where
  they belong (DECISIONS.md, the storyboard, the creative record, STATUS.md log).
- Handoff: `docs/SESSION-HANDOFF.md` (≤ 60 lines, verified, replaced not appended) via skill
  `mwc-handoff`: before ending substantial work, and when the context-watch hook says so (200k soft,
  350k hard: then finish the atomic step, hand off, stop).
- Command output: read the summary or tail; the full output only when something fails. Never hide a failure.
- Images: open each rendered frame once per change; QA sheets first, full frames for what a sheet
  cannot settle. Efficiency never skips a gate, a frame check or a measurement.
- A source recorded with its date is not fetched again unless a rule requires a check now.
- Substantial independent research or audits → one subagent (`mwc-researcher`); no swarms.
- Code navigation: `grep -n` / targeted reads (and the LSP when installed) over reading whole files.

## Reports
Result · Changes · Verification · Remaining issues · Next action — short, factual, no repeated summaries.

## Doc map
| Doc | Read when |
|---|---|
| `docs/SESSION-HANDOFF.md` | Resuming: current state, next action. |
| `docs/STATUS.md` | Full record: milestones, approvals, gates, log (read by section). |
| `docs/ARCHITECTURE.md` | Touching code: layers, catalogue of reusable parts, how to add a scene/theme. |
| `docs/COMMANDS.md` | Every npm command with its arguments. |
| `docs/BRAND.md` | Anything visual: identity, type, colour, light, motion language. |
| `docs/STORY.md` | Scripts, directions, openings, endings, captions, CTA, honesty. |
| `docs/storyboards/<id>.md` | One video's creative work (`_template.md`). |
| `docs/growth/PLAYBOOK.md` | Planning any video; `HOOKS.md`, `LEARNINGS.md`, `COMPETITORS.md`, `AUDIT.md`. |
| `content/creative/<id>.ts` | A video's creative record (D46); read by `npm run diversity`. |
| `docs/SOUND.md` | Narration, music, SFX, levels. |
| `docs/QA.md` | Before presenting any render; Gate 3 for affiliate packages. |
| `docs/PLATFORMS.md` | Delivery specs, safe zones, licences, platform rules (verified, with sources). |
| `docs/ORCHESTRATOR.md` | The production orchestrator: stages, database, Control Center, kits + arcs, its rules. |
| `docs/DECISIONS.md` | Why things are the way they are (D-numbers); dependency + asset ledgers. |
| `docs/affiliate/<partner>.md` | An affiliate video: claim bank, program, tracking, plan facts. |
| `docs/research/ANIMATION-SOURCES.md` | Before building an effect, hand-drawn mark, character or 3D. |
| `docs/optimization/` | Context/token baseline and results; tool decisions. |

Core commands: `npm run check` · `doctor` · `studio` · `new-video -- <id> "Title"` · `voice -- <id>` ·
`render -- <id> --stills 0,60` · `diversity -- <id> [--stage render]` · `make -- <id>` · `qa -- <id>`.
