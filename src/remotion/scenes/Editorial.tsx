import { AbsoluteFill } from 'remotion';
import { CAPTION_BAND } from '../../brand/format.ts';
import { fonts, palette, type } from '../../brand/tokens.ts';
import { SCATTER } from '../../video/scenes/scatter.ts';
import {
  hookBeats,
  HOOK_LAYOUT,
  payoffBeats,
  payoffCheckAt,
  PAYOFF_LAYOUT,
  problemBeats,
  PROBLEM_LAYOUT,
  statementBeats,
  type HookProps,
  type PayoffProps,
  type ProblemProps,
  type StatementProps,
} from '../../video/scenes/editorial.ts';
import { ease, lerp, progress } from '../lib/anim.ts';
import { useFontsReady } from '../lib/fonts.ts';
import { useLayout, usePreset, useTime } from '../lib/hooks.ts';
import { KineticPhrase } from '../brand/KineticPhrase.tsx';
import { Label } from '../brand/Mark.tsx';
import { SectionLabel } from '../brand/SectionLabel.tsx';
import { CameraRig } from '../motion/Camera.tsx';
import { Avatar, toneFor } from '../ui/Card.tsx';
import { MEMO, MemoContent, memoSurface, memoWidth } from '../ui/Memo.tsx';
import { ScatterMemo } from '../ui/Scatter.tsx';

/** A slow push across the whole scene (scaled by the preset's camera intensity). */
const drift = (duration: number, zoom = 1.035) => [
  { t: 0, zoom: 1, x: 0, y: 0 },
  { t: duration, zoom, x: 0, y: 0, ease: 'linear' as const },
];

/** HookScene: the headline over the scattered to-dos of the problem. */
export const Hook: React.FC<{ props: HookProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { u, gutter } = useLayout();
  const preset = usePreset();
  const b = hookBeats(props, duration);
  const align = props.align ?? preset.layout.align;
  const frags = props.fragments ?? [];
  const behind = frags.map((fr, i) => ({ fr, i })).filter(({ i }) => SCATTER[i]?.plane !== 'near');
  const front = frags.map((fr, i) => ({ fr, i })).filter(({ i }) => SCATTER[i]?.plane === 'near');
  return (
    <AbsoluteFill>
      <CameraRig keys={drift(duration)}>
        {behind.map(({ fr, i }) => (
          <ScatterMemo key={i} frag={fr} index={i} leaveAt={b.out - 0.1} />
        ))}
        <div style={{ position: 'absolute', left: gutter, right: gutter, top: HOOK_LAYOUT.headlineTop * u, display: 'grid', gap: HOOK_LAYOUT.eyebrowGap * u }}>
          {props.eyebrow && <SectionLabel text={props.eyebrow} at={b.headline} out={b.out} align={align} />}
          <KineticPhrase markup={props.headline} role="display" at={b.headline} out={b.out} align={align} />
        </div>
        {front.map(({ fr, i }) => (
          <ScatterMemo key={i} frag={fr} index={i} leaveAt={b.out - 0.1} />
        ))}
      </CameraRig>
    </AbsoluteFill>
  );
};

/** StatementScene: one line, big, centred in the live area. */
export const Statement: React.FC<{ props: StatementProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { u, gutter, safe } = useLayout();
  const preset = usePreset();
  const b = statementBeats(props, duration);
  const align = props.align ?? preset.layout.align;
  return (
    <AbsoluteFill>
      <CameraRig keys={drift(duration, 1.03)}>
        <div style={{ position: 'absolute', left: gutter, right: gutter, top: safe.top, height: safe.height, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 40 * u }}>
          {props.label && <SectionLabel text={props.label} at={b.text} out={b.out} align={align} />}
          <KineticPhrase markup={props.text} role={props.role ?? preset.layout.statementRole} at={b.text} out={b.out} align={align} />
          {props.support && <KineticPhrase markup={props.support} role="lead" at={b.support} out={b.out} align={align} color={palette.fog} />}
        </div>
      </CameraRig>
    </AbsoluteFill>
  );
};

/** ProblemScene: messages pile up, newest at the bottom, nobody answers. */
export const Problem: React.FC<{ props: ProblemProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { frame, f } = useTime();
  const layout = useLayout();
  const { u } = layout;
  const b = problemBeats(props, duration);
  const L = PROBLEM_LAYOUT;
  const landed = (k: number) => progress(frame, f(b.first + k * b.interval), f(0.42), ease.snap);
  // How many cards have arrived after card k (continuous): pushes k up.
  const above = (k: number) => props.items.reduce((s, _, j) => (j > k ? s + landed(j) : s), 0);
  const count = props.items.filter((_, k) => frame >= f(b.first + k * b.interval)).length;
  const lastLanded = Math.max(0, count - 1);
  const pop = count ? progress(frame, f(b.first + lastLanded * b.interval), f(0.3), ease.linear) : 0;
  const x = (layout.width - L.width * u) / 2;
  return (
    <AbsoluteFill>
      <CameraRig keys={drift(duration, 1.03)}>
        {props.items.map((it, k) => {
          const p = landed(k);
          if (p <= 0) return null;
          const depth = above(k);
          const y = (L.bottom - L.cardHeight - depth * (L.cardHeight + L.gap)) * u + (1 - p) * 90 * u;
          // Cards climbing into the caption band recede (dark surfaces: fading is fine here).
          const recede = Math.min(1, Math.max(0, (CAPTION_BAND.bottom * u + 40 * u - y) / (L.cardHeight * u)));
          const tilt = (k % 2 ? 0.6 : -0.5) * p;
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: L.width * u,
                height: L.cardHeight * u,
                ...memoSurface(u),
                opacity: Math.min(1, p * 1.6) * (1 - recede),
                filter: recede > 0.02 ? `blur(${recede * 10}px)` : undefined,
                transform: `rotate(${tilt}deg) scale(${1 - depth * L.depthScale * 0.5})`,
                display: 'flex',
                alignItems: 'center',
                gap: 22 * u,
                padding: `0 ${28 * u}px`,
                boxSizing: 'border-box',
                fontFamily: fonts.sans,
              }}
            >
              <Avatar initials={(it.meta ?? '?').slice(0, 1).toUpperCase()} size={52 * u} tone={toneFor(it.meta ?? String(k))} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {it.meta && <Label size={type.label.size * u} color={palette.smoke}>{it.meta}</Label>}
                <div style={{ marginTop: 6 * u, fontSize: type.memo.size * u, fontWeight: type.memo.weight, letterSpacing: type.memo.tracking, color: palette.memoryText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.text}</div>
              </div>
              {it.tag && (
                <div style={{ fontFamily: fonts.mono, fontSize: MEMO.tagSize * u, letterSpacing: '0.06em', textTransform: 'uppercase', color: palette.friction, padding: `${6 * u}px ${MEMO.tagPadX * u}px`, borderRadius: 8 * u, background: 'rgba(255,138,101,0.12)', whiteSpace: 'nowrap' }}>
                  {it.tag}
                </div>
              )}
            </div>
          );
        })}
      </CameraRig>
      {props.counter && count > 0 && (
        <div style={{ position: 'absolute', right: layout.width - layout.safe.right, top: L.counterTop * u, transform: `scale(${1 + Math.sin(pop * Math.PI) * 0.12})`, transformOrigin: 'right center' }}>
          <Label size={type.label.size * u * 1.15} color={palette.friction}>
            {`${props.counter} · ${count}`}
          </Label>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** PayoffScene: the to-dos, checked off by the system one by one, then the line. */
export const Payoff: React.FC<{ props: PayoffProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { frame, f } = useTime();
  const layout = useLayout();
  const { u, gutter } = layout;
  const preset = usePreset();
  const b = payoffBeats(props, duration);
  const L = PAYOFF_LAYOUT;
  const n = props.items.length;
  const listH = n * L.rowHeight + (n - 1) * L.gap;
  const top = L.listCenter - listH / 2;
  const widest = Math.max(...props.items.map((it) => memoWidth(it, it.resolved)));
  const left = (layout.width / u - widest) / 2;
  const allDone = progress(frame, f(payoffCheckAt(b, n - 1) + 0.2), f(0.9), ease.out);
  const align = preset.layout.align;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(${820 * u}px ${560 * u}px at 50% ${(L.listCenter / 1920) * 100}%, rgba(201,242,93,${0.1 * allDone * preset.world.glow}), transparent 70%)` }} />
      <CameraRig keys={drift(duration, 1.025)}>
        {props.items.map((it, k) => {
          const enter = progress(frame, f(Math.max(0, b.items - 0.45) + k * 0.06), f(0.45), ease.out);
          const at = payoffCheckAt(b, k);
          const check = progress(frame, f(at), f(0.35), ease.out);
          const strike = progress(frame, f(at + 0.1), f(0.35), ease.inOut);
          const tagSwap = progress(frame, f(at + 0.12), f(0.3), ease.out);
          const w = lerp(memoWidth(it), memoWidth(it, it.resolved), tagSwap);
          return (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: left * u,
                top: (top + k * (L.rowHeight + L.gap)) * u + (1 - enter) * 30 * u,
                width: w * u,
                height: MEMO.height * u,
                overflow: 'hidden',
                opacity: enter,
                filter: enter < 1 ? `blur(${(1 - enter) * 8}px)` : undefined,
                ...memoSurface(u),
              }}
            >
              <MemoContent memo={it} u={u} resolved={{ label: it.resolved, check, strike }} />
            </div>
          );
        })}
      </CameraRig>
      {props.statement && (
        <div style={{ position: 'absolute', left: gutter, right: gutter, top: L.statementTop * u }}>
          <KineticPhrase markup={props.statement} role="title" at={b.statement} align={align} />
        </div>
      )}
    </AbsoluteFill>
  );
};
