# systeme.io — affiliate research (checked 2026-11-17)

> **Source of truth for publishing (since 2026-11-18, D44):** `content/affiliate/systeme-io.ts`
> (claim bank, program, link, tracking, plan facts, each with its quote and status), re-verified
> by `npm run verify-affiliate -- <id>` before every package. This document keeps the research
> notes, the "do not say" list and the history.

The owner approved affiliate videos on 2026-11-17 (D42). Rules: CLAUDE.md, docs/STORY.md
§ Affiliate videos. In a spec: `affiliate: { partner: 'systeme-io', page?: '<page>' }`.

Sources: systeme.io pages fetched 2026-11-17 (raw HTML, plus headless Chrome for the pricing
grid, which is rendered client-side). Most pages say "Last updated: April 2026". Quotes are
verbatim unless marked. Re-check prices and limits before every video: they change.

## 1. Our link and how attribution works (verified)

| | |
|---|---|
| Affiliate link | `https://systeme.io/?sa=sa0286549007496fe803218a3f1a238a9bf66cc091` |
| Affiliate ID | `sa0286549007496fe803218a3f1a238a9bf66cc091` |
| Deep links | "You can start promoting any page on systeme.io simply by adding ?sa=YOURID to the URL" (affiliate-program). Example: `https://systeme.io/booking-calendar?sa=sa0286549007496fe803218a3f1a238a9bf66cc091` |
| Dashboard | Affiliate dashboard inside our systeme.io account (not checked) |

From the affiliate agreement (https://systeme.io/affiliate-agreement):
- **The referral only counts once the person creates a free account.** "If a lead clicks your
  affiliate link but never signs up for a free account, no referral is recorded". So the CTA
  is "start the free plan", not "buy".
- **Attribution is lifetime and follows their email address.** "Once a lead signs up for a free
  account using your affiliate link, you become their affiliate for life. Your affiliate ID
  stays attached to that lead's email address".
- **Exception:** "if the lead uses another affiliate's affiliate link on one of our payment
  pages to complete a purchase, that affiliate will receive the commission".
- **Commission is paid only if:** the lead is a real, new customer; "a Customer must remain a
  customer during a 30-day period"; the purchase is not made by us or by family or employees
  (no self-referral); and no refund is demanded within 30 days.
- "We reserve the right to alter or change the commission amounts".
- The operator is ITACWT Limited (Dublin, Ireland). Irish law applies. We pay our own taxes and
  bank fees.

## 2. Money (verified, affiliate-program page)

| Item | Value |
|---|---|
| Commission | "60% on every sale", "Lifetime recurring, earn every month the referral stays subscribed" |
| Annual plans | "Annual plan commissions are paid on the full annual amount." |
| Payout | "Monthly (processed on the 10th)", minimum $30, PayPal or wire transfer. A payment method must be confirmed in the dashboard |
| Per referral (page's own maths) | Startup $17/mo → $10.20/mo. Unlimited $97/mo → $58.20/mo. Annual Startup $102, annual Webinar $282, annual Unlimited $582 |
| Who can join | "Anyone, free to join, no application, no purchase required" |

Official promo assets ("Systeme.io" offer on the affiliate page) are a Google Drive folder:
https://drive.google.com/drive/folders/1v1nbHnAm2sjKnCLHTKvybHlmKZ-tWm7S. It holds five folders:
Banners, Email sequences, Guides, Logos, Material for social media (last modified 2021–22).
Their contents were not opened.

## 3. Rules we must follow

### Affiliate agreement: "Brand promotion" and "Legal stipulations" (verified)
- "You can not alter the resources in any way"
- "You can only use our trademarks in connection with the affiliate program"
- "You must not use our trademark in a misleading way or imply that we endorse, sponsor, or
  approve of your services or products without our prior consent"
- "You must immediately comply if we request that you discontinue use."
- "You agree not to engage in any deceptive, misleading, illegal, or unethical marketing
  activities"
- "You will not make any statement … that reasonably would contradict anything in this Agreement."
- Logo page (https://systeme.io/logo): "Please do not edit, change, distort, recolor, or
  reconfigure the systeme.io logo". Their palette is primary #00A0FF, text #19191B, secondary
  text #7B7E85, accent #F2F2F3. Their font is Inter. The page frames matching their branding
  as a suggestion ("will help you"), not a rule.

The agreement says nothing about paid ads, bidding on their brand name, or coupon sites.

### FTC (US) disclosure: Endorsement Guides FAQ
https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
(the FTC site blocks direct download, so these short quotes were extracted with WebFetch)
- A disclosure only in the description is "not enough on its own because consumers can easily
  miss disclosures in the video description". On TikTok, a text description disclosure "is
  thus very unlikely to be clear and conspicuous".
- "if the endorsement is made through visual means, the disclosure should be made at least
  visually". Summarised: if the endorsement is spoken and shown, disclose in both.
- Disclose at the start: "Having it at the beginning of the review would be better."
- Platform tools alone may not be enough: "just because a platform offers this feature is no
  guarantee that it's an effective way for influencers to disclose".
- Wording: "affiliate link" alone is not enough, and neither is "Commissionable link". "Paid
  link" next to the link is adequate. "#ad" or "Ad:" at the start is "likely" effective.
  Example sentence: "I get commissions for purchases made through links in this post."
- Language: disclose "in whatever language or languages the endorsement is made".
- Honesty: "You can't talk about your experience with a product if you haven't tried it."
  Results must be typical or the ad must state the "generally expected results".

### TikTok: Branded Content Policy (effective 30 Oct 2026)
https://www.tiktok.com/legal/page/global/bc-policy/en
- Affiliate posts count: "A product or service for which you will receive a commission on any
  sales (for instance, via an affiliate link or promotional code)".
- "When posting branded content, you must enable the commercial content disclosure toggle."
- "You must ensure that the product or service you are promoting is sufficiently clear, without
  requiring viewers to access your profile page or any links." So say "systeme.io" out loud
  and in the caption.
- "You must not make false, deceptive or misleading claims about any products or services."
- Prohibited: "pyramid schemes, multi-level marketing opportunities, too-good-to-be-true
  financial offers, payday loans and “get-rich-quick” schemes." Keep away from "make money
  online" and "earn passive income as an affiliate" angles.

### Instagram: branded content (Help Center)
https://help.instagram.com/616901995832907
- Scenario "You join a third party affiliate program and earn commissions from affiliate links
  on your posts or reels." → "Use the paid partnership label". Reason: "Posts featuring
  affiliate links earn commissions on sales and constitute an exchange of value."

### How we apply this (built: D42; the placement is our judgement on the rules above)
- The body teaches, tool-agnostic. systeme.io is named only on the end card. From the moment
  it is named, the end card shows "AD · I earn a commission from systeme.io through the link in
  my bio." It enters 0.45 s after the CTA and stays at least 2.4 s. The narration doesn't
  name it, so no spoken disclosure is needed; if a line ever names it, that line says the
  disclosure.
- Caption, first line: "Ad: I earn a commission from systeme.io through the link in my bio."
  This also names the product in the caption, as TikTok requires.
- Platform: TikTok commercial content toggle on. Instagram paid partnership label on. AI label
  stays on (D23).
- Bio: "Paid link: I earn a commission from systeme.io" next to the link.
- No first-person experience claims ("I use…", "I built…") unless the owner really uses it.
  The narrator is synthetic, so frame lines as product facts, not testimony.
- Disclose in the language of the video.

## 4. What the product is (verified)

"an all-in-one platform that replaces the separate tools most online entrepreneurs use to run
their business" (features). It covers funnels, email, website and blog, courses, communities,
booking, CRM pipelines, automation and workflows, evergreen webinars, physical products, SMS
(via your own Twilio account), link in bio, affiliate management, sub-accounts and white label.

- Users: "Over 500,000 entrepreneurs use systeme.io" (features, why-systeme). This is their
  claim. Attribute it if used.
- Founder Aurelien Amacker. "built … in 2018" (why-systeme).
- Target users (their words): "creators, coaches, consultants, and small e-commerce businesses"
  (compare).
- Limits they admit (useful for honest framing): "not designed for large-scale e-commerce with
  complex inventory, and it does not offer branded mobile apps for communities" (why-systeme).
  The calendar "does not yet match the advanced team scheduling features of Calendly Teams"
  (booking-calendar). Live webinars with Q&A: "Zoom is still the better tool"
  (automated-webinars).

## 5. Plans (pricing grid, rendered 2026-11-17)

| | Free | Startup | Webinar | Unlimited |
|---|---|---|---|---|
| Monthly | $0 | $17 | $47 | $97 |
| Annual (affiliate page) | — | $170/yr | $470/yr | $970/yr |
| Contacts | 2,000 | 5,000 | 10,000 | Unlimited |
| Emails sent / newsletters | Unlimited | Unlimited | Unlimited | Unlimited |
| Email campaigns (sequences) | 1 | 10 | 100 | Unlimited |
| Tags | 1 | 10 | 100 | Unlimited |
| Automation rules / workflows | 1 / 1 | 10 / 5 | 100 / 20 | Unlimited |
| Sales funnels / funnel steps | 3 / 15 | 10 / 50 | 50 / 300 | Unlimited |
| A/B tests, 1-click upsells, order bumps | 1 each | 10 / 10 / 10 | 50 / 100 / 100 | Unlimited |
| Evergreen webinars | 0 | 0 | 10 | Unlimited |
| Custom domains | 1 | 3 | 10 | Unlimited |
| Websites / blogs (posts) | 1 / 1 (unlimited) | 5 / 5 | 20 / 20 | Unlimited |
| Courses / students | 1 / 500 | 5 / unlimited | 20 / unlimited | Unlimited |
| Communities (members) | 1 (unlimited) | 5 | 20 | Unlimited |
| Booking events / bookings | 1 / unlimited | 5 / unl. | 20 / unl. | Unlimited |
| CRM pipelines | 1 | 5 | 20 | 100 |
| Link-in-bio pages | 1 | 3 | 10 | Unlimited |
| Coupon codes / product variants | 1 / 50 | 10 / 100 | 50 / 250 | Unlimited |
| Sub-accounts, assistant accounts | Unlimited | Unlimited | Unlimited | Unlimited |
| Transaction fees | 0% | 0% | 0% | 0% |
| 1-on-1 kickstart coaching, early access | — | — | — | Yes |
| Free migration | Unlimited plan or any annual plan ("worth $1997", affiliate page) | | | |

All plans include: Stripe, PayPal, Apple Pay, Razorpay, Flutterwave, Mercado Pago, Xendit, cash
on delivery, SMS (Twilio), Google Sheets/Calendar/Meet, Zoom, ActiveCampaign, SendGrid,
deadline funnels, 24/7 email support, run-your-own affiliate program. A "For teams" tier is
custom-priced (book a call).

Free plan: "The free plan never expires and does not require a credit card." (pricing FAQ).
Sub-accounts: "Each sub-account is a fully fledged systeme.io account with its own full set
of limits" (pricing).
0% fees means no systeme.io fee only: "you keep 100% of your course revenue minus payment
processor fees, such as Stripe or PayPal" (online-courses).

## 6. Claim bank (verbatim quotes for kit `references`)

Every line a video states should map to one of these, quoted with its URL. Base URL is
`https://systeme.io/` + the page.

| Fact a video could state | Quote | Page |
|---|---|---|
| Free plan, no card, no expiry | "The free plan never expires and does not require a credit card." | pricing |
| Free plan contents | "the free plan supports up to 2,000 contacts, 3 sales funnels, 1 blog, 1 course, 1 affiliate program, and 1 custom domain. Emails sent are unlimited." | pricing |
| No send cap | "There is no daily or monthly send cap." | email-marketing |
| Opt-in → list → automation | "When someone opts into a funnel, they are automatically added to your email list, tagged, and can be enrolled in an automation sequence without any manual setup or third-party integration." | features |
| One purchase, many actions | "a purchase can trigger a course enrollment, a welcome email, and a CRM pipeline update automatically." | features |
| Workflows | "Workflows handle multi-step automations on a visual canvas. After the trigger, you add actions, delays (minutes, hours, days, or an exact date), and decisions that split contacts into Yes/No paths" | features |
| Deadline funnels | "When the timer hits zero, the system automatically redirects visitors to an \"Offer ended\" page." | sales-funnels |
| Booking + payment | "You can require full payment or a deposit at the time of booking." | booking-calendar |
| Booking automation | "Once a booking is made, systeme.io sends a confirmation email to the client, adds a Zoom or Google Meet link to the invite, and adds the contact to your CRM." | booking-calendar |
| Calendar sync | "It syncs two ways with Google Calendar to prevent double-bookings" | booking-calendar |
| Course drip + locking | "Drip scheduling releases lessons automatically, day by day or week by week, after enrollment. You can also lock modules so students must complete earlier lessons" | online-courses |
| Course on purchase | "When a student buys your course, they get access automatically and appear in your contacts" | online-courses |
| Community access | "the system automatically grants access upon purchase and revokes it if they cancel" | online-communities |
| Evergreen webinar | "You record your presentation once, set it to run on a recurring schedule (every 15 minutes, every hour, or at specific daily times), and the system handles registration, reminders, delivery, and follow-up automatically." (Webinar plan and up) | automated-webinars |
| Timed offer in webinar | "a buy button appears 45 minutes into the presentation when you make your pitch" | automated-webinars |
| CRM auto-move | "when a contact books a call (trigger), the system moves their deal card to \"Demo Booked\" and sends a confirmation email automatically." | crm-pipelines |
| Link in bio | "Visitors land on it from your social media bio link, click the product they want, and pay immediately without leaving the page." | link-in-bio |
| Link in bio, free | "The free plan includes 1 link in bio page with up to 3 products" | link-in-bio |
| Own affiliate program | "On the 10th of every month, the system automatically generates invoices for your affiliates based on the commissions they have earned" | affiliate-management |
| Sub-accounts | "every plan allows you to create unlimited sub-accounts" | pricing |
| Physical products | "Inventory tracking updates in real time as orders come in, preventing overselling." | physical-products |
| SMS | "SMS messages are sent through Twilio, which charges per message based on destination country." | sms-marketing |
| White label | "White label is included with every systeme.io plan at no extra cost." (resale price can't be lower than systeme.io's) | white-label |

### Do not say (their own pages contradict each other, or it is puffery or unverified)
- "Your first funnel" on free. The features page says this, but the pricing grid and three FAQs
  say 3 funnels. Use 3.
- "Startup removes the funnel and course limits" (why-systeme FAQ). Wrong per the grid: 10
  funnels, 5 courses.
- "All features are available on every plan" (sms-marketing FAQ). Wrong: webinars need the
  Webinar plan, and coaching and early access are Unlimited only. "Most features" is accurate.
- Time-to-launch claims. They vary: "under 10 minutes", "within a day", "under 2 hours",
  "under an hour".
- "10 times cheaper", "industry-leading deliverability", "best tool in the world". Puffery we
  can't substantiate.
- Competitor prices ("ClickFunnels $97… total $245/month"). These are systeme.io's figures,
  not checked by us, and they date fast. Use generic categories ("a funnel tool, an email tool,
  a course platform") unless we verify each competitor's price on its own site at the time.
- Any income or results claim for the viewer, and anything about earning as an affiliate
  (TikTok get-rich-quick rule, FTC typical-results rule).
- Twilio's "$0.0079" per SMS. It's systeme.io's figure, not checked.

## 7. Video angles (my judgement)

These fit the house style: chaos → system, with lime as "the system did this for you". Each
one is a single feature and a single promise, and ends on the free plan CTA plus a deep link.

| # | Angle (hook) | Feature | Claim rows | Deep link page |
|---|---|---|---|---|
| 1 | "Four logins to sell one course" → one account | All-in-one | opt-in → list, one purchase, free plan | `register` or `/` |
| 2 | "The client paid before the call even started" | Booking + deposit + Meet link + CRM | booking rows | `booking-calendar` |
| 3 | "One sale. Four things happen. You did none of them." | Workflow | one purchase, workflows | `marketing-automation` |
| 4 | "Your offer ends at midnight, for real" | Deadline funnel | deadline funnels | `sales-funnels` |
| 5 | "Your bio link should sell, not list" | Link in bio | link-in-bio rows | `link-in-bio` |
| 6 | "Lessons that unlock themselves" | Course drip + locking | course rows | `online-courses` |
| 7 | "Members who cancel lose access automatically" | Paid community | community access | `online-communities` |
| 8 | "Ten clients, one dashboard" (agencies) | Sub-accounts | sub-accounts | `sub-accounts` |

Strongest first (judgement): 2 and 3. They show a visible chain of automated steps, which is
exactly what the existing flowRun and chaosToSystem scenes do. 1 is the broadest hook but
risks feeling like a generic ad.

Audience note: on systeme.io the referral only counts after a free signup, so the free plan
is the conversion and upgrades pay later. Videos aimed at people starting a business, coach,
course or creator, fit that better than videos aimed at existing large businesses.

## 8. Not verified / open
- TikTok bio-link eligibility. Only user reports were found (1,000 followers, or a business
  account). The official help page didn't render. Captions on either platform have no
  clickable links (not verified).
- Whether Instagram's paid partnership label requires systeme.io's account to accept the tag.
- Whether `?sa=` survives from a feature page to signup. Their page says any page works. Not
  tested, and testing it creates a click record.
- The contents of the affiliate Drive folders, and whether they include logo licence terms
  beyond the agreement.
- Consumer and advertising law outside the US (FTC only was checked).
- The owner has no systeme.io account in the studio yet. Real screen captures need one.

## 9. Studio rules this changed (resolved 2026-11-17, D42)

The owner decided affiliate videos are allowed, with the disclosure built in. The table below
is the original conflict list, kept for the record.

| Rule | Where | Conflict |
|---|---|---|
| "no affiliate links" | CLAUDE.md, STORY.md ("No affiliate links, ever."), QA.md #10, D23 (`spec.publish` rejects links) | The whole purpose |
| "no real brand names or logos in product UI"; fictional, unbranded world | CLAUDE.md, D11, STORY.md | The video must name systeme.io (TikTok rule) |
| "No fake demos of real products" | CLAUDE.md | We can't recreate their UI in Remotion. Real behaviour must be captured from a real account (STORY.md already allows this "decide with the user first") |
| "no implied endorsement" | STORY.md | An affiliate video is an endorsement, so it needs disclosure instead |
| `affiliate_conversions` stays empty | D23 note in DECISIONS.md | Would start being used |

## 10. Re-check for v008 "The booking that runs itself" (2026-11-18)

Fetched today (raw HTML; the pricing grid rendered in the bundled headless Chrome). Every fact
v008 states, on screen or in the caption, maps to a row here. Pages still say "Last updated:
April 2026".

| Fact in v008 | Quote (verbatim) | Page |
|---|---|---|
| Payment up front | "You can require full payment or a deposit at the time of booking. Clients pay via Stripe or PayPal directly on the booking confirmation page before the appointment is confirmed." | booking-calendar (FAQ) |
| …on the free plan | "Payment collection at time of booking is also available on the free plan via Stripe or PayPal." | booking-calendar (FAQ) |
| Confirmation + call link | "Once a booking is made, systeme.io sends a confirmation email to the client, adds a Zoom or Google Meet link to the invite, and adds the contact to your CRM." | booking-calendar (FAQ) |
| Reminder the day before | "By default, every new event includes two standard reminders: one sent 24 hours before and another sent 1 hour before the event starts." Up to 3 reminders, timing editable, text not editable. | https://help.systeme.io/article/10270-how-to-set-up-your-calendar-events |
| Booking free plan | Pricing grid: Booking calendar · Events 1 / 5 / 20 / Unlimited; Bookings Unlimited on every plan. Contacts 2,000 on free. Transaction fees 0 %. | pricing (rendered) |
| No card | "The free plan never expires and does not require a credit card." | pricing (FAQ) |
| Caption tip | "By default, the booking confirmation email is sent as soon as the payment process starts, even if the payment later fails or is canceled. To avoid this, go to Settings, then Notifications, then Sales, and enable the option Send the booking confirmation email only after payment is completed." | https://help.systeme.io/article/10274-how-to-sell-your-calendar-bookings |

Note: the booking FAQ says on the free plan "You can create appointment types" (plural) while
the grid says 1 event. v008 says "1 booking event type" (the grid, the stricter one).

### Posting facts checked today (for the post guide)
- TikTok, commercial content disclosure (ads.tiktok.com Help, "Last updated: January 2026"):
  post screen → "Content disclosure and ads" (or "More options" → "Content disclosure and
  ads") → turn on "Disclose commercial content" → "Your brand" or "Branded content"; tagging a
  brand partner is a further optional step. Also possible after posting (post → More options
  → Ad settings). https://ads.tiktok.com/help/article/how-to-turn-on-the-commercial-content-disclosure-setting-in-tiktok
- TikTok, website link in the profile: TikTok's own help page did not render outside the app.
  TikTok's business blog: with a Business Account, "once you reach 1000 followers, you can add
  a link to your website"; TikTok's Business registration one-pager: a registered Business
  Account can show its website link (no follower count stated). Several 2026 guides quote the
  help centre as "at least 1,000 followers, or … a Verified Business Account". **A new account
  may have no clickable link on TikTok.**
- Instagram, paid partnership label on a reel (help.instagram.com/1109894795810258, steps
  expanded in headless Chrome): Next → More options → Add paid partnership label → toggle on →
  add up to 2 brands. "Your branded content will have the paid partnership label without the
  brand partner's name if they haven't approved you yet." "If the brand denies your request,
  the paid partnership label will be removed from your content." Needs branded content tools
  enabled first (profile → Menu → Business/Creator tools and controls → Branded content → Set
  up branded content tools → Enable; help.instagram.com/1123581461537025) and a professional
  account on the partner's side.
- Not verified: the Instagram in-app wording of the AI label for a reel (the API flag
  `is_ai_generated` exists: Meta developer changelog, 2026-06-22); whether systeme.io has an
  Instagram professional account that accepts tags; the 5-link Instagram bio limit.

## 11. Publishing package facts (2026-11-18, D44)
Moved into `content/affiliate/systeme-io.ts` with their quotes. New since § 10:
- Tracking: `&tk=<tag>` after the affiliate ID, "to track the traffic source"; "tag will be added
  to all sales made from this link" (help 1508, updated 2026-08-25). Links must not use "www"
  (help 162).
- Link test (2026-11-18, `npm run verify-affiliate`): the booking-calendar link returns HTTP 200
  with no redirect, keeps `sa` and `tk`, and sets `systeme_affiliate_systemeio` (holds our ID,
  1 year) and `tk_systemeio=<tag>`; the same page without parameters sets neither. § 8's open
  question about `?sa=` surviving is answered for the click; sign-up credit is still untested.
- Payout (help 162): paid on the 10th, total over $30, minimum 30-day holding, within 30–60 days,
  profile complete, PayPal or bank transfer; 60 % computed after VAT.
- Paid bookings need setup (help 10274, 225, 132, 307, 4274): calendar event, order form/payment
  page, price plan, Paid calendar element, Stripe or PayPal Business connected and enabled per
  funnel, Google Calendar before Google Meet.

## 12. Re-check for v009 "The sale that does the rest" (2026-11-18)
Angle 3 of § 7, narrowed to a course sale. Read on the live pages today (raw HTML, the verifier's
own matcher); the claims are in `content/affiliate/systeme-io.ts` (`course.*`, `workflow.*`,
`plan.free-workflow`, `plan.free-course-limits`, `plan.free-crm`, `plan.course-fees`).
- Course access + login email (help 237, updated 2026-06-25): the course goes into a digital
  product on the order form (access type, price plan). "When they are enrolled, your customers will
  automatically receive an email with instructions on how to set a password to access the course's
  membership area." Its wording is fixed: "the automated enrollment email cannot be customized
  within systeme.io at this time" (also help 273: congratulations on your behalf, username, password
  link). So the video's "login" email is systeme.io's, not a custom welcome.
- One workflow does the rest (help 1542): trigger "New sale: When a customer purchases an offer.";
  actions include "Add to a pipeline stage" and "Send an email"; "Delay … Minutes, Hours, or Days";
  "Workflows are inactive by default"; "Workflows only trigger for events that happen after the
  workflow is activated." Features page: "The free plan includes 1 automation rule and 1 workflow."
- CRM (crm-pipelines): "the CRM pipeline feature is included on the free plan at no cost"; automation
  rules can add contacts to a stage on a purchase. A new pipeline has six default steps you can
  rename (help 3900).
- Courses on free (online-courses): "1 course with up to 500 students and 2,000 contacts"; 0 %
  transaction fees, payment processor fees apply.
- Not verified: whether the free plan's one workflow has a step limit (none documented;
  `assume.free-workflow-steps`); "Students gain complete access upon initial payment" is the help
  page's description of Full access, not a timing guarantee, so the video says "their login goes
  out", not "instantly".
- Package scope: booking-only setup facts now carry `pages: ['booking-calendar']`, the course setup
  `pages: ['online-courses']` (Fact.pages, D45), so neither video's package lists the other's steps.
