# {{series}} — {{title}} (`{{id}}`)

Status: **planning** · Rule: reuse the engine, not the creative experience (D46).
Work top to bottom; nothing is rendered (except stills) until § 8 is answered and
`npm run diversity -- {{id}} --stage render` passes. Record: `content/creative/{{id}}.ts`.

## 1. Subject and audience
- Who exactly, which pain or desire, why now (docs/growth/PLAYBOOK.md § 5, § 7 score).
- What we know from LEARNINGS.md that applies.
- Facts the video will state, each with a primary source (quote + URL + date). Real products:
  authentic captures only (§ 6), claims from the vendor's own docs.

## 2. What the subject deserves
One paragraph, before looking at the scene library: what is the most vivid, truthful way to make
a stranger *feel* this subject? What is the one image they should remember?

## 3. Three creative directions (genuinely different)
Each differs from the others in at least two of: opening concept, narrative structure, visual
metaphor, demonstration method (kinds: VOCABULARY in `src/creative/diversity.ts`).

| | A | B | C |
|---|---|---|---|
| Name | | | |
| Approach (PLAYBOOK.md § 6 list or new) | | | |
| Opening (first 3 s, what is already happening) | | | |
| Structure | | | |
| Visual metaphor | | | |
| Demonstration | | | |
| Ending | | | |
| Subject fit / hook / demonstration / feasibility (1–5 each) | | | |
| Engine: existing parts · missing capability (opt-in) | | | |

**Chosen:** _, because (suitability for this subject — not merely being different): …
**Not chosen:** B because …, C because …

## 4. Comparison with the last five
Run `npm run diversity -- {{id}}` (storyboard stage) and paste the table. Answer: which dimension
is closest to an earlier video, and is that closeness deliberate?

## 5. Hooks (docs/growth/HOOKS.md method)
Ten hooks from ≥ 5 categories, scored (context, gap, specific, stakes, visual; truth gate).
Top three with their opening visual; the chosen one and why.

## 6. Opening, second by second (0–3 s)
| t | Picture (already moving at frame 0) | On-screen words (not the narration verbatim) | Voice | Sound |
|---|---|---|---|---|

## 7. Scenes
One block per scene: **purpose** · **narration** · **on-screen text** · **visual concept** ·
**motion** · **sound** · **transition out** · **duration** · **why the viewer keeps watching** ·
**engine mapping** (library part, or the missing opt-in capability and its cost).
A scene without an answer to "why keep watching" is cut.

## 8. Creative review (Gate 2c) — answered before rendering, re-checked on frames
1. What makes this video visually different from our last five videos?
2. What makes its opening different?
3. Why is this the right storytelling structure for this subject?
4. What is the strongest moment?
5. What will viewers learn?
6. What would make someone share or save it?
7. Is any scene unnecessary?
8. Is the ending integrated into the story rather than another generic logo screen?

## 9. Approval
The owner's decision on the concept and storyboard, with the date → `approved` in the record.

## 10. Hypothesis (goes to LEARNINGS.md when posted)
What we expect (skip rate, watch time, sends, saves, follows vs our baseline) and why.
