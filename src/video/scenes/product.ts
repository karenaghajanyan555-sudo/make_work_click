/**
 * Product-world scene types (pure models): the fictional software doing the work.
 *
 *   dashboard      DashboardScene     app window: live metrics + a list whose statuses update
 *   notifications  NotificationScene  notifications land; one opens into its detail
 *   timeline       TimelineScene      events on a rail; a playhead runs them one by one
 *   comparison     ComparisonScene    by hand vs by system, switched by the brand click
 *   data           DataScene          metric cards count up, a chart draws in
 *
 * All UI is fictional and unbranded (CLAUDE.md). Layout blocks are base units on a
 * 1080×1920 frame; the content zone sits below the caption band (CAPTION_BAND.bottom 500).
 */
import { count, ordered, type SceneModel } from './model.ts';

export type ValueFormat = 'int' | 'pct' | 'money' | 'hours' | 'minutes';

/** Content zone shared by product scenes: under the caption band, inside the safe zone. */
export const PRODUCT_ZONE = { top: 548, bottom: 1236, x: 90, width: 900 } as const;

/** Spread n events over [first, end] with a cap on the gap. */
function spread(n: number, first: number, end: number, max: number, min = 0.16): number {
  return n <= 1 ? 0 : Math.min(max, Math.max(min, (end - first) / (n - 1)));
}

// ---------- dashboard ----------
export type DashboardMetric = { label: string; from: number; to: number; format?: ValueFormat };
export type DashboardRow = { initials: string; name: string; detail: string; before: string; after: string };
export type DashboardProps = {
  workspace: { name: string; initials: string; breadcrumb: string };
  /** 1–3 live numbers in the window's top band; they move as rows complete. */
  metrics: DashboardMetric[];
  /** Mono heading over the list (e.g. "Today · follow-ups"). */
  listTitle: string;
  rows: DashboardRow[];
  beats?: Partial<{ open: number; first: number; interval: number }>;
};
export const DASHBOARD_LAYOUT = { header: 112, metricsBand: 136, listTitle: 56, row: 90, pad: 24 } as const;
export const dashboardHeight = (rows: number) => {
  const L = DASHBOARD_LAYOUT;
  return L.header + L.metricsBand + L.listTitle + rows * L.row + L.pad;
};
export const dashboardBeats = (p: DashboardProps, d: number) => {
  const open = p.beats?.open ?? 0;
  const first = p.beats?.first ?? open + 0.9;
  return { open, first, interval: p.beats?.interval ?? spread(p.rows.length, first, d - 0.8, 0.7) };
};
export const dashboardModel: SceneModel<DashboardProps> = {
  name: 'DashboardScene',
  story: 'The product at work: live numbers climb as each row is handled by the system.',
  minDuration: 2.4,
  cues: (p, d) => {
    const b = dashboardBeats(p, d);
    const c: Record<string, number> = { start: 0, open: b.open };
    p.rows.forEach((_, k) => (c[`row${k}`] = b.first + k * b.interval));
    c.settled = b.first + (p.rows.length - 1) * b.interval + 0.4;
    return c;
  },
  validate: (p, d) => [
    ...count('metrics', p.metrics.length, 1, 3),
    ...count('rows', p.rows.length, 1, 4),
    ...(PRODUCT_ZONE.top + dashboardHeight(p.rows.length) > PRODUCT_ZONE.bottom ? ['window too tall for the safe zone'] : []),
    ...ordered(['open', 'first'], dashboardBeats(p, d)),
  ],
  sounds: (p) => p.rows.map((_, k) => ({ cue: `row${k}`, id: 'check', variant: k })),
};

// ---------- notifications ----------
export type NoticeIcon = 'mail' | 'calendar' | 'chat' | 'spark' | 'check' | 'doc';
export type Notice = { app: string; icon: NoticeIcon; title: string; body: string; time: string; /** Done by the system: lime icon. */ system?: boolean };
export type NotificationsProps = {
  /** Oldest first; the newest lands on top. */
  items: Notice[];
  /** One notice opens into its detail (labelled rows), the rest step aside. */
  expand?: { index: number; rows: Array<{ label: string; text: string }> };
  /** `last`: when the newest notice lands (sets the interval; can be pinned to a word). */
  beats?: Partial<{ first: number; interval: number; last: number; expand: number }>;
};
export const NOTIFICATIONS_LAYOUT = { top: 560, card: 150, gap: 16, row: 74, expandPad: 26, stackScale: 0.04 } as const;
export const notificationsBeats = (p: NotificationsProps, d: number) => {
  const first = p.beats?.first ?? 0.2;
  const room = p.expand ? d * 0.55 : d - 0.8;
  const n = p.items.length;
  const interval = p.beats?.last !== undefined && n > 1 ? (p.beats.last - first) / (n - 1) : (p.beats?.interval ?? spread(n, first, room, 0.6, 0.3));
  return { first, interval, expand: p.beats?.expand ?? first + (p.items.length - 1) * interval + 0.7 };
};
export const notificationsModel: SceneModel<NotificationsProps> = {
  name: 'NotificationScene',
  story: 'The system reports back: notifications land, one opens into what was done.',
  minDuration: 2,
  cues: (p, d) => {
    const b = notificationsBeats(p, d);
    const c: Record<string, number> = { start: 0 };
    p.items.forEach((_, k) => (c[`notice${k}`] = b.first + k * b.interval));
    if (p.expand) c.expand = b.expand;
    return c;
  },
  validate: (p, d) => {
    const e = count('items', p.items.length, 1, 4);
    if (p.expand) {
      if (!(p.expand.index >= 0 && p.expand.index < p.items.length)) e.push('expand.index is not an item');
      e.push(...count('expand.rows', p.expand.rows.length, 1, 4));
      const L = NOTIFICATIONS_LAYOUT;
      if (L.top + L.card + L.expandPad + p.expand.rows.length * L.row > PRODUCT_ZONE.bottom) e.push('expanded notice too tall for the safe zone');
      const b = notificationsBeats(p, d);
      if (b.expand < b.first + (p.items.length - 1) * b.interval + 0.3) e.push('expand must wait until the last notice has landed');
    }
    return e;
  },
  sounds: (p) => [
    ...p.items.map((n, k) => ({ cue: `notice${k}`, id: 'notify' as const, variant: n.system ? 1 : 0 })),
    ...(p.expand ? [{ cue: 'expand', id: 'open' as const }] : []),
  ],
};

// ---------- timeline ----------
export type TimelineEvent = {
  /** Mono time or date, e.g. "Fri" or "9:00". */
  time: string;
  title: string;
  detail?: string;
  /** Owner initials (avatar). */
  owner?: string;
  /** Lime badge once the playhead reaches it (e.g. "Assigned"). */
  badge: string;
};
export type TimelineProps = {
  /** Card heading (mono label). */
  title: string;
  events: TimelineEvent[];
  /** Lime stamp in the card header once the plan has gone out (e.g. "Sent to 4 people"). */
  stamp?: string;
  /** `last`: when the last event is reached (sets the interval; can be pinned to a word). */
  beats?: Partial<{ start: number; interval: number; last: number; stamp: number }>;
};
export const TIMELINE_LAYOUT = { header: 84, row: 116, pad: 22, railX: 150 } as const;
export const timelineHeight = (n: number) => TIMELINE_LAYOUT.header + n * TIMELINE_LAYOUT.row + TIMELINE_LAYOUT.pad;
export const timelineBeats = (p: TimelineProps, d: number) => {
  const start = p.beats?.start ?? 0.55;
  const n = p.events.length;
  const interval = p.beats?.last !== undefined && n > 1 ? (p.beats.last - start) / (n - 1) : (p.beats?.interval ?? spread(n, start, d - 0.7, 0.8, 0.25));
  return { start, interval, stamp: p.beats?.stamp ?? start + (n - 1) * interval + 0.6 };
};
export const timelineModel: SceneModel<TimelineProps> = {
  name: 'TimelineScene',
  story: 'Things happen in order without anyone pushing: a playhead runs the plan.',
  minDuration: 2,
  cues: (p, d) => {
    const b = timelineBeats(p, d);
    const c: Record<string, number> = { start: 0 };
    p.events.forEach((_, k) => (c[`event${k}`] = b.start + k * b.interval));
    c.done = b.start + (p.events.length - 1) * b.interval + 0.35;
    if (p.stamp) c.stamp = b.stamp;
    return c;
  },
  validate: (p) => [
    ...count('events', p.events.length, 2, 5),
    ...(PRODUCT_ZONE.top + timelineHeight(p.events.length) > PRODUCT_ZONE.bottom ? ['timeline too tall for the safe zone'] : []),
  ],
  sounds: (p) => [...p.events.map((_, k) => ({ cue: `event${k}`, id: 'check' as const, variant: k })), ...(p.stamp ? [{ cue: 'stamp', id: 'sent' as const }] : [])],
};

// ---------- comparison ----------
export type ComparisonSide = { label: string; items: string[]; /** Mono figure in the panel header, e.g. "3 h / week". */ stat?: string };
export type ComparisonProps = {
  before: ComparisonSide;
  after: ComparisonSide;
  beats?: Partial<{ before: number; click: number; after: number; interval: number }>;
};
export const COMPARISON_LAYOUT = { header: 78, item: 66, pad: 22, switchRow: 92 } as const;
export const comparisonPanelHeight = (n: number) => COMPARISON_LAYOUT.header + n * COMPARISON_LAYOUT.item + COMPARISON_LAYOUT.pad;
export const comparisonBeats = (p: ComparisonProps, d: number) => {
  const before = p.beats?.before ?? 0.1;
  const click = p.beats?.click ?? Math.max(before + 0.9, d * 0.42);
  const after = p.beats?.after ?? click + 0.35;
  return { before, click, after, interval: p.beats?.interval ?? spread(p.after.items.length, after, d - 0.6, 0.3) };
};
export const comparisonModel: SceneModel<ComparisonProps> = {
  name: 'ComparisonScene',
  story: 'Before and after in one frame: the brand switch turns "by hand" into "by system".',
  minDuration: 2.4,
  cues: (p, d) => {
    const b = comparisonBeats(p, d);
    const c: Record<string, number> = { start: 0, before: b.before, click: b.click };
    p.after.items.forEach((_, k) => (c[`after${k}`] = b.after + k * b.interval));
    return c;
  },
  validate: (p, d) => {
    const L = COMPARISON_LAYOUT;
    const h = comparisonPanelHeight(p.before.items.length) + L.switchRow + comparisonPanelHeight(p.after.items.length);
    return [
      ...count('before.items', p.before.items.length, 1, 4),
      ...count('after.items', p.after.items.length, 1, 4),
      ...(PRODUCT_ZONE.top + h > PRODUCT_ZONE.bottom ? ['panels too tall for the safe zone'] : []),
      ...ordered(['before', 'click', 'after'], comparisonBeats(p, d)),
    ];
  },
  sounds: (p) => [{ cue: 'click', id: 'click' }, ...p.after.items.map((_, k) => ({ cue: `after${k}`, id: 'check' as const, variant: k }))],
};

// ---------- data ----------
export type DataMetric = { label: string; value: number; from?: number; format?: ValueFormat; /** Small lime note, e.g. "+4 this week". */ delta?: string };
export type ChartSpec = {
  kind: 'bar' | 'line';
  title: string;
  labels: string[];
  values: number[];
  /** Index drawn in the signal colour (the system's result). */
  highlight?: number;
  format?: ValueFormat;
  /** Lime note landing on the highlighted bar after the chart draws (e.g. "+41% vs W4"). */
  callout?: string;
};
export type DataProps = {
  metrics: DataMetric[];
  chart?: ChartSpec;
  /** Fine print under the chart, e.g. "Example workspace · illustrative". */
  note?: string;
  beats?: Partial<{ metrics: number; chart: number }>;
};
export const DATA_LAYOUT = { metricsTop: 548, metricsHeight: 196, chartTop: 772, chartHeight: 440, gap: 18 } as const;
export const dataBeats = (p: DataProps, d: number) => {
  const metrics = p.beats?.metrics ?? 0.15;
  return { metrics, chart: p.beats?.chart ?? Math.min(metrics + 0.7, d * 0.4) };
};
export const DATA_TIMING = { count: 1.1, bar: 0.55, barStagger: 0.08, line: 1.0, callout: 0.45 } as const;
export const dataChartDone = (p: DataProps, d: number) => {
  const b = dataBeats(p, d);
  const n = p.chart?.values.length ?? 0;
  return b.chart + (p.chart?.kind === 'line' ? DATA_TIMING.line : DATA_TIMING.bar + (n - 1) * DATA_TIMING.barStagger);
};
export const dataModel: SceneModel<DataProps> = {
  name: 'DataScene',
  story: 'The result in numbers: metrics count up, a chart draws in, the system’s bar lights up.',
  minDuration: 2.2,
  cues: (p, d) => {
    const b = dataBeats(p, d);
    const peak = dataChartDone(p, d);
    return { start: 0, metrics: b.metrics, ...(p.chart ? { chart: b.chart, peak } : {}), ...(p.chart?.callout ? { callout: peak + DATA_TIMING.callout } : {}) };
  },
  validate: (p, d) => {
    const e = count('metrics', p.metrics.length, 1, 3);
    if (p.chart) {
      e.push(...count('chart.values', p.chart.values.length, 2, 8));
      if (p.chart.labels.length !== p.chart.values.length) e.push('chart: labels and values differ in length');
      if (p.chart.values.some((v) => !(v >= 0))) e.push('chart: values must be ≥ 0');
      if (p.chart.highlight !== undefined && !(p.chart.highlight >= 0 && p.chart.highlight < p.chart.values.length)) e.push('chart.highlight is not a bar');
      if (dataChartDone(p, d) > d - 0.4) e.push('chart finishes drawing too late to be read');
      if (p.chart.callout && p.chart.highlight === undefined) e.push('chart.callout needs a highlighted bar');
      if (p.chart.callout && dataChartDone(p, d) + DATA_TIMING.callout > d - 0.5) e.push('chart.callout lands too late to be read');
    }
    return e;
  },
  sounds: (p) => (p.chart ? [{ cue: 'peak', id: 'tick', variant: 9 }] : []),
};

/** Deterministic number formatting for UI (no locale lookups). */
export function formatValue(v: number, format: ValueFormat = 'int'): string {
  const group = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  switch (format) {
    case 'int':
      return group(v);
    case 'pct':
      return `${Math.round(v)}%`;
    case 'money':
      return `$${group(v)}`;
    case 'hours':
      return `${(Math.round(v * 10) / 10).toFixed(v < 10 ? 1 : 0)} h`;
    case 'minutes':
      return `${Math.round(v)} min`;
  }
}
