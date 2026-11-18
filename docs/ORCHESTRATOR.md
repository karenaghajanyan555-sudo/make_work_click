# Production orchestrator — idea in, approved video out

The orchestrator wraps the video engine (docs/ARCHITECTURE.md) in a persistent, resumable
production pipeline. It never re-implements the engine: voice, render, mix, delivery, QA and
the post pack are the existing modules and scripts, called stage by stage.

```
IDEA → RESEARCH → BRIEF → SCRIPT → STORYBOARD → VOICE → ASSETS → SPEC → RENDER → QA → EDITORIAL → APPROVAL → PACKAGE
 score   support    plan    write     scenes      Kokoro   manifest  file    engine  file   story       human      post kit
                                                                                   gate   report
```

## Principles
- **Engine untouched.** Generated videos are ordinary specs (`content/productions/<id>.ts`,
  `defineVideo` + timing lock) registered beside the hand-made ones, so Studio, `make`, QA
  and every cache work unchanged. Render cache keys exclude `content/`: registering videos
  cannot invalidate v001/v002.
- **Deterministic and offline by default.** No paid API is needed: the script writer is
  rule-based (story kits + arcs, below). Network is used only to verify research sources.
- **Every stage is a pure function of a declared input.** The stage's input object is
  hashed; a stage reruns only when that hash changes or its artifacts are missing. A stage
  sees only what it declares, so the hash covers exactly what it uses.
- **Humans decide.** Nothing posts. A failed QA can never be approved. Approval binds to
  the exact upload file (sha256): a re-render needs a new approval.

## Stages
| Stage | Input (hashed) | Output / records | Calls |
|---|---|---|---|
| idea | idea fields, category performance | score, priority, fit (kit, arc) | `scoring.ts` |
| research | topic, category, audience, user sources, kit references, research code | facts (supported / partial / unverified / contradicted, with confidence, the page's words, limitations, retrieval date) + assumptions / illustrative / suggestions + sources | `research.ts` (fetch + quote match + claim-term coverage) |
| brief | idea (incl. title), research summary, kit | brief: angle, arc, preset, harmony, post copy draft | `writer.ts` |
| script | brief **without title/post copy**, claim support, script edits, chosen variants, writer code | hook · problem · explanation · payoff · CTA lines, captions, claim refs | `writer.ts` |
| storyboard | script, kit material, preset/harmony edits | scenes (library types), word-pinned beats, score plan | `storyboard.ts` (arcs) |
| voice | line ids + texts only (`narrationKey`) | draft take (cache) + timing lock | `ensureDraft`, `writeTimingLock` |
| assets | storyboard needs + content hashes of fonts, textures, samples, narration | asset manifest | — |
| spec | storyboard, lines, timing lock, title + post copy | `content/productions/<id>.ts`, validated; pauses auto-fitted | `defineVideo`, `validateSpec` |
| render | segment keys, mix inputs (spec without title/copy/status), delivery settings, assets | upload file + sha256, segments rendered/reused | `scripts/render.ts`, `mix.ts`, `deliver.ts` |
| qa | upload sha256 + QA code | technical QA report (28 checks; must be for this exact file), sheets | `scripts/qa.ts --no-render` |
| editorial | script, storyboard, scene durations, timing, claims, technical QA results, editorial code | structured story report (`out/<id>/qa/editorial.md|json`, `editorial_reports`); never blocks, never approves | `editorial.ts` |
| approval | upload sha256 + QA report | waits for a human decision | dashboard / CLI |
| package | approval, upload, post copy, captions, sources | `out/<id>/package/` | `approve-take` (freeze), `publish-pack` |

### Dependency graph (what re-runs when something changes)
Each stage hashes its declared input; the pure stages also hash their own code (`STAGE_CODE`),
so editing the writer, planner, fitter or research code re-runs exactly the stages that use it.
A downstream stage reruns only if the *output* it reads changed. Measured by
`tests/hardening.test.ts` with the real stage input functions:

| Change | Re-runs | Reused |
|---|---|---|
| nothing | — | all 13 |
| title | idea, brief, spec, package | research, script, storyboard, voice, assets, render, QA, editorial, approval (the file did not change, so the approval holds) |
| a rating | idea | everything else |
| caption only | script, storyboard, spec, render (only segments showing it), QA, editorial, approval | voice, assets |
| a spoken line | script, storyboard, voice, assets, spec, render, QA, editorial, approval | idea, research, brief |
| preset (look) | storyboard, spec, render (every segment), QA, editorial, approval | script, voice |
| one scene's content | that scene's segment (+ a neighbour sharing a hand-off) | the other segments |
| a font, texture, brand token, render code | assets, render (every segment), QA, editorial, approval | voice, spec |
| a sound sample, composer code, score plan | assets/spec, render (mix + delivery only, no segment), QA, editorial, approval | picture segments, voice |
| narrator recipe, TTS model or engine | voice (new take), then everything after it | idea → storyboard |
| research code or kit references | research, then brief/script only if a claim's support changed | everything whose input is unchanged |
| a new upload file (any of the above) | approval asks again | — |

The engine's own caches agree with this (`npm run make` uses the same keys): segments by
scene slice + render code (`RENDER_INPUTS`), the mix by spec + narration + `MIX_INPUTS` (which
cover every sample file, not only the manifest, since Phase 2.5), the take by script +
narrator + model + engine. Over-invalidation that is accepted: `src/brand/voice.ts` lives in
`src/brand`, a render input, so a narrator change also re-renders the picture (it changes
the timing anyway). Not tracked: a source page that changes after research ran (research
is cached per input; `produce rerun <job> --force research` re-fetches).

## Writing without an LLM: kits + arcs
- **Story kit** (`content/kits/<category>.ts`): domain material for one category —
  fictional workspace and people, to-dos, workflow steps, notifications, timeline events,
  line variants with word pins, post copy, assumptions, optional real-source references for
  capability claims. All UI, names and numbers are fictional and marked illustrative.
- **Arc** (`src/orchestrator/storyboard.ts`): choreography rules that turn a script into
  library scenes. `signature` = the v001-v2 look (chaosToSystem → flowRun with follow camera,
  merge field, read receipt, stamp counter, trails → burst outro). `editorial` = the v002
  sequence (hook → problem → product scenes → payoff → outro).
- The writer picks line variants (seeded by idea id), uses the idea's own hook line when it
  fits (≤ 10 words), and never states a fact research did not find directly supported:
  a line citing a partial, unverified or contradicted claim pauses the job for script review.

## Research support levels
Each cited claim is checked against the page it cites (fetched once per research input):
| Level | Rule |
|---|---|
| supported | the exact quote is on the page **and** the passage around it (± 300 characters) contains ≥ 60 % of the claim's key terms, with no negation in the quote's sentence |
| partial | the quote is on the page but covers too few of the claim's terms, or only similar wording is on the page (≥ 70 % of the quote's words in one sentence) |
| unverified | the page could not be retrieved, no quote was given, or nothing like it is there |
| contradicted | the quote is on the page, but its sentence negates it ("not", "no longer", "deprecated", …) |

Confidence describes the evidence, not the truth: high = exact quote and ≥ 85 % of the claim's
terms; medium = exact quote and 60–85 %; low = partial or contradicted; none = unverified.
Every claim stores the claim text, URL, the page's own words, retrieval date, quote match,
term coverage and its limitations (always including "word-overlap check, not a reading").
Numbers must match exactly. The Research tab lists uncertain claims first; the script review
is where a person reads them. Assumptions, illustrative details and creative suggestions are
stored as their own kinds, never as facts.

## Editorial QA (separate from technical QA)
Technical QA (`src/pipeline/qa.ts`) asks "is the file correct?". Editorial QA
(`src/orchestrator/editorial.ts`) asks "is the story clear, honest and on brand?" and writes a
structured report: hook (length, time to say it, names the viewer's friction), clarity (line
length, Flesch reading ease, words per second), progression (section order), repetition
(content words in 3+ lines, same opener, same scene type twice in a row), pacing (total,
scene lengths, the technical motion measure), variety (scene types), claims (cited claims
supported, contradictions, figures without a source), CTA (one, last, the studio line, end
card), brand (narrator, preset, disclosure, every line on a scene). Each item is ok / look /
problem with the measured value and the rule. The verdict is always "needs your review": it
never approves and never blocks.
- Limit: only categories with a kit can be produced automatically. A writer provider
  interface (`WriterProvider`) is where an optional LLM writer would plug in later.

## Persistence (SQLite, `data/studio.db`, built-in `node:sqlite`, D4/D29)
| Table | One row per | Key columns |
|---|---|---|
| `ideas` | idea | title, topic, audience, category (= kit), hook, value_note, 1–5 ratings, score, priority, priority_override, research_status, status, origin |
| `idea_sources` | source the owner attached | url, claim, quote |
| `jobs` | production of one idea | video_id, status, options (reviewScript, failOnce), current_stage, error, notes, runner_pid, cancel_requested, timestamps |
| `stage_runs` | stage execution (incl. reuse) | stage, attempt, status, input_hash, output_hash, output (JSON), error, log_path, child_pid, started_at, finished_at, seconds |
| `research`, `sources`, `claims` | research pass, fetched page, claim | provider, status, summary · url, title, fetched_at, http_status, content_sha256 · kind, status (= support for facts), quote, evidence (the page's words), confidence, quote_match, coverage, limitations, retrieved_at, required |
| `briefs`, `scripts`, `storyboards`, `asset_manifests` | produced version | input_hash, data (JSON) |
| `renders` | engine build | upload_path, upload_sha256, bytes, video_seconds, segments_rendered/total, build_seconds |
| `qa_reports` | technical QA run | upload_sha256, pass, checks_total/failed, report_path, data |
| `editorial_reports` | editorial QA run | upload_sha256, problems, attention, data |
| `approvals` | human decision | target (script/video), target_hash, decision (approved/revise/rejected), notes |
| `edits` | human edit | target (script/storyboard), data |
| `packages` | publishing package | approval_id, dir, manifest |
| `publications`, `metrics` | post made by hand, metric snapshot | platform, platform_video_id, url, published_at, hook, category, arc, preset · views, avg_watch_seconds, retention, completion_rate, saves, shares, comments, profile_visits, link_clicks, affiliate_conversions |
| `events` | state change / decision | job_id, kind, message |
| `runner` | the one active runner | pid, heartbeat_at, label |

Integrity (schema 2): every job record has a foreign key to its job (packages to their
approval); the database allows one active job per idea (`jobs_one_active_per_idea`);
approvals only take known targets and decisions. Multi-row writes (an idea with its sources,
a research pass with its sources and claims, a decision with its status change, a job start
with its "one active job" check) are single transactions (`tx()`, `BEGIN IMMEDIATE`).
Migrations run in a transaction after an automatic backup, and a database newer than the code
is refused.

### Backup and restore
```bash
npm run db -- backup            # verified online copy → data/backups/studio-<time>-manual.db
npm run db -- list              # newest first
npm run db -- check             # integrity, foreign keys, schema version, row counts
npm run db -- restore <file>    # stop the Control Center first; the current db is kept as …-before-restore.db
```
The Control Center backs up on every start (newest 14 `-auto` kept). Backups use SQLite's
backup API (consistent while the Control Center runs) and are opened and checked before they
count. Tests never touch `data/studio.db` (`openDb` refuses it under `node --test`);
`MWC_DB=<file>` points every command at another database.

Job states: `queued → running → {awaiting_review, awaiting_approval, failed, interrupted,
cancelled, revision, rejected, done}`; waiting and stopped states return through `queued`.
Every edge is checked (`JOB_TRANSITIONS`, `canTransition`). Stage runs end `succeeded`,
`reused`, `failed`, `interrupted`, `cancelled` or `waiting`.

## Workflow
1. **Add an idea** (dashboard "Add idea", or `npm run produce -- idea add …`), or
   **Discover** the kits' seed ideas. Ideas are scored (`scoring.ts`); pin a priority to
   override.
2. **Start production.** The runner works stage by stage: idea → research (fetch + quote
   check) → brief → script → storyboard → [optional script review] → voice (Kokoro draft,
   cached by script) → assets → spec (fitted, written to `content/productions/`) → render
   (engine: changed segments only, mix, delivery) → QA (24 checks + sheets).
3. **Review** on the Control Center's home page (http://127.0.0.1:4318, D39): each video
   waiting for you with its checks and narration; approve, request changes or reject. Scripts
   waiting for review are listed there too (a script repeating another job's is flagged).
   Everything else (ideas, stages, logs, QA sheets, script/storyboard edits, research,
   metrics) is on **Production details** (`/details`): request a revision there by editing
   lines/captions/pauses or the preset, then "Re-run with edits".
4. **Approval** freezes the narration take and builds `out/<id>/package/`: the MP4, cover,
   post sheet, per-platform copy (`platforms.md/json`), captions (`.srt`, `.vtt`), sources
   and claims, metadata, a manifest with sha256s. Upload by hand.
5. After posting, **record the publication and metrics** (Metrics tab / CLI). Category
   completion rates start influencing idea scores at ≥ 3 measured posts per category.

Failures: the error names the stage and includes its log tail, also when the stage could not
even read its input; **Retry** (on the job or the failed stage's row) re-queues it and
completed stages are reused. **Cancel** stops the current engine step (or cancels at once if
the job's runner is gone). Ctrl-C (CLI) or stopping the Control Center interrupts cleanly.
**Run** on a stage reruns only that stage. `--fail-once <stage>` (CLI) makes a stage fail
once, to exercise retry.

### Crashes, restarts, two runners
- **One runner at a time.** The runner lease (`runner` row) counts only while its process is
  alive *and* it heartbeats every 10 s (also during a render); a lease silent for 60 s is
  free. A runner that loses its lease interrupts its current stage. A CLI `run` while the
  Control Center runs queues the job there instead; `stage`/`rerun --force` refuse.
- **Recovery.** When a runner takes the lease, and on every idle tick of the Control Center,
  every job/run still marked `running` that no live runner owns becomes `interrupted`, and
  its orphaned engine process (cwd = this repo, a `scripts/*.ts` command) is killed. A pid
  alone proves nothing after a reboot (pids are reused); the heartbeat does. Resume
  continues from the interrupted stage.
- **Partial outputs.** Every engine output is written beside its target and renamed into
  place when complete: scene segments (`.part.mp4`), the master, the mix, the upload, the
  timing lock, the draft listening copy, the generated spec, the frozen take
  (`take-NN.part/` → `take-NN/` after every file is copied and verified), the package
  (`package.part/` swapped in; a package of an earlier approval is moved to
  `packages/approval-<id>/`, never deleted). A reused output is checked first: the upload,
  spec and package by sha256, a frozen take against its `approved.json`.
- **Package files are copies**, never hard links: a later build rewrites
  `out/<id>/<id>.mp4`, the package keeps the approved bytes. Retrying a package reuses its
  row and its frozen take (no duplicates).
- **Approval re-checks** that the file on disk is still the QA-passed file (sha256) at the
  moment of the decision.
- Tested: SIGKILL of the runner during each of the 13 stages (child process) → restart →
  finished stages reused, the killed stage reruns once, database intact; and end to end in a
  throwaway copy (`npm run test:e2e`): kill -9 mid-render, orphaned render stopped, finished
  segments reused, approve, package, re-delivery after packaging, package retry, backup and
  restore.

## Acceptance plan
Add idea (CLI + dashboard API) → start → run to a rendered video → inspect persisted
research/script/storyboard/QA → approve → package; interrupt during render and resume
(finished segments reused); injected failure (`--fail-once <stage>`) then retry; rerun
the job (everything reused); two different videos from two ideas; all tests green; v001-v2
and v002 rebuild fully cached (no regression).

## Known limits
- **Writing is kit-bound.** Only categories with a story kit can be produced; two ideas in
  one kit share most visuals (line variants, the idea's own hook and the preset differ).
  The owner's sources are verified and shown, but the kit writer does not put them into
  narration yet.
- **Support is lexical** (D32, D35): the exact quote on the page plus word overlap with the
  claim. It cannot tell a page that mentions something from one that asserts it; the script
  review is the human check. Pages that render their text with JavaScript come back
  unverified. A page that changes after research ran is not noticed until research re-runs.
- **Editorial QA measures proxies** (word counts, reading ease, section order, repetition,
  durations): it cannot judge whether a hook is good, only whether it breaks a rule.
- **Headline fit is a character budget** (3 lines × 16), not a measured text width.
- **One machine, one runner.** Jobs run strictly one at a time; a long render blocks the
  queue. The Control Center has no login: it binds to 127.0.0.1 only.
- **Analytics is manual entry.** Scoring uses completion rate per category once ≥ 3 posts
  per category (≥ 5 overall) have metrics; hooks/arc/preset are stored per post for later.
- The first frame of a fresh browser session can differ by ≤ 2 levels (ARCHITECTURE.md
  § Known limits); QA's determinism check uses a mid-video frame.

## Next improvements (recommended)
1. An optional model-based `WriterProvider` (local model, or the owner's Claude Code in
   headless mode) that drafts kit material for new categories; the human script review
   stays on for its output.
2. More kits (follow-ups, meetings, reviews, scheduling) and a third arc built on the
   dashboard/data scenes.
3. Measured headline width (render the line once in the bundle) instead of a character
   budget.
4. A metrics importer per platform (CSV exports first), then hook-level comparisons in the
   scoring once enough posts exist.
