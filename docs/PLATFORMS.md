# Platform specs (verified against primary sources)

Checked 2026-11-16. Re-verify before relying on anything older than ~6 months.

| Platform | What the source says | Source |
|---|---|---|
| YouTube (uploads) | MP4, moov at front (fast start), no edit lists; H.264 High, progressive, CABAC, 4:2:0, VBR; 2 consecutive B-frames, closed GOP of half the frame rate; AAC-LC (or Opus) 48 kHz, stereo; 1080p 24–30 fps SDR: 8 Mbps recommended | https://support.google.com/youtube/answer/1722171 |
| YouTube Shorts | Up to 3 minutes; vertical uploads; max resolution 1080p | https://support.google.com/youtube/answer/10059070 |
| Instagram Reels (Meta ads guide) | 9:16; recommended 1440×2560; MP4/MOV, H.264, square pixels, fixed frame rate, progressive; stereo AAC ≥ 128 kbps; 0 s–15 min; keep 14% top, 35% bottom, 6% left/right free of text/logos | https://www.facebook.com/business/ads-guide/update/video/instagram-reels |
| TikTok (in-feed ads) | 9:16 recommended, ≥ 540×960; .mp4/.mov/.mpeg/.3gp/.avi; ≤ 500 MB; ≤ 10 min; bitrate ≥ 516 kbps; safe zone only as downloadable template (not checked) | https://ads.tiktok.com/help/article/video-ads-specifications |
| Facebook Reels (Reels Publishing API) | MP4; 9:16; 1080×1920 recommended (min 540×960); 24–60 fps; 3–90 s; 4:2:0, closed GOP 2–5 s, H.264/H.265, fixed frame rate, progressive; AAC-LC 48 kHz stereo ≥ 128 kb/s | https://developers.facebook.com/documentation/video-api/guides/reels-publishing (checked 2026-11-16) |

## How we apply them (our decisions)
- One upload file for all four (`src/pipeline/deliver.ts`, D19): 1080×1920, 30 fps, H.264
  High yuv420p, CRF 20 preset slow (v001: 12.7 Mbps, 34.2 MB for 21 s), closed GOP of 15
  frames, 2 B-frames, faststart, no edit lists; AAC-LC 320 kb/s, 48 kHz stereo.
  (The earlier "CRF 16 ≈ 10–13 Mbps" note was wrong: CRF 16 measured 43 Mbps on this grain.
  CRF 16 is now only the internal picture master.)
- GOP: YouTube asks for half the frame rate (0.5 s); the Meta Reels API page says 2–5 s.
  We follow YouTube in the one file. Judgement, not verified: app uploads re-encode and accept
  short GOPs. If a Meta upload ever fails or looks worse, make a Meta variant with `keyint=60`.
- Safe zone: Meta's 14% / 35% / 6% for every platform (strictest numeric guidance found).
- Not verified: organic (non-ad) overlay sizes per platform, platform loudness normalisation,
  TikTok safe-zone template contents, Reels length limits for in-app (non-API) uploads,
  how a 9:16 cover is cropped on profile grids (our covers keep the headline in the middle
  third so any centre crop keeps it).

## Posting (checked 2026-11-16)
| Topic | What the source says | Source |
|---|---|---|
| YouTube: AI disclosure | Disclose realistic altered or synthetic content: a real person saying or doing something they didn't, altered footage of real events, realistic-looking scenes that didn't happen. Not required for clearly unrealistic or animated content, minor edits, or production help. The page does not cover synthetic narration by a voice that is not a real person. | https://support.google.com/youtube/answer/14328491 |
| YouTube: title, description | Title ≤ 100 characters, no `<` or `>`; description ≤ 5,000 bytes | https://developers.google.com/youtube/data/reference/rest/v3/videos, https://support.google.com/youtube/answer/57404 |
| Meta (Instagram, Facebook): AI disclosure | "We require people to use this disclosure and label tool when they post organic content" with photorealistic video or realistic-sounding audio "that was digitally created or altered, and we may apply penalties if they fail to do so." (post of 2026-02-19) | https://about.fb.com/news/2026/02/meta-prepares-for-2026-us-midterms/ |
| TikTok: AI disclosure | "We require creators to label AI-generated or significantly edited content that shows realistic-looking scenes or people." Unlabeled content "may be removed, restricted, or labeled". Effective 2026-09-24. The page does not mention synthetic voices. | https://www.tiktok.com/community-guidelines/en/integrity-authenticity |
| TikTok: AI label covers audio (checked 2026-11-18) | "We also require creators to label all AI-generated content that contains realistic images, audio, and video". Steps: "Tap More options ..., then turn on the AI-generated content setting." "Turning on the AI-generated content setting won't affect the distribution of your video as long as it doesn't violate our Community Guidelines." | https://support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content |
| Bio (checked 2026-11-18) | TikTok: "Bios cannot exceed 80 characters." Instagram: "You can add up to 5 websites to your Instagram profile." "Tap Links, then tap Add external link to add the URL for your website." (iPhone tab). Instagram's 150-character bio limit: not verified (page did not load). | https://www.tiktok.com/support/faq_detail?id=7096681482017692162, https://help.instagram.com/362497417173378 |
| TikTok: TTS narration | **Not verified.** A search summary of the Creator Academy said generic TTS narration needs no disclosure; the page itself would not load. | (tiktok.com/creator-academy, not loaded) |
| Instagram: caption (checked 2026-11-17) | "Maximum 2200 characters, 30 hashtags, and 20 @ tags." (Graph API, the `caption` field when publishing media) | https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media |
| TikTok: caption (checked 2026-11-17) | `post_info.title`: "The maximum length is 2200 in UTF-16 runes." (Content Posting API, direct post) | https://developers.tiktok.com/doc/content-posting-api-reference-direct-post |
| Facebook Reels: caption | **Not verified.** The package holds Facebook copy to the 2,200 limit above. | — |

How we apply it (our decision): **turn the AI label on for every platform** and say
"Narration voice is AI-generated" in the caption. Meta and TikTok require it for our realistic
synthetic narration (TikTok since we read its AI page on 2026-11-18: "realistic … audio"). On
YouTube it is a choice: the verified rule doesn't clearly cover a synthetic non-person
narrator, and being open about it fits a brand about AI tools.
Not verified: whether the label affects reach.

## Affiliate disclosure (checked 2026-11-17; how we apply it: D42)
| Topic | What the source says | Source |
|---|---|---|
| TikTok: affiliate = branded content | Branded content includes "A product or service for which you will receive a commission on any sales (for instance, via an affiliate link or promotional code)". "When posting branded content, you must enable the commercial content disclosure toggle." The product must be clear "without requiring viewers to access your profile page or any links", e.g. named "verbally and/or in the text caption". Prohibited: "“get-rich-quick” schemes". Effective 30 Oct 2026. | https://www.tiktok.com/legal/page/global/bc-policy/en |
| Instagram: affiliate links | "You join a third party affiliate program and earn commissions from affiliate links on your posts or reels." → "Use the paid partnership label". | https://help.instagram.com/616901995832907 |
| FTC: clear and conspicuous | Visual representation → disclosure "in at least the communication's visual portion"; visual and audible → "in the communication's visual and audible portions"; social media → "should be unavoidable". The Guides are the FTC's interpretation of section 5, "the basis for voluntary compliance". | 16 CFR 255.0 (https://www.law.cornell.edu/cfr/text/16/255.0) |
| FTC: placement, tools | A disclosure only in a video description is "not enough on its own"; on TikTok a text description is "very unlikely to be clear and conspicuous"; on Instagram it must show "without having to click 'more'"; "it's always best to add your own disclosure even if a platform offers its own disclosure tool". (Quotes extracted with WebFetch: the site blocks direct download.) | https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking |

| TikTok: where the toggle is (checked 2026-11-18) | "On the post screen, click Content disclosure and ads" (not in TikTok One: "More options" first) → "Turn on Disclose commercial content" → "Your brand or Branded content"; tagging a brand partner is a further step. Also after posting: post → More options → Ad settings. "If you don't display the proper disclosure, your post may be removed or restricted." | https://ads.tiktok.com/help/article/how-to-turn-on-the-commercial-content-disclosure-setting-in-tiktok (Last updated January 2026) |
| Instagram: label on a reel (checked 2026-11-18) | "Tap More options. Tap Add paid partnership label and then turn the Add paid partnership label toggle on." Up to 2 brands. Unapproved brand: label "without the brand partner's name"; "If the brand denies your request, the paid partnership label will be removed from your content." First enable branded content tools (profile → Menu → Business/Creator tools and controls → Branded content → Set up branded content tools → Enable). | https://help.instagram.com/1109894795810258, https://help.instagram.com/1123581461537025 |
| TikTok: website link in the profile (checked 2026-11-18) | "You can add a link to a website on your TikTok profile if you have at least 1,000 followers, or if you have a Verified Business Account." Steps: "Next to Links, tap Add." "When you tap a link on someone's profile, our in-app browser will open the page." | https://www.tiktok.com/support/faq_detail?id=7581821550328896012 |

Not verified: Facebook's affiliate case (only Instagram's help page spells it out), YouTube's
paid-promotion setting, Instagram's in-app AI-label wording for a reel, whether the labels reduce reach, and non-US law.

## Licences
- Remotion (package `LICENSE.md`, remotion.dev/docs/license/faq): free for individuals and
  for-profit organisations with up to 3 people, commercial use included; larger teams need a
  company licence. Re-check if the team grows.
- Kokoro-82M weights: Apache-2.0 (https://huggingface.co/hexgrad/Kokoro-82M).
- Fonts: SIL OFL 1.1 (see `public/fonts/OFL-*.txt`).
- Sound samples: VCSL, CC0 1.0 — README: "you can do whatever you want with these sounds
  (even make commercial software), no royalties, no credit, no special terms"
  (https://github.com/sgossner/VCSL, commit c1ea7bc; `assets/sound/manifest.json`).
