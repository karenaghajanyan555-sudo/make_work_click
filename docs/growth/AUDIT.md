# Growth audit — why our videos look premium but are not built to be watched (2026-11-18)

Scope: v001-memory-v2, v002-meetings, v003-invoices-chase-themselves, v004-client-onboarding-runs,
v008-bookings-run-themselves (posted), v009-sale-does-the-rest (built). Evidence: the specs and
scripts in `content/`, the QA contact sheets `out/<id>/qa/sheet.png` (every 0.5 s), the brand and
story rules, the orchestrator's editorial QA and scoring code, and the production database.
Platform facts and research: [PLAYBOOK.md](PLAYBOOK.md) § 1 (sources, dates).

Labels: **Measured** = read from our files or renders today. **Verified** = primary source checked
today. **Judgement** = my reading; not proven by audience data (we have none yet: 0 publications
and 0 metric rows in `data/studio.db`).

## Verdict
The engine makes beautiful, honest, consistent videos. They fail the stranger test: a person
who does not follow us has no reason to stop, nothing left to wonder about after ~4 s, nothing
new to learn, nothing they can act on, and 3–4 s of logo at the end. The fix is mostly
**editorial** (topics, hooks, story shapes, endings, proof), plus a few opt-in engine props. No
rewrite.

## What is strong (keep)
- Visual identity, typography, light and motion quality (D40, D41); the click as a signature.
- Frame 0 is never empty (`hook.firstFrame`); safe zones respected; captions phrase-based.
- Honesty systems: fictional UI, claim banks, affiliate disclosure built into the spec.
- Deterministic, cached pipeline: a new story costs a spec, not engineering.

## Findings
1. **One story, told six times** (Measured). v001-v2, v003, v008, v009 use the identical arc
   `chaosToSystem → flowRun → endCard`; v002 and v004 use the editorial arc. All six tell the
   same plot: scattered to-dos → the switch clicks → a workflow runs → to-dos checked → brand.
   The climax is the same click in every video. A viewer who has seen one has seen all.
2. **The hook states a familiar problem; it does not open a question** (Measured + Judgement).
   Hooks: "Your business shouldn't depend on your memory." · "Every meeting ends the same way." ·
   "Getting paid shouldn't depend on chasing." · "Every new client asks the same questions." ·
   "Booking one call shouldn't take ten messages." · "Every sale you make comes with three more
   jobs." Five of six are generalised truisms; none promises a specific outcome, reveal or proof.
   The answer category ("let the system / one link do it") is spoken by ~4–5 s (v008 sheet:
   "Let one link do the booking" at 4.0–5.5 s). Loewenstein's information-gap account: curiosity
   needs a perceived gap; ours is closed before second 5, and the rest confirms what the viewer
   already assumed.
3. **The visual hook is the weakest of the three hooks** (Measured + creator framework). Frames
   0–3.5 s (v002, v004, v008): a headline typing in on black, faint to-do fragments at low
   contrast, nothing else moving. The written hook equals the spoken hook word for word. Kallaway
   (creator, 475K) ranks visual > written > spoken and asks for all three aligned on one idea;
   ours leans on the spoken line. Instagram says it makes "reels that are majority text" less
   visible (Ranking Explained, 2023-05-31); our first 3 s are effectively a text card — a risk,
   not measured.
4. **Little to learn, nothing to act on** (Judgement). Auto-reminders, booking links, meeting
   notes and onboarding sequences are known ideas to anyone who follows AI/productivity accounts.
   Knowledge videos may not name a tool (STORY.md), show a setting, a template or a number, so the
   viewer cannot do anything next. Save value (come back to it) and send value (a friend needs
   this) are low by construction. Berger & Milkman (2012) found practical utility and surprise
   predict sharing; our videos offer neither a surprise nor a usable step on screen. (v008/v009
   put steps in the caption — good — but not in the picture.)
5. **The proof is illegible on a phone** (Measured). UI body 22 u, chips 21 u, step titles 30 u
   (`src/brand/tokens.ts`); at a 390-pt-wide phone that is ~8 pt body/chips and ~11 pt titles.
   From ~6 s to ~17 s the frame is one 900-u window in the upper half with the bottom ~40 % empty
   dark (sheets). The viewer sees "a light rectangle where chips turn green", not a demonstration.
6. **The ending spends 14–18 % of runtime on an identical lockup** (Measured from sheets). End
   card: v002 ~3.2 s of 22.7 s, v004 ~3.8 s of 24.8 s, v008 ~4.2 s of 23.7 s. CTA "Follow for
   more systems like this" in 4/6. Instagram's top predictions include whether you "watch a reel
   all the way through" (Verified); a long logo tail gives the viewer a reason to leave right
   before that point (Judgement).
7. **The same words every time** (Measured). "runs itself", "sends itself", "write themselves",
   "chase themselves", "on its own", "Let the system …" across titles and lines in all six. The
   vocabulary is the brand idea repeated, not new information.
8. **Low arousal by design** (Judgement against research). BRAND.md asks for "quiet, unhurried";
   lines run at ~2 words/s (42–57 words in 21–25 s); no person loses anything, no number surprises.
   Berger & Milkman: high-arousal emotions (awe, anxiety, anger) drive sharing; low-arousal ones
   do not. Premium does not have to mean low stakes.
9. **Pacing looks fine to QA, not to a viewer** (Measured). `pacing.static` passes (longest still
   0.47–1.07 s) because chips and camera move, but 6–17 s is one composition with small state
   changes. QA measures pixel change, not new information per second.
10. **Nothing in the pipeline judges engagement** (Measured). Editorial QA's hook checks are a word
    count, a 3-s limit and a regex for words like "you/never/again"; idea scores are owner-typed
    1–5 values; no step generates or compares hooks, concepts or story shapes; the per-video
    brief has one hook and no hypothesis.
11. **The learning loop is empty and cannot record our posts** (Measured). 0 publications, 0
    metrics in `data/studio.db`. v008 was posted but `produce publish` needs an orchestrator job,
    so engine videos cannot be recorded. The `metrics` table lacks reach, non-follower reach, skip
    rate, likes, follows and per-post hypotheses; `analytics.csv` for v008 is empty.
12. **Compliance: affiliate posts on Instagram need a label this account cannot use yet**
    (Verified). Meta: affiliate-link posts → "Use the paid partnership label"; "All branded
    content must be disclosed using the paid partnership label"; eligibility includes "an
    authentic, established presence … sufficient follower base". The account's branded content
    tools are restricted (owner). v008 is live on Instagram (STATUS.md), so it is live without
    the required label, and v009's posting step plans Instagram too. Details and options:
    PLAYBOOK.md § 8.
13. **A platform fact is out of date** (Verified + reported). PLATFORMS.md and the package hold
    captions to 30 hashtags. Instagram capped hashtags at five (Dec 2025, reported by Digital
    Trends and Inc. from Instagram's @creators / Mosseri). Instagram's own Help Center page still
    says 30 (stale or not yet updated). Use ≤ 5 to be safe under both.

## Compared with accounts that grow in our niche
COMPETITORS.md has the 28 profiles checked today. The pattern (followers verified today; format
notes from my prior knowledge, not re-watched — Instagram hides posts without login):
- The large AI/automation accounts (handlytech 993K, mavgpt 1.5M, sabrina_ramonov 1.2M,
  nick_saraev 746K, rowancheung 531K, kallaway 475K) show **real tools doing real things**, often
  with a face, and promise a concrete outcome in the first line.
- Faceless brands that grew are either studio animation with deep story (kurzgesagt 1.6M), a
  ruthless one-idea graphic system (visualizevalue 475K), or news/media brands (morningbrew 2.2M,
  voxdotcom 1M).
- Polished SaaS motion design on its own does not travel: n8n.io (1,634) and raycastapp (1,627)
  have tiny Instagram followings despite large products (follower counts reflect many factors;
  Judgement). That is the closest analogue to what we make now.

## What this means (Judgement)
Keep the studio look. Change what the look is used for: every video must (a) open on a visual
that asks a question, (b) withhold the answer until it is earned, (c) show something the viewer
did not know or could not see, legibly, (d) leave them with a step, a number or a setting worth
saving or sending, and (e) end on the payoff, not on a 4-s logo. The plan: STATUS.md → Next step.
