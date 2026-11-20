---
name: mwc-video
description: Plan and produce a new MAKE WORK CLICK video (Instagram Reel) the studio way — research, three genuinely different creative directions, the comparison with the last five videos, hooks, storyboard, creative review, then production on the existing engine. Use for any request to make, plan, pitch or storyboard a new video or reel, or to pick the next topic.
when_to_use: "make a new video", "next video", "a reel about …", "video idea", "storyboard", "creative concepts", "plan v010", "what should we post next"
argument-hint: "[topic or video id]"
---

# New MAKE WORK CLICK video

Principle (CLAUDE.md, D46): **reuse the engine, not the creative experience.** Library scenes,
presets and the brand are building blocks; the story, opening, metaphor, demonstration, pacing
and ending are decided for this subject. A new topic in an old structure is the same video.

Read first: `docs/STATUS.md` (approvals, what is posted), `docs/growth/PLAYBOOK.md` (§ 1 platform
facts, § 6 creative directions, § 7 scoring, § 9 engagement review, § 10 workflow),
`docs/growth/LEARNINGS.md` (what real audiences did), `docs/growth/HOOKS.md`, `docs/STORY.md`,
`docs/QA.md` § Gate 2c. Write for the owner: short, verdict first, facts labelled verified vs
judgement.

## Stage A — concept (stop for approval at the end)
1. **Subject.** Who, which pain or desire, why now. Score 2–3 candidate topics (PLAYBOOK § 7) if
   the topic is open. Every fact the video will state: primary source, exact quote, URL, date
   (fetch it now; never from memory). Real products: vendor docs only.
2. **What the subject deserves.** One paragraph *before* opening the scene catalogue: the most
   vivid, truthful way to make a stranger feel it; the one image they should remember.
3. **Scaffold.** Next free id (check `content/videos`, `content/productions`, `out/`, orchestrator
   jobs). `npm run new-video -- vNNN-slug "Title"` → `docs/storyboards/<id>.md`,
   `content/creative/<id>.ts`, placeholder spec. Do not keep anything from the placeholder spec.
4. **Three directions** (storyboard § 3), genuinely different: each pair differs in ≥ 2 of
   opening, structure, visual metaphor, demonstration (kinds: `VOCABULARY` in
   `src/creative/diversity.ts`; add a kind for a truly new idea). Score subject fit, hook
   strength, demonstration, feasibility (1–5). **Choose the strongest for the subject** among
   those that pass — not the most different, not the easiest to build. Say why the others lost.
5. **Record + check.** Fill `content/creative/<id>.ts` (basis `planned`; directions with scores,
   suitability, rejectedBecause; a `plan` with the intended scene types/preset/transitions/
   harmony/length). `npm run diversity -- <id>` → paste the table into storyboard § 4. FAIL →
   redesign the concept (not the wording).
6. **Hooks.** Ten from ≥ 5 HOOKS.md categories, scored (context, gap, specific, stakes, visual;
   truth gate); top three with their opening visual; the chosen one.
7. **Opening, second by second** (0–3 s): something already happening at frame 0; on-screen
   words designed for the picture, not the narration verbatim.
8. **Scenes.** Per-scene sheet (purpose, narration, on-screen text, visual concept, motion, sound,
   transition, duration, why keep watching, engine mapping). Missing capability → an opt-in
   addition with its cost (code touched, which caches it invalidates); never bend the story.
9. **Gate 2c answers + hypothesis** in the storyboard and the record; `npm run diversity -- <id>`
   again.
10. **Stop.** Present to the owner: the three directions (one line each + scores), the chosen one
    and why, the diversity table, the top hooks, the opening, the scene list, required new
    capabilities, open risks. Do not write the spec, synthesise a voice or render before approval.

## Stage B — production (after approval)
0. Record the approval in `content/creative/<id>.ts`: `approved: { date, note }` (the owner's
   words), set the storyboard status line.
1. Spec from the chosen concept (§ Engine steps below; time from the voice; opt-in props
   so earlier videos render unchanged). New capabilities: ARCHITECTURE.md "How to add a scene
   type", tests, catalogue.
2. `npm run voice -- <id>` → listen → tune. `npm run render -- <id> --stills …` → look at real
   frames; iterate.
3. `npm run diversity -- <id> --stage render` must PASS (the render gate refuses otherwise; the
   `--creative-override` is only for an exception the owner approves in the session).
4. `npm run make -- <id>`; Gates 1, 2 and 2c on the sheets and full-resolution stills; fix and
   re-run while a meaningful improvement exists. `npm run check` after every code change.
5. Present real frames + measured numbers. On approval: take, publish copy, package
   (affiliate: verify-affiliate first; Instagram affiliate posts need the paid partnership label
   — PLAYBOOK § 8a). Copy the hypothesis and creative kinds into LEARNINGS.md.

## Engine steps (reference; moved from CLAUDE.md, 2026-11-18)
1. `npm run new-video -- v0NN-slug "Title"` → storyboard (from `docs/storyboards/_template.md`),
   creative record, a neutral placeholder spec + timing lock, all registered. No default story.
2. Storyboard: subject and sources → what the subject deserves → three directions (scored) → the
   chosen one → `npm run diversity -- <id>` → ten hooks → the opening second by second → scene
   sheets → Gate 2c answers → hypothesis. **Stop for the owner's approval**; record it as
   `approved: { date, note }` in the creative record (a full render needs it).
3. Spec: the script (narration lines, ≤ 7-word caption phrases, `|` to split) and the scenes
   mapped from the chosen concept to library parts (`docs/ARCHITECTURE.md` catalogue; a missing
   capability = a proposed opt-in addition); preset and composer plan (`audio.compose`) chosen
   for this concept. Preview in `npm run studio` (timing estimated).
4. `npm run voice -- <id>` → draft take (cached by script) + timing lock `content/timing/<id>.ts`.
   Listen: `out/<id>/voice/draft.m4a`. Tune `pause`s, pin beats to words, re-run.
5. `npm run render -- <id> --stills …` and review real frames; iterate.
6. `npm run diversity -- <id> --stage render` must pass, then `npm run make -- <id>` → render
   (only changed scene segments), mix, deliver, QA. Review the QA sheets against Gates 2–2c and
   listen; fix and re-run (unchanged steps are skipped).
7. With the user: approve the take (`npm run approve-take -- <id> draft`, set `narration.take`,
   `npm run voice`), add `publish` copy, `npm run publish-pack -- <id>` (affiliate videos:
   `npm run verify-affiliate -- <id>` first; the pack refuses without it).

## Never
- Default to the transformation arc (to-dos → switch → workflow → lockup), a headline on black,
  or a 3–4 s logo ending.
- Invent a statistic, a feature, an interface presented as real, or a past creative decision.
- Handle credentials; show real customer data; pass a simulation off as a capture.
- Ask viewers to share, tag or comment a word (engagement bait).
- Publish or post anything.
