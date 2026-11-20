# Growth playbook — research, strategy, story shapes, scoring, review, learning

Read this before planning any new video (with [HOOKS.md](HOOKS.md) and
[LEARNINGS.md](LEARNINGS.md)). Why it exists: [AUDIT.md](AUDIT.md). Competitors:
[COMPETITORS.md](COMPETITORS.md). Built 2026-11-18; re-check § 1 sources older than ~6 months.

Evidence classes used everywhere in this folder:
**[Official]** platform statement, quoted, with date · **[Study]** peer-reviewed or published
dataset · **[Industry]** vendor dataset (method partly unknown) · **[Creator]** pattern a working
creator teaches or that I observed · **[Hypothesis]** ours, to be tested on our own posts.
Nothing here promises reach. Distribution varies a lot from post to post.

---

## 1. What Instagram says (Official)

| # | Statement (verbatim where quoted) | Source, date | What we do with it |
|---|---|---|---|
| O1 | Reels: "The most important predictions we make are how likely you are to reshare a reel, watch a reel all the way through, like it, and go to the audio page." Surveys ask whether a reel is "worth their time or fun". | [Instagram Ranking Explained](https://about.instagram.com/blog/announcements/instagram-ranking-explained), 2023-05-31 (oldest official source here; still the current long-form explainer) | Design for completion and resharing, not for views. Short, tight, payoff at the end. |
| O2 | "We aim to make certain reels less visible … such as low-resolution or watermarked reels, reels that are muted or contain borders, reels that are majority text, or reels that have already been posted on Instagram." | same | Never a static text card as the opening; never borders; always native, never re-posted. |
| O3 | "every piece of eligible content … is shown to a small audience that we think will enjoy it, regardless of whether they follow the account … the top performing set of reels are shown to a slightly wider audience". Eligible = "original, does not violate our community guidelines, has no visible watermarks and satisfies our recommendation guidelines". | [Helping Creators Find New Audiences](https://creators.instagram.com/recommendations-and-originality), 2024-04-30 | With 5 followers, every reel is a test on strangers. Followers are not the bottleneck; the first test audience's behaviour is. |
| O4 | Not recommended: "Unoriginal content that is largely repurposed from another source…"; also "clickbait or engagement bait" (originality page). Accounts not recommended if they "Repeatedly engaged in misleading practices to build followings, such as purchasing 'likes'". | [Recommendations on Instagram](https://help.instagram.com/313829416281232) (rendered 2026-11-18) | No bait, no bought growth, no reposting other people's clips. |
| O5 | Mosseri: the signals that matter most are watch time, likes per reach and sends per reach; "Likes are slightly more important for connected content, and sends are slightly more important for unconnected content." | Mosseri video, 2025-01-22, as reported by Social Media Today and others (primary video not opened here) | Our growth lever is **sends per reach** (strangers sending it to someone). Track it per post. |
| O6 | Skip rate = share of views that skipped in the first 3 seconds; shown with a retention chart in reel insights (since Aug 2025; percentages on top since Apr 2026). | Reported by Social Media Today and many tools; Instagram's in-app definition — **confirm in your account** (tap (i) next to the metric) | Skip rate is our hook metric. |
| O7 | Trial reels: shown "to non-followers first"; metrics after ~24 h; auto-share to followers if they do well in 72 h. Eligibility later widened to public accounts with ≥ 1,000 followers. | [Trial reels](https://creators.instagram.com/blog/instagram-trial-reels), 2024-12-10; the 1,000 rule reported (Mosseri on Threads, mid-2025) | Not available to us yet. At 1,000 followers: test hooks as trials. |
| O8 | Hashtags capped at five per post/reel ("Quality over quantity is key"). | Dec 2025, reported by [Digital Trends](https://www.digitaltrends.com/social-media/instagram-now-limits-you-to-five-hashtags-per-post/) and Inc.; Help Center page still says 30 | ≤ 5 specific hashtags. Fix PLATFORMS.md (says 30). |
| O9 | Profile grid shows 3:4 thumbnails (since Jan 2025). | Mosseri, Jan 2025, reported widely | Cover text inside the central 3:4 crop (our covers already centre it; check). |
| O10 | Public posts of professional accounts can appear in Google/Bing results (from 2025-07-10). | Reported (Social Media Today et al.) | Captions written as plain-language search answers. |
| O11 | Mosseri's year-end memo: "authenticity is becoming infinitely reproducible"; the bar moves to making something only you could make; raw content as a credibility signal. | 2025-12-31, reported by Engadget, TechRadar | A polished, faceless, AI-voiced brand must earn trust through **real proof** (real tests, real numbers), not polish alone. |
| O12 | Engagement bait = urging likes/shares/comments to boost reach; includes "Share baiting: Asking people to share the post with their friends" and comment/tag/vote baiting; such posts are demoted. | [Meta Business Help Center 259911614709806](https://www.facebook.com/business/help/259911614709806) (Facebook; via search summary, not rendered) | Never ask for shares, tags or one-word comments. Make the video *sendable* instead. |
| O13 | Affiliate links are branded content → "Use the paid partnership label"; eligibility needs an "established presence … sufficient follower base". | [What is considered branded content](https://help.instagram.com/616901995832907), [Eligibility](https://help.instagram.com/1372533836927082), [Get started](https://help.instagram.com/1123581461537025) (rendered 2026-11-18) | § 8: affiliate on Instagram is on hold until the label is available. |

## 2. Evidence from studies and datasets

| # | Finding | Source | Caveat |
|---|---|---|---|
| S1 | Curiosity = a felt gap between what you know and what you want to know; it motivates closing the gap. | [Study] Loewenstein (1994), *Psychological Bulletin* 116(1) 75–98 | Theory, not a reels experiment. |
| S2 | Content evoking high-arousal emotions (awe, anger, anxiety) is shared more; low-arousal (sadness) less; practical utility, interest and surprise also predict sharing. | [Study] Berger & Milkman (2012), *JMR* 49(2) 192–205 (NYT most-emailed) | Articles and email, not short video. |
| S3 | Swipes cluster right after playback starts and at the end. | [Study] Dashlet, arXiv 2204.12954 (25 users, 500 TikTok-like videos) | Small lab sample. |
| S4 | Median skip rate (swiped within 3 s): 65.5 % for 1–5K-follower brands, 60.5 % for 100K–1M; Reels 30–60 s had the highest reach rate (5.60 %), > 2 min 3.50 %. | [Industry] [Socialinsider](https://www.socialinsider.io/blog/instagram-reels-statistics/), 9.77M brand reels, Jan–Jun 2026, updated 2026-11-17 | Brands only, correlational; length may proxy for content type. |
| S5 | Average reel watch time 8.5 s (more than double year on year). | [Industry] Metricool 2026 study (press release 2026-06-16), 24.4M posts / 375K accounts | Method of the average not published. |
| S6 | "over 63% of all videos with the highest click-through rate (CTR) highlight their key message or product within the first 3 seconds". | [Industry] TikTok, *9 Creative Tips* (ads PDF, undated) | Ads, TikTok, no method. |

Reading: about two of every three strangers leave in 3 s (S4). Average watch time (S5) is shorter
than our videos. The hook decides almost everything; the end is the second exit point (S3).

## 3. Creator patterns (Creator)
- **Hook alignment** (Kallaway, 475K): visual hook > written hook > spoken hook; all three must
  say the same thing; choose the visual first, then write the words. Spoken formula: *context →
  lean (open the loop) → contrarian snapback*. Context first: moving it later raises skips.
  ([X post](https://x.com/kanekallaway/status/1912316912198943206))
- **Show the result first, then the how** (AI-tool accounts: handlytech, mavgpt, rowancheung —
  my prior knowledge, not re-watched): the output appears in frame 0; the tutorial follows.
- **Specific, testable promises** ("I tested…", "this setting…", "in 30 seconds") over themes.
- **Lists and recaps for saves**: a numbered list or a recap card at the end that is worth a
  screenshot.
- **Series**: a recurring format the viewer can name, so the follow has a reason.

## 4. Our hypotheses (to test, § 12)
- H1 A visual-first opening (the absurd before-state or the result, big and legible) lowers our
  skip rate versus the headline-on-black opening.
- H2 Withholding the "how" until ≥ 60 % of runtime raises average watch time / completion.
- H3 Ending on the payoff with a ≤ 1.5 s brand mark (no 3–4 s lockup) raises completion.
- H4 A specific, non-obvious step (setting, number, template) on screen raises saves and sends.
- H5 Real, measured proof (a timer, a real result) beats an illustrative fictional workflow on
  sends per reach. (Needs a rule decision: § 8b.)
- H6 Stakes (money or a client lost) raise sends without hurting brand perception.

---

## 5. Strategy for a new account (≈5 followers)
- **Every reel is a stranger test** (O3). It must work with zero context: no "as I said", no
  series knowledge required, the problem named in the first second.
- **Learn fast, change one thing at a time.** Three reels a week for six weeks gives 18 data
  points (§ 13). [Hypothesis] — Instagram gives no frequency rule we could verify.
- **One audience, one promise.** Tell the system who it is for: freelancers, coaches and small
  business owners who lose time to admin. Same topic family in every post so recommendations learn
  who to show us to (O3 "audience that we think will enjoy it"; personalisation by interest per
  the Recommendations page).
- **Profile converts the visit.** Bio = who it is for + what you get ("Systems that save small
  businesses hours. New one every Mon/Wed/Fri."). Pin the three best reels once we know them.
  Covers read as a set (one headline each, same placement).
- **No growth hacks.** No follow-for-follow, pods, bought engagement, share/comment bait (O4, O12).
- **Monetisation later.** Knowledge videos first (§ 8).

## 6. Creative directions (D46: reuse the engine, not the creative experience)
No default shape. For every video: write what the subject deserves, develop **three genuinely
different directions** (each pair differs in ≥ 2 of opening, structure, visual metaphor,
demonstration), score them for the subject (fit, hook, demonstration, feasibility, 1–5 each),
and choose the strongest one that passes the comparison with the last five (`npm run
diversity`). Diversity is a gate; suitability decides. Then map the concept to engine parts.

| Direction (kind) | Fits subjects that… | Opening ideas (already happening at frame 0) | Engine today | Missing (opt-in, only when a video needs it) |
|---|---|---|---|---|
| Cinematic product demonstration (`product-demo`) | have a real tool doing something surprising | the result appearing on the real screen | camera rig, UI kit (illustrative only) | `capture` scene (D46 phase 2) |
| Timed experiment / challenge (`experiment`) | can be tested and timed by us | a timer already running | `data` count-ups, `timeline` playhead | a running timer element; a split race |
| Before/after transformation (`before-after`, `transformation`) | have a visible messy → clean change | the mess mid-collapse | `chaosToSystem`, `comparison` | — (used by v001–v009: don't repeat back to back) |
| Investigative documentary (`investigation`) | rest on a claim worth tracing | the evidence in close-up | `timeline` (chronology), `statement` | a source/evidence document element (quote, highlight, citation) |
| First-person narrative (`first-person`) | have a character's day or an object's view | the character mid-problem | any scene; same narrator in first person | an object/POV framing if needed |
| Split-screen comparison (`split-comparison`) | compare two ways side by side | both running at once | `comparison` (flip, one side at a time) | a simultaneous split |
| Visual mystery and reveal (`mystery-reveal`) | hide a surprising answer | a cropped, unexplained image | `Animate` mask, `KineticPhrase` mask | a progressive crop/zoom-out reveal |
| Myth vs reality (`myth`) | correct a common belief | the myth stated, then visibly cracking | `statement`, `comparison`, `data` | — |
| Unexpected use case (`unexpected-use`) | use a known tool in a new way | the odd result first | illustrative UI | `capture` for real tools |
| Customer journey simulation (`customer-journey`) | are best seen from the customer's side | the customer mid-wait | `timeline`, `notifications`, `flowRun` | — |
| Live workflow demonstration (`live-workflow`) | are a sequence of steps | step 1 already firing | `flowRun` (illustrative), `capture` later | — |
| Data-driven explanation (`data-explainer`) | have sourced numbers that surprise | the number counting | `data` (metrics, chart, callout) | — |
Plus the retention shapes: discovery, escalation, mistake, checklist (same rules).

**Per-scene sheet** (in `docs/storyboards/<id>.md`): purpose · narration · on-screen text ·
visual concept · motion · sound · transition out · duration · *why the viewer keeps watching* ·
engine mapping. A scene with no answer to "why keep watching" is cut.

### Rules for every direction
- **Frame 0 shows something happening**, not a headline being typed (STORY.md § The first three
  seconds).
- **Hook alignment**: picture, on-screen words and voice make the same point; on-screen words
  are not the narration verbatim.
- **Withhold the how** until after the middle.
- **New information every ~3 s** (a number, a step, a consequence) — motion alone does not count.
- **Readable proof**: anything the viewer must read ≥ ~30 u (≈ 11 pt on a 390-pt phone).
- **Stakes**, truthfully: what the before-state costs.
- **The ending belongs to the story** (STORY.md § Endings).

## 7. Topic selection and scoring
Score each idea 0–5 on ten criteria; the total feeds the existing orchestrator scorer
(`src/orchestrator/scoring.ts`: audience value / engagement / commercial), so no new system.

| Criterion | Weight | Feeds | 0 | 5 |
|---|---|---|---|---|
| Audience relevance | 1.0 | audience | not our viewer | daily pain of freelancers/owners |
| Problem strength | 1.5 | audience | mild annoyance | costs money, clients or evenings |
| Practical usefulness | 1.0 | audience | idea only | a step they can do today |
| Curiosity potential | 1.5 | engagement | obvious answer | answer they would not guess |
| Demonstration potential | 1.5 | engagement | talking only | a visible transformation in < 20 s |
| Shareability (send) | 1.0 | engagement | nobody to send it to | "this is exactly you" for a specific person |
| Save potential | 1.0 | engagement | nothing to keep | steps / setting / template |
| Freshness | 0.75 | engagement | everyone has seen it | new or rarely explained |
| Competition (inverse) | 0.5 | engagement | saturated | few good versions |
| Monetisation | 0.75 | commercial | none | a partner fit (when allowed) |

Gates: problem strength ≥ 3 **and** demonstration ≥ 3 **and** curiosity ≥ 3, else reject.
Facts and capabilities only from primary sources; no invented statistics; a number we show is
either sourced or measured by us (and labelled).

## 8. Compliance and monetisation
**a. Affiliate on Instagram is on hold** [Official O13]. Meta requires the paid partnership label
for affiliate-link posts; the label needs branded-content eligibility; the account's branded
content tools are restricted. A caption "Ad:" line and our end-card "Ad" tag do not replace the
platform label. Until the label is available: knowledge videos only on Instagram. Owner actions:
(1) in the app: Menu → Creator tools and controls → Branded content → Set up → if not eligible,
"request a review" (Official wording); (2) decide what to do with v008, which is live on
Instagram without the label (archive is reversible; or keep and accept the policy risk — owner's
call); (3) keep v009 unposted on Instagram. TikTok's own rule (commercial content toggle) is separate (PLATFORMS.md).
**b. Real tools — decided (owner, 2026-11-18, D46).** Authorised: authentic screenshots and
screen recordings of real products when they strengthen the story — our own captures, a demo
account, fictional data, no credentials or personal data anywhere, the tool's terms checked and
the capture logged in the asset ledger; claims from the vendor's docs, checked now. Simulated
interfaces are accurate and labelled "illustrative", never presented as captures, never showing
a feature the product lacks. The `capture` scene type is built with the first video that needs it.
**c. Never**: income claims, fake urgency, bought engagement, bait, claims beyond the source.

## 9. Engagement review (with docs/QA.md § Gate 2c, before rendering)
Gate 2c (diversity + the owner's eight questions) is binding. These twelve add the engagement
side; answer them in the storyboard; any "no" → fix or justify.
1. **Stranger test (muted)**: frames 0–1 s alone — does a stranger know what this is about and
   why it matters to them?
2. **Open question**: write the question the viewer has at 3 s. Is it answered after ≥ 60 % of
   runtime, and fully?
3. **Alignment**: do the opening visual, the on-screen text and the voice make the same point?
4. **Novelty**: name the one thing a smart viewer in our audience probably did not know.
5. **Readable proof**: is the key claim shown, at ≥ ~30 u, long enough to read?
6. **Information rhythm**: list the new information beats; any gap > ~3 s?
7. **Save trigger**: which frame is worth saving, and does it hold ≥ 2 s?
8. **Send trigger**: who exactly would a viewer send this to? (No share/tag/comment asks — O12.)
9. **Ending**: payoff in the last 2 s; brand ≤ ~1.5 s or integrated; CTA specific, not generic.
10. **Honesty**: hook fully paid off; every number sourced or measured by us; no exaggeration.
11. **Variety**: covered by Gate 2c (`npm run diversity`, the last five videos).
12. **Length earns itself**: cut any second without new information (Socialinsider's 30–60 s
    reach peak is correlation, not a target).
Automatable later (editorial QA): end-card share of runtime, words/s, gap between caption
changes, arc and hook-type repetition vs earlier specs, banned-phrase repetition ("itself").

## 10. Workflow for every new video (Claude Code; the `mwc-video` skill runs it)
1. **Subject + audience research**: who, which pain, why now; LEARNINGS.md; every fact with a
   primary source (quote, URL, date). Score the topic (§ 7).
2. **Creative research**: how others cover it (COMPETITORS.md teardown sheet); the angle nobody
   took.
3. **What the subject deserves** (one paragraph, before the scene library), then **three
   genuinely different directions** (§ 6), scored; choose for the subject; `npm run new-video`
   scaffolds the storyboard and the record; `npm run diversity -- <id>`.
4. **Ten hooks** (HOOKS.md), scored; top three with their opening visual; the chosen one.
5. **Opening second by second**, then the **script** (withhold the how, stakes, one surprising
   fact or step, the ending inside the story).
6. **Scene sheets**, mapped to engine parts; missing capabilities listed as opt-in proposals.
7. **Gate 2c answers + hypothesis.** **Stop: the owner approves the concept and storyboard.**
8. **Production**: spec, voice, stills, `npm run diversity -- <id> --stage render`, make.
9. **Review**: Gates 1, 2, 2c (on frames), this § 9; improve and re-render while a meaningful fix
   exists.
10. **Publishing package**: video, cover (3:4-safe), caption (search sentence first, steps,
    ≤ 5 specific hashtags), CTA, disclosures, sources, posting time; the hypothesis and the
    creative record's kinds copied into LEARNINGS.md. Human approval before anything is posted.

## 11. Publishing details
- **Cover**: the before-state or the promise in ≤ 5 words, inside the centre 3:4 crop.
- **Caption**: first line = the hook in plain search words ("How to stop chasing late invoices");
  then the steps; then sources/illustrative note/AI-voice note; ≤ 5 specific hashtags (O8).
- **CTA**: one; specific value of following or the next video; never a share/comment/tag ask.
- **Timing**: post when the audience is online (Insights → Audience after ~100 followers);
  before that, any consistent slot.

## 12. Learning loop
Record per post at 24 h, 72 h and 7 days (Instagram Insights): views, accounts reached,
% non-followers, skip rate, average watch time, watch time total, retention curve shape (where the
big drops are), likes, comments, shares (sends), saves, profile visits, follows, link taps.
Derived: likes/reach, sends/reach, saves/reach, follows/reach, avg watch ÷ duration.
- **Baseline** = our own median of the last 6 posts (until then: the first 6 posts).
- **Verdicts**: "worked" only when a metric is outside the range of the comparison posts, on
  ≥ 3 posts per variant; otherwise "inconclusive". Views alone never decide.
- **Creative variables** recorded with every post (from its creative record): direction,
  opening kind, hook mechanism, structure, visual metaphor, demonstration, ending, duration,
  preset. Read them against average watch time (and ÷ duration), sends per reach, saves per
  reach, follows per reach and skip rate. Do not assume cinematic, fast, short or heavily
  animated wins: a kind is "better" only when it beats the others on ≥ 3 posts each, outside
  their range, with the sample size written next to the claim. Under that: "directional".
  Favour experimenting further with kinds that look promising; never stop exploring new ones.
- **After every post**: compare to the hypothesis, name the strongest and weakest moment
  (retention drops at which second → which scene), write the lesson in LEARNINGS.md, and update
  this playbook only when a lesson holds on ≥ 3 posts.

## 13. First six weeks — test plan (Hypothesis)
| Weeks | Posts | Variable tested | Held constant |
|---|---|---|---|
| 1–2 | 6 | Opening: visual-first vs headline-first (3 + 3) — H1 | length band, ending, topic family |
| 3–4 | 6 | Ending: payoff + 1 s mark vs full lockup — H3; withheld "how" — H2 | the better opening |
| 5–6 | 6 | Proof: concrete step/number on screen vs concept — H4 (and H5 if real-tool format approved) | best opening + ending |
Primary metric per test: skip rate (opening), avg watch ÷ duration (ending, withheld how),
saves + sends per reach (proof). Small samples: treat everything as directional.
