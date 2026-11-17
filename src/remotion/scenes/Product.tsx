import { AbsoluteFill } from 'remotion';
import { fonts, palette, radius, type } from '../../brand/tokens.ts';
import {
  comparisonBeats,
  comparisonPanelHeight,
  COMPARISON_LAYOUT,
  dashboardBeats,
  dashboardHeight,
  DASHBOARD_LAYOUT,
  dataBeats,
  DATA_LAYOUT,
  DATA_TIMING,
  notificationsBeats,
  NOTIFICATIONS_LAYOUT,
  PRODUCT_ZONE,
  timelineBeats,
  timelineHeight,
  TIMELINE_LAYOUT,
  type ComparisonProps,
  type DashboardProps,
  type DataProps,
  type NotificationsProps,
  type TimelineProps,
} from '../../video/scenes/product.ts';
import { ease, lerp, mixColor, progress } from '../lib/anim.ts';
import { useFontsReady } from '../lib/fonts.ts';
import { useArrivesBuilt, useLayout, usePreset, useTime } from '../lib/hooks.ts';
import { Label, ToggleMark } from '../brand/Mark.tsx';
import { CameraRig } from '../motion/Camera.tsx';
import { ClickRipple } from '../motion/Signal.tsx';
import { Avatar, cardSurface, DashboardCard, toneFor, UILabel, UIText } from '../ui/Card.tsx';
import { Chip } from '../ui/Flow.tsx';
import { CheckIcon } from '../ui/icons.tsx';
import { memoSurface } from '../ui/Memo.tsx';
import { Chart, MetricCard } from '../ui/Metrics.tsx';
import { NotificationCard, NOTICE_METRICS } from '../ui/NotificationCard.tsx';
import { WindowChrome } from '../ui/WindowChrome.tsx';

const Z = PRODUCT_ZONE;
const push = (duration: number, zoom = 1.035) => [
  { t: 0, zoom: 1, x: 0, y: 0 },
  { t: duration, zoom, x: 0, y: 0, ease: 'linear' as const },
];

/** Reveal a light surface by clipping (never by opacity over the dark ground: D10). */
const clipUp = (p: number, r: number): string | undefined => (p >= 1 ? undefined : `inset(${(1 - p) * 100}% 0 0 0 round ${r}px)`);

/** Signal bounce under the product while the system is working. */
const Bounce: React.FC<{ y: number; strength: number }> = ({ y, strength }) => {
  const { u, height } = useLayout();
  const glow = usePreset().world.glow;
  return <AbsoluteFill style={{ background: `radial-gradient(${900 * u}px ${520 * u}px at 50% ${(y / height) * 100}%, rgba(201,242,93,${0.1 * strength * glow}), transparent 70%)` }} />;
};

// ---------------------------------------------------------------------------------------
/** DashboardScene: live metrics climb as each row is handled by the system. */
export const Dashboard: React.FC<{ props: DashboardProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { frame, f } = useTime();
  const { u } = useLayout();
  const b = dashboardBeats(props, duration);
  const L = DASHBOARD_LAYOUT;
  const n = props.rows.length;
  const win = { x: Z.x * u, y: Z.top * u, width: Z.width * u, height: dashboardHeight(n) * u };
  const built = useArrivesBuilt();
  const open = built ? 1 : progress(frame, f(b.open), f(0.65), ease.snap);
  const reveal = { top: (win.height / 2) * (1 - open), bottom: (win.height / 2) * (1 - open), left: 0, right: 0, radius: radius.window * u };
  const rowAt = (k: number) => b.first + k * b.interval;
  const done = props.rows.map((_, k) => progress(frame, f(rowAt(k)), f(0.4), ease.out));
  const doneSum = done.reduce((a, c) => a + c, 0);
  const inner = (L.header + 22) * u;
  const mw = (win.width - 2 * 26 * u - (props.metrics.length - 1) * 16 * u) / props.metrics.length;
  const listTop = (L.header + L.metricsBand) * u;
  const live = progress(frame, f(b.first - 0.2), f(0.4));
  return (
    <AbsoluteFill>
      <Bounce y={win.y + win.height} strength={live} />
      <CameraRig keys={push(duration, 1.03)}>
        <WindowChrome rect={win} u={u} reveal={open < 1 ? reveal : undefined} headerIn={built ? 1 : progress(frame, f(b.open + 0.35), f(0.4))} workspace={props.workspace} on={live} />
        {open > 0.6 && (
          <div style={{ position: 'absolute', left: win.x, top: win.y, width: win.width, height: win.height, clipPath: open < 1 ? `inset(${reveal.top}px 0 ${reveal.bottom}px 0 round ${reveal.radius}px)` : undefined }}>
            {props.metrics.map((m, i) => {
              const v = lerp(m.from, m.to, Math.min(1, doneSum / n));
              const lit = progress(frame, f(rowAt(n - 1)), f(0.5)) * (i === 0 ? 1 : 0);
              return (
                <div key={i} style={{ position: 'absolute', left: 26 * u + i * (mw + 16 * u), top: inner }}>
                  <MetricCard label={m.label} value={v} format={m.format} u={u} width={mw} height={(L.metricsBand - 34) * u} compact lit={lit} />
                </div>
              );
            })}
            <div style={{ position: 'absolute', left: 30 * u, top: listTop + 14 * u }}>
              <UILabel u={u}>{props.listTitle}</UILabel>
            </div>
            {props.rows.map((r, k) => {
              const y = listTop + L.listTitle * u + k * L.row * u;
              const d = done[k]!;
              const active = progress(frame, f(rowAt(k) - 0.3), f(0.25)) * (1 - progress(frame, f(rowAt(k) + 0.5), f(0.35)));
              const appear = built ? 1 : progress(frame, f(b.open + 0.45 + k * 0.07), f(0.45));
              return (
                <div
                  key={k}
                  style={{
                    position: 'absolute',
                    left: 18 * u,
                    right: 18 * u,
                    top: y,
                    height: (L.row - 10) * u,
                    borderRadius: 18 * u,
                    background: mixColor('rgba(242,241,237,0)', palette.ui.well, active),
                    boxShadow: `0 0 0 ${2 * u * active}px rgba(201,242,93,${0.8 * active})`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20 * u,
                    padding: `0 ${14 * u}px`,
                    opacity: appear,
                    transform: `translateY(${(1 - appear) * 12 * u}px)`,
                  }}
                >
                  <Avatar initials={r.initials} size={52 * u} tone={toneFor(r.name)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <UIText u={u} role="uiTitle" style={{ fontSize: (type.uiTitle.size - 4) * u }}>
                      {r.name}
                    </UIText>
                    <UIText u={u} role="uiBody" style={{ marginTop: 2 * u }}>
                      {r.detail}
                    </UIText>
                  </div>
                  <Chip state={d > 0 ? 'done' : 'idle'} label={d > 0 ? r.after : r.before} u={u} pop={d} />
                </div>
              );
            })}
          </div>
        )}
      </CameraRig>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------
/** NotificationScene: notices land newest-on-top; one opens into what was done. */
export const Notifications: React.FC<{ props: NotificationsProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { frame, f } = useTime();
  const layout = useLayout();
  const { u } = layout;
  const b = notificationsBeats(props, duration);
  const L = NOTIFICATIONS_LAYOUT;
  const n = props.items.length;
  const landed = (k: number) => progress(frame, f(b.first + k * b.interval), f(0.5), ease.snap);
  const ex = props.expand;
  const open = ex ? progress(frame, f(b.expand), f(0.6), ease.inOut) : 0;
  const width = Z.width * u;
  const cardH = L.card * u;
  return (
    <AbsoluteFill>
      <Bounce y={(L.top + L.card) * u} strength={open} />
      <CameraRig keys={push(duration, 1.03)}>
        {props.items.map((it, k) => {
          const p = landed(k);
          if (p <= 0) return null;
          // Depth: how many newer notices have landed on top of this one.
          const depth = props.items.reduce((s, _, j) => (j > k ? s + landed(j) : s), 0);
          const isEx = ex?.index === k;
          const exH = ex ? (L.expandPad + ex.rows.length * L.row) * u : 0;
          // Opening: the others step aside (down and out of frame), never faded.
          const aside = isEx ? 0 : progress(frame, f(b.expand + (n - 1 - k) * 0.04), f(0.55), ease.in) * (layout.height - L.top * u);
          const y = L.top * u + depth * (cardH + L.gap * u) * (isEx ? 1 - open : 1) + aside + (isEx ? 0 : open * exH);
          const scale = 1 - depth * L.stackScale * (isEx ? 1 - open : 1);
          const h = cardH + (isEx ? exH * open : 0);
          const active = it.system ? progress(frame, f(b.first + k * b.interval + 0.2), f(0.3)) * (1 - progress(frame, f(b.first + k * b.interval + 1.1), f(0.4))) + (isEx ? open : 0) : 0;
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: Z.x * u,
                top: y - (1 - p) * 40 * u,
                transform: `scale(${scale})`,
                transformOrigin: '50% 0%',
                clipPath: p < 1 ? `inset(0 0 ${(1 - p) * 100}% 0 round ${(radius.card + 4) * u}px)` : undefined,
                zIndex: 10 + k,
              }}
            >
              <NotificationCard n={it} u={u} width={width} height={h} active={Math.min(1, active)}>
                {isEx && open > 0 && (
                  <div style={{ position: 'absolute', left: NOTICE_METRICS.padX * u, right: NOTICE_METRICS.padX * u, top: cardH, borderTop: `${1.5 * u}px solid ${palette.ui.border}` }}>
                    {ex!.rows.map((r, j) => {
                      const rp = progress(frame, f(b.expand + 0.25 + j * 0.12), f(0.45), ease.out);
                      return (
                        <div key={j} style={{ display: 'flex', alignItems: 'baseline', gap: 20 * u, height: L.row * u, paddingTop: 24 * u, boxSizing: 'border-box', opacity: rp, transform: `translateY(${(1 - rp) * 10 * u}px)` }}>
                          <UILabel u={u} style={{ width: 176 * u, flexShrink: 0 }}>
                            {r.label}
                          </UILabel>
                          <UIText u={u} role="uiBody" color={palette.ui.text} style={{ fontWeight: 520 }}>
                            {r.text}
                          </UIText>
                        </div>
                      );
                    })}
                  </div>
                )}
              </NotificationCard>
            </div>
          );
        })}
      </CameraRig>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------
/** TimelineScene: a playhead runs the plan, event by event. */
export const Timeline: React.FC<{ props: TimelineProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { frame, f } = useTime();
  const { u } = useLayout();
  const b = timelineBeats(props, duration);
  const L = TIMELINE_LAYOUT;
  const n = props.events.length;
  const card = { x: Z.x * u, y: Z.top * u, w: Z.width * u, h: timelineHeight(n) * u };
  const built = useArrivesBuilt();
  const open = built ? 1 : progress(frame, 0, f(0.6), ease.snap);
  const rowY = (k: number) => (L.header + k * L.row + L.row / 2) * u;
  const eventAt = (k: number) => b.start + k * b.interval;
  // Playhead: fractional index, snapping from event to event.
  let head = 0;
  for (let k = 1; k < n; k++) head = lerp(head, k, progress(frame, f(eventAt(k) - 0.32), f(0.32), ease.snap));
  const started = progress(frame, f(eventAt(0) - 0.2), f(0.2));
  const railX = L.railX * u;
  const fill = rowY(0) + (rowY(Math.min(n - 1, Math.floor(head))) - rowY(0)) + (head % 1) * (L.row * u);
  return (
    <AbsoluteFill>
      <Bounce y={card.y + card.h} strength={progress(frame, f(eventAt(0)), f(0.6))} />
      <CameraRig keys={push(duration, 1.03)}>
        <DashboardCard
          x={card.x}
          y={card.y}
          width={card.w}
          height={card.h}
          u={u}
          title={props.title}
          right={
            props.stamp && frame >= f(b.stamp) ? (
              <Chip state="done" label={props.stamp} u={u} pop={progress(frame, f(b.stamp), f(0.3), ease.linear)} />
            ) : (
              <UILabel u={u} color={palette.signalOnLight}>{`${props.events.filter((_, k) => frame >= f(eventAt(k))).length}/${n}`}</UILabel>
            )
          }
          active={props.stamp ? progress(frame, f(b.stamp), f(0.3)) * (1 - progress(frame, f(b.stamp + 0.8), f(0.4))) : 0}
          style={{ clipPath: clipUp(open, radius.card * u) }}
        >
          {/* Rail + lime fill to the playhead. */}
          <div style={{ position: 'absolute', left: railX - 1.5 * u, top: rowY(0), width: 3 * u, height: rowY(n - 1) - rowY(0), background: palette.ui.border, borderRadius: 3 * u }} />
          <div style={{ position: 'absolute', left: railX - 1.5 * u, top: rowY(0), width: 3 * u, height: Math.max(0, (fill - rowY(0)) * started), background: palette.signalDeep, borderRadius: 3 * u }} />
          {props.events.map((e, k) => {
            const reached = progress(frame, f(eventAt(k)), f(0.3), ease.out);
            const appear = built ? 1 : progress(frame, f(0.25 + k * 0.08), f(0.45));
            const active = reached * (1 - progress(frame, f(eventAt(k) + 0.55), f(0.35)));
            const y = rowY(k);
            return (
              <div key={k} style={{ opacity: appear, transform: `translateY(${(1 - appear) * 10 * u}px)` }}>
                <div style={{ position: 'absolute', left: 28 * u, width: railX - 56 * u, top: y - 12 * u, textAlign: 'right' }}>
                  <UILabel u={u} color={reached > 0.5 ? palette.ui.text : palette.ui.textFaint}>
                    {e.time}
                  </UILabel>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: railX - 11 * u,
                    top: y - 11 * u,
                    width: 22 * u,
                    height: 22 * u,
                    borderRadius: 22 * u,
                    background: mixColor(palette.ui.surface, palette.signal, reached),
                    border: `${2.5 * u}px solid ${mixColor(palette.ui.borderStrong, palette.signalDeep, reached)}`,
                    boxShadow: `0 0 0 ${8 * u * active}px rgba(201,242,93,${0.35 * active})`,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ position: 'absolute', left: railX + 34 * u, right: 28 * u, top: y - 38 * u, height: 76 * u, display: 'flex', alignItems: 'center', gap: 18 * u }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <UIText u={u} role="uiTitle" style={{ fontSize: (type.uiTitle.size - 3) * u }}>
                      {e.title}
                    </UIText>
                    {e.detail && (
                      <UIText u={u} role="uiBody" style={{ marginTop: 3 * u }}>
                        {e.detail}
                      </UIText>
                    )}
                  </div>
                  {e.owner && <Avatar initials={e.owner} size={46 * u} tone={toneFor(e.owner)} />}
                  <Chip state={reached > 0 ? 'done' : 'idle'} label={reached > 0 ? e.badge : 'Open'} u={u} pop={reached} />
                </div>
              </div>
            );
          })}
        </DashboardCard>
      </CameraRig>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------
/** ComparisonScene: by hand (dark, coral) → the brand click → by system (light, lime). */
export const Comparison: React.FC<{ props: ComparisonProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { frame, f } = useTime();
  const layout = useLayout();
  const { u } = layout;
  const b = comparisonBeats(props, duration);
  const L = COMPARISON_LAYOUT;
  const x = Z.x * u, w = Z.width * u;
  const topH = comparisonPanelHeight(props.before.items.length) * u;
  const botH = comparisonPanelHeight(props.after.items.length) * u;
  const topY = Z.top * u;
  const swY = topY + topH + (L.switchRow * u) / 2;
  const botY = topY + topH + L.switchRow * u;
  const inTop = progress(frame, f(b.before), f(0.5), ease.out);
  const on = progress(frame, f(b.click), f(0.22), ease.inOut);
  // The "by system" panel turns over (the v001 flip): dark face → light face, edge-on swap.
  const flipP = progress(frame, f(b.click + 0.12), f(0.42), ease.inOut);
  const angle = flipP * 180;
  const back = angle > 90;
  const edge = Math.sin(flipP * Math.PI);
  const dim = progress(frame, f(b.click + 0.1), f(0.5));
  const head = (label: string, stat: string | undefined, light: boolean) => (
    <div style={{ height: L.header * u, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${28 * u}px`, borderBottom: `${1.5 * u}px solid ${light ? palette.ui.border : palette.hairline}` }}>
      <Label size={type.label.size * u} color={light ? palette.ui.textMuted : palette.fog}>
        {label}
      </Label>
      {stat && (
        <Label size={type.label.size * u} color={light ? palette.signalOnLight : palette.friction}>
          {stat}
        </Label>
      )}
    </div>
  );
  return (
    <AbsoluteFill>
      <Bounce y={botY + botH / 2} strength={progress(frame, f(b.after), f(0.6))} />
      <CameraRig keys={push(duration, 1.025)}>
        {/* Before: the manual way. */}
        <div style={{ position: 'absolute', left: x, top: topY + (1 - inTop) * 24 * u, width: w, height: topH, ...memoSurface(u), opacity: inTop * (1 - dim * 0.35), overflow: 'hidden', fontFamily: fonts.sans }}>
          {head(props.before.label, props.before.stat, false)}
          {props.before.items.map((it, k) => (
            <div key={k} style={{ height: L.item * u, display: 'flex', alignItems: 'center', gap: 18 * u, padding: `0 ${28 * u}px`, opacity: progress(frame, f(b.before + 0.15 + k * 0.08), f(0.4)) }}>
              <div style={{ width: 10 * u, height: 10 * u, borderRadius: 10 * u, background: palette.friction, flexShrink: 0 }} />
              <div style={{ fontSize: type.memo.size * 0.9 * u, fontWeight: type.memo.weight, color: palette.memoryText, whiteSpace: 'nowrap' }}>{it}</div>
            </div>
          ))}
        </div>

        {/* The switch between them: the brand click. */}
        <div style={{ position: 'absolute', left: layout.width / 2 - 32 * u * 0.9 * 2, top: swY - 32 * u, opacity: inTop }}>
          <ToggleMark on={on} height={64 * u} />
        </div>
        <ClickRipple at={b.click} x={layout.width / 2} y={swY} size={110 * u} />

        {/* After: the system's way. */}
        <div
          style={{
            position: 'absolute',
            left: x,
            top: botY,
            width: w,
            height: botH,
            overflow: 'hidden',
            opacity: inTop,
            transform: `perspective(${1600 * u}px) rotateX(${back ? angle - 180 : angle}deg) scale(${1 + edge * 0.03})`,
            ...(back ? cardSurface(u, progress(frame, f(b.after), f(0.3)) * (1 - progress(frame, f(duration - 0.6), f(0.4)))) : { ...memoSurface(u), background: palette.graphite }),
            fontFamily: fonts.sans,
          }}
        >
          {head(props.after.label, back ? props.after.stat : undefined, back)}
          {/* Off: placeholder rows, waiting for the switch. */}
          {!back &&
            props.after.items.map((_, k) => (
              <div key={k} style={{ height: L.item * u, display: 'flex', alignItems: 'center', gap: 16 * u, padding: `0 ${28 * u}px` }}>
                <div style={{ width: 30 * u, height: 30 * u, borderRadius: 9 * u, border: `${2 * u}px solid ${palette.hairlineStrong}`, flexShrink: 0 }} />
                <div style={{ width: `${[58, 44, 52, 40][k % 4]}%`, height: 14 * u, borderRadius: 7 * u, background: palette.hairline }} />
              </div>
            ))}
          {back &&
            props.after.items.map((it, k) => {
              const p = progress(frame, f(b.after + k * b.interval), f(0.35), ease.out);
              return (
                <div key={k} style={{ height: L.item * u, display: 'flex', alignItems: 'center', gap: 16 * u, padding: `0 ${28 * u}px` }}>
                  <div style={{ width: 30 * u, height: 30 * u, borderRadius: 9 * u, flexShrink: 0, background: mixColor(palette.ui.well, palette.signal, p), color: palette.signalInk, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + Math.sin(p * Math.PI) * 0.18})` }}>
                    {p > 0.3 && <CheckIcon size={20 * u} strokeWidth={3} />}
                  </div>
                  <UIText u={u} role="uiTitle" color={mixColor(palette.ui.textFaint, palette.ui.text, p)} style={{ fontSize: type.memo.size * 0.9 * u, fontWeight: 560 }}>
                    {it}
                  </UIText>
                </div>
              );
            })}
        </div>
      </CameraRig>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------
/** DataScene: metrics count up, a chart draws in, the system's bar lights up. */
export const Data: React.FC<{ props: DataProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { frame, f } = useTime();
  const layout = useLayout();
  const { u } = layout;
  const b = dataBeats(props, duration);
  const L = DATA_LAYOUT;
  const T = DATA_TIMING;
  const n = props.metrics.length;
  const gap = L.gap * u;
  const mw = (Z.width * u - gap * (n - 1)) / n;
  const chart = props.chart;
  const built = useArrivesBuilt();
  const chartOpen = chart ? (built ? 1 : progress(frame, f(b.chart - 0.35), f(0.55), ease.snap)) : 0;
  const peak = chart ? progress(frame, f(b.chart + T.bar + (chart.values.length - 1) * T.barStagger), f(0.6)) : 0;
  return (
    <AbsoluteFill>
      <Bounce y={(L.chartTop + L.chartHeight * 0.6) * u} strength={peak} />
      <CameraRig keys={push(duration, 1.03)}>
        {props.metrics.map((m, k) => {
          const at = b.metrics + k * 0.1;
          const open = built ? 1 : progress(frame, f(at - 0.3), f(0.5), ease.snap);
          const c = progress(frame, f(at), f(T.count), ease.out);
          const v = lerp(m.from ?? 0, m.value, c);
          return (
            <div key={k} style={{ position: 'absolute', left: Z.x * u + k * (mw + gap), top: L.metricsTop * u, clipPath: clipUp(open, radius.card * u) }}>
              <MetricCard label={m.label} value={v} format={m.format} delta={m.delta} deltaIn={progress(frame, f(at + T.count * 0.7), f(0.4))} u={u} width={mw} height={L.metricsHeight * u} lit={k === 0 ? c : 0} />
            </div>
          );
        })}
        {chart && (
          <DashboardCard x={Z.x * u} y={L.chartTop * u} width={Z.width * u} height={L.chartHeight * u} u={u} title={chart.title} style={{ clipPath: clipUp(chartOpen, radius.card * u) }}>
            <div style={{ position: 'absolute', left: 32 * u, top: 96 * u }}>
              <Chart
                kind={chart.kind}
                labels={chart.labels}
                values={chart.values}
                highlight={chart.highlight}
                format={chart.format}
                progress={chart.kind === 'line' ? [progress(frame, f(b.chart), f(T.line), ease.inOut)] : chart.values.map((_, i) => progress(frame, f(b.chart + i * T.barStagger), f(T.bar), ease.out))}
                u={u}
                width={(Z.width - 64) * u}
                height={(L.chartHeight - 122) * u}
                callout={chart.callout}
                calloutIn={chart.callout ? progress(frame, f(b.chart + T.bar + (chart.values.length - 1) * T.barStagger + T.callout), f(0.35), ease.out) : 0}
              />
            </div>
          </DashboardCard>
        )}
        {props.note && (
          <div style={{ position: 'absolute', left: Z.x * u, top: (L.chartTop + L.chartHeight + 16) * u, opacity: chartOpen }}>
            <Label size={type.label.size * 0.9 * u} color={palette.smoke}>
              {props.note}
            </Label>
          </div>
        )}
      </CameraRig>
    </AbsoluteFill>
  );
};
