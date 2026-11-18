import { defineVideo } from '../../src/video/define.ts';
import type { FlowStep } from '../../src/video/scenes/chaosToSystem.ts';
import type { ResolvedTodo } from '../../src/video/scenes/flowRun.ts';
import { timing } from '../timing/v009-sale-does-the-rest.ts';

/**
 * N° 009 — "The sale that does the rest". The second affiliate video (D42, partner systeme.io).
 *
 * A knowledge video first: after a course sale the owner still has three jobs (send the login,
 * add the buyer to the customer list, check in a few days later). One workflow, triggered by the
 * sale, does all three. Covering the end card, it still teaches the method. systeme.io appears on
 * the end card and in the post copy only; the UI is the studio's fictional, unbranded world.
 *
 * Every step shown is something systeme.io's free plan does (read on the live pages 2026-11-18,
 * content/affiliate/systeme-io.ts, docs/affiliate/systeme-io.md § 12):
 *   login email   "When they are enrolled, your customers will automatically receive an email with
 *                 instructions on how to set a password to access the course's membership area."
 *                 (help 237; its wording is systeme.io's own: "cannot be customized")
 *   new sale      workflow trigger "New sale: When a customer purchases an offer." (help 1542)
 *   pipeline      workflow action "Add to a pipeline stage" (help 1542); CRM free (crm-pipelines)
 *   check-in      workflow delay "Minutes, Hours, or Days." + "Send an email" (help 1542)
 *   free plan     "The free plan includes 1 automation rule and 1 workflow." (features);
 *                 "1 course with up to 500 students and 2,000 contacts" (online-courses)
 *
 * Written against the narration: lines follow the take's rhythm, beats pin to spoken words.
 * Same signature arc as v003/v008 (chaosToSystem → flowRun → endCard, smooth); the step order
 * (email → goal → wait) and the `contact` icon on the pipeline step keep it from reading as v008 again.
 */

const workspace = { name: 'Wren Studio', initials: 'WS', breadcrumb: 'Automations · After the sale' };

/** The automation, authored once (chaosToSystem builds it, flowRun runs it). */
const flow: FlowStep[] = [
  { kind: 'trigger', icon: 'card', title: 'Course bought', subtitle: 'Watercolor Foundations · $49', chip: 'Just now', chipDone: 'Paid' },
  { kind: 'email', title: 'Send the login', subtitle: '“Your login is ready”', chip: 'Sent', chipBefore: 'Queued' },
  { kind: 'goal', icon: 'contact', title: 'Add to the pipeline', subtitle: 'Stage · Customers', chip: 'Added', chipBefore: 'Waiting' },
  { kind: 'wait', title: 'Check-in, 3 days later', subtitle: '“How’s lesson 1 going?”', chip: 'Fri 9:00', chipBefore: 'Waiting', chipDone: 'Sent' },
];

/** The owner's to-dos the steps replace (same text as the fragments that become them). */
const resolved: ResolvedTodo[] = [
  { text: 'Did Maya’s payment clear?', tag: 'Not checked', resolved: 'Paid' },
  { text: 'Send Maya her login', tag: 'Waiting 2h', resolved: 'Sent' },
  { text: 'Add Maya to my customers', resolved: 'Added' },
  { text: 'Check in with Maya Friday', resolved: 'Checked in' },
];

export const v009SaleDoesTheRest = defineVideo(
  {
    id: 'v009-sale-does-the-rest',
    title: 'The sale that does the rest',
    series: 'N° 009',
    format: 'vertical',
    theme: 'ink',
    preset: 'editorial',
    status: 'draft',
    affiliate: {
      partner: 'systeme-io',
      page: 'online-courses',
      // Every systeme.io fact the video and the caption state (content/affiliate/systeme-io.ts).
      claims: [
        'course.access-on-purchase',
        'course.access-email',
        'course.access-email-fixed',
        'workflow.new-sale-trigger',
        'workflow.pipeline-action',
        'workflow.delay-days',
        'workflow.send-email',
        'plan.free-workflow',
        'plan.free-course-limits',
        'plan.free-crm',
        'plan.course-fees',
        'plan.free-no-card',
      ],
    },
    brief: {
      topic: 'One course sale that sends the login, adds the buyer to the pipeline and checks in three days later, by itself',
      audience: 'Coaches and creators who sell an online course and do the after-sale work by hand',
      hook: 'Every sale comes with three more jobs.',
      cta: 'The tool I’d use for this: systeme.io · link in bio',
    },
    narration: {
      voice: 'bella-nicole-v1',
      lines: [
        // The hook scene sets its own type: the first two lines carry no caption.
        { id: 'hook', text: 'Every sale you make comes with three more jobs.' },
        { id: 'system', text: 'Let the sale do the rest.', pause: 0.4 },
        { id: 'step1', text: 'They buy the course, and their login goes out.', caption: 'They buy the course,|and their login\n**goes out.**', pause: 0.5 },
        { id: 'step2', text: 'Then they land in your pipeline, as a customer.', caption: 'Then they land\nin your pipeline,|as a *customer.*', pause: 0.45 },
        { id: 'step3', text: "Three days later, a check-in asks how it's going.", caption: 'Three days later,|a check-in asks\n**how it’s going.**', pause: 0.5 },
        { id: 'payoff', text: 'One sale. Three jobs. None of them yours.', caption: 'One sale. Three jobs.|*None of them yours.*', pause: 0.8 },
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
          headline: 'Every sale\ncomes with\n*three more jobs.*',
          resolution: 'Let the sale\n**do the rest**.',
          workspace,
          fragments: [
            { text: 'Did Maya’s payment clear?', tag: 'Not checked', becomes: 0 },
            { text: 'Add Maya to my customers', becomes: 2 },
            { text: 'Check in with Maya Friday', becomes: 3 },
            { text: 'Reply to Maya’s email' },
            { text: 'Send Maya her login', tag: 'Waiting 2h', becomes: 1 },
            { text: 'Where’s the welcome PDF?' },
            { text: 'Update the sales sheet' },
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
          { cue: 'arrive1', label: '03 — Login sent' },
          { cue: 'arrive2', label: '04 — In the pipeline' },
          { cue: 'arrive3', label: '05 — Checked in' },
          { cue: 'resolve', label: '06 — Nothing typed' },
        ],
        sounds: [
          { cue: 'open1', id: 'open' },
          { cue: 'open2', id: 'open' },
          { cue: 'order2', id: 'notify', variant: 1 },
          { cue: 'open3', id: 'open' },
          { cue: 'stamp', id: 'notify', variant: 1 },
        ],
        props: {
          workspace,
          flow,
          details: [
            null,
            {
              kind: 'email',
              to: 'Maya Torres',
              from: 'Wren Studio',
              subject: 'You’re in: Watercolor Foundations',
              body: 'Welcome in! Your login is ready: choose a password and start with Lesson 1.',
              deliveredAt: '9:41 PM',
            },
            {
              kind: 'goal',
              initials: 'MT',
              customer: 'Maya Torres',
              items: 'Watercolor Foundations',
              time: 'Tue 9:41 PM',
              note: 'Source · New sale',
              badge: 'Added to pipeline',
              amount: 49,
            },
            {
              kind: 'wait',
              days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
              dates: ['17', '18', '19', '20', '21'],
              startDay: 0,
              startLabel: 'Bought',
              sendDay: 3,
              sendTime: '9:00',
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
            // The run scene opens 0.4 s into "They buy the course": the sale lands on "course".
            trigger: { line: 'step1', word: 'course', offset: 0.1 },
            steps: [
              { arrive: { line: 'step1', word: 'and', offset: -0.15 }, done: { line: 'step1', word: 'out', offset: 0.2 } },
              { arrive: { line: 'step2', edge: 'start', offset: 0.1 }, done: { line: 'step2', word: 'customer' } },
              { arrive: { line: 'step3', edge: 'start', offset: -0.3 }, done: { line: 'step3', word: 'going' } },
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
      title: 'The sale that does the rest',
      caption:
        'Every sale comes with three more jobs.\n\n' +
        'Let the sale do them:\n' +
        '1. They buy, and their login goes out by itself.\n' +
        '2. They land in your pipeline as a customer.\n' +
        '3. Three days later, a check-in email asks how it’s going.\n\n' +
        'You can set this up on systeme.io’s free plan: 1 course (up to 500 students), 1 workflow and a CRM pipeline. You take payments through your own Stripe or PayPal account (systeme.io takes 0%; their fees apply). No credit card needed to start.\n\n' +
        'How: put the course in your order form’s product (the login email then sends itself). Then one workflow: New sale → Add to a pipeline stage → Delay 3 days → Send an email.\n\n' +
        'Note: the login email is systeme.io’s own template; its wording can’t be changed. Narration voice is AI-generated.',
      hashtags: ['#onlinecourse', '#coursecreator', '#automation', '#systemeio'],
    },
  },
  timing,
);
