import type { VideoSpec } from '../../src/video/spec.ts';

/**
 * The scene library, rendered: every reusable scene type once, with example content, and
 * one of each hand-off between them. Not a video to publish — the living catalogue that
 * design reviews and QA look at (`npm run render -- library --stills …`).
 * Business, people and app are fictional.
 */
const workspace = { name: 'Northline Studio', initials: 'NS', breadcrumb: 'Automations · Client follow-ups' };

export const library: VideoSpec = {
  id: 'library',
  title: 'Scene library',
  series: 'Library',
  format: 'vertical',
  theme: 'ink',
  preset: 'editorial',
  status: 'prototype',
  captions: { enabled: false },
  scenes: [
    {
      id: 'hook',
      type: 'hook',
      duration: 3,
      transitionOut: { type: 'focusPull' },
      chapters: [{ cue: 'start', label: 'HookScene' }],
      props: {
        eyebrow: 'N° 000 · Follow-ups',
        headline: 'Your inbox\nshouldn’t run\nyour *day.*',
        fragments: [
          { text: 'Chase the Patel invoice', tag: 'Overdue · 5d' },
          { text: 'Reply to Ana?' },
          { text: 'Send the proposal' },
          { text: 'Book the review call' },
          { text: 'Who signed already?', tag: 'Forgot · 1w' },
          { text: 'Update the tracker' },
        ],
      },
    },
    {
      id: 'statement',
      type: 'statement',
      duration: 2.6,
      transitionOut: { type: 'fade' },
      chapters: [{ cue: 'start', label: 'StatementScene' }],
      props: { label: 'The idea', text: 'One system.\nZero *reminders.*', support: 'Set it up once. It runs every day.' },
    },
    {
      id: 'problem',
      type: 'problem',
      duration: 3.2,
      transitionOut: { type: 'blur' },
      chapters: [{ cue: 'start', label: 'ProblemScene' }],
      props: {
        counter: 'Unanswered',
        items: [
          { meta: 'Ana · 9:12', text: 'Any update on the proposal?' },
          { meta: 'Raj · 10:40', text: 'Did the invoice go out?', tag: 'No reply' },
          { meta: 'Mia · 11:05', text: 'Can we move the call?' },
          { meta: 'Ana · 14:30', text: 'Just checking in again', tag: 'No reply' },
          { meta: 'Leo · 16:02', text: 'Who owns this one?' },
        ],
      },
    },
    {
      id: 'compare',
      type: 'comparison',
      duration: 3.6,
      transitionOut: { type: 'wipe' },
      chapters: [{ cue: 'start', label: 'ComparisonScene' }],
      props: {
        before: { label: 'By hand', stat: '3 h / week', items: ['Copy notes into emails', 'Remember who to chase', 'Update the tracker'] },
        after: { label: 'By system', stat: '0 min', items: ['Follow-ups go out on time', 'Replies land in one place', 'Tracker updates itself'] },
      },
    },
    {
      id: 'dashboard',
      type: 'dashboard',
      duration: 3.6,
      transitionOut: { type: 'slide' },
      chapters: [{ cue: 'start', label: 'DashboardScene' }],
      props: {
        workspace,
        metrics: [
          { label: 'Followed up', from: 0, to: 4 },
          { label: 'Replies', from: 2, to: 5 },
          { label: 'Open', from: 6, to: 2 },
        ],
        listTitle: 'Today · client follow-ups',
        rows: [
          { initials: 'AP', name: 'Ana Patel', detail: 'Proposal sent 3 days ago', before: 'Waiting', after: 'Followed up' },
          { initials: 'RK', name: 'Raj Kumar', detail: 'Invoice 0142 · due today', before: 'Due', after: 'Reminded' },
          { initials: 'MO', name: 'Mia Ortiz', detail: 'Asked to reschedule', before: 'Pending', after: 'Rebooked' },
          { initials: 'LW', name: 'Leo Wang', detail: 'New lead from the website', before: 'New', after: 'Welcomed' },
        ],
      },
    },
    {
      id: 'notify',
      type: 'notifications',
      duration: 3.8,
      transitionOut: { type: 'zoom' },
      chapters: [{ cue: 'start', label: 'NotificationScene' }],
      props: {
        items: [
          { app: 'Mail', icon: 'mail', title: 'Ana Patel', body: 'Thanks — let’s go ahead with option B.', time: '9:41' },
          { app: 'Calendar', icon: 'calendar', title: 'Review call moved', body: 'Thu 3:00 PM · Mia Ortiz', time: '9:42' },
          { app: 'Northline Flow', icon: 'spark', title: 'Follow-ups done', body: '4 clients handled while you were out', time: '9:42', system: true },
        ],
        expand: {
          index: 2,
          rows: [
            { label: 'Followed up', text: 'Ana, Raj, Mia, Leo' },
            { label: 'Replies', text: '3 in your inbox, sorted' },
            { label: 'Next', text: 'Raj · reminder Fri 9:00' },
          ],
        },
      },
    },
    {
      id: 'timeline',
      type: 'timeline',
      duration: 3.6,
      transitionOut: { type: 'focusPull' },
      chapters: [{ cue: 'start', label: 'TimelineScene' }],
      props: {
        title: 'This week · runs on its own',
        events: [
          { time: 'Mon', title: 'Proposal follow-up', detail: 'To Ana Patel', owner: 'AP', badge: 'Sent' },
          { time: 'Wed', title: 'Invoice reminder', detail: 'Invoice 0142', owner: 'RK', badge: 'Sent' },
          { time: 'Thu', title: 'Review call', detail: 'Rebooked for 3:00 PM', owner: 'MO', badge: 'Booked' },
          { time: 'Fri', title: 'Weekly summary', detail: 'To you, 5:00 PM', badge: 'Ready' },
        ],
      },
    },
    {
      id: 'data',
      type: 'data',
      duration: 3.6,
      transitionOut: { type: 'cut' },
      chapters: [{ cue: 'start', label: 'DataScene' }],
      props: {
        metrics: [
          { label: 'Hours back', value: 3.5, from: 0, format: 'hours', delta: 'per week' },
          { label: 'On-time follow-ups', value: 100, from: 40, format: 'pct' },
        ],
        chart: { kind: 'bar', title: 'Follow-ups sent on time', labels: ['W1', 'W2', 'W3', 'W4', 'W5'], values: [4, 5, 4, 9, 12], highlight: 4, callout: '3× week 1' },
        note: 'Example workspace · illustrative numbers',
      },
    },
    {
      id: 'payoff',
      type: 'payoff',
      duration: 3.2,
      transitionOut: { type: 'focusPull' },
      chapters: [{ cue: 'start', label: 'PayoffScene' }],
      props: {
        statement: 'Nothing left\nto *remember.*',
        items: [
          { text: 'Chase the Patel invoice', tag: 'Overdue · 5d', resolved: 'Sent' },
          { text: 'Reply to Ana?', resolved: 'Handled' },
          { text: 'Book the review call', resolved: 'Booked' },
        ],
      },
    },
    {
      id: 'end',
      type: 'endCard',
      duration: 3,
      chapters: [{ cue: 'start', label: 'BrandOutroScene' }],
      props: { cta: 'Follow for more *systems* like this.' },
    },
  ],
};
