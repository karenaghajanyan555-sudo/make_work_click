/**
 * LAB ONLY — E5 product / software demonstration. Fictional, unbranded app ("app.example.com",
 * RFC 2606 documentation domain); our own cursor (mac-cursors = Apple artwork: not used).
 *   e5-demo-current  production DashboardScene (the 4-row card whose rows flip to lime)
 *   e5-demo-cursor   a browser window; a person sets the rule once (cursor travels, clicks the
 *                    field, types "2", turns the rule on), the camera pushes in so the UI reads
 *                    on a phone, pulls back, then the system works the list (lime = the system)
 * Brand rule kept: the person's click is neutral (press + grey ring); only what the system does
 * afterwards is lime.
 */
import { AbsoluteFill } from 'remotion';
import { fonts, palette, radius, type } from '../../../src/brand/tokens.ts';
import { ease, lerp, mixColor, progress, sub, withAlpha } from '../../../src/remotion/lib/anim.ts';
import { useLayout, useTime } from '../../../src/remotion/lib/hooks.ts';
import { Dashboard } from '../../../src/remotion/scenes/Product.tsx';
import { Avatar, toneFor, UILabel, UIText } from '../../../src/remotion/ui/Card.tsx';
import { CheckIcon, ClockIcon, MailIcon, UserPlusIcon } from '../../../src/remotion/ui/icons.tsx';
import { Stage } from '../shared.tsx';

// ---------------------------------------------------------------------------------------------
// Baseline: the production DashboardScene with the library's content.

const WORKSPACE = { name: 'Northwind Studio', initials: 'NS', breadcrumb: 'Automations' };
export const DemoCurrent: React.FC = () => (
  <Stage tag="E5 · A · current · DashboardScene (production)">
    <Dashboard
      duration={5}
      props={{
        workspace: WORKSPACE,
        metrics: [
          { label: 'Reminded', from: 0, to: 4 },
          { label: 'Paid', from: 1, to: 3 },
          { label: 'Overdue', from: 4, to: 1 },
        ],
        listTitle: 'Invoices · overdue',
        rows: [
          { initials: 'AP', name: 'Ana Patel', detail: 'Invoice 0142 · 6 days late', before: 'Overdue', after: 'Reminded' },
          { initials: 'RK', name: 'Raj Kumar', detail: 'Invoice 0139 · 3 days late', before: 'Overdue', after: 'Reminded' },
          { initials: 'MO', name: 'Mia Ortiz', detail: 'Invoice 0137 · 2 days late', before: 'Overdue', after: 'Reminded' },
          { initials: 'LW', name: 'Leo Wang', detail: 'Invoice 0131 · 9 days late', before: 'Overdue', after: 'Reminded' },
        ],
      }}
    />
  </Stage>
);

// ---------------------------------------------------------------------------------------------
// Pure layout (base units, 1080 × 1920): the window and its hit targets.

export const WIN = { x: 70, y: 300, w: 940, h: 940 };
const BAR = 64; // browser bar
const SIDE = 200; // sidebar
const MAIN = { x: WIN.x + SIDE + 30, y: WIN.y + BAR + 30, w: WIN.w - SIDE - 60 };
const RULE = { x: MAIN.x, y: MAIN.y + 56, w: MAIN.w, h: 250 };
/** The days field and the rule switch: the two things the person touches. */
export const FIELD = { x: RULE.x + 420, y: RULE.y + 120, w: 96, h: 56 };
export const SWITCH = { x: RULE.x + RULE.w - 140, y: RULE.y + 28, w: 100, h: 56 };
const LIST = { x: MAIN.x, y: RULE.y + RULE.h + 40, w: MAIN.w, row: 104 };
const ROWS = [
  { name: 'Ana Patel', inv: 'Invoice 0142', late: 6 },
  { name: 'Raj Kumar', inv: 'Invoice 0139', late: 3 },
  { name: 'Mia Ortiz', inv: 'Invoice 0137', late: 2 },
  { name: 'Leo Wang', inv: 'Invoice 0131', late: 9 },
];
const centre = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Script (seconds). */
const T = { travel1: 0.55, click1: 1.25, type: 1.45, travel2: 1.85, click2: 2.45, pull: 2.75, rows: 3.25, rowGap: 0.28 };

/** Cursor path: rest → field → switch → off to the side (base units), eased per leg. */
export function cursorAt(t: number): { x: number; y: number } {
  const rest = { x: 760, y: 1180 };
  const field = { x: centre(FIELD).x + 6, y: centre(FIELD).y + 4 };
  const sw = { x: centre(SWITCH).x + 18, y: centre(SWITCH).y + 6 };
  const away = { x: 960, y: 1275 }; // below the card: the first version came to rest on the last lime chip (review 2026-11-19)
  const leg = (a: { x: number; y: number }, b: { x: number; y: number }, k: number, arc: number) => {
    // A hand moves on a slight arc, not a ruler line: offset perpendicular, peaking mid-leg.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const n = Math.hypot(dx, dy) || 1;
    const bow = Math.sin(Math.PI * k) * arc;
    return { x: lerp(a.x, b.x, k) + (-dy / n) * bow, y: lerp(a.y, b.y, k) + (dx / n) * bow };
  };
  if (t < T.travel2) return leg(rest, field, ease.glide(sub(t, T.travel1, T.click1 - 0.08)), 60);
  if (t < T.pull) return leg(field, sw, ease.glide(sub(t, T.travel2, T.click2 - 0.08)), -40);
  return leg(sw, away, ease.inOut(sub(t, T.pull + 0.3, T.pull + 1.2)), 30);
}

/** Camera: establish, push to the rule (readable on a phone), pull back over the list. */
export function cameraAt(t: number): { zoom: number; fx: number; fy: number } {
  const wide = { zoom: 1, fx: 540, fy: 790 };
  const close = { zoom: 1.62, fx: RULE.x + RULE.w / 2 - 10, fy: RULE.y + RULE.h / 2 };
  const list = { zoom: 1.14, fx: 560, fy: LIST.y + 150 };
  const push = ease.inOut(sub(t, 0.35, 1.2));
  const pull = ease.inOut(sub(t, T.pull, T.pull + 0.9));
  const mix = (a: typeof wide, b: typeof wide, k: number) => ({ zoom: lerp(a.zoom, b.zoom, k), fx: lerp(a.fx, b.fx, k), fy: lerp(a.fy, b.fy, k) });
  return pull > 0 ? mix(close, list, pull) : mix(wide, close, push);
}

// ---------------------------------------------------------------------------------------------
// Parts

/** Our pointer: drawn for this project (ink body, paper outline, soft contact shadow). */
export const Pointer: React.FC<{ u: number; press: number }> = ({ u, press }) => {
  const s = 1.25 * u * (1 - 0.12 * press);
  return (
    <svg width={30 * s} height={40 * s} viewBox="0 0 30 40" style={{ overflow: 'visible', filter: `drop-shadow(0 ${3 * u}px ${4 * u}px ${withAlpha(palette.ink, 0.45)})` }}>
      <path d="M2 2 L2 31 L9.2 24.6 L14 35.5 L19.6 33.1 L14.9 22.4 L24.6 22.4 Z" fill={palette.ink} stroke={palette.paper} strokeWidth={2.2} strokeLinejoin="round" />
    </svg>
  );
};

/** A person's click: neutral press ring (lime is reserved for what the system does). */
const PressRing: React.FC<{ at: number; x: number; y: number; u: number }> = ({ at, x, y, u }) => {
  const { frame, f } = useTime();
  const q = progress(frame, f(at), f(0.45), ease.out);
  if (frame < f(at) || q >= 1) return null;
  const d = (26 + q * 70) * u;
  return <div style={{ position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d, border: `${2 * u}px solid ${withAlpha(palette.ui.text, 0.35 * (1 - q))}` }} />;
};

const Switch: React.FC<{ on: number; u: number }> = ({ on, u }) => (
  <div style={{ width: SWITCH.w * u, height: SWITCH.h * u, borderRadius: 999, background: mixColor(palette.ui.borderStrong, palette.signal, on), position: 'relative' }}>
    <div style={{ position: 'absolute', top: 6 * u, left: lerp(6, SWITCH.w - SWITCH.h + 6, on) * u, width: (SWITCH.h - 12) * u, height: (SWITCH.h - 12) * u, borderRadius: 999, background: palette.ui.surface, boxShadow: `0 ${2 * u}px ${6 * u}px ${withAlpha(palette.ink, 0.25)}` }} />
  </div>
);

const Browser: React.FC<{ u: number; t: number }> = ({ u, t }) => {
  const typed = t >= T.type ? '2' : '';
  const focus = t >= T.click1 && t < T.travel2 + 0.3;
  const caretOn = focus && Math.floor((t - T.click1) * 2.2) % 2 === 0;
  const on = progress(t * 30, T.click2 * 30, 0.33 * 30, ease.snap);
  const hoverField = t > T.click1 - 0.25 && t < T.travel2 + 0.1;
  const hoverSwitch = t > T.click2 - 0.25 && t < T.pull;
  const rowDone = (k: number) => progress(t * 30, (T.rows + k * T.rowGap) * 30, 0.4 * 30, ease.out);
  const ui = (r: number) => r * u;
  return (
    <div style={{ position: 'absolute', left: ui(WIN.x), top: ui(WIN.y), width: ui(WIN.w), height: ui(WIN.h), borderRadius: radius.window * u, background: palette.ui.canvas, overflow: 'hidden', boxShadow: `0 ${30 * u}px ${80 * u}px ${-20 * u}px ${withAlpha(palette.ink, 0.85)}`, border: `${1.5 * u}px solid ${palette.ui.border}` }}>
      {/* Browser bar: neutral controls, one tab, a fictional address */}
      <div style={{ height: ui(BAR), display: 'flex', alignItems: 'center', gap: ui(18), padding: `0 ${ui(24)}px`, background: palette.ui.well, borderBottom: `${1.5 * u}px solid ${palette.ui.border}` }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: ui(13), height: ui(13), borderRadius: 99, background: palette.ui.borderStrong }} />
        ))}
        <div style={{ marginLeft: ui(14), flex: 1, height: ui(38), borderRadius: ui(10), background: palette.ui.surface, display: 'flex', alignItems: 'center', padding: `0 ${ui(16)}px`, fontFamily: fonts.sans, fontSize: type.uiBody.size * u, color: palette.ui.textMuted, letterSpacing: type.uiBody.tracking }}>
          app.example.com/automations
        </div>
      </div>
      {/* Sidebar */}
      <div style={{ position: 'absolute', left: 0, top: ui(BAR), width: ui(SIDE), bottom: 0, borderRight: `${1.5 * u}px solid ${palette.ui.border}`, padding: `${ui(28)}px ${ui(20)}px`, display: 'flex', flexDirection: 'column', gap: ui(10) }}>
        {[
          ['Inbox', MailIcon],
          ['Customers', UserPlusIcon],
          ['Automations', ClockIcon],
        ].map(([label, Icon], i) => {
          const I = Icon as typeof MailIcon;
          const active = i === 2;
          return (
            <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: ui(12), padding: `${ui(12)}px ${ui(14)}px`, borderRadius: ui(12), background: active ? palette.ui.surface : undefined, border: active ? `${1.5 * u}px solid ${palette.ui.border}` : `${1.5 * u}px solid transparent` }}>
              <I size={ui(22)} color={active ? palette.ui.text : palette.ui.textFaint} />
              <UIText u={u} role="uiBody" color={active ? palette.ui.text : palette.ui.textMuted}>
                {label as string}
              </UIText>
            </div>
          );
        })}
      </div>
      {/* Rule card (coordinates relative to the window) */}
      <div style={{ position: 'absolute', left: ui(MAIN.x - WIN.x), top: ui(MAIN.y - WIN.y) }}>
        <UILabel u={u}>Automation · payments</UILabel>
      </div>
      <div style={{ position: 'absolute', left: ui(RULE.x - WIN.x), top: ui(RULE.y - WIN.y), width: ui(RULE.w), height: ui(RULE.h), borderRadius: radius.card * u, background: palette.ui.surface, border: `${1.5 * u}px solid ${on > 0.5 ? withAlpha(palette.signalDeep, 0.5) : palette.ui.border}` }}>
        <div style={{ position: 'absolute', left: ui(28), top: ui(30) }}>
          <UIText u={u} role="uiTitle">
            Payment reminders
          </UIText>
          <div style={{ marginTop: ui(6) }}>
            <UIText u={u} role="uiBody" color={palette.ui.textMuted}>
              {on > 0.5 ? 'On · runs every morning' : 'Off'}
            </UIText>
          </div>
        </div>
        <div style={{ position: 'absolute', left: ui(SWITCH.x - RULE.x), top: ui(SWITCH.y - RULE.y), filter: hoverSwitch && on < 0.5 ? 'brightness(0.96)' : undefined }}>
          <Switch on={on} u={u} />
        </div>
        <div style={{ position: 'absolute', left: ui(28), top: ui(FIELD.y - RULE.y), height: ui(FIELD.h), display: 'flex', alignItems: 'center', gap: ui(14) }}>
          <UIText u={u} role="uiBody">
            When an invoice is late, remind after
          </UIText>
        </div>
        <div style={{ position: 'absolute', left: ui(FIELD.x - RULE.x), top: ui(FIELD.y - RULE.y), width: ui(FIELD.w), height: ui(FIELD.h), borderRadius: ui(12), background: hoverField && !focus ? palette.ui.well : palette.ui.surface, border: `${(focus ? 2.5 : 1.5) * u}px solid ${focus ? palette.ui.text : palette.ui.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.sans, fontSize: type.uiTitle.size * u, fontWeight: type.uiTitle.weight, color: palette.ui.text }}>
          {typed}
          {caretOn ? <div style={{ width: ui(2.5), height: ui(30), background: palette.ui.text, marginLeft: ui(2) }} /> : null}
        </div>
        <div style={{ position: 'absolute', left: ui(FIELD.x - RULE.x + FIELD.w + 16), top: ui(FIELD.y - RULE.y), height: ui(FIELD.h), display: 'flex', alignItems: 'center' }}>
          <UIText u={u} role="uiBody">
            days
          </UIText>
        </div>
      </div>
      {/* The list the system works */}
      <div style={{ position: 'absolute', left: ui(LIST.x - WIN.x), top: ui(LIST.y - WIN.y), width: ui(LIST.w) }}>
        <UILabel u={u}>Invoices · late</UILabel>
        <div style={{ marginTop: ui(14), borderRadius: radius.card * u, background: palette.ui.surface, border: `${1.5 * u}px solid ${palette.ui.border}`, overflow: 'hidden' }}>
          {ROWS.map((r, k) => {
            const d = rowDone(k);
            return (
              <div key={r.name} style={{ height: ui(LIST.row), display: 'flex', alignItems: 'center', gap: ui(18), padding: `0 ${ui(24)}px`, borderTop: k ? `${1.5 * u}px solid ${palette.ui.border}` : undefined }}>
                <Avatar initials={r.name.split(' ').map((w) => w[0]).join('')} size={ui(48)} tone={toneFor(r.name)} />
                <div style={{ flex: 1 }}>
                  <UIText u={u} role="uiTitle">
                    {r.name}
                  </UIText>
                  <UIText u={u} role="uiBody" color={palette.ui.textMuted}>
                    {d > 0.5 ? `${r.inv} · reminder sent 9:0${k}` : `${r.inv} · ${r.late} days late`}
                  </UIText>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: ui(8), fontFamily: fonts.sans, fontSize: type.uiChip.size * u, fontWeight: type.uiChip.weight, padding: `${ui(8)}px ${ui(16)}px`, borderRadius: 999, background: d > 0.5 ? palette.signal : withAlpha(palette.friction, 0.14), color: d > 0.5 ? palette.signalInk : palette.friction, transform: `scale(${1 + 0.08 * Math.sin(Math.PI * d)})` }}>
                  {d > 0.5 ? <CheckIcon size={ui(18)} color={palette.signalInk} strokeWidth={2.6} /> : null}
                  {d > 0.5 ? 'Reminded' : 'Late'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const DemoCursor: React.FC = () => {
  const { t } = useTime();
  const { u, safe } = useLayout();
  const cam = cameraAt(t);
  const c = cursorAt(t);
  const press = Math.max(Math.sin(Math.PI * sub(t, T.click1 - 0.04, T.click1 + 0.12)), Math.sin(Math.PI * sub(t, T.click2 - 0.04, T.click2 + 0.12)));
  // Camera: the focus point lands on the live-area centre, scaled by zoom (pure transform).
  const tx = 540 * u - cam.fx * u * cam.zoom;
  const ty = safe.cy - cam.fy * u * cam.zoom;
  return (
    <Stage tag="E5 · B · experiment · browser + our cursor + camera">
      <AbsoluteFill style={{ transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${cam.zoom.toFixed(4)})`, transformOrigin: '0 0' }}>
        <Browser u={u} t={t} />
        <PressRing at={T.click1} x={centre(FIELD).x * u} y={centre(FIELD).y * u} u={u} />
        <PressRing at={T.click2} x={centre(SWITCH).x * u} y={centre(SWITCH).y * u} u={u} />
        <div style={{ position: 'absolute', left: c.x * u - 2.5 * u, top: c.y * u - 2.5 * u }}>
          <Pointer u={u} press={press} />
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
