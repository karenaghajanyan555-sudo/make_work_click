import { defineVideo } from '../../src/video/define.ts';
import type { FlowStep } from '../../src/video/scenes/chaosToSystem.ts';
import type { ResolvedTodo } from '../../src/video/scenes/flowRun.ts';
import { timing } from '../timing/v008-bookings-run-themselves.ts';

/**
 * N° 008 — "The booking that runs itself". The first affiliate video (D42, partner systeme.io).
 *
 * A knowledge video first: booking a paid call by hand (messages back and forth, chasing the
 * payment, sending the link, remembering the reminder) becomes one booking link that takes the
 * payment up front, sends the confirmation with the call link and the reminder the day before.
 * Covering the end card, it still teaches the method. systeme.io appears on the end card and in
 * the post copy only; the UI is the studio's fictional, unbranded product world.
 *
 * Every step shown is something systeme.io's free plan does (re-checked on the live pages
 * 2026-11-18, docs/affiliate/systeme-io.md § 6 + the v008 rows):
 *   payment up front  "You can require full payment or a deposit at the time of booking." +
 *                     "Payment collection at time of booking is also available on the free plan
 *                     via Stripe or PayPal." (booking-calendar)
 *   confirmation      "Once a booking is made, systeme.io sends a confirmation email to the client,
 *                     adds a Zoom or Google Meet link to the invite, and adds the contact to your CRM."
 *   reminder          "By default, every new event includes two standard reminders: one sent 24
 *                     hours before and another sent 1 hour before the event starts." (help 10270)
 *   free plan         pricing grid: Booking calendar · Events 1 · Bookings Unlimited.
 *
 * Written against the narration: lines follow the take's rhythm, beats pin to spoken words.
 * Same arc and motion as v003 (signature: chaosToSystem → flowRun → endCard, smooth).
 */

const workspace = { name: 'Harbor Lane Coaching', initials: 'HL', breadcrumb: 'Automations · Bookings' };

/** The automation, authored once (chaosToSystem builds it, flowRun runs it). */
const flow: FlowStep[] = [
  { kind: 'trigger', title: 'Time picked', subtitle: 'Strategy call · Thu 10:00', chip: 'Just now', chipDone: 'Booked' },
  { kind: 'goal', icon: 'card', title: 'Paid up front', subtitle: 'Card · before the call', chip: 'Paying', chipBefore: 'Waiting', chipDone: 'Paid' },
  { kind: 'email', title: 'Send the confirmation', subtitle: '“You’re booked · Thu 10:00”', chip: 'Sent', chipBefore: 'Queued' },
  { kind: 'wait', title: 'Reminder, day before', subtitle: '“See you tomorrow at 10:00”', chip: 'Wed 10:00', chipBefore: 'Waiting', chipDone: 'Sent' },
];

/** The owner's to-dos the steps replace (same text as the fragments that become them). */
const resolved: ResolvedTodo[] = [
  { text: 'Find a time with Dana', tag: '6 messages', resolved: 'Booked' },
  { text: 'Did Dana pay yet?', tag: 'Unpaid', resolved: 'Paid' },
  { text: 'Send Dana the call link', resolved: 'Sent' },
  { text: 'Remind Dana on Wednesday', resolved: 'Reminded' },
];

export const v008BookingsRunThemselves = defineVideo(
  {
    id: 'v008-bookings-run-themselves',
    title: 'The booking that runs itself',
    series: 'N° 008',
    format: 'vertical',
    theme: 'ink',
    preset: 'editorial',
    status: 'final',
    affiliate: {
      partner: 'systeme-io',
      page: 'booking-calendar',
      // Every systeme.io fact the video and the caption state (content/affiliate/systeme-io.ts).
      claims: [
        'booking.pay-at-booking',
        'booking.pay-free-plan',
        'booking.confirmation-call-link',
        'booking.reminder-day-before',
        'booking.confirm-after-payment',
        'plan.free-no-card',
        'plan.free-booking-limits',
        'plan.processor-fees',
      ],
    },
    brief: {
      topic: 'A booking link that takes the payment up front, sends the confirmation with the call link and the reminder by itself',
      audience: 'Coaches, consultants and freelancers who book paid calls by messaging back and forth',
      hook: 'Booking one call shouldn’t take ten messages.',
      cta: 'The tool I’d use for this: systeme.io · link in bio',
    },
    narration: {
      voice: 'bella-nicole-v1',
      // Gold (D18): the draft the owner published 2026-11-18, frozen as take-01.
      take: 'take-01',
      lines: [
        // The hook scene sets its own type: the first two lines carry no caption.
        { id: 'hook', text: "Booking one call shouldn't take ten messages." },
        { id: 'system', text: 'Let one link do the booking.', pause: 0.4 },
        { id: 'step1', text: 'They pick a time, and pay up front.', caption: 'They pick a time,|and pay *up front.*', pause: 0.5 },
        { id: 'step2', text: 'The confirmation goes out, with the call link.', caption: 'The confirmation\n**goes out**,|with the call *link.*', pause: 0.45 },
        { id: 'step3', text: 'The day before, the reminder sends itself.', caption: 'The day before,|the reminder\n**sends itself.**', pause: 0.5 },
        { id: 'payoff', text: 'Ten messages became one link.', caption: 'Ten messages\nbecame *one link.*', pause: 0.8 },
        // The end card shows the tool (with the "Ad" tag); the voice only points to the bio.
        { id: 'cta', text: 'Set it up once. Link in bio.', pause: 1 },
      ],
    },
    scenes: [
      {
        id: 'hook',
        type: 'chaosToSystem',
        say: ['hook', 'system'],
        transitionOut: { type: 'cut' },
        chapters: [
          { cue: 'start', label: '01 — By hand' },
          { cue: 'click', label: '02 — By system' },
        ],
        props: {
          headline: 'Booking one call\nshouldn’t take\n*ten messages.*',
          resolution: 'Let one link\n**do the booking**.',
          workspace,
          fragments: [
            { text: 'Find a time with Dana', tag: '6 messages', becomes: 0 },
            { text: 'Send Dana the call link', becomes: 2 },
            { text: 'Remind Dana on Wednesday', becomes: 3 },
            { text: 'Check Dana’s time zone' },
            { text: 'Did Dana pay yet?', tag: 'Unpaid', becomes: 1 },
            { text: 'Is Thursday still free?' },
            { text: 'Reply to Dana’s DM' },
          ],
          flow,
          smooth: true,
          beats: {
            hookOut: { line: 'hook', edge: 'end', offset: 0.03 },
            gather: { line: 'hook', edge: 'end', offset: 0.09 },
            caption: { line: 'system', edge: 'start', offset: 0.1 },
            flip: { line: 'system', edge: 'start', offset: 0.5 },
            click: { line: 'system', edge: 'end', offset: 0.08 },
            captionOut: { line: 'system', edge: 'end', offset: 0.28 },
            run: { line: 'step1', edge: 'start', offset: 0.38 },
          },
        },
      },
      {
        id: 'run',
        type: 'flowRun',
        say: ['step1', 'step2', 'step3', 'payoff'],
        lead: -0.4,
        transitionOut: { type: 'cut' },
        chapters: [
          { cue: 'arrive1', label: '03 — Paid' },
          { cue: 'arrive2', label: '04 — Confirmed' },
          { cue: 'arrive3', label: '05 — Reminded' },
          { cue: 'resolve', label: '06 — Nothing typed' },
        ],
        sounds: [
          { cue: 'open1', id: 'open' },
          { cue: 'order1', id: 'notify', variant: 1 },
          { cue: 'open2', id: 'open' },
          { cue: 'merge2', id: 'tick', variant: 4 },
          { cue: 'opened2', id: 'notify' },
          { cue: 'open3', id: 'open' },
          { cue: 'stamp', id: 'notify', variant: 1 },
        ],
        props: {
          workspace,
          flow,
          details: [
            null,
            {
              kind: 'goal',
              initials: 'DO',
              customer: 'Dana Okafor',
              items: 'Strategy call · Thu 10:00',
              time: 'Mon 8:12 PM',
              note: 'Paid by card',
              badge: 'Slot confirmed',
              amount: 150,
            },
            {
              kind: 'email',
              to: 'Dana Okafor',
              from: 'Harbor Lane Coaching',
              subject: 'You’re booked for Thursday, Dana',
              body: 'Thanks for booking. Your call link is below and in your calendar invite. See you Thursday at 10:00.',
              deliveredAt: '8:12 PM',
              mergeField: '{first name}',
              opened: 'Opened · 8:14 PM',
            },
            {
              kind: 'wait',
              days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
              dates: ['9', '10', '11', '12', '13'],
              startDay: 0,
              startLabel: 'Booked',
              sendDay: 2,
              sendTime: '10:00',
            },
          ],
          resolved,
          camera: 'follow',
          glow: 'follow',
          smooth: true,
          trails: false,
          stamp: 'Done by the system',
          beats: {
            push: 0,
            // The run scene opens 0.4 s into "They pick a time": the slot is picked on "time".
            trigger: { line: 'step1', word: 'time', offset: 0.1 },
            steps: [
              // The payment lands on "and pay", counts up to $150 and is "Paid" just after "front".
              { arrive: { line: 'step1', word: 'and', offset: -0.15 }, done: { line: 'step1', word: 'front', offset: 0.6 } },
              { arrive: { line: 'step2', edge: 'start', offset: 0.1 }, done: { line: 'step2', word: 'out' } },
              { arrive: { line: 'step3', edge: 'start', offset: -0.3 }, done: { line: 'step3', word: 'itself' } },
            ],
            loop: { line: 'payoff', edge: 'start', offset: -0.7 },
            pullBack: { line: 'payoff', edge: 'start', offset: -0.7 },
            resolve: { line: 'payoff', edge: 'start', offset: 0.15 },
            converge: { line: 'payoff', edge: 'end', offset: 0.1 },
          },
        },
      },
      {
        id: 'end',
        type: 'endCard',
        say: ['cta'],
        lead: 0.3,
        chapters: [{ cue: 'click', label: '07 — The tool' }],
        sounds: [{ cue: 'click', id: 'swell' }],
        props: {
          cta: 'The tool I’d use for this:\n*systeme.io* · link in bio',
          burst: true,
          smooth: true,
          switchHandedOver: true,
          beats: { click: 0.15, wordmark: 0.3, cta: { line: 'cta', edge: 'start', offset: 0.45 } },
        },
      },
    ],
    audio: {
      compose: {
        harmony: 'clarity',
        anchor: 'hook.click',
        sections: [
          { at: 'hook.start', style: 'intro' },
          { at: 'hook.click', style: 'pulse' },
          { at: 'run.arrive2', style: 'lift' },
          { at: 'run.resolve', style: 'hold' },
          { at: 'end.click', style: 'home' },
        ],
      },
    },
    // postText puts the disclosure first ("Ad: I earn a commission from systeme.io …"), so it
    // reads before "more" on every platform. Every partner fact below: see the header comment.
    publish: {
      coverAt: 3.0,
      title: 'The booking that runs itself',
      caption:
        'Booking one call shouldn’t take ten messages.\n\n' +
        'The setup is one booking link:\n' +
        '1. They pick a time and pay up front.\n' +
        '2. The confirmation goes out with the call link.\n' +
        '3. The reminder sends itself the day before.\n\n' +
        'You can set this up on systeme.io’s free plan: 1 booking event type, unlimited bookings, and payment at booking through your own Stripe or PayPal account (you connect it; their fees apply). No credit card needed to start.\n\n' +
        'Tip: by default the confirmation email goes out as soon as payment starts. In systeme.io, Settings → Notifications → Sales → “Send the booking confirmation email only after payment is completed.”\n\n' +
        'The screens in this video are illustrative, not systeme.io’s interface. Narration voice is AI-generated.',
      hashtags: ['#coachingbusiness', '#smallbusiness', '#automation', '#systemeio'],
    },
  },
  timing,
);
