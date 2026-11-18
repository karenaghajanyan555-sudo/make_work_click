/**
 * Instagram and TikTok publishing rules (pure data), each fact with its official source.
 * Verified 2026-11-18 unless a source says otherwise: quotes read from the live pages (raw HTML
 * or rendered in headless Chrome). `npm run verify-affiliate` re-reads every raw/rendered source
 * on each run; `manual` sources need a person (docs/QA.md § Gate 3). Background and the reasoning
 * behind our choices: docs/PLATFORMS.md.
 */
import type { Fact, Source } from './model.ts';

export type PlatformId = 'instagram' | 'tiktok';

/** One metric to read after posting: where it is and what it means. */
export type Metric = { name: string; meaning: string; status: 'verified' | 'unverified'; source?: Source };

export type PlatformRules = {
  name: string;
  /** Caption limit as the platform counts it. */
  caption: { max: number; units: 'chars' | 'utf16'; hashtags?: number; source: Source };
  /** Bio text limit (characters), when verified. */
  bioMax?: number;
  facts: { disclosure: Fact[]; ai: Fact[]; bio: Fact[] };
  analytics: Metric[];
};

const D = '2026-11-18';
const IG_PPL = 'https://help.instagram.com/1109894795810258';
const TT_LINK = 'https://www.tiktok.com/support/faq_detail?id=7581821550328896012';
const TT_AI = 'https://support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content';
const TT_BC = 'https://www.tiktok.com/legal/page/global/bc-policy/en';
const TT_DISC = 'https://ads.tiktok.com/help/article/how-to-turn-on-the-commercial-content-disclosure-setting-in-tiktok';

export const PLATFORMS: Record<PlatformId, PlatformRules> = {
  instagram: {
    name: 'Instagram Reels',
    caption: {
      max: 2200,
      units: 'chars',
      hashtags: 30,
      source: { url: 'https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media', quote: 'Maximum 2200 characters, 30 hashtags, and 20 @ tags.', method: 'manual', checked: '2026-11-17' },
    },
    facts: {
      disclosure: [
        {
          id: 'ig.affiliate-needs-label',
          text: 'Posts with affiliate links earn commissions on sales and are an exchange of value: use the paid partnership label.',
          status: 'verified',
          source: { url: 'https://help.instagram.com/616901995832907', quote: 'Posts featuring affiliate links earn commissions on sales and constitute an exchange of value.', method: 'rendered', checked: D },
        },
        {
          id: 'ig.enable-tools',
          text: 'Set up branded content tools once: profile, Menu, Creator or Business tools and controls, Branded content, Set up branded content tools, Enable.',
          status: 'verified',
          how: 'Profile → Menu (top right) → Creator tools and controls (or Business tools and controls) → Branded content → Set up branded content tools → Enable.',
          source: { url: 'https://help.instagram.com/1123581461537025', quote: 'Tap Set up branded content tools.', method: 'rendered', checked: D },
        },
        {
          id: 'ig.eligible',
          text: 'Your account is eligible for branded content tools (if Enable is not offered, Instagram lets you request a review).',
          status: 'account',
          how: 'Same screen as above: "Enable" means eligible; otherwise "request a review".',
          source: { url: 'https://help.instagram.com/1123581461537025', quote: 'If you are not eligible, you can request a review.', method: 'rendered', checked: D },
        },
        {
          id: 'ig.reel-steps',
          text: 'On a reel: after Next, tap More options, tap Add paid partnership label and turn the Add paid partnership label toggle on.',
          status: 'verified',
          how: 'More options → Add paid partnership label → toggle on (on the screen after Next).',
          source: { url: IG_PPL, quote: 'Tap Add paid partnership label and then turn the Add paid partnership label toggle on.', method: 'rendered', click: 'Tag a brand partner in a reel', checked: D },
        },
        {
          id: 'ig.brand-optional-risk',
          text: 'If a tagged brand denies the request, the paid partnership label is removed from the content.',
          status: 'verified',
          how: 'Turn the label on; tag the brand only if the app requires one, then re-check the post the next day.',
          source: { url: IG_PPL, quote: 'If the brand denies your request, the paid partnership label will be removed from your content.', method: 'rendered', checked: D },
        },
        {
          id: 'ig.brand-unapproved',
          text: 'Before a brand approves you, the content has the paid partnership label without the brand partner name.',
          status: 'verified',
          source: { url: IG_PPL, quote: 'Your branded content will have the paid partnership label without the brand partner’s name if they haven’t approved you yet', method: 'rendered', checked: D },
        },
      ],
      ai: [
        {
          id: 'ig.ai-required',
          text: 'Meta requires people to use its disclosure and label tool when they post organic content with realistic AI-generated audio or video.',
          status: 'verified',
          source: { url: 'https://about.fb.com/news/2026/02/meta-prepares-for-2026-us-midterms/', quote: 'We require people to use this disclosure and label tool when they post organic content', method: 'rendered', checked: D },
        },
        {
          id: 'ig.ai-steps',
          text: 'The reel share screen has an "Add AI label" toggle (in some app versions under Advanced settings).',
          status: 'unverified',
          how: 'Look for "Add AI label" before sharing; third-party guides only, no Meta help page with the steps could be loaded.',
        },
      ],
      bio: [
        {
          id: 'ig.bio-links',
          text: 'Add the link: Profile, Edit profile, tap Links, then Add external link to add the URL for your website, then Done.',
          status: 'verified',
          how: 'Profile → Edit profile → Links → Add external link → paste the URL → Done.',
          source: { url: 'https://help.instagram.com/362497417173378', quote: 'Tap Links, then tap Add external link to add the URL for your website.', method: 'rendered', click: 'iPhone App Help', checked: D },
        },
        {
          id: 'ig.bio-five',
          text: 'You can add up to 5 websites to your Instagram profile.',
          status: 'verified',
          source: { url: 'https://help.instagram.com/362497417173378', quote: 'You can add up to 5 websites to your Instagram profile.', method: 'rendered', click: 'iPhone App Help', checked: D },
        },
        { id: 'ig.bio-length', text: 'The bio holds up to 150 characters.', status: 'unverified', how: 'Instagram Help page 936495066470190 as quoted by a search engine; the page itself did not load.' },
      ],
    },
    analytics: [
      { name: 'Views', meaning: 'The number of times your content was played or displayed.', status: 'verified', source: { url: 'https://help.instagram.com/788388387972460', quote: 'The number of times your content was played or displayed.', method: 'rendered', checked: D } },
      { name: 'Viewers (accounts reached)', meaning: 'Unique accounts that saw the reel.', status: 'verified', source: { url: 'https://help.instagram.com/788388387972460', quote: 'Viewers: The number of unique accounts that have', method: 'rendered', checked: D } },
      { name: 'Likes, comments, shares, saves', meaning: 'Interactions on the reel.', status: 'unverified' },
      { name: 'Average watch time, skip rate', meaning: 'How long people watched; who skipped in the first 3 s (names from Meta’s API docs, not the app).', status: 'unverified' },
      { name: 'Follows', meaning: 'Accounts that followed from the reel.', status: 'unverified' },
      { name: 'Profile activity / external link taps', meaning: 'Taps on the bio link. Not documented per reel; read it in the account’s insights.', status: 'unverified' },
    ],
  },
  tiktok: {
    name: 'TikTok',
    caption: {
      max: 2200,
      units: 'utf16',
      source: { url: 'https://developers.tiktok.com/doc/content-posting-api-reference-direct-post', quote: 'The maximum length is 2200 in UTF-16 runes.', method: 'manual', checked: '2026-11-17' },
    },
    bioMax: 80,
    facts: {
      disclosure: [
        {
          id: 'tt.affiliate-is-branded',
          text: 'Branded content includes a product or service for which you receive a commission on any sales, for instance via an affiliate link.',
          status: 'verified',
          source: { url: TT_BC, quote: 'A product or service for which you will receive a commission on any sales', method: 'rendered', checked: D },
        },
        {
          id: 'tt.toggle-required',
          text: 'When posting branded content, you must enable the commercial content disclosure toggle.',
          status: 'verified',
          source: { url: TT_BC, quote: 'When posting branded content, you must enable the commercial content disclosure toggle.', method: 'rendered', checked: D },
        },
        {
          id: 'tt.product-clear',
          text: 'The promoted product must be clear without requiring viewers to access your profile page or any links: name it in the video or the caption.',
          status: 'verified',
          source: { url: TT_BC, quote: 'without requiring viewers to access your profile page or any links', method: 'rendered', checked: D },
        },
        {
          id: 'tt.toggle-steps',
          text: 'On the post screen: Content disclosure and ads (or More options, then Content disclosure and ads), turn on Disclose commercial content, choose Branded content.',
          status: 'verified',
          how: 'Post screen → Content disclosure and ads (or More options → Content disclosure and ads) → Disclose commercial content: on → Branded content → Save. The brand-partner tag is optional: skip it.',
          source: { url: TT_DISC, quote: 'Turn on Disclose commercial content.', method: 'raw', checked: D },
        },
        {
          id: 'tt.toggle-after',
          text: 'The disclosure can also be turned on after posting: post, More options, Ad settings.',
          status: 'verified',
          source: { url: TT_DISC, quote: 'Click Ad settings.', method: 'raw', checked: D },
        },
      ],
      ai: [
        {
          id: 'tt.ai-required',
          text: 'TikTok requires creators to label all AI-generated content that contains realistic images, audio, and video (our narrator is realistic synthetic audio).',
          status: 'verified',
          source: { url: TT_AI, quote: 'We also require creators to label all AI-generated content that contains realistic images, audio, and video', method: 'rendered', checked: D },
        },
        {
          id: 'tt.ai-steps',
          text: 'Video: tap More options, then turn on the AI-generated content setting before posting.',
          status: 'verified',
          how: 'Post screen → More options → AI-generated content: on.',
          source: { url: TT_AI, quote: 'Tap More options ..., then turn on the AI-generated content setting', method: 'rendered', checked: D },
        },
        {
          id: 'tt.ai-distribution',
          text: 'TikTok says turning on the AI-generated content setting does not affect the distribution of the video if it follows the Community Guidelines.',
          status: 'verified',
          source: { url: TT_AI, quote: "Turning on the AI-generated content setting won't affect the distribution of your video as long as it doesn't violate our Community Guidelines.", method: 'rendered', checked: D },
        },
        { id: 'tt.ai-permanent', text: 'Assume the label cannot be removed after posting.', status: 'unverified', how: 'TikTok says so for auto labels only; set it right before posting.' },
      ],
      bio: [
        {
          id: 'tt.link-eligibility',
          text: 'You can add a link to a website on your TikTok profile if you have at least 1,000 followers, or if you have a Verified Business Account.',
          status: 'verified',
          source: { url: TT_LINK, quote: 'You can add a link to a website on your TikTok profile if you have at least 1,000 followers, or if you have a Verified Business Account.', method: 'rendered', checked: D },
        },
        {
          id: 'tt.link-available',
          text: 'Your profile shows the Links field (1,000 followers or a Verified Business Account).',
          status: 'account',
          how: 'Profile → Edit profile: is there "Links → Add"? If not, do not post an affiliate video on TikTok yet: its "link in bio" would lead nowhere.',
        },
        {
          id: 'tt.link-steps',
          text: 'In the TikTok app: Profile, Edit profile, next to Links tap Add, follow the steps.',
          status: 'verified',
          how: 'Profile → Edit profile → next to Links, tap Add.',
          source: { url: TT_LINK, quote: 'Next to Links, tap Add.', method: 'rendered', checked: D },
        },
        {
          id: 'tt.in-app-browser',
          text: 'A tapped profile link opens in the TikTok in-app browser.',
          status: 'verified',
          source: { url: TT_LINK, quote: 'When you tap a link on someone\'s profile, our in-app browser will open the page.', method: 'rendered', checked: D },
        },
        {
          id: 'tt.bio-length',
          text: 'Bios cannot exceed 80 characters.',
          status: 'verified',
          source: { url: 'https://www.tiktok.com/support/faq_detail?id=7096681482017692162', quote: 'Bios cannot exceed 80 characters.', method: 'rendered', checked: D },
        },
      ],
    },
    analytics: [
      { name: 'Post views', meaning: 'Views of the post (Overview).', status: 'verified', source: { url: 'https://www.tiktok.com/creator-academy/en/article/tool-analytics-intro', quote: 'View your post views, profile views, likes, comments, shares', method: 'rendered', checked: D } },
      { name: 'Average watch time', meaning: 'The average duration viewers spent watching.', status: 'verified', source: { url: 'https://www.tiktok.com/creator-academy/en/article/tool-analytics-intro', quote: 'This represents the average duration viewers spent watching your content.', method: 'rendered', checked: D } },
      { name: 'Watched full video', meaning: 'Finish rate: the percentage who watched until the last few seconds.', status: 'verified', source: { url: 'https://www.tiktok.com/creator-academy/en/article/tool-analytics-intro', quote: 'This is your finish rate or the percentage of people who watched your content until the last few seconds.', method: 'rendered', checked: D } },
      { name: 'Traffic source', meaning: 'How viewers found the post (For You, search, profile…).', status: 'verified', source: { url: 'https://www.tiktok.com/creator-academy/en/article/tool-analytics-intro', quote: 'data to find out how viewers discovered your posts', method: 'rendered', checked: D } },
      { name: 'Profile views', meaning: 'Visits to your profile, where the link is.', status: 'verified', source: { url: 'https://www.tiktok.com/creator-academy/en/article/tool-analytics-intro', quote: 'View your post views, profile views, likes, comments, shares', method: 'rendered', checked: D } },
    ],
  },
};

/**
 * The law behind the platform rules (United States, FTC Endorsement Guides). Our application is a
 * judgement (D42): the endorsement is visual (end card), so the tag is visual and the caption
 * leads with it; the voice names no product and gives no opinion.
 */
export const DISCLOSURE_LAW: Fact[] = [
  {
    id: 'ftc.unavoidable',
    text: 'On social media or the internet, the disclosure should be unavoidable.',
    status: 'verified',
    source: { url: 'https://www.law.cornell.edu/cfr/text/16/255.0', quote: 'In any communication using an interactive electronic medium, such as social media or the internet, the disclosure should be unavoidable', method: 'raw', checked: D },
  },
  {
    id: 'ftc.same-means',
    text: 'If the representation is made through both visual and audible means, the disclosure should be made in the visual and audible portions.',
    status: 'verified',
    source: { url: 'https://www.law.cornell.edu/cfr/text/16/255.0', quote: "if the representation is made through both visual and audible means, the disclosure should be made in the communication's visual and audible portions", method: 'raw', checked: D },
  },
  {
    id: 'ftc.description-not-enough',
    text: 'A disclosure only in the video description is not enough on its own: consumers can easily miss it.',
    status: 'verified',
    source: { url: 'https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking', quote: 'not enough on its own because consumers can easily miss disclosures in the video description', method: 'manual', checked: '2026-11-17' },
  },
  { id: 'law.outside-us', text: 'Advertising law outside the United States was not checked.', status: 'unverified', how: 'If you target a specific country (EU, UK…), check its rules before posting there.' },
];
