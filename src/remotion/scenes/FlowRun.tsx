import { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { radius } from '../../brand/tokens.ts';
import type { Rect } from '../../brand/format.ts';
import type { CameraKey } from '../../video/camera.ts';
import { END_CARD_LAYOUT } from '../../video/scenes/endCard.ts';
import {
  checkAt,
  detailCloseAt,
  detailOpenAt,
  mergeAt,
  openedAt,
  orderAt,
  FLOW_RUN_LAYOUT,
  FLOW_RUN_TIMING,
  flowRunWindow,
  focusScroll,
  scheduleHops,
  type FlowRunProps,
  type StepDetail,
} from '../../video/scenes/flowRun.ts';
import { ease, lerp, progress } from '../lib/anim.ts';
import { useFontsReady } from '../lib/fonts.ts';
import { useLayout, useTime } from '../lib/hooks.ts';
import { Label, ToggleMark } from '../brand/Mark.tsx';
import { CameraRig } from '../motion/Camera.tsx';
import { ClickRipple, LightSweep } from '../motion/Signal.tsx';
import { palette, type } from '../../brand/tokens.ts';
import { EmailDetailView, GoalDetailView, ScheduleDetailView } from '../ui/Details.tsx';
import { Connector, FLOW_METRICS, NodeBody, nodeSurface, type ChipState } from '../ui/Flow.tsx';
import { MEMO, MemoContent, memoSurface, memoWidth } from '../ui/Memo.tsx';
import { WindowChrome } from '../ui/WindowChrome.tsx';

/**
 * Scene type "flowRun" (model + beats: src/video/scenes/flowRun.ts).
 * One continuous shot inside the product window:
 *  1. RUN       Camera pushes in. The trigger fires; the signal travels down the flow and
 *               each step opens a detail showing what it did (email sent, schedule kept,
 *               order back). The canvas auto-scrolls like real software; the window
 *               never moves, so captions above always sit on dark ground.
 *  2. LOOP      The signal travels back up to the trigger; camera pulls back to the flow.
 *  3. RESOLVE   Steps flip back (the chaosToSystem flip, reversed) into the owner's
 *               to-dos, which get ticked off; the window recedes behind them.
 *  4. CONVERGE  The resolved to-dos slide into the brand switch (hand-off to endCard).
 * The camera is exactly 1.0 from the pull-back on, so screen space = scene space.
 */
export const FlowRun: React.FC<{ props: FlowRunProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { frame, f } = useTime();
  const layout = useLayout();
  const { u } = layout;
  const b = props.beats;
  const T = FLOW_RUN_TIMING;
  const m = FLOW_METRICS;
  const steps = props.flow;
  const n = steps.length;

  const win: Rect = useMemo(() => {
    const w = flowRunWindow(n, layout.width / u);
    return { x: w.x * u, y: w.y * u, width: w.width * u, height: w.height * u };
  }, [layout.width, u, n]);
  const canvas: Rect = { x: win.x, y: win.y + m.headerHeight * u, width: win.width, height: win.height - m.headerHeight * u };

  // ---- detail expansion + auto-scroll (base units) ----
  const detail = (i: number): StepDetail | null => props.details[i] ?? null;
  const detailH = (i: number) => {
    const d = detail(i);
    return d ? FLOW_RUN_LAYOUT.detailHeight[d.kind] : 0;
  };
  const openP = (i: number) =>
    i === 0 || !detail(i) ? 0 : progress(frame, f(detailOpenAt(b, i)), f(T.detailOpen), ease.inOut) * (1 - progress(frame, f(detailCloseAt(b, i)), f(T.detailClose), ease.inOut));
  const expand = steps.map((_, i) => detailH(i) * openP(i));

  let scroll = 0;
  for (let i = 1; i < n; i++) {
    if (!detail(i)) continue;
    scroll = lerp(scroll, focusScroll(i, detailH(i)), progress(frame, f(b.steps[i - 1]!.arrive - 0.45), f(T.scroll), ease.inOut));
  }
  scroll = lerp(scroll, 0, progress(frame, f(b.pullBack), f(T.pullBackTravel), ease.inOut));
  // Like real software: never scroll past the content (a closing detail pulls content back down).
  scroll = Math.min(scroll, expand.reduce((a, c) => a + c, 0));

  const needsClip = scroll > 0.01 || expand.some((e) => e > 0.01);
  const nodeTop = (i: number) => canvas.y + (m.bodyPad + i * (m.nodeHeight + m.nodeGap) + expand.slice(0, i).reduce((a, c) => a + c, 0) - scroll) * u;
  const nodeX = canvas.x + m.bodyPad * u;
  const nodeW = win.width - m.bodyPad * 2 * u;
  const iconX = canvas.x + (m.bodyPad + m.padX + m.icon / 2) * u;

  // ---- step states ----
  const loopDone = b.loop + T.loopTravel;
  const stepState = (i: number): { chip: ChipState; label: string; active: number; pop: number } => {
    const s = steps[i]!;
    const before = s.chipBefore ?? s.chip;
    const doneLabel = s.chipDone ?? s.chip;
    if (i === 0) {
      const returned = frame >= f(loopDone);
      const fired = frame >= f(b.trigger);
      const active =
        progress(frame, f(b.trigger), f(0.25)) * (1 - progress(frame, f(b.trigger + 0.9), f(0.3))) +
        progress(frame, f(loopDone - 0.1), f(0.2)) * (1 - progress(frame, f(loopDone + 0.5), f(0.3)));
      if (returned) return { chip: 'done', label: doneLabel, active, pop: progress(frame, f(loopDone), f(0.3), ease.linear) };
      return { chip: fired ? 'pending' : 'idle', label: s.chip, active, pop: fired ? progress(frame, f(b.trigger), f(0.3), ease.linear) : 0 };
    }
    const { arrive, done } = b.steps[i - 1]!;
    const active = progress(frame, f(arrive - 0.05), f(0.2)) * (1 - progress(frame, f(detailCloseAt(b, i) + 0.1), f(0.3)));
    if (frame >= f(done)) return { chip: 'done', label: doneLabel, active, pop: progress(frame, f(done), f(0.3), ease.linear) };
    if (s.kind === 'email' && frame >= f(detailOpenAt(b, i) + 0.25)) return { chip: 'busy', label: 'Sending', active, pop: 0 };
    if (frame >= f(arrive) && s.kind !== 'email') return { chip: 'pending', label: s.chip, active, pop: progress(frame, f(arrive), f(0.3), ease.linear) };
    return { chip: 'idle', label: before, active, pop: 0 };
  };

  const connector = (i: number) => {
    const from = i === 0 ? b.trigger : b.steps[i - 1]!.done;
    const to = b.steps[i]!.arrive;
    const start = from + 0.08;
    const p = progress(frame, f(start), f(Math.max(0.1, to - 0.05 - start)), ease.inOut);
    // Loop: the signal travels back up, bottom connector first.
    const seg = T.loopTravel / (n - 1);
    const k = n - 2 - i;
    const back = progress(frame, f(b.loop + k * seg), f(seg), ease.linear);
    const pulse = back > 0 && back < 1 ? 1 - back : p;
    return { fill: p, pulse };
  };

  // ---- resolve: flip back, tick off, window recedes ----
  const resolveStarted = frame >= f(b.resolve);
  // The window leaves downward behind the resolved to-dos (never faded: light over dark).
  const collapse = progress(frame, f(b.resolve + 0.3), f(T.collapse), ease.in);
  const windowDrop = collapse * (layout.height - win.y + 80 * u);
  const mood = 1 - collapse;

  // ---- camera: push in, hold (or breathe in on each step), pull back to exactly 1.0 ----
  const focus = FLOW_RUN_LAYOUT.zoom.focus;
  const camera: CameraKey[] =
    props.camera === 'follow'
      ? [
          { t: 0, zoom: 1.025, x: 0, y: 0 },
          { t: b.push + T.pushTravel, zoom: focus, x: 0, y: 0 },
          // Each step in focus: lean in (≤ 1.12, lifted 6 so the window clears the caption
          // band and the safe bottom), drift with it, settle back as its detail closes.
          ...b.steps.flatMap((st, j): CameraKey[] => {
            const i = j + 1;
            const side = j % 2 === 0 ? -4 : 4;
            return [
              { t: Math.max(b.push + T.pushTravel, st.arrive - 0.15), zoom: focus, x: 0, y: 0 },
              { t: st.arrive + 0.75, zoom: FLOW_RUN_LAYOUT.zoom.lean, x: side, y: 6 },
              { t: detailCloseAt(b, i) - 0.05, zoom: FLOW_RUN_LAYOUT.zoom.lean - 0.004, x: side * 1.5, y: 6, ease: 'linear' },
              { t: detailCloseAt(b, i) + 0.4, zoom: focus, x: 0, y: 0 },
            ];
          }),
          { t: b.pullBack, zoom: focus + 0.012, x: 0, y: 0, ease: 'linear' },
          { t: b.pullBack + T.pullBackTravel, zoom: FLOW_RUN_LAYOUT.zoom.overview, x: 0, y: 0 },
        ]
      : [
          { t: 0, zoom: 1.025, x: 0, y: 0 },
          { t: b.push + T.pushTravel, zoom: focus, x: 0, y: 0 },
          { t: b.pullBack, zoom: focus + 0.012, x: 0, y: 0, ease: 'linear' },
          { t: b.pullBack + T.pullBackTravel, zoom: FLOW_RUN_LAYOUT.zoom.overview, x: 0, y: 0 },
        ];

  // ---- light: under the window (v001), or following the active step ----
  let glowY = win.y + win.height;
  if (props.glow === 'follow') {
    let wsum = 0.35, ysum = 0.35 * (win.y + win.height);
    steps.forEach((_, i) => {
      const a = stepState(i).active;
      wsum += a;
      ysum += a * (nodeTop(i) + (m.nodeHeight * u) / 2 + expand[i]! * u * 0.5);
    });
    glowY = ysum / wsum;
  }

  const sw = { x: END_CARD_LAYOUT.switchCx * u, y: END_CARD_LAYOUT.switchCy * u, h: END_CARD_LAYOUT.switchHeight * u };
  const formed = progress(frame, f(b.converge + 0.08), f(T.converge - 0.08), ease.out);

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(${900 * u}px ${520 * u}px at 50% ${(glowY / layout.height) * 100}%, rgba(201,242,93,${0.11 * mood}), transparent 70%)`,
        }}
      />
      <CameraRig keys={camera} locked>
        {collapse < 1 && (
          // No transform at rest: same rendering path as chaosToSystem's last frame (invisible cut).
          <div style={{ position: 'absolute', inset: 0, transform: collapse > 0 ? `translateY(${windowDrop}px) scale(${1 - collapse * 0.04})` : undefined, transformOrigin: '50% 40%' }}>
            <WindowChrome rect={win} u={u} workspace={props.workspace} on={1} />
          </div>
        )}

        {/* Canvas: nodes + details, clipped below the header like a real scrolling view. */}
        {!resolveStarted && (
          // Full-frame container (origin 0,0 like chaosToSystem's cards) clipped to the canvas
          // only once content can overflow. A container positioned at the canvas rect gets its
          // origin pixel-snapped under the camera scale: the nodes moved 1 px at the cut (measured).
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: needsClip
                ? `inset(${canvas.y}px ${layout.width - canvas.x - canvas.width}px ${layout.height - canvas.y - canvas.height}px ${canvas.x}px round 0 0 ${radius.window * u}px ${radius.window * u}px)`
                : undefined,
            }}
          >
            {steps.slice(0, -1).map((_, i) => {
              const { fill, pulse } = connector(i);
              return <Connector key={`c${i}`} x={iconX} y={nodeTop(i) + (m.nodeHeight + expand[i]!) * u} height={m.nodeGap * u} u={u} fill={fill} pulse={pulse} />;
            })}
            {steps.map((s, i) => {
              const st = stepState(i);
              const d = detail(i);
              const appear = openP(i);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: nodeX,
                    top: nodeTop(i),
                    width: nodeW,
                    height: (m.nodeHeight + expand[i]!) * u,
                    overflow: 'hidden',
                    ...nodeSurface(u, st.active, 1),
                  }}
                >
                  {expand[i]! > 0.01 ? (
                    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: m.nodeHeight * u }}>
                      <NodeBody step={s} chip={st.chip} chipLabel={st.label} u={u} pop={st.pop} />
                    </div>
                  ) : (
                    // Same markup as chaosToSystem's settled cards (text lands on the same pixels at the cut).
                    <NodeBody step={s} chip={st.chip} chipLabel={st.label} u={u} pop={st.pop} />
                  )}
                  {d && appear > 0 && (
                    <div style={{ position: 'absolute', left: 0, top: m.nodeHeight * u, width: '100%', height: detailH(i) * u }}>
                      <DetailView d={d} i={i} u={u} width={nodeW} appear={appear} props={props} />
                    </div>
                  )}
                </div>
              );
            })}
            <ClickRipple at={b.trigger} x={nodeX + nodeW - 90 * u} y={nodeTop(0) + (m.nodeHeight / 2) * u} size={80 * u} strength={0.6} />
            {b.steps.map((s, j) => (
              <ClickRipple key={j} at={s.done} x={nodeX + nodeW - 90 * u} y={nodeTop(j + 1) + (m.nodeHeight / 2) * u} size={90 * u} strength={0.8} />
            ))}
            <ClickRipple at={loopDone} x={nodeX + nodeW - 90 * u} y={nodeTop(0) + (m.nodeHeight / 2) * u} size={90 * u} strength={0.8} />
          </div>
        )}
      </CameraRig>

      {/* From the pull-back on the camera is exactly 1.0: these sit in screen space. */}
      {resolveStarted &&
        steps.map((s, k) => {
          const todo = props.resolved[k]!;
          const flipP = progress(frame, f(b.resolve + k * T.flipStagger), f(T.flipDuration), ease.inOut);
          const angle = flipP * 180;
          const back = angle > 90;
          const edge = Math.sin(flipP * Math.PI);
          const node = { x: nodeX, y: nodeTop(k), w: nodeW, h: m.nodeHeight * u };
          const check = progress(frame, f(checkAt(b, k)), f(0.35), ease.out);
          const strike = progress(frame, f(checkAt(b, k) + 0.1), f(0.35), ease.inOut);
          const tagSwap = progress(frame, f(checkAt(b, k) + 0.12), f(0.3), ease.out);
          const memoW = lerp(memoWidth(todo), memoWidth(todo, todo.resolved), tagSwap) * u;
          const memo = { x: node.x, y: node.y + ((m.nodeHeight - MEMO.height) / 2) * u, w: memoW, h: MEMO.height * u };
          // Converge into the switch.
          const c = progress(frame, f(b.converge + k * 0.05), f(T.converge - 0.15), ease.in);
          const cx = lerp(memo.x + memo.w / 2, sw.x, c);
          const cy = lerp(memo.y + memo.h / 2, sw.y, c);
          const cScale = lerp(1, 0.12, c);
          if (c >= 1) return null;
          const st = stepState(k);
          // Light trail: a streak behind the to-do as it flies into the switch.
          const trail =
            props.trails && c > 0 ? (
              <div
                key={`t${k}`}
                style={{
                  position: 'absolute',
                  left: cx,
                  top: cy - 2 * u,
                  width: Math.hypot(sw.x - (memo.x + memo.w / 2), sw.y - (memo.y + memo.h / 2)) * Math.min(c * 1.4, 1) * (1 - c * 0.5),
                  height: 4 * u,
                  borderRadius: 4 * u,
                  transformOrigin: '0 50%',
                  transform: `rotate(${(Math.atan2(memo.y + memo.h / 2 - sw.y, memo.x + memo.w / 2 - sw.x) * 180) / Math.PI}deg)`,
                  background: `linear-gradient(90deg, rgba(201,242,93,${0.75 * (1 - c * 0.6)}), rgba(201,242,93,0))`,
                  filter: `blur(${1.5 * u}px)`,
                }}
              />
            ) : null;
          return [
            trail,
            <div
              key={k}
              style={{
                position: 'absolute',
                left: back ? cx - memo.w / 2 : node.x,
                top: back ? cy - memo.h / 2 : node.y,
                width: back ? memo.w : node.w,
                height: back ? memo.h : node.h,
                opacity: 1 - progress(frame, f(b.converge + k * 0.05 + (T.converge - 0.15) * 0.6), f((T.converge - 0.15) * 0.4)),
                transform: `perspective(${1400 * u}px) rotateX(${back ? angle - 180 : angle}deg) scale(${(1 + edge * 0.035) * cScale})`,
                overflow: 'hidden',
                ...(back ? memoSurface(u) : nodeSurface(u, edge * 0.5, 1)),
              }}
            >
              {back ? (
                <MemoContent memo={todo} u={u} resolved={{ label: todo.resolved, check, strike }} />
              ) : (
                <NodeBody step={s} chip={st.chip} chipLabel={st.label} u={u} />
              )}
              {back && props.stamp && <LightSweep at={checkAt(b, n - 1) + 0.2 + k * 0.07} duration={0.55} width={220 * u} opacity={0.55} />}
            </div>,
          ];
        })}

      {/* Stamp: counts the check-offs, lime once all are done; leaves as they converge. */}
      {props.stamp && resolveStarted && (() => {
        const done = steps.filter((_, k) => frame >= f(checkAt(b, k))).length;
        if (done === 0) return null;
        const p = progress(frame, f(checkAt(b, 0)), f(0.4), ease.out);
        const all = progress(frame, f(checkAt(b, n - 1)), f(0.3), ease.out);
        const pop = progress(frame, f(checkAt(b, done - 1)), f(0.28), ease.linear);
        const leave = progress(frame, f(b.converge), f(0.3), ease.in);
        return (
          <div style={{ position: 'absolute', left: nodeX, top: nodeTop(0) - 58 * u + (1 - p) * 10 * u, opacity: p * (1 - leave), display: 'flex', alignItems: 'center', gap: 14 * u }}>
            <div style={{ width: 36 * u, height: Math.max(1, 2 * u), background: all > 0 ? palette.signal : palette.hairlineStrong }} />
            <div style={{ transform: `scale(${1 + Math.sin(pop * Math.PI) * 0.08})`, transformOrigin: 'left center' }}>
              <Label size={type.label.size * u * 1.1} color={all > 0.5 ? palette.signal : palette.fog}>
                {`${props.stamp} · ${done}/${n}`}
              </Label>
            </div>
          </div>
        );
      })()}

      {/* The brand switch forms as the to-dos slide in (hand-off to endCard, same place). */}
      {formed > 0 && (
        <div
          style={{
            position: 'absolute',
            left: sw.x - sw.h * 0.9,
            top: sw.y - sw.h / 2,
            transform: `scale(${lerp(0.2, 1, formed)})`,
            opacity: Math.min(1, formed * 3),
          }}
        >
          <ToggleMark on={0} height={sw.h} />
        </div>
      )}
    </AbsoluteFill>
  );
};

const DetailView: React.FC<{ d: StepDetail; i: number; u: number; width: number; appear: number; props: FlowRunProps }> = ({ d, i, u, width, appear, props }) => {
  const { frame, f } = useTime();
  const b = props.beats;
  const { done } = b.steps[i - 1]!;
  switch (d.kind) {
    case 'email': {
      const start = detailOpenAt(b, i) + 0.25;
      const send = progress(frame, f(start), f(done - start), ease.inOut);
      const merge = d.mergeField ? progress(frame, f(mergeAt(b, i) - 0.25), f(0.5), ease.inOut) : undefined;
      const opened = d.opened ? progress(frame, f(openedAt(b, i)), f(0.3), ease.linear) : 0;
      return <EmailDetailView d={d} u={u} appear={appear} send={send} sent={frame >= f(done)} merge={merge} opened={opened} />;
    }
    case 'wait': {
      const hops = scheduleHops(b, i, d);
      let cursor = d.startDay;
      hops.forEach(([s, e], k) => (cursor = lerp(cursor, d.startDay + k + 1, progress(frame, f(s), f(e - s), ease.snap))));
      return <ScheduleDetailView d={d} u={u} appear={appear} cursor={cursor} sent={progress(frame, f(done), f(0.3), ease.out)} width={width} />;
    }
    case 'goal': {
      const arrive = progress(frame, f(b.steps[i - 1]!.arrive + 0.35), f(0.5), ease.out);
      const value = d.amount !== undefined ? d.amount * progress(frame, f(orderAt(b, i) + 0.1), f(0.8), ease.out) : undefined;
      return <GoalDetailView d={d} u={u} appear={appear} arrive={arrive} reached={progress(frame, f(done), f(0.3), ease.linear)} value={value} />;
    }
  }
};
