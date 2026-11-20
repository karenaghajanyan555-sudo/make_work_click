# Story rules

Every video is one clear idea. If the idea needs two sentences to state, it is two videos.

## Creative direction first (D46: reuse the engine, not the creative experience)
There is no default shape. Each video's structure, opening, metaphor, demonstration, pacing,
transitions and ending come from what its subject deserves, decided in its storyboard
(`docs/storyboards/_template.md`):
1. **What the subject deserves** — the most vivid, truthful way to make a stranger feel it,
   written before looking at the scene library.
2. **Three genuinely different directions** — each pair differs in at least two of opening,
   structure, visual metaphor, demonstration. Menu (not a fixed list; PLAYBOOK.md § 6):
   cinematic product demonstration · timed experiment or challenge · before/after
   transformation · investigative documentary · first-person narrative · split-screen
   comparison · visual mystery and reveal · myth vs reality · unexpected use case · customer
   journey simulation · live workflow demonstration · data-driven explanation.
3. **Choose for the subject** — score subject fit, hook strength, demonstration and
   feasibility; the strongest one that passes the diversity check wins. Never pick a structure
   because the engine makes it easy, and never pick one only because it is different.
4. **Compare with the last five** (`npm run diversity`): opening, hook mechanism, structure,
   visual metaphor, demonstration and ending weigh most; brand constants never count. Too
   close → redesign the concept, not the topic.

The transformation arc of v001–v009 (problem → the system → it runs → brand) is one direction
among many and may not be used twice in a row.

## The first three seconds
- Something is **already happening** at frame 0 (a timer running, a workflow collapsing, a
  result before its explanation, two processes racing, an unexpected image of the problem).
- Picture, on-screen words and voice make the same point (hook alignment, PLAYBOOK.md § 3); the
  on-screen words are designed for the picture, **not the narration repeated verbatim**.
- Never: a headline on black, generic floating text, a logo introduction, a slow lead-in.
- The opening creates one specific question the rest of the video answers (the answer comes
  after the middle, not at second 4).

## Endings
- The ending belongs to the story: the payoff, a save-able artifact (a recap, a note, the
  setting), a loop back to the opening, or a reveal — with the brand mark carried inside it or
  held briefly. A 3–4 s generic logo screen is not an ending.
- The CTA names the specific value of following or the next video; never "share this", "tag a
  friend" or "comment X" (Meta lists these as engagement bait: PLAYBOOK.md O12).
- Affiliate videos end on the end card (it carries the "Ad" disclosure, D42), but its form,
  length and lead-in still follow the story.

## Script
- Spoken English, second person, present tense. Short sentences. Concrete nouns
  (subscriber, welcome email, Thursday 9:00) over abstractions (engagement, workflows).
- Narration says what the picture cannot; never describes what is already on screen.
- Banned: "In today's fast-paced world", "Are you tired of", "game-changer", "unlock",
  "supercharge", "leverage", rhetorical lists of three adjectives, any fake statistics.
- Claims about real products, prices or results only from the vendor's primary docs or a
  primary study, checked when the video is made (quote + URL + date in the storyboard); an
  affiliate video's partner facts only from its claim bank (below). No links anywhere in a
  video; in a caption only where the publishing rules allow.
- An ending line that answers the hook is one option (memory → "Let the system remember"),
  not a rule.

## Captions (on-screen text)
- Phrase-based, never word-by-word. One phrase on screen at a time; ≤ 7 words per phrase;
  display role ≤ 3 lines, title role ≤ 2 lines.
- Markup: `*word*` emphasis (serif italic), `**word**` signal (serif italic + lime),
  `\n` line break. At most one emphasis/signal span per phrase.
- Captions are timed to narration phrases via cue points; text leaves before the next
  focal element takes over.

## Honesty
- Businesses, people and apps are fictional and unbranded (e.g. "Juniper & Rye Bakery",
  "Sam Rivera") unless the video shows a real product.
- **Real products** (owner, 2026-11-18, D46): authentic captures of the real interface only —
  our own screenshots/recordings, a demo account, fictional data; no credentials, real
  customer data or personal information anywhere (screen, files, logs); Claude never handles
  credentials (the owner records logged-in screens). Every feature shown exists and is
  verified on the vendor's docs.
- **Simulated interfaces** are either fictional and unbranded, or an accurate simulation of a
  real product labelled "illustrative" on screen and in the caption. A simulation is never
  presented as a capture, and never shows a feature the product does not have.
- Knowledge videos still name no affiliate partner (validation).

## Affiliate videos (D42)
Most videos are knowledge videos and stay exactly as they are. An affiliate video is a
knowledge video first; the paid partner is how the viewer can act on it.
- **Worth it without the ad.** Cover the end card: the video must still teach one useful,
  complete idea. If it only makes sense as a pitch, it is not made.
- **Tool-agnostic body.** The narration and scenes teach the method (the deposit taken at
  booking, the sequence that runs on its own); the fictional UI stays fictional and is never
  passed off as the partner's product. The partner is named on the end card ("The tool I'd use
  for this: *systeme.io*") and in the post copy. Validation enforces it.
- **Say it before they buy it.** `spec.affiliate` puts the "Ad" tag on the end card and the
  disclosure as the caption's first line. If the narration ever names the partner, that line
  says the disclosure too ("Full disclosure: I earn a commission from systeme.io.").
- **No disappointed buyers.** Partner facts only from its claim bank (exact quote, re-checked
  on the live page before the video), worded no stronger than the source; mention the plan a
  feature needs; no income or results promises, no "free" without its limits, no countdowns
  or fake urgency, no hype words (banned list above).
- **The CTA is the free start**, never a hard sell: one line, one link in the bio.
