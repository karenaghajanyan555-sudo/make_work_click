# Competitor and creative intelligence

**What was verified (2026-11-18):** each profile below was rendered in headless Chrome
(`src/pipeline/browser.ts`): follower count and bio as Instagram shows them to a logged-out
visitor. **What was not:** Instagram hides posts without a login, so no reel was watched in this
session. "Format notes" are my prior knowledge of these accounts (to mid-2026) or third-party
sources where named — treat them as leads to check, not findings. The per-reel teardown below is
how we turn them into evidence (owner in the app, or the proposed `teardown` tool on screen
recordings: STATUS.md → Next step).

Handles tried and discarded (wrong or unavailable account): jeffsu, jeff_su, keepproductive,
linear.app, tiagoforte (private, not the author), vox (German TV), theverge, thehustle, zainkahn.

## Accounts (followers as shown 2026-11-18)

### AI tools and tutorials
| Account | Followers | Bio (verbatim excerpt) | Format notes (unverified unless sourced) |
|---|---|---|---|
| [handlytech](https://www.instagram.com/handlytech/) | 993K | "AI tools, tested for you" | Summarises AI tools/workflows in ~30 s, paired with longer tutorials (CreatorDB, 2026-10-02). Result first, then how. |
| [mavgpt](https://www.instagram.com/mavgpt/) | 1.5M | "Daily prompts, tips & tools to 10x productivity" | Face + screen; one tip per reel. |
| [sabrina_ramonov](https://www.instagram.com/sabrina_ramonov/) | 1.2M | "Teach 10M ppl AI … DM me "GUIDE" to learn AI free" | Face-led tutorials; DM-keyword funnel to a free guide. |
| [rpn](https://www.instagram.com/rpn/) | 975K | "your guide to the intelligence age" | Face-led AI news and opinions. |
| [tiffintech](https://www.instagram.com/tiffintech/) | 817K | "Inside AI, robotics & the companies shaping the future" | Host-led interviews/explainers. |
| [rowancheung](https://www.instagram.com/rowancheung/) | 531K | "The latest in AI and robotics, explained" | News hook ("X just released Y"), demo clips. |
| [kallaway](https://www.instagram.com/kallaway/) | 475K | "Breaking down new tech & AI … Helping business owners stay ahead" | Teaches hook alignment publicly (PLAYBOOK.md § 3). |
| [godofprompt](https://www.instagram.com/godofprompt/) | 368K | "Sharing AI Prompts, Tips & Tricks … AI Agents, Automations" | Not checked. |
| [theaisavvy](https://www.instagram.com/theaisavvy/) | 93K | "AI Tools & Tutorials" | Not checked. |
| [mattfarmerai](https://www.instagram.com/mattfarmerai/) | 92.2K | "New AI Tools · AI Expert · Humanoid Robots" | New-tool showcases. |

### Automation and business systems (closest to us)
| Account | Followers | Bio | Format notes |
|---|---|---|---|
| [nick_saraev](https://www.instagram.com/nick_saraev/) | 746K | "Helping 2000+ beginners land their First AI client" | Outcome promise in the bio; face-led. |
| [leadgenman](https://www.instagram.com/leadgenman/) | 389K | "AI Agents and Automation · Lead Generation" | Not checked. |
| [liz.on.the.web](https://www.instagram.com/liz.on.the.web/) | 300K | "Work SMARTER, earn MORE … systems, automations & AI skills" | Same audience as ours; face-led. |
| [tenfoldmarc](https://www.instagram.com/tenfoldmarc/) | 126K | "Teaching AI to non-technical folks" | Not checked. |
| [automatewithmarko](https://www.instagram.com/automatewithmarko/) | 65.8K | "Scaling Businesses Using Automated Systems" | Our exact topic; face-led. |

### Productivity
| Account | Followers | Bio | Format notes |
|---|---|---|---|
| [aliabdaal](https://www.instagram.com/aliabdaal/) | 1.1M | "Doctor turned Entrepreneur · Feel-Good Productivity" | Face-led, story + lesson. |
| [tomfrankly](https://www.instagram.com/tomfrankly/) | 101K | "productivity, learning, and Notion" | YouTube-first creator. |

### SaaS brands (polished brand content)
| Account | Followers | Bio | Note |
|---|---|---|---|
| [figma](https://www.instagram.com/figma/) | 985K | "Everything is better in 3D (transforms)" | Huge offline user base. |
| [notionhq](https://www.instagram.com/notionhq/) | 497K | "The AI workspace that works while you sleep." | Huge offline user base. |
| [zapier](https://www.instagram.com/zapier/) | 105K | "Get your software working together, automatically." | Category leader in automation. |
| [n8n.io](https://www.instagram.com/n8n.io/) | 1,634 | "Extendable workflow automation tool …" | Big product, tiny Instagram. |
| [raycastapp](https://www.instagram.com/raycastapp/) | 1,627 | "Your shortcut to everything." | Known for polished design; tiny Instagram. |

### Faceless / premium editorial
| Account | Followers | Bio | Format notes |
|---|---|---|---|
| [mkbhd](https://www.instagram.com/mkbhd/) | 5.3M | "I promise I won't overdo the filters." | Premium production, face-led (reference for craft, not format). |
| [cleoabram](https://www.instagram.com/cleoabram/) | 3.2M | "Video journalist making HUGE* If True, an optimistic show about science and tech. Prev: Vox, Netflix." | A named show with a promise; host-led. |
| [morningbrew](https://www.instagram.com/morningbrew/) | 2.2M | "Everything you need to know about the world of business …" | Business news, often humour. |
| [kurzgesagt](https://www.instagram.com/kurzgesagt/) | 1.6M | "Sciency videos made with love, a lot of time and after effects." | Faceless, animated; a style as recognisable as a face. |
| [voxdotcom](https://www.instagram.com/voxdotcom/) | 1M | "Making sense of it all." | Explainers. |
| [visualizevalue](https://www.instagram.com/visualizevalue/) | 475K | "Create > consume." | Faceless; one idea per post in a strict monochrome system. |

## What the pattern suggests (Judgement — to confirm with teardowns and our own data)
1. **Outcome first.** The big AI/automation accounts promise a concrete result (a client, a
   tested tool, a tip you can use) in the bio and the first line. Our bio and hooks promise a
   theme ("systems that work").
2. **Real tools, tested.** "Tested for you" is a credibility position. We show fictional UI, so
   the viewer cannot act on what they saw (AUDIT.md finding 4). Decision: PLAYBOOK.md § 8b.
3. **A face — or a signature as strong as one.** Faceless accounts that grew have a visual system
   carrying a point of view (kurzgesagt, visualizevalue). Our system is strong; the point of view
   is not yet visible in what we choose to say.
4. **Polish alone does not travel.** n8n.io and raycastapp (both ~1.6K) are the nearest analogue
   to our current output: well-made software motion design without a stranger-facing hook.
5. **A named format gives a reason to follow** (Cleo Abram's *Huge If True*). We have N° series
   numbers but no named promise.
6. **Avoid the DM-keyword funnel for now.** "DM/comment GUIDE" is common in the niche; Meta lists
   asking people to comment with specific words as comment baiting (PLAYBOOK.md O12). Not worth
   the recommendation risk for a new account.

## MAKE WORK CLICK's distinct position (proposal)
**"The studio that shows the system."** Others talk about tools; we show, in a frame you can
read and save, exactly what a system does and how to set it up — honest, sourced, measured.
Candidate named formats (each a story shape in PLAYBOOK.md § 6):
- **The Setup** — one system, the exact steps, a save-able recap (shape A or G).
- **Timed** — before/after with a stopwatch we actually ran (shape C/E; needs proof).
- **The Setting** — one hidden setting in a real tool (shape A/F; needs the real-tool decision).
- **Myth** — a common belief, the evidence, the rule (shape D).
The click stays the signature — as the payoff moment of a story worth finishing, not a routine.

## Teardown sheet (one per reel; 20 reels before the next concept round)
Record: account, reel URL, date posted, length, views/likes shown (if visible), then:
1. Frames 0–2 s: what is on screen, what is said, what is written? Are they aligned?
2. What makes someone keep watching at 3 s (the open question)?
3. The central curiosity in one line.
4. Emotional trigger (awe, anxiety, anger, relief, amusement, none).
5. Structure (which shape in PLAYBOOK.md § 6, or a new one).
6. How often does the picture change? (count cuts / new information per 10 s)
7. How is information revealed (all at once, step by step, withheld until the end)?
8. Why would someone send it — to whom?
9. Why would someone save it — what would they come back for?
10. How does it end (payoff, CTA, loop, logo — how many seconds)?
Then: the principle to keep (one line) and what we must not copy (their face, words, look).
