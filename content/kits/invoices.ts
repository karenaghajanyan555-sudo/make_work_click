import { pin, type StoryKit } from '../../src/orchestrator/kit.ts';

/**
 * Kit "invoices" — getting paid without chasing. Signature arc (the v001-v2 look):
 * the owner's to-dos flip into an automation that invoices, reminds and gets paid.
 * Studio, client, invoice and amounts are fictional; the app UI is unbranded.
 */
export const invoicesKit: StoryKit = {
  id: 'invoices',
  label: 'Invoices & getting paid',
  short: 'Invoices',
  angle: 'Finished work turns into an invoice, a reminder and a payment, with nobody chasing.',
  promise: 'Get paid on time without writing a single reminder.',
  arc: 'signature',
  preset: 'editorial',
  harmony: 'clarity',
  beats: [
    {
      id: 'hook',
      section: 'hook',
      label: 'By hand',
      replaceable: true,
      lines: [{ text: "Getting paid shouldn't depend on chasing." }, { text: 'Stop chasing your own invoices.' }],
    },
    {
      id: 'system',
      section: 'problem',
      label: 'By system',
      lines: [
        { text: 'Let the system chase it.', caption: 'Let the system\n**chase it**.', pause: 0.2 },
        { text: 'Let the system follow up.', caption: 'Let the system\n**follow up**.', pause: 0.2 },
      ],
    },
    {
      id: 'step1',
      section: 'explanation',
      label: 'Invoiced',
      lines: [{ text: 'Finish the job. The invoice goes out on its own.', caption: 'Finish the job.|The invoice goes out\n*on its own.*', pause: 0.3 }],
    },
    {
      id: 'step2',
      section: 'explanation',
      label: 'Reminder',
      claims: ['auto-reminders'],
      lines: [{ text: 'Still unpaid by Thursday? The reminder sends itself.', caption: 'Still unpaid\nby Thursday?|The reminder\n**sends itself**.', pause: 0.45 }],
    },
    {
      id: 'step3',
      section: 'explanation',
      label: 'Paid',
      lines: [{ text: 'And the payment lands.', caption: 'And the payment *lands.*', pause: 0.5 }],
    },
    {
      id: 'payoff',
      section: 'payoff',
      label: 'Nothing chased',
      lines: [
        // The run's last result stays readable before the loop closes: a longer breath.
        { text: "You didn't chase a single invoice.", caption: 'You didn’t chase\na single *invoice.*', pause: 0.8 },
        { text: 'Not one reminder came from you.', caption: 'Not one reminder\ncame from *you.*', pause: 0.8 },
      ],
    },
    // The run converges into the switch before the CTA: a longer breath here.
    { id: 'cta', section: 'cta', label: 'Follow', lines: [{ text: 'Follow for more systems like this.', pause: 0.7 }] },
  ],
  signature: {
    workspace: { name: 'Fernhill Studio', initials: 'FS', breadcrumb: 'Automations · Getting paid' },
    fragments: [
      { text: 'Invoice the Patel job', tag: 'Overdue · 5d', becomes: 0 },
      { text: 'Send invoice 0142?', becomes: 1 },
      { text: 'Chase Ana on Thursday', becomes: 2 },
      { text: 'Update the spreadsheet' },
      { text: 'Did Ana pay yet?', tag: 'Unpaid · 2w', becomes: 3 },
      { text: 'Check the bank app' },
      { text: 'Reply to the accountant' },
    ],
    flow: [
      { kind: 'trigger', title: 'Job marked done', subtitle: 'Brand refresh · Patel & Co.', chip: 'Just now', chipDone: 'Paid' },
      { kind: 'email', title: 'Send the invoice', subtitle: '“Invoice 0142 · Brand refresh”', chip: 'Sent', chipBefore: 'Queued' },
      { kind: 'wait', title: 'Reminder if unpaid', subtitle: '“A friendly nudge on 0142”', chip: 'Thu 9:00', chipBefore: 'Waiting', chipDone: 'Sent' },
      { kind: 'goal', title: 'Invoice paid', subtitle: 'Goal · paid in full', chip: 'Goal', chipDone: 'Goal reached' },
    ],
    details: [
      null,
      {
        kind: 'email',
        to: 'Ana Patel',
        from: 'Fernhill Studio',
        subject: 'Your invoice is ready, Ana',
        body: 'Thanks again for a great project. Invoice 0142 is attached, and you can pay by card in one tap.',
        deliveredAt: '9:41 AM',
        mergeField: '{first name}',
        opened: 'Opened · 9:58 AM',
      },
      { kind: 'wait', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], dates: ['9', '10', '11', '12', '13'], startDay: 0, startLabel: 'Invoice', sendDay: 3, sendTime: '9:00' },
      { kind: 'goal', initials: 'AP', customer: 'Ana Patel', items: 'Invoice 0142 · Brand refresh', time: 'Thu 2:14 PM', note: 'Paid by card · receipt sent', badge: 'Paid in full', amount: 640 },
    ],
    resolved: ['Invoiced', 'Sent', 'Reminded', 'Paid'],
    stamp: 'Done by the system',
    pins: {
      steps: [
        { arrive: pin('step1', 'invoice', { offset: -0.15 }), done: pin('step1', 'own', { fallback: 'end', offset: -0.05 }) },
        { arrive: pin('step2', undefined, { offset: 0.1 }), done: pin('step2', 'itself', { fallback: 'end' }) },
        { arrive: pin('step3', undefined, { offset: -0.3 }), done: pin('step3', 'lands', { fallback: 'end' }) },
      ],
    },
  },
  publish: {
    caption: [
      'Every finished job should turn into an invoice, a reminder and a payment. None of it should depend on you chasing.',
      'One trigger. The invoice goes out on its own. A reminder if it’s still unpaid. The payment lands.',
      'Set it up once. Let the system chase it.',
    ],
    hashtags: ['#automation', '#freelance', '#invoicing', '#smallbusiness'],
  },
  assumptions: [
    'Freelancers and small studios send invoices and payment reminders by hand.',
    'Late payments are usually chased with manual reminder emails.',
  ],
  references: [
    {
      ref: 'auto-reminders',
      claim: 'Invoicing software can send reminder emails for unpaid invoices automatically.',
      url: 'https://docs.stripe.com/invoicing/send-email',
      quote: 'Automatic email reminders for unpaid invoices',
      required: true,
    },
  ],
  illustrative: [
    'Fernhill Studio, Ana Patel and Patel & Co. are fictional.',
    'The app is unbranded; invoice number, dates and the $640 amount are illustrative.',
  ],
  seeds: [
    { title: 'Invoices that chase themselves', topic: 'Automatic invoicing and payment reminders for finished jobs', audience: 'Freelancers and small studios who chase late payments by hand', audienceValue: 5, engagement: 4, commercial: 4 },
    { title: 'Stop writing payment reminders', topic: 'Reminder sequences for unpaid invoices', audience: 'Service businesses with recurring late payers', audienceValue: 4, engagement: 3, commercial: 4 },
  ],
};
