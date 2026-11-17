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
| TikTok: TTS narration | **Not verified.** A search summary of the Creator Academy said generic TTS narration needs no disclosure; the page itself would not load. | (tiktok.com/creator-academy, not loaded) |

How we apply it (our decision): **turn the AI label on for every platform** and say
"Narration voice is AI-generated" in the caption. Meta requires it for our realistic
synthetic narration. On YouTube and TikTok it is a choice: the verified rules don't clearly
cover a synthetic non-person narrator, and being open about it fits a brand about AI tools.
Not verified: whether the label affects reach.

## Licences
- Remotion (package `LICENSE.md`, remotion.dev/docs/license/faq): free for individuals and
  for-profit organisations with up to 3 people, commercial use included; larger teams need a
  company licence. Re-check if the team grows.
- Kokoro-82M weights: Apache-2.0 (https://huggingface.co/hexgrad/Kokoro-82M).
- Fonts: SIL OFL 1.1 (see `public/fonts/OFL-*.txt`).
- Sound samples: VCSL, CC0 1.0 — README: "you can do whatever you want with these sounds
  (even make commercial software), no royalties, no credit, no special terms"
  (https://github.com/sgossner/VCSL, commit c1ea7bc; `assets/sound/manifest.json`).
