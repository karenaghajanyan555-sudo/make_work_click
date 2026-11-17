import { defineVideo } from '../../src/video/define.ts';
import { timing } from '../timing/v002-meetings.ts';

/**
 * Video 002 — "Every meeting ends the same way." (engine example: same brand, captions,
 * hand-offs, audio pipeline and outro as v001; different story, scenes, preset and music).
 *
 * Written against the narration: no absolute times. Lines follow the take's own rhythm,
 * each scene lasts as long as what it says, and beats are pinned to spoken words.
 * The team, workspace and app are fictional and unbranded.
 */
export const v002Meetings = defineVideo(
  {
    id: 'v002-meetings',
    title: 'Every meeting ends the same way',
    series: 'N° 002',
    format: 'vertical',
    theme: 'ink',
    preset: 'data',
    status: 'draft',
    brief: {
      topic: 'AI meeting summaries: decisions, owners and deadlines sent automatically after every meeting',
      audience: 'Team leads and small-business owners who lose follow-ups after meetings',
      hook: 'Every meeting ends the same way.',
      cta: 'Follow for more systems like this.',
    },
    narration: {
      voice: 'bella-nicole-v1',
      lines: [
        // The hook and payoff scenes set their own type: those lines carry no caption.
        { id: 'hook', text: 'Every meeting ends the same way.' },
        { id: 'problem', text: 'Nobody wrote it down.', caption: 'Nobody wrote it *down.*', pause: 0.25 },
        { id: 'summary', text: 'Now the notes write themselves.', caption: 'Now the notes\n**write themselves.**', pause: 0.6 },
        {
          id: 'owners',
          text: "Decisions, owners and deadlines, sent before you're back at your desk.",
          caption: 'Decisions, owners\nand deadlines,|sent before you’re\nback at your *desk.*',
          pause: 0.35,
        },
        { id: 'tracked', text: "Every action item, tracked until it's done.", caption: 'Every action item,\ntracked until it’s *done.*', pause: 0.3 },
        { id: 'payoff', text: 'Your meetings finally end with a plan.', pause: 0.3 },
        { id: 'cta', text: 'Follow for more systems like this.', pause: 0.35 },
      ],
    },
    scenes: [
      {
        id: 'hook',
        type: 'hook',
        say: ['hook'],
        transitionOut: { type: 'blur' },
        chapters: [{ cue: 'start', label: '01 — After the meeting' }],
        props: {
          eyebrow: 'N° 002 · Meetings',
          headline: 'Every meeting\nends the *same way.*',
          fragments: [
            { text: 'Who’s sending the notes?' },
            { text: 'What did we decide?', tag: 'Unclear' },
            { text: 'Owner: ???' },
            { text: 'Pricing — follow up?' },
            { text: 'Was this recorded?' },
            { text: 'Next steps…' },
          ],
          beats: { out: { line: 'hook', edge: 'end', offset: 0.05 } },
        },
      },
      {
        id: 'problem',
        type: 'problem',
        say: ['problem'],
        chapters: [{ cue: 'start', label: '02 — Nobody wrote it down' }],
        props: {
          counter: 'Unanswered',
          items: [
            { meta: 'Maya · 3:02 PM', text: 'Did anyone take notes?' },
            { meta: 'Leo · 3:05 PM', text: 'What did we decide on pricing?', tag: 'No reply' },
            { meta: 'Sam · 3:11 PM', text: 'Who’s sending the deck?' },
            { meta: 'Maya · 4:40 PM', text: 'Is launch still Friday?', tag: 'No reply' },
          ],
          beats: { first: 0.1 },
        },
      },
      {
        id: 'summary',
        type: 'notifications',
        say: ['summary'],
        chapters: [{ cue: 'notice1', label: '03 — The summary' }],
        props: {
          items: [
            { app: 'Calendar', icon: 'calendar', title: 'Pricing sync ended', body: '45 min · 4 people', time: '3:00' },
            { app: 'Meeting notes', icon: 'spark', title: 'Summary ready', body: '3 decisions · 4 action items', time: '3:01', system: true },
          ],
          expand: {
            index: 1,
            rows: [
              { label: 'Decided', text: 'Launch moves to Fri 12' },
              { label: 'Pricing', text: 'Keep Pro at $24, add annual' },
              { label: 'Next', text: '4 action items, owners set' },
            ],
          },
          beats: {
            first: 0.15,
            // The system's notice lands on "notes"; it opens on "themselves".
            last: { line: 'summary', word: 'notes', offset: -0.1 },
            expand: { line: 'summary', word: 'themselves' },
          },
        },
      },
      {
        id: 'owners',
        type: 'timeline',
        say: ['owners'],
        chapters: [{ cue: 'event0', label: '04 — Owners' }],
        props: {
          title: 'Action items · sent 3:02 PM',
          events: [
            { time: 'Tue', title: 'Send the deck to the board', owner: 'SK', badge: 'Assigned' },
            { time: 'Wed', title: 'Update the pricing page', detail: 'Pro $24 · add annual', owner: 'MA', badge: 'Assigned' },
            { time: 'Thu', title: 'Draft the launch email', owner: 'LE', badge: 'Assigned' },
            { time: 'Fri', title: 'Launch', detail: 'Fri 12 · 10:00 AM', badge: 'On track' },
          ],
          stamp: 'Sent to 4 people',
          beats: {
            start: { line: 'owners', word: 'decisions' },
            last: { line: 'owners', word: 'sent' },
            stamp: { line: 'owners', word: 'desk' },
          },
        },
      },
      {
        id: 'tracked',
        type: 'data',
        say: ['tracked'],
        transitionOut: { type: 'wipe' },
        chapters: [{ cue: 'metrics', label: '05 — Tracked' }],
        props: {
          metrics: [
            { label: 'Action items done', value: 31, from: 0, delta: 'this week' },
            { label: 'Done on time', value: 94, from: 60, format: 'pct' },
          ],
          chart: { kind: 'bar', title: 'Done on time · by week', labels: ['W1', 'W2', 'W3', 'W4', 'W5'], values: [12, 15, 14, 22, 31], highlight: 4, callout: '+41% vs W4' },
          note: 'Example team · illustrative numbers',
          beats: { metrics: { line: 'tracked', word: 'every' }, chart: { line: 'tracked', word: 'item' } },
        },
      },
      {
        id: 'payoff',
        type: 'payoff',
        say: ['payoff'],
        transitionOut: { type: 'focusPull' },
        chapters: [{ cue: 'check0', label: '06 — A plan' }],
        props: {
          statement: 'Your meetings end\nwith *a plan.*',
          items: [
            { text: 'Who’s sending the notes?', resolved: 'Sent' },
            { text: 'What did we decide?', tag: 'Unclear', resolved: 'Decided' },
            { text: 'Owner: ???', resolved: 'Assigned' },
            { text: 'Was this recorded?', resolved: 'Summarized' },
          ],
          beats: { items: 0.2, interval: 0.24, statement: { line: 'payoff', word: 'meetings' } },
        },
      },
      {
        id: 'end',
        type: 'endCard',
        say: ['cta'],
        lead: 0.75, // the click and the wordmark land before she speaks
        chapters: [{ cue: 'click', label: '07 — Follow' }],
        props: {
          cta: 'Follow for more *systems* like this.',
          beats: { click: 0.15, wordmark: 0.35, cta: { line: 'cta', word: 'follow' } },
        },
      },
    ],
    audio: {
      compose: {
        harmony: 'focus',
        // The music lands when the system's summary arrives.
        anchor: 'summary.notice1',
        sections: [
          { at: 'hook.start', style: 'intro' },
          { at: 'summary.notice1', style: 'pulse' },
          { at: 'tracked.peak', style: 'lift' },
          { at: 'payoff.start', style: 'hold' },
          { at: 'end.click', style: 'home' },
        ],
      },
    },
  },
  timing,
);
