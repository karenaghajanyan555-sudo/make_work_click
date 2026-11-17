import { fonts, palette, radius, type } from '../../brand/tokens.ts';
import type { EmailDetail, GoalDetail, ScheduleDetail } from '../../video/scenes/flowRun.ts';
import { lerp, mixColor } from '../lib/anim.ts';
import { Chip, FLOW_METRICS } from './Flow.tsx';
import { CheckIcon, MailIcon } from './icons.tsx';

/**
 * Step details: what a flow step actually did, shown inside its node when it is in
 * focus (flowRun). Heights match FLOW_RUN_LAYOUT.detailHeight. Fictional, unbranded.
 * Every view takes plain progress values (0..1) so the scene owns all timing.
 */

const padX = FLOW_METRICS.padX;

const Divider: React.FC<{ u: number }> = ({ u }) => (
  <div style={{ position: 'absolute', left: padX * u, right: padX * u, top: 0, height: 1.5 * u, background: palette.ui.border }} />
);

const MonoLabel: React.FC<{ u: number; children: React.ReactNode; color?: string }> = ({ u, children, color = palette.ui.textFaint }) => (
  <span
    style={{
      fontFamily: fonts.mono,
      fontSize: type.label.size * u,
      fontWeight: type.label.weight,
      letterSpacing: type.label.tracking,
      textTransform: 'uppercase',
      color,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

/** `appear` 0..1 — content settles in as the node opens (light on light: opacity is fine). */
const settle = (appear: number, u: number, delay = 0): React.CSSProperties => {
  const p = Math.min(1, Math.max(0, (appear - delay) / (1 - delay)));
  return { opacity: p, transform: `translateY(${(1 - p) * 10 * u}px)` };
};

/** Subject with its personalisation: the merge field until `merge` passes ½, then the name, flashed in signal. */
const Subject: React.FC<{ d: EmailDetail; u: number; merge: number }> = ({ d, u, merge }) => {
  const first = d.to.split(' ')[0]!;
  const at = d.subject.lastIndexOf(first);
  if (at < 0) return <>{d.subject}</>;
  const filled = merge >= 0.5;
  const flash = filled ? Math.max(0, 1 - (merge - 0.5) * 2) : 0;
  return (
    <>
      {d.subject.slice(0, at)}
      <span
        style={{
          display: 'inline-block',
          padding: `0 ${6 * u}px`,
          margin: `0 ${-6 * u}px`,
          borderRadius: 8 * u,
          background: filled ? `rgba(201,242,93,${0.55 * flash})` : palette.ui.well,
          color: filled ? palette.ui.text : palette.ui.textFaint,
          fontFamily: filled ? undefined : fonts.mono,
          fontSize: filled ? undefined : '0.78em',
          transform: `scale(${1 + Math.sin(Math.min(1, merge * 2) * Math.PI) * 0.06})`,
        }}
      >
        {filled ? first : d.mergeField}
      </span>
      {d.subject.slice(at + first.length)}
    </>
  );
};

export const EmailDetailView: React.FC<{ d: EmailDetail; u: number; appear: number; send: number; sent: boolean; merge?: number; opened?: number }> = ({ d, u, appear, send, sent, merge, opened = 0 }) => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: fonts.sans }}>
    <Divider u={u} />
    <div style={{ position: 'absolute', left: padX * u, right: padX * u, top: 24 * u, display: 'flex', gap: 14 * u, alignItems: 'baseline', ...settle(appear, u) }}>
      <MonoLabel u={u}>To</MonoLabel>
      <span style={{ fontSize: type.uiBody.size * u, fontWeight: 560, color: palette.ui.text }}>{d.to}</span>
      <span style={{ width: 20 * u }} />
      <MonoLabel u={u}>From</MonoLabel>
      <span style={{ fontSize: type.uiBody.size * u, fontWeight: type.uiBody.weight, color: palette.ui.textMuted }}>{d.from}</span>
    </div>
    <div
      style={{
        position: 'absolute',
        left: padX * u,
        right: padX * u,
        top: 64 * u,
        fontSize: type.uiTitle.size * u,
        fontWeight: type.uiTitle.weight,
        letterSpacing: type.uiTitle.tracking,
        color: palette.ui.text,
        whiteSpace: 'nowrap',
        ...settle(appear, u, 0.15),
      }}
    >
      {d.mergeField && merge !== undefined ? <Subject d={d} u={u} merge={merge} /> : d.subject}
    </div>
    <div
      style={{
        position: 'absolute',
        left: padX * u,
        right: padX * u,
        top: 110 * u,
        fontSize: type.uiBody.size * u,
        fontWeight: type.uiBody.weight,
        letterSpacing: type.uiBody.tracking,
        lineHeight: 1.45,
        color: palette.ui.textMuted,
        ...settle(appear, u, 0.3),
      }}
    >
      {d.body}
    </div>
    <div style={{ position: 'absolute', left: padX * u, right: padX * u, top: 204 * u, height: 32 * u, display: 'flex', alignItems: 'center', gap: 20 * u, ...settle(appear, u, 0.45) }}>
      <div style={{ position: 'relative', flex: 1, height: 6 * u, borderRadius: 6 * u, background: palette.ui.well, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${send * 100}%`, borderRadius: 6 * u, background: sent ? palette.signal : palette.ui.textFaint }} />
      </div>
      {d.opened && opened > 0 ? (
        <div style={{ transform: `scale(${1 + Math.sin(Math.min(1, opened) * Math.PI) * 0.08})` }}>
          <MonoLabel u={u} color={palette.signalOnLight}>
            {d.opened}
          </MonoLabel>
        </div>
      ) : (
        <MonoLabel u={u} color={sent ? palette.ui.text : palette.ui.textFaint}>
          {sent ? `Delivered · ${d.deliveredAt}` : 'Sending…'}
        </MonoLabel>
      )}
    </div>
  </div>
);

/**
 * Week strip. `cursor` is the fractional day index of the "today" frame (startDay →
 * sendDay); `sent` 0..1 fills the send day with the signal.
 */
export const ScheduleDetailView: React.FC<{ d: ScheduleDetail; u: number; appear: number; cursor: number; sent: number; width: number }> = ({
  d,
  u,
  appear,
  cursor,
  sent,
  width,
}) => {
  const gap = 12 * u;
  const n = d.days.length;
  const cellW = (width - 2 * padX * u - gap * (n - 1)) / n;
  const cellH = 118 * u;
  const top = 24 * u;
  const cellX = (i: number) => padX * u + i * (cellW + gap);
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: fonts.sans }}>
      <Divider u={u} />
      {d.days.map((day, i) => {
        const isStart = i === d.startDay;
        const isSend = i === d.sendDay;
        const here = Math.max(0, 1 - Math.abs(cursor - i));
        const lit = isSend ? sent : 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cellX(i),
              top,
              width: cellW,
              height: cellH,
              borderRadius: radius.icon * u,
              background: lit > 0 ? mixColor(palette.ui.surface, palette.signal, lit) : mixColor(palette.ui.well, palette.ui.surface, here),
              border: `${1.5 * u}px solid ${isSend && lit < 0.5 ? palette.signalDeep : palette.ui.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 16 * u,
              boxSizing: 'border-box',
              ...settle(appear, u, Math.min(0.5, i * 0.08)),
            }}
          >
            <MonoLabel u={u} color={lit > 0.5 ? palette.signalInk : palette.ui.textFaint}>
              {day}
            </MonoLabel>
            <div style={{ fontSize: type.uiTitle.size * u, fontWeight: type.uiTitle.weight, letterSpacing: type.uiTitle.tracking, color: lit > 0.5 ? palette.signalInk : palette.ui.text, marginTop: 4 * u, fontVariantNumeric: 'tabular-nums' }}>
              {d.dates[i]}
            </div>
            <div style={{ marginTop: 8 * u, height: 26 * u, display: 'flex', alignItems: 'center', gap: 6 * u, fontSize: type.uiChip.size * 0.9 * u, fontWeight: type.uiChip.weight, color: lit > 0.5 ? palette.signalInk : palette.ui.textMuted }}>
              {isStart && (
                <>
                  <span style={{ width: 9 * u, height: 9 * u, borderRadius: 9 * u, background: palette.signalDeep }} />
                  {d.startLabel}
                </>
              )}
              {isSend && (lit > 0.5 ? <CheckIcon size={20 * u} strokeWidth={2.8} /> : <MailIcon size={19 * u} strokeWidth={2.2} />)}
              {isSend && (lit > 0.5 ? 'Sent' : d.sendTime)}
            </div>
          </div>
        );
      })}
      {/* "Today" frame hopping day to day. */}
      <div
        style={{
          position: 'absolute',
          left: lerp(cellX(Math.floor(cursor)), cellX(Math.min(n - 1, Math.floor(cursor) + 1)), cursor - Math.floor(cursor)) - 4 * u,
          top: top - 4 * u,
          width: cellW + 8 * u,
          height: cellH + 8 * u,
          borderRadius: (radius.icon + 4) * u,
          border: `${2.5 * u}px solid ${palette.ui.text}`,
          opacity: appear * (1 - sent),
        }}
      />
    </div>
  );
};

export const GoalDetailView: React.FC<{ d: GoalDetail; u: number; appear: number; arrive: number; reached: number; value?: number }> = ({ d, u, appear, arrive, reached, value }) => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: fonts.sans }}>
    <Divider u={u} />
    <div
      style={{
        position: 'absolute',
        left: padX * u,
        right: padX * u,
        top: 24 * u,
        height: 64 * u,
        display: 'flex',
        alignItems: 'center',
        gap: 20 * u,
        opacity: Math.min(appear, arrive),
        transform: `translateX(${(1 - arrive) * 60 * u}px)`,
      }}
    >
      <div
        style={{
          width: 56 * u,
          height: 56 * u,
          borderRadius: 56 * u,
          flexShrink: 0,
          background: 'linear-gradient(160deg, #F3DCCB, #DDB79B)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: type.uiBody.size * u,
          fontWeight: 680,
          color: '#5B452C',
        }}
      >
        {d.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: type.uiTitle.size * u, fontWeight: type.uiTitle.weight, letterSpacing: type.uiTitle.tracking, color: palette.ui.text }}>{d.customer}</div>
        <div style={{ fontSize: type.uiBody.size * u, fontWeight: type.uiBody.weight, color: palette.ui.textMuted, marginTop: 4 * u, whiteSpace: 'nowrap' }}>{d.items}</div>
      </div>
      {d.amount !== undefined && value !== undefined ? (
        <div style={{ textAlign: 'right' }}>
          <MonoLabel u={u}>{d.time}</MonoLabel>
          <div style={{ marginTop: 4 * u, fontSize: type.uiTitle.size * u, fontWeight: type.uiTitle.weight, letterSpacing: type.uiTitle.tracking, color: palette.signalOnLight, fontVariantNumeric: 'tabular-nums' }}>
            +${value.toFixed(2)}
          </div>
        </div>
      ) : (
        <MonoLabel u={u}>{d.time}</MonoLabel>
      )}
    </div>
    <div style={{ position: 'absolute', left: padX * u, right: padX * u, top: 106 * u, height: 44 * u, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: Math.min(appear, arrive) }}>
      <div
        style={{
          padding: `${9 * u}px ${16 * u}px`,
          borderRadius: radius.chip,
          background: palette.ui.well,
          fontSize: type.uiChip.size * u,
          fontWeight: 560,
          color: palette.ui.textMuted,
          whiteSpace: 'nowrap',
        }}
      >
        {d.note}
      </div>
      <div style={{ opacity: reached > 0 ? 1 : 0 }}>
        <Chip state="done" label={d.badge} u={u} pop={reached} />
      </div>
    </div>
  </div>
);
