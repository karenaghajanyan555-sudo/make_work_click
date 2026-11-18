import type { PartnerRecord } from '../../src/publishing/partner.ts';

/**
 * systeme.io: the publishing record (claim bank + program, link, plan and posting facts).
 * Every quote was read on the live page on the `checked` date; `npm run verify-affiliate -- <id>`
 * re-reads them before each package. Research notes and the "do not say" list:
 * docs/affiliate/systeme-io.md. Word a claim no stronger than its quote.
 */
const D = '2026-11-18';
const SIO = 'https://systeme.io/';
const BOOKING = `${SIO}booking-calendar`;
const PRICING = `${SIO}pricing`;
const AGREEMENT = `${SIO}affiliate-agreement`;
const PROGRAM = `${SIO}affiliate-program`;
const HOW = 'https://help.systeme.io/article/162-how-the-systeme-io-affiliate-program-works';
const TAG = 'https://help.systeme.io/article/1508-how-to-tag-an-affiliate-link';
const SELL = 'https://help.systeme.io/article/10274-how-to-sell-your-calendar-bookings';
const EVENTS = 'https://help.systeme.io/article/10270-how-to-set-up-your-calendar-events';
const FEATURES = `${SIO}features`;
const COURSES = `${SIO}online-courses`;
const CRM = `${SIO}crm-pipelines`;
const SELL_COURSE = 'https://help.systeme.io/article/237-how-to-sell-an-online-course';
const WORKFLOWS = 'https://help.systeme.io/article/1542-workflow-feature';
const PIPELINE = 'https://help.systeme.io/article/3900-how-to-create-a-pipeline';
/** Facts that belong only to booking videos' packages (v008) or course videos' (v009): Fact.pages. */
const BOOKING_PAGES = ['booking-calendar'];
const COURSE_PAGES = ['online-courses'];

export const systemeIoRecord: PartnerRecord = {
  partner: 'systeme-io',

  claims: {
    'booking.pay-at-booking': {
      text: 'You can require full payment or a deposit at the time of booking.',
      source: { url: BOOKING, quote: 'You can require full payment or a deposit at the time of booking.', method: 'raw', checked: D },
    },
    'booking.pay-free-plan': {
      text: 'Payment collection at the time of booking is available on the free plan via Stripe or PayPal.',
      source: { url: BOOKING, quote: 'Payment collection at time of booking is also available on the free plan via Stripe or PayPal.', method: 'raw', checked: D },
    },
    'booking.confirmation-call-link': {
      text: 'Once a booking is made, systeme.io sends a confirmation email to the client and adds a Zoom or Google Meet link to the invite.',
      source: { url: BOOKING, quote: 'Once a booking is made, systeme.io sends a confirmation email to the client, adds a Zoom or Google Meet link to the invite, and adds the contact to your CRM.', method: 'raw', checked: D },
    },
    'booking.reminder-day-before': {
      text: 'By default, every new event sends reminders 24 hours and 1 hour before the event starts.',
      source: { url: EVENTS, quote: 'By default, every new event includes two standard reminders: one sent 24 hours before and another sent 1 hour before the event starts.', method: 'raw', checked: D },
    },
    'booking.confirm-after-payment': {
      text: 'By default the booking confirmation email is sent as soon as the payment process starts; a setting sends it only after payment is completed.',
      source: { url: SELL, quote: 'Send the booking confirmation email only after payment is completed', method: 'raw', checked: D },
    },
    'plan.free-no-card': {
      text: 'The free plan never expires and does not require a credit card.',
      source: { url: PRICING, quote: 'The free plan never expires and does not require a credit card.', method: 'raw', checked: D },
    },
    'plan.free-booking-limits': {
      text: 'Booking calendar events: 1 on the free plan; bookings: unlimited.',
      source: { url: PRICING, quote: 'Events 1 5 20 Unlimited Bookings Unlimited Unlimited Unlimited Unlimited', method: 'rendered', checked: D },
    },
    'plan.processor-fees': {
      text: 'systeme.io charges 0% transaction fees; you keep the full amount minus the payment processor standard rate.',
      source: { url: BOOKING, quote: "systeme.io charges 0% transaction fees, you keep the full amount minus the payment processor's standard rate.", method: 'raw', checked: D },
    },
    // v009 "The sale that does the rest" (read on the live pages 2026-11-18).
    'course.access-on-purchase': {
      text: 'When a student buys your course, they get access automatically and appear in your contacts.',
      source: { url: COURSES, quote: 'When a student buys your course, they get access automatically and appear in your contacts', method: 'raw', checked: D },
    },
    'course.access-email': {
      text: 'When they are enrolled, customers automatically receive an email with instructions to set a password and access the course.',
      source: { url: SELL_COURSE, quote: "When they are enrolled, your customers will automatically receive an email with instructions on how to set a password to access the course's membership area.", method: 'raw', checked: D },
    },
    'course.access-email-fixed': {
      text: 'The automated enrollment email cannot be customized.',
      source: { url: SELL_COURSE, quote: 'the automated enrollment email cannot be customized within systeme.io at this time.', method: 'raw', checked: D },
    },
    'workflow.new-sale-trigger': {
      text: 'Workflow trigger "New sale": when a customer purchases an offer.',
      source: { url: WORKFLOWS, quote: 'New sale: When a customer purchases an offer.', method: 'raw', checked: D },
    },
    'workflow.pipeline-action': {
      text: 'A workflow action can add the contact to a pipeline stage.',
      source: { url: WORKFLOWS, quote: 'Add to a pipeline stage', method: 'raw', checked: D },
    },
    'workflow.delay-days': {
      text: 'A workflow delay can wait minutes, hours or days before the next step.',
      source: { url: WORKFLOWS, quote: 'You can set the delay in: Minutes, Hours, or Days.', method: 'raw', checked: D },
    },
    'workflow.send-email': {
      text: 'A workflow action can send an email.',
      source: { url: WORKFLOWS, quote: 'Send an email / Send email to specific address', method: 'raw', checked: D },
    },
    'plan.free-workflow': {
      text: 'The free plan includes 1 automation rule and 1 workflow.',
      source: { url: FEATURES, quote: 'The free plan includes 1 automation rule and 1 workflow.', method: 'raw', checked: D },
    },
    'plan.free-course-limits': {
      text: 'The free plan includes 1 course with up to 500 students and 2,000 contacts.',
      source: { url: COURSES, quote: 'The free plan includes 1 course with up to 500 students and 2,000 contacts.', method: 'raw', checked: D },
    },
    'plan.free-crm': {
      text: 'The CRM pipeline feature is included on the free plan at no cost.',
      source: { url: CRM, quote: 'the CRM pipeline feature is included on the free plan at no cost.', method: 'raw', checked: D },
    },
    'plan.course-fees': {
      text: 'systeme.io takes 0% transaction fees on every plan; you keep your course revenue minus payment processor fees, such as Stripe or PayPal.',
      source: { url: COURSES, quote: 'systeme.io takes 0% transaction fees on every plan, so you keep 100% of your course revenue minus payment processor fees, such as Stripe or PayPal.', method: 'raw', checked: D },
    },
  },

  link: [
    {
      id: 'link.any-page',
      text: 'Any systeme.io page becomes an affiliate link by adding ?sa= and your ID to the URL.',
      status: 'verified',
      source: { url: PROGRAM, quote: 'You can start promoting any page on systeme.io simply by adding ?sa=YOURID to the URL', method: 'raw', checked: D },
    },
    {
      id: 'link.no-www',
      text: 'Adding www to a systeme.io affiliate link prevents the tracking from working: always link to systeme.io without www.',
      status: 'verified',
      source: { url: HOW, quote: 'Adding "www" to a systeme.io affiliate link will prevent the tracking from working correctly.', method: 'raw', checked: D },
    },
  ],

  tracking: {
    param: 'tk',
    tags: { instagram: 'instagram', tiktok: 'tiktok' },
    facts: [
      {
        id: 'tracking.tk',
        text: 'The tk parameter, added after the affiliate ID, adds a tag to an affiliate link to track the traffic source.',
        status: 'verified',
        source: { url: TAG, quote: 'add a tag to an affiliate link to track the traffic source', method: 'raw', checked: D },
      },
      {
        id: 'tracking.tk-sales',
        text: 'The tag is added to all sales made from the tagged link.',
        status: 'verified',
        source: { url: TAG, quote: 'tag will be added to all sales made from this link.', method: 'raw', checked: D },
      },
      {
        id: 'tracking.where-shown',
        text: 'Where the tag appears in your affiliate dashboard (sales list, export) is not documented.',
        status: 'account',
        how: 'After the first sale: Dashboard → Affiliate Dashboard → find the sale and look for "instagram" / "tiktok".',
      },
      {
        id: 'tracking.no-click-split',
        text: 'Clicks and free sign-ups per tag: the help pages document the tag on sales only.',
        status: 'unverified',
        how: 'Use each platform’s own link-tap numbers for clicks (section 10).',
      },
    ],
    test: { affiliateCookie: 'systeme_affiliate_systemeio', tagCookie: 'tk_systemeio' },
  },

  program: [
    { id: 'program.rate', text: 'You earn 60% of the amount of all sales of systeme.io and their courses.', status: 'verified', source: { url: HOW, quote: 'You earn 60% of the amount of all sales of systeme.io and our courses', method: 'raw', checked: D } },
    { id: 'program.vat', text: 'VAT is first deducted from the total price (if applicable), then the 60% is calculated, so commissions vary by buyer.', status: 'verified', source: { url: HOW, quote: 'VAT is first deducted from the total price (if applicable)', method: 'raw', checked: D } },
    { id: 'program.recurring', text: 'Lifetime recurring: you earn every month the referral stays subscribed.', status: 'verified', source: { url: PROGRAM, quote: 'Lifetime recurring, earn every month the referral stays subscribed', method: 'raw', checked: D, negationReviewed: { word: 'not', why: '"not just for 30/60 days" is the next table cell (attribution), not this one' } } },
    { id: 'program.signup-required', text: 'If a lead clicks your affiliate link but never signs up for a free account, no referral is recorded.', status: 'verified', source: { url: AGREEMENT, quote: 'If a lead clicks your affiliate link but never signs up for a free account, no referral is recorded', method: 'raw', checked: D } },
    { id: 'program.locked-to-email', text: 'After a free signup through your link, your affiliate ID stays attached to the lead email address.', status: 'verified', source: { url: AGREEMENT, quote: "Your affiliate ID stays attached to that lead's email address", method: 'raw', checked: D } },
    { id: 'program.payment-page-exception', text: 'Exception: if the lead later buys through another affiliate link on a systeme.io payment page, that affiliate gets the commission.', status: 'verified', source: { url: HOW, quote: "if they later use another affiliate's link specifically for one of our payment pages to complete their purchase, the commission will go to that affiliate.", method: 'raw', checked: D } },
    { id: 'program.customer-30-days', text: 'A customer must remain a customer during a 30-day period for the commission.', status: 'verified', source: { url: AGREEMENT, quote: 'a Customer must remain a customer during a 30-day period', method: 'raw', checked: D, negationReviewed: { word: 'not', why: '"must not have been completed by You" is clause (iv) of the same list' } } },
    { id: 'program.no-self-referral', text: 'Purchases by you or a party affiliated to you, such as an employee, spouse or family member, earn no commission.', status: 'verified', source: { url: AGREEMENT, quote: 'must not have been completed by You or any party affiliated to You such as Your employee, spouse or family member', method: 'raw', checked: D } },
    { id: 'program.refund', text: 'You are not eligible for commission when the customer demands a refund within 30 days of the purchase date.', status: 'verified', source: { url: AGREEMENT, quote: 'demands a refund within 30 days of the purchase date', method: 'raw', checked: D } },
    { id: 'program.payout-day', text: 'Commissions are paid on the 10th of each month.', status: 'verified', source: { url: HOW, quote: 'Commissions are paid on the 10th of each month', method: 'raw', checked: D } },
    { id: 'program.payout-minimum', text: 'The total amount of your commissions must exceed $30 to be paid.', status: 'verified', source: { url: HOW, quote: 'The total amount of your commissions must exceed $30', method: 'raw', checked: D } },
    { id: 'program.holding', text: 'There is a minimum 30-day holding period before commissions are paid out.', status: 'verified', source: { url: HOW, quote: 'There is a minimum 30-day holding period before commissions are paid out.', method: 'raw', checked: D } },
    { id: 'program.payout-window', text: 'Payment of commissions occurs within 30 to 60 days, provided all the conditions are met.', status: 'verified', source: { url: HOW, quote: 'The payment of commissions always occurs within 30 to 60 days, provided all the conditions are met', method: 'raw', checked: D } },
    { id: 'program.can-change', text: 'systeme.io reserves the right to alter or change the commission amounts.', status: 'verified', source: { url: AGREEMENT, quote: 'We reserve the right to alter or change the commission amounts', method: 'raw', checked: D } },
  ],

  plan: [
    { id: 'plan.free-limits', text: 'The free plan supports up to 2,000 contacts, 3 sales funnels, 1 blog, 1 course, 1 affiliate program and 1 custom domain.', status: 'verified', source: { url: PRICING, quote: 'the free plan supports up to 2,000 contacts, 3 sales funnels, 1 blog, 1 course, 1 affiliate program, and 1 custom domain.', method: 'raw', checked: D } },
    { id: 'plan.free-other-limits', text: 'Other free-plan features have lower limits, like 1 automation rule, 1 email campaign and 500 students.', status: 'verified', source: { url: PRICING, quote: 'Other features have lower limits on the free plan, like 1 automation rule, 1 email campaign and 500 students.', method: 'raw', checked: D } },
    {
      id: 'plan.paid-booking-setup',
      pages: BOOKING_PAGES,
      text: 'A paid booking needs a calendar event, an order form or payment page, and a price plan, then the Paid calendar element on the page.',
      status: 'configure',
      how: 'Calendar event → order form/payment page with a digital product that includes the event → price plan → add the "Paid calendar" element in the page editor.',
      source: { url: SELL, quote: 'A calendar event ( How to set up your calendar events ) An order form/payment page', method: 'raw', checked: D },
    },
    {
      id: 'plan.stripe',
      text: 'Card payments need a Stripe account connected under Settings, Payment Gateways, with your personal information verified.',
      status: 'configure',
      how: 'Profile picture → Settings → Payment Gateways → Connect (Stripe) → choose country + business type → verify personal information → Authorize.',
      source: { url: 'https://help.systeme.io/article/225-how-to-connect-your-stripe-account-to-systeme-io', quote: 'On the next screen, verify your personal information. This is required to activate payments on systeme.io.', method: 'raw', checked: D },
    },
    {
      id: 'plan.paypal',
      text: 'PayPal payments need a PayPal Business account connected to systeme.io.',
      status: 'configure',
      how: 'Settings → Gateways (under Payments) → Connect next to PayPal → log in → Allow. Order forms need email, first name and last name fields.',
      source: { url: 'https://help.systeme.io/article/132-paypal-integration', quote: 'A PayPal Business account', method: 'raw', checked: D },
    },
    {
      id: 'plan.enable-in-funnel',
      text: 'Payment methods are switched on per funnel: funnel Settings, tick Credit card or debit card and PayPal, Save.',
      status: 'configure',
      how: 'Sites → Sales funnels → ⋯ next to the funnel → Settings → tick the payment methods → Save.',
      source: { url: 'https://help.systeme.io/article/307-how-to-activate-payments-by-stripe-or-paypal', quote: 'Check both boxes, Credit card or debit card (3), and PayPal (4).', method: 'raw', checked: D },
    },
    {
      id: 'plan.meet-integration',
      pages: BOOKING_PAGES,
      text: 'Google Meet links need the Google Meet integration, which first needs Google Calendar connected.',
      status: 'configure',
      how: 'Settings → Integrations → Google Meet → Manage calendar integration → Connect your Google account.',
      source: { url: 'https://help.systeme.io/article/4274-how-to-integrate-google-meet-with-systeme-io', quote: 'you must first integrate Google Calendar', method: 'raw', checked: D },
    },
    {
      id: 'plan.course-sell-setup',
      pages: COURSE_PAGES,
      text: 'Selling a course: add the course to a digital product on your order form, and define a price plan to save the product.',
      status: 'configure',
      how: 'Create the course → Sites → Sales funnels → a funnel with an order form → on the order form: new digital product, add the course as a resource, access type Full access, create a price plan → Save.',
      source: { url: SELL_COURSE, quote: 'It is essential to define a price plan to save your digital product', method: 'raw', checked: D },
    },
    {
      id: 'plan.pipeline-setup',
      pages: COURSE_PAGES,
      text: 'A new pipeline is automatically configured with six default steps, which you can modify (rename one to Customers before building the workflow).',
      status: 'configure',
      how: 'CRM → Pipelines → Create → name it, rename a stage to Customers → Save.',
      source: { url: PIPELINE, quote: 'by default, when a new sales pipeline is created, it is automatically configured with six steps', method: 'raw', checked: D },
    },
    {
      id: 'plan.workflow-setup',
      pages: COURSE_PAGES,
      text: 'Workflows are inactive by default: activate the workflow in the Workflows list after you build it.',
      status: 'configure',
      how: 'Automations → Workflows → + Create → name it → + Add a trigger: New sale (choose the course offer) → (+) Action: Add to a pipeline stage (Customers) → (+) Delay: 3 days → (+) Action: Send an email (your check-in) → Workflows list → ⋯ → Activate.',
      source: { url: WORKFLOWS, quote: 'Workflows are inactive by default.', method: 'raw', checked: D },
    },
    {
      id: 'plan.workflow-not-retroactive',
      pages: COURSE_PAGES,
      text: 'Workflows only trigger for events after the workflow is activated: buyers from before are not included.',
      status: 'verified',
      source: { url: WORKFLOWS, quote: 'Workflows only trigger for events that happen after the workflow is activated.', method: 'raw', checked: D },
    },
  ],

  account: [
    { id: 'account.affiliate-id', text: 'The affiliate ID in the link is the one in your affiliate dashboard.', status: 'account', how: 'systeme.io → Dashboard → Affiliate Dashboard → your affiliate ID (copy icon). It must equal the sa= value in both bio links.' },
    { id: 'account.payout-method', text: 'A payout method (PayPal or bank transfer) is set and your profile information is complete.', status: 'account', how: 'Profile picture → Settings → Affiliate Commissions Payouts → choose PayPal or bank transfer; complete your profile (needed for invoices).' },
  ],

  assumptions: [
    { id: 'assume.signup-credited', text: 'A free signup through these links is credited to you. Not tested: it needs a real new account by someone else (self-referral is excluded).', status: 'unverified', how: 'Watch the affiliate dashboard after posting.' },
    { id: 'assume.tag-on-deep-link', text: 'The tk tag on a feature page (not the homepage) is reported like the help page example on the homepage. The cookie is set (link test); reporting is not documented for this case.', status: 'unverified' },
    { id: 'assume.in-app-browser', text: 'Instagram and TikTok in-app browsers keep the tracking cookie until the viewer signs up. If the viewer leaves the in-app browser before signing up, the click may not be linked.', status: 'unverified' },
    { id: 'assume.free-funnel', pages: BOOKING_PAGES, text: 'A paid-booking order page uses one of the 3 free-plan funnels (an inference from the setup steps, not stated by systeme.io).', status: 'unverified' },
    { id: 'assume.free-workflow-steps', pages: COURSE_PAGES, text: 'The free plan’s one workflow holds all four steps of this setup (trigger, pipeline stage, delay, email). No step limit is documented; not tried in an account.', status: 'unverified', how: 'If the editor refuses a step: move “Add to a pipeline stage” to the free plan’s 1 automation rule (trigger New sale). The CRM page says rules can add contacts to a pipeline stage on a purchase. The delay and the check-in email stay in the workflow (rules have no delay).' },
  ],
};
