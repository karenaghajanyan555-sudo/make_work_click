import type { VideoSpec } from '../../src/video/spec.ts';
import type { FlowStep, Fragment } from '../../src/video/scenes/chaosToSystem.ts';
import { v001MemoryScore } from '../scores/v001-memory.ts';

/**
 * Video 001 — "Your business shouldn't depend on your memory."
 * Storyboard (approved 2026-11-16): docs/storyboards/v001-memory.md.
 * Narration take-01 approved (Bella × Nicole, immutable). Every beat below is timed to
 * its word timings (public/narration/v001-memory/take-01/take.json); absolute times in
 * the comments are video seconds.
 * The business, customer and app UI are fictional and unbranded.
 */

const workspace = { name: 'Juniper & Rye Bakery', initials: 'J&R', breadcrumb: 'Automations · Welcome series' };

// Authored once, used by both scenes (continuity: the to-dos become these steps).
const fragments: Fragment[] = [
  { text: 'Reply to Sam’s sign-up', tag: 'Overdue · 2d', becomes: 0 },
  { text: 'Send the welcome offer?', becomes: 1 },
  { text: 'Follow up next week', becomes: 2 },
  { text: 'Did I thank Maria?' },
  { text: 'Who hasn’t ordered back?', tag: 'Forgot · 1w', becomes: 3 },
  { text: 'Remind regulars about Friday' },
  { text: 'Update the email list' },
];

const flow: FlowStep[] = [
  { kind: 'trigger', title: 'New subscriber', subtitle: 'Sam Rivera · joined via website', chip: 'Just now', chipDone: 'Returned' },
  { kind: 'email', title: 'Send welcome email', subtitle: '“Welcome to Juniper & Rye, Sam”', chip: 'Sent', chipBefore: 'Queued' },
  { kind: 'wait', title: 'Follow-up in 3 days', subtitle: '“Your first pastry is on us”', chip: 'Thu 9:00', chipBefore: 'Waiting', chipDone: 'Sent' },
  { kind: 'goal', title: 'Customer comes back', subtitle: 'Goal · first repeat order', chip: 'Goal', chipDone: 'Goal reached' },
];

const resolvedLabel = ['Handled', 'Sent', 'Followed up', 'Came back'];
const resolved = fragments
  .filter((f): f is Fragment & { becomes: number } => f.becomes !== undefined)
  .sort((a, b) => a.becomes - b.becomes)
  .map((f) => ({ text: f.text, ...(f.tag ? { tag: f.tag } : {}), resolved: resolvedLabel[f.becomes]! }));

export const v001Memory = {
  id: 'v001-memory',
  title: 'Your business shouldn’t depend on your memory',
  series: 'N° 001',
  format: 'vertical',
  theme: 'ink',
  status: 'draft',
  scenes: [
    {
      // 0.0–5.7 s. Hook → to-dos gather and flip into the flow → the click (after "remember").
      id: 'hook',
      type: 'chaosToSystem',
      duration: 5.7,
      transitionOut: { type: 'cut' }, // continuity: flowRun opens on this exact frame
      chapters: [
        { cue: 'start', label: '01 — By memory' },
        { cue: 'click', label: '02 — By system' },
      ],
      props: {
        headline: 'Your business\nshouldn’t depend\non your *memory.*',
        resolution: 'Let the system\n**remember**.',
        workspace,
        fragments,
        flow,
        beats: {
          hookOut: 2.72, // "memory" ends 2.69
          gather: 2.78,
          flip: 3.6,
          caption: 3.2, // "Let the system remember" 3.12–4.72
          click: 4.8,
          captionOut: 5.0,
          run: 5.7, // the run happens in flowRun
        },
      },
    },
    {
      // 5.7–17.7 s (scene-local times below; add 5.7 for video time).
      id: 'run',
      type: 'flowRun',
      duration: 12,
      transitionOut: { type: 'cut' }, // continuity: endCard opens on the formed switch
      chapters: [
        { cue: 'arrive1', label: '03 — Welcome' },
        { cue: 'arrive2', label: '04 — Follow-up' },
        { cue: 'arrive3', label: '05 — Return' },
        { cue: 'resolve', label: '06 — Remembered' },
      ],
      props: {
        workspace,
        flow,
        details: [
          null,
          {
            kind: 'email',
            to: 'Sam Rivera',
            from: 'Juniper & Rye',
            subject: 'Welcome to Juniper & Rye, Sam',
            body: 'Thanks for joining us! Fresh bread is out of the oven at 7 every morning — come say hi.',
            deliveredAt: '9:41 AM',
          },
          { kind: 'wait', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], dates: ['16', '17', '18', '19', '20'], startDay: 0, startLabel: 'Welcome', sendDay: 3, sendTime: '9:00' },
          {
            kind: 'goal',
            initials: 'SR',
            customer: 'Sam Rivera',
            items: 'Sourdough loaf, 2 croissants',
            time: 'Thu 4:12 PM',
            note: 'First pastry on us · applied',
            badge: 'Repeat customer',
          },
        ],
        resolved,
        beats: {
          push: 0,
          trigger: 0.25, // 5.95 — "busy"
          steps: [
            { arrive: 0.75, done: 2.15 }, // email sent 7.85 — "anyway" 7.65–8.45
            { arrive: 3.5, done: 5.55 }, // 9.2 "Three days later" · sends 11.25 — "itself"
            { arrive: 6.9, done: 7.8 }, // 12.6 · goal reached 13.5 — "come back"
          ],
          loop: 9.0, // 14.7
          pullBack: 9.0,
          resolve: 9.85, // 15.55 — "You didn't…"; ticks ≈ 16.2–16.5 on "remember a thing"
          converge: 11.4, // 17.1 → switch formed 17.65
        },
      },
    },
    {
      // 17.7–21.0 s. The switch clicks on, wordmark, CTA ("Follow…" 18.0–20.4).
      id: 'end',
      type: 'endCard',
      duration: 3.3,
      chapters: [{ cue: 'click', label: '07 — Follow' }],
      props: {
        cta: 'Follow for more *systems* like this.',
        switchHandedOver: true,
        beats: { click: 0.15, wordmark: 0.3, cta: 0.75 },
      },
    },
  ],
  narration: {
    // Approved take: public/narration/v001-memory/take-01 (changing any text below needs a new take).
    take: 'take-01',
    lines: [
      // Captions for "hook" and "system" are set by the chaosToSystem scene (headline, resolution).
      { id: 'hook', text: "Your business shouldn't depend on your memory.", at: 0.15 },
      { id: 'system', text: 'Let the system remember.', at: 3.06 },
      { id: 'welcome', text: "You're busy. The welcome goes out anyway.", caption: 'You’re busy.\nThe welcome goes out *anyway.*', at: 5.3 },
      { id: 'followup', text: 'Three days later, the follow-up sends itself.', caption: 'Three days later,\nthe follow-up **sends itself**.', at: 9.1 },
      { id: 'back', text: 'And they come back.', caption: 'And they *come back.*', at: 12.9 },
      { id: 'payoff', text: "You didn't have to remember a thing.", caption: 'You didn’t have to\nremember *a thing.*', at: 15.4 },
      // The end card renders the CTA line itself.
      { id: 'cta', text: 'Follow for more systems like this.', at: 18.0 },
    ],
  },
  score: v001MemoryScore,
  publish: {
    coverAt: 2.5, // frame 75: the hook headline in full, both overdue to-dos legible
    title: 'Your business shouldn’t depend on your memory',
    caption: [
      'Every new customer should get a welcome, a follow-up and a reason to come back. None of it should depend on you remembering.',
      '',
      'One trigger. A welcome email that goes out on its own. A follow-up three days later. The customer comes back.',
      '',
      'Set it up once. Let the system remember.',
      '',
      'Fictional bakery, illustrative workflow. Narration voice is AI-generated.',
    ].join('\n'),
    hashtags: ['#automation', '#smallbusiness', '#emailmarketing', '#productivity'],
  },
} satisfies VideoSpec;
