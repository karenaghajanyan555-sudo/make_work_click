import { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { duration as D, fonts, palette, radius, type } from '../../brand/tokens.ts';
import type { Rect } from '../../brand/format.ts';
import {
  chaosToSystemBeats,
  chaosToSystemCuePoints,
  chaosToSystemWindow,
  CHAOS_TO_SYSTEM_LAYOUT,
  flipAt,
  RUN_READ_SECONDS,
  stepDoneAt,
  type ChaosToSystemProps,
  type Fragment,
} from '../../video/scenes/chaosToSystem.ts';
import type { CameraKey } from '../../video/camera.ts';
import { ease, lerp, progress, sub } from '../lib/anim.ts';
import { useFontsReady } from '../lib/fonts.ts';
import { useLayout, useTime } from '../lib/hooks.ts';
import { SCATTER } from '../../video/scenes/scatter.ts';
import { CameraRig, DEPTH } from '../motion/Camera.tsx';
import { ClickRipple, LightSweep, SoftLight } from '../motion/Signal.tsx';
import { KineticPhrase } from '../brand/KineticPhrase.tsx';
import { Connector, FLOW_METRICS, NodeBody, nodeSurface, type ChipState } from '../ui/Flow.tsx';
import { MEMO, MemoContent, memoWidth } from '../ui/Memo.tsx';
import { ScatterMemo } from '../ui/Scatter.tsx';
import { switchCenter, WindowChrome } from '../ui/WindowChrome.tsx';

/**
 * Scene type "chaosToSystem" (content model + beats: src/video/scenes/chaosToSystem.ts).
 * One continuous shot, three beats:
 *  1. PROBLEM   Hook headline over the owner's scattered to-dos on three depth planes.
 *  2. GATHER    The to-dos that matter straighten, rack into focus and line up as a
 *               tidy column; the rest are dismissed outward.
 *     FLIP      Top to bottom, each to-do card turns over — its back is the automated
 *               step. Size/style swap happens edge-on (90°), so there is never a
 *               half-dark/half-light grey state. The window builds around the steps.
 *  3. SOLUTION  The automation switch clicks on (brand signature), light shifts to
 *               signal, and the flow runs step by step on its own.
 */

const L = CHAOS_TO_SYSTEM_LAYOUT;

export const ChaosToSystem: React.FC<{ props: ChaosToSystemProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  const { frame, f, t } = useTime();
  const layout = useLayout();
  const { u } = layout;
  const b = chaosToSystemBeats(props);
  const cues = chaosToSystemCuePoints(props);
  const m = FLOW_METRICS;
  const steps = props.flow;

  // One coordinate space for window chrome, nodes and travelling cards.
  const win: Rect = useMemo(() => {
    const w = chaosToSystemWindow(steps.length, layout.width / u);
    return { x: w.x * u, y: w.y * u, width: w.width * u, height: w.height * u };
  }, [layout.width, u, steps.length]);
  const nodeRect = (i: number): Rect => ({
    x: win.x + m.bodyPad * u,
    y: win.y + (m.headerHeight + m.bodyPad + i * (m.nodeHeight + m.nodeGap)) * u,
    width: win.width - m.bodyPad * 2 * u,
    height: m.nodeHeight * u,
  });
  const iconX = win.x + (m.bodyPad + m.padX + m.icon / 2) * u;

  // Gathered to-dos, ordered by the step they become (top to bottom).
  const gathered = props.fragments
    .map((frag, i) => ({ frag, i, step: frag.becomes }))
    .filter((x): x is { frag: Fragment; i: number; step: number } => x.step !== undefined)
    .sort((a, c) => a.step - c.step);

  // Window builds at full opacity, following the flips; header last.
  const flipDone = (k: number) => flipAt(b, k) + b.flipDuration;
  const pad = m.bodyPad * u;
  const n0 = nodeRect(0);
  const lastNode = nodeRect(steps.length - 1);
  const grow = progress(frame, f(flipAt(b, 0) + b.flipDuration * 0.5), f(0.3), ease.out);
  const down = progress(frame, f(flipDone(0) - 0.1), f(Math.max(0.2, flipDone(steps.length - 1) - flipDone(0))), ease.inOut);
  const up = progress(frame, f(flipDone(steps.length - 1) - 0.1), f(0.32), ease.inOut);
  const reveal =
    frame < f(flipAt(b, 0) + b.flipDuration * 0.5)
      ? { top: win.height, right: 0, bottom: 0, left: 0, radius: 0 }
      : {
          top: lerp(lerp(n0.y - win.y, n0.y - win.y - pad, grow), 0, up),
          bottom: win.height - lerp(lerp(n0.y + n0.height - win.y, n0.y + n0.height - win.y + pad, grow), lastNode.y + lastNode.height - win.y + pad, down),
          left: lerp(pad, 0, grow),
          right: lerp(pad, 0, grow),
          radius: lerp(radius.card, radius.window, grow) * u,
        };

  const on = progress(frame, f(b.click), f(0.22), ease.inOut);
  const mood = progress(frame, f(b.click), f(0.9), ease.out);
  const flash = progress(frame, f(b.click), f(0.12)) * (1 - progress(frame, f(b.click + 0.1), f(0.6), ease.in));
  // Smooth: the click blooms and fades instead of flashing, and is gone by the cut (flowRun
  // has no bloom: a bloom still on at the last frame pops off at the cut, measured).
  const bloomPeak = b.click + D.quick;
  const bloomFade = Math.max(D.micro, Math.min(D.slow, duration - 2 / 30 - bloomPeak));
  const bloom = progress(frame, f(b.click), f(D.quick), ease.glide) * (1 - progress(frame, f(bloomPeak), f(bloomFade), ease.inOut));
  const sw = switchCenter(win, u);

  const camera: CameraKey[] = props.smooth
    ? [
        // Smooth: the reel opens already gliding in (the path starts before frame 0), pushes
        // into the hook, eases back as the system assembles, then pushes on into the run.
        { t: -1.2, zoom: 0.985, x: 0, y: 0 },
        { t: b.hookOut + 0.1, zoom: 1.035, x: 0, y: 0 },
        { t: cues.aligned ?? b.flip, zoom: 1, x: 0, y: 0 },
        { t: duration, zoom: 1.025, x: 0, y: 0 },
      ]
    : [
        { t: 0, zoom: 1, x: 0, y: 0 },
        { t: b.hookOut + 0.1, zoom: 1.035, x: 0, y: 0, ease: 'linear' },
        { t: cues.aligned ?? b.flip, zoom: 1, x: 0, y: 0 },
        { t: duration, zoom: 1.025, x: 0, y: 0, ease: 'linear' },
      ];

  // Run phase: only steps that can resolve and be read (~0.5s) before the scene ends.
  const runnable = steps.map((_, i) => i === 0 || stepDoneAt(b, i) + RUN_READ_SECONDS <= duration);

  const stepState = (i: number): { chip: ChipState; label: string; active: number; pop: number } => {
    const step = steps[i]!;
    const before = step.chipBefore ?? step.chip;
    if (i === 0) {
      const fired = frame >= f(b.run);
      const active = progress(frame, f(b.run), f(0.25)) * (1 - progress(frame, f(b.run + b.stepInterval * 0.7), f(0.3)));
      return { chip: fired ? 'pending' : 'idle', label: step.chip, active, pop: fired ? progress(frame, f(b.run), f(0.3), ease.linear) : 0 };
    }
    if (!runnable[i]) return { chip: 'idle', label: before, active: 0, pop: 0 };
    const done = stepDoneAt(b, i);
    const arrive = done - 0.25;
    const isDone = frame >= f(done);
    const busy = step.kind === 'email' && frame >= f(arrive) && !isDone;
    const active = progress(frame, f(arrive), f(0.2)) * (1 - progress(frame, f(done + 0.45), f(0.3)));
    const chip: ChipState = isDone ? (step.kind === 'email' ? 'done' : 'pending') : busy ? 'busy' : 'idle';
    const label = isDone ? step.chip : busy ? 'Sending' : before;
    return { chip, label, active, pop: isDone ? progress(frame, f(done), f(0.3), ease.linear) : 0 };
  };

  const connector = (i: number) => {
    const next = i + 1;
    if (!runnable[next]) return { fill: 0, pulse: undefined };
    const done = stepDoneAt(b, next);
    const start = done - b.stepInterval + 0.1;
    const p = progress(frame, f(start), f(done - 0.25 - start), ease.inOut);
    return { fill: p, pulse: p };
  };

  return (
    <AbsoluteFill>
      {/* Scene light: signal bounce under the window once the system is on, plus the click flash. */}
      {props.smooth ? (
        <>
          {/* Same light as flowRun's first frame (the cut stays invisible). */}
          <SoftLight x={layout.width / 2} y={win.y + win.height} rx={900 * u} ry={560 * u} core={320 * u} bloom={mood} signal={mood * 0.85} />
          <SoftLight x={sw.x} y={sw.y} rx={700 * u} ry={700 * u} core={220 * u} bloom={bloom} signal={bloom} />
        </>
      ) : (
        <>
          <AbsoluteFill
            style={{
              background: `radial-gradient(${900 * u}px ${520 * u}px at 50% ${((win.y + win.height) / layout.height) * 100}%, rgba(201,242,93,${0.11 * mood}), transparent 70%)`,
            }}
          />
          <AbsoluteFill
            style={{
              background: `radial-gradient(${1100 * u}px ${1100 * u}px at ${(sw.x / layout.width) * 100}% ${(sw.y / layout.height) * 100}%, rgba(201,242,93,${0.16 * flash}), transparent 65%)`,
            }}
          />
        </>
      )}

      <CameraRig keys={camera} smooth={props.smooth}>
        {props.fragments.map((frag, i) =>
          frag.becomes === undefined && SCATTER[i] && SCATTER[i]!.plane !== 'near' ? <ScatterMemo key={i} frag={frag} index={i} leaveAt={b.gather} /> : null,
        )}

        <div style={{ position: 'absolute', left: layout.gutter, right: layout.gutter, top: L.headlineTop * u }}>
          <KineticPhrase markup={props.headline} role="display" at={-0.3} out={b.hookOut} />
        </div>

        <WindowChrome
          rect={win}
          u={u}
          reveal={reveal}
          headerIn={sub(up, 0.35, 1)}
          workspace={props.workspace}
          on={on}
          overlay={<LightSweep at={b.click + 0.05} duration={0.75} width={300 * u} opacity={0.6} />}
        />
        {steps.slice(0, -1).map((_, i) => {
          const a = nodeRect(i);
          const { fill, pulse } = connector(i);
          return (
            <div key={i} style={{ opacity: progress(frame, f(flipDone(i + 1) - 0.1), f(0.25)) }}>
              <Connector x={iconX} y={a.y + a.height} height={m.nodeGap * u} u={u} fill={fill} pulse={pulse} />
            </div>
          );
        })}

        {gathered.map(({ frag, i, step }, k) => {
          const slot = SCATTER[i] ?? SCATTER[0]!;
          const plane = DEPTH[slot.plane];
          const target = nodeRect(step);

          // GATHER: scattered → left-aligned column at the step's row, in focus, level.
          const g = progress(frame, f(b.gather + k * b.gatherStagger), f(b.gatherTravel), ease.snap);
          const drift = Math.min(t, b.gather + k * b.gatherStagger);
          const w0 = memoWidth(frag) * u;
          const h0 = MEMO.height * u;
          const x0 = slot.x * u + Math.sin((Math.min(frame, f(b.gather)) + i * 40) / 45) * 6 * plane.drift + (w0 * (plane.scale - 1)) / 2;
          const y0 = slot.y * u - drift * 30 * plane.drift + (h0 * (plane.scale - 1)) / 2;
          const colX = target.x;
          const colY = target.y + (target.height - h0) / 2;

          // FLIP: rotate about the horizontal axis; swap face + size while edge-on.
          const flipP = progress(frame, f(flipAt(b, k)), f(b.flipDuration), ease.inOut);
          const angle = flipP * 180;
          const back = angle > 90;
          const st = stepState(step);

          const x = back ? target.x : lerp(x0, colX, g);
          const y = back ? target.y : lerp(y0, colY, g);
          const w = back ? target.width : w0;
          const h = back ? target.height : h0;
          const scale = lerp(plane.scale, 1, g) * (1 + Math.sin(flipP * Math.PI) * 0.035);
          const rotateZ = lerp(slot.rotate, 0, g);
          const blur = lerp(plane.blur, 0, sub(g, 0, 0.75));
          const opacity = lerp(plane.opacity, 1, sub(g, 0, 0.6));
          const edgeGlow = Math.sin(flipP * Math.PI);

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: w,
                height: h,
                opacity,
                filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
                // Settled cards drop the 3D transform: same rendering path as flowRun's nodes.
                transform: flipP >= 1 && g >= 1 ? undefined : `perspective(${1400 * u}px) rotateZ(${rotateZ}deg) rotateX(${back ? angle - 180 : angle}deg) scale(${scale})`,
                overflow: 'hidden',
                ...(back
                  ? nodeSurface(u, Math.max(st.active, edgeGlow * 0.6), 1)
                  : {
                      ...nodeSurface(u, edgeGlow * 0.5, 0),
                      // Lit from above as it turns: the face brightens toward the edge-on point.
                      background: `linear-gradient(rgba(255,255,255,${0.1 * edgeGlow}), rgba(255,255,255,0)), ${palette.memoryCard}`,
                    }),
              }}
            >
              {back ? (
                <NodeBody step={steps[step]!} chip={st.chip} chipLabel={st.label} u={u} pop={st.pop} />
              ) : (
                <MemoContent memo={frag} u={u} />
              )}
            </div>
          );
        })}

        {props.fragments.map((frag, i) =>
          frag.becomes === undefined && SCATTER[i]?.plane === 'near' ? <ScatterMemo key={i} frag={frag} index={i} leaveAt={b.gather} /> : null,
        )}

        <ClickRipple at={b.click} x={sw.x} y={sw.y} size={120 * u} />
        {steps.map((s, i) => {
          if (s.kind !== 'email' || i === 0 || !runnable[i]) return null;
          const r = nodeRect(i);
          return <ClickRipple key={i} at={stepDoneAt(b, i)} x={r.x + r.width - 90 * u} y={r.y + r.height / 2} size={90 * u} strength={0.8} />;
        })}
      </CameraRig>

      <div style={{ position: 'absolute', left: layout.gutter, right: layout.gutter, top: L.captionTop * u }}>
        <KineticPhrase markup={props.resolution} role="title" at={b.caption} out={b.captionOut} />
      </div>
    </AbsoluteFill>
  );
};
