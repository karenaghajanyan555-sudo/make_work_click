import { pin, type StoryKit } from '../../src/orchestrator/kit.ts';

/**
 * Kit "onboarding" — client onboarding that runs itself. Editorial arc (one library scene
 * per line): the same questions from every new client → signing starts everything →
 * files and the kickoff arrive on their own → before/after → every client ready.
 * Consultancy, clients and app are fictional and unbranded.
 */
export const onboardingKit: StoryKit = {
  id: 'onboarding',
  label: 'Client onboarding',
  short: 'Onboarding',
  angle: 'Signing the contract starts the whole onboarding: welcome, files, access and kickoff, with nobody copying emails.',
  promise: 'Every new client gets the same great start without a single manual email.',
  arc: 'editorial',
  preset: 'cinematic',
  harmony: 'focus',
  beats: [
    {
      id: 'hook',
      section: 'hook',
      label: 'Every new client',
      replaceable: true,
      lines: [{ text: 'Every new client asks the same questions.' }, { text: 'New client. Same questions. Again.' }],
      scene: {
        type: 'hook',
        transitionOut: { type: 'blur' },
        props: {
          fragments: [
            { text: 'Send the welcome pack' },
            { text: 'When’s the kickoff?', tag: 'Unanswered' },
            { text: 'Where are their files?' },
            { text: 'Share drive access' },
            { text: 'Contract signed?', tag: 'Pending · 3d' },
            { text: 'Book the intro call' },
          ],
          beats: { out: pin('hook', undefined, { fallback: 'end', offset: 0.05 }) },
        },
      },
    },
    {
      id: 'problem',
      section: 'problem',
      label: 'By hand',
      lines: [{ text: 'And you answer every one by hand.', caption: 'And you answer\nevery one *by hand.*', pause: 0.25 }],
      scene: {
        type: 'problem',
        props: {
          counter: 'Unanswered',
          items: [
            { meta: 'Lena · 9:14 AM', text: 'What do you need from me?' },
            { meta: 'Omar · 11:02 AM', text: 'When is our kickoff?', tag: 'No reply' },
            { meta: 'Lena · 1:40 PM', text: 'Where do I upload files?' },
            { meta: 'Priya · 4:25 PM', text: 'Who do I talk to day to day?', tag: 'No reply' },
          ],
          beats: { first: 0.1 },
        },
      },
    },
    {
      id: 'signed',
      section: 'explanation',
      label: 'Signed',
      claims: ['workflow-triggers'],
      lines: [{ text: 'The moment they sign, onboarding runs itself.', caption: 'The moment they sign,|onboarding **runs itself.**', pause: 0.5 }],
      scene: {
        type: 'timeline',
        chapterCue: 'event0',
        props: {
          title: 'New client · Priya Shah',
          events: [
            { time: '9:41', title: 'Contract signed', detail: 'Shah Atelier · 12-week project', owner: 'PS', badge: 'Signed' },
            { time: '9:42', title: 'Welcome pack sent', detail: 'Guide, timeline, contacts', badge: 'Sent' },
            { time: '9:42', title: 'Intake form sent', detail: 'Files and access, one link', badge: 'Sent' },
            { time: 'Thu', title: 'Kickoff booked', detail: 'Thu 10:00 · 45 min', badge: 'Booked' },
          ],
          stamp: 'Onboarding running',
          beats: { start: pin('signed', 'moment'), last: pin('signed', 'runs'), stamp: pin('signed', 'itself', { fallback: 'end' }) },
        },
      },
    },
    {
      id: 'ready',
      section: 'explanation',
      label: 'Ready',
      lines: [{ text: 'Files, access and answers arrive before the kickoff.', caption: 'Files, access\nand answers|arrive before\nthe *kickoff.*', pause: 0.35 }],
      scene: {
        type: 'notifications',
        chapterCue: 'notice0',
        props: {
          items: [
            { app: 'Forms', icon: 'doc', title: 'Intake form complete', body: 'Priya Shah · 6 files attached', time: '2:14' },
            { app: 'Calendar', icon: 'calendar', title: 'Kickoff confirmed', body: 'Thu 10:00 · Priya Shah', time: '2:15' },
            { app: 'Oakline Flow', icon: 'spark', title: 'Client ready', body: 'Onboarding complete · nothing missing', time: '2:15', system: true },
          ],
          expand: {
            index: 2,
            rows: [
              { label: 'Files', text: '6 received, filed' },
              { label: 'Access', text: 'Drive and analytics shared' },
              { label: 'Kickoff', text: 'Thu 10:00 · agenda sent' },
            ],
          },
          beats: { first: 0.15, last: pin('ready', 'answers'), expand: pin('ready', 'kickoff', { fallback: 'end' }) },
        },
      },
    },
    {
      id: 'compare',
      section: 'explanation',
      label: 'By system',
      lines: [{ text: 'No copy and paste. No chasing files.', caption: 'No copy and paste.\nNo *chasing files.*', pause: 0.3 }],
      scene: {
        type: 'comparison',
        chapterCue: 'click',
        transitionOut: { type: 'wipe' },
        props: {
          before: { label: 'By hand', items: ['Copy the welcome email', 'Chase the missing files', 'Find a time for kickoff'] },
          after: { label: 'By system', items: ['Welcome pack on signing', 'Files in one link', 'Client books the kickoff'] },
          beats: { click: pin('compare', 'no', { nth: 2, offset: -0.1 }) },
        },
      },
    },
    {
      id: 'payoff',
      section: 'payoff',
      label: 'Day one',
      lines: [{ text: 'Every client, ready on day one.', pause: 0.3 }],
      scene: {
        type: 'payoff',
        transitionOut: { type: 'focusPull' },
        chapterCue: 'check0',
        props: {
          items: [
            { text: 'What do you need from me?', resolved: 'Answered' },
            { text: 'When is our kickoff?', tag: 'No reply', resolved: 'Booked' },
            { text: 'Where do I upload files?', resolved: 'Received' },
            { text: 'Who do I talk to?', resolved: 'Introduced' },
          ],
          beats: { items: 0.2, interval: 0.24, statement: pin('payoff', 'ready') },
        },
      },
    },
    { id: 'cta', section: 'cta', label: 'Follow', lines: [{ text: 'Follow for more systems like this.', pause: 0.35 }] },
  ],
  compose: {
    anchor: 'signed.event0',
    sections: [
      { at: 'hook.start', style: 'intro' },
      { at: 'signed.event0', style: 'pulse' },
      { at: 'ready.expand', style: 'lift' },
      { at: 'payoff.start', style: 'hold' },
      { at: 'end.click', style: 'home' },
    ],
  },
  publish: {
    caption: [
      'Every new client asks the same questions. What do you need from me? When is the kickoff? Where do the files go?',
      'Let signing the contract start everything: the welcome pack, the intake form, the kickoff booking.',
      'Set it up once. Every client gets the same great start.',
    ],
    hashtags: ['#automation', '#clientonboarding', '#consulting', '#smallbusiness'],
  },
  assumptions: [
    'Consultants and agencies answer the same onboarding questions for every new client.',
    'Onboarding steps (welcome, intake, access, kickoff) are sent by hand today.',
  ],
  references: [
    {
      ref: 'workflow-triggers',
      // Worded to what the source says (Phase 2.5 audit: the earlier wording, "start a sequence … e.g. a deal is signed", went beyond it).
      claim: 'Workflow tools can enroll records in a workflow automatically when they meet trigger criteria.',
      url: 'https://knowledge.hubspot.com/workflows/create-workflows',
      quote: 'Enrollment triggers are a set of criteria that automatically enroll records in a workflow.',
    },
  ],
  illustrative: ['Oakline Consulting, Shah Atelier and every client name are fictional.', 'The apps are unbranded; times and file counts are illustrative.', 'A signed contract as the trigger is an illustrative example of trigger criteria.'],
  seeds: [
    { title: 'Client onboarding that runs itself', topic: 'Automated client onboarding triggered by a signed contract', audience: 'Consultants and small agencies onboarding new clients by hand', audienceValue: 4, engagement: 4, commercial: 4 },
    { title: 'Every new client asks the same questions', topic: 'Welcome packs, intake forms and kickoff booking on autopilot', audience: 'Freelancers and studios with a steady flow of new clients', audienceValue: 4, engagement: 5, commercial: 3 },
  ],
};
