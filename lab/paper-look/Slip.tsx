/**
 * LOOK TEST ONLY: the fifth piece — a ready-to-resume slip on a perforated stub. Before the tear,
 * intact tabs bridge stub and slip (the holes show the ground). The tear runs left → right: tabs
 * behind the front are broken (small torn nubs + fibres on both sides), tabs ahead stretch by the
 * pull. Coordinates: slip-local, perforation at y = 0, body below, stub above.
 */
import { random } from 'remotion';
import { fonts, palette } from '../../src/brand/tokens.ts';
import { mixColor, withAlpha } from '../../src/remotion/lib/anim.ts';
import { ToggleMark } from '../../src/remotion/brand/Mark.tsx';
import { pathOf, type Fibre, type Outline, type V } from './geometry.ts';
import { FIBRE, TextLayer } from './Paper.tsx';
import type { Measure, Run } from './page.ts';

export const SLIP = { W: 700, H: 252, STUB: 30, pitch: 7.6, hole: 4.8, holeH: 2.5 } as const;
export const SLIP_TONE = mixColor(palette.paper, palette.ui.surface, 0.6);

type Tab = { x0: number; x1: number; up: number[]; down: number[] };

function tabs(): Tab[] {
  const out: Tab[] = [];
  const { W, pitch, hole } = SLIP;
  let x = 8;
  let k = 0;
  while (x + pitch < W - 8) {
    const x0 = x + hole;
    const x1 = x + pitch;
    const r = (s: string) => random(`slip/tab${k}/${s}`);
    out.push({ x0, x1, up: [r('u0') * 0.9 + 0.2, r('u1') * 1.5 + 0.4, r('u2') * 0.9 + 0.2], down: [r('d0') * 0.8 + 0.2, r('d1') * 1.3 + 0.3, r('d2') * 0.8 + 0.2] });
    x += pitch;
    k++;
  }
  return out;
}
export const TABS = tabs();

/** Body (below the perforation) and stub (above) outlines with torn tab profiles. */
export function slipOutlines(): { body: Outline; stub: Outline } {
  const { W, H, STUB, holeH } = SLIP;
  const h = holeH / 2;
  const top: V[] = [{ x: 0, y: h }];
  const bottom: V[] = [{ x: W, y: -h }];
  for (const t of TABS) {
    const w = t.x1 - t.x0;
    top.push({ x: t.x0, y: h }, { x: t.x0 + w * 0.2, y: -t.up[0]! * 0.6 }, { x: t.x0 + w * 0.5, y: -t.up[1]! }, { x: t.x0 + w * 0.8, y: -t.up[2]! * 0.6 }, { x: t.x1, y: h });
  }
  top.push({ x: W, y: h });
  for (const t of [...TABS].reverse()) {
    const w = t.x1 - t.x0;
    bottom.push({ x: t.x1, y: -h }, { x: t.x0 + w * 0.8, y: t.down[2]! * 0.6 }, { x: t.x0 + w * 0.5, y: t.down[1]! }, { x: t.x0 + w * 0.2, y: t.down[0]! * 0.6 }, { x: t.x0, y: -h });
  }
  bottom.push({ x: 0, y: -h });
  const body = [...top, { x: W, y: H }, { x: 0, y: H }];
  const stub = [{ x: 0, y: -STUB }, { x: W, y: -STUB }, ...bottom];
  const fib = (side: 'up' | 'down'): Fibre[] =>
    TABS.flatMap((t, k) => {
      const n = random(`slip/f${side}${k}`) < 0.55 ? 1 : 2;
      return Array.from({ length: n }, (_, j) => {
        const x = t.x0 + (t.x1 - t.x0) * random(`slip/fx${side}${k}${j}`);
        const len = 1.2 + random(`slip/fl${side}${k}${j}`) * 3.2;
        const dir = side === 'up' ? -1 : 1;
        const bend = (random(`slip/fb${side}${k}${j}`) - 0.5) * 2;
        return { d: `M${x.toFixed(2)} ${(dir * -0.2).toFixed(2)} q${bend.toFixed(2)} ${(dir * len * 0.5).toFixed(2)} ${(bend * 0.4).toFixed(2)} ${(dir * len).toFixed(2)}`, w: 0.3 + random(`slip/fw${side}${k}${j}`) * 0.35, a: 0.55 + random(`slip/fa${side}${k}${j}`) * 0.4 };
      });
    });
  return { body: { surface: body, fringe: body, tearline: [], fibres: fib('up') }, stub: { surface: stub, fringe: stub, tearline: [], fibres: fib('down') } };
}

/** The note itself (slip-local), measured so the labels and values align. */
export function slipRuns(m: Measure): { runs: Run[]; rules: Array<{ x0: number; x1: number; y: number }> } {
  const { W } = SLIP;
  const ink = palette.ui.text;
  const meta = palette.smoke;
  const mono = fonts.mono;
  const serif = fonts.serif;
  const runs: Run[] = [];
  const rules: Array<{ x0: number; x1: number; y: number }> = [];
  runs.push({ text: 'READY TO RESUME', x: 34, y: 50, family: mono, size: 16, weight: 600, tracking: 2.8, color: ink });
  const right = '1 MINUTE';
  runs.push({ text: right, x: W - 34 - m(right, `500 12.5px ${mono}`) - 2 * right.length, y: 50, family: mono, size: 12.5, weight: 500, tracking: 2, color: meta });
  rules.push({ x0: 34, x1: W - 34, y: 66 });
  const rows: Array<[string, string]> = [
    ['STOPPED AT', 'the pricing table, row 3'],
    ['STILL OPEN', 'which plan to recommend'],
    ['NEXT', 'send the draft to Maya'],
  ];
  rows.forEach(([label, value], i) => {
    const y = 114 + i * 46;
    runs.push({ text: label, x: 34, y, family: mono, size: 13, weight: 500, tracking: 1.9, color: meta });
    runs.push({ text: value, x: 198, y, family: serif, size: 30, weight: 400, italic: true, color: ink });
    rules.push({ x0: 198, x1: W - 34, y: y + 10 });
  });
  runs.push({ text: 'BEFORE YOU SWITCH · LEROY & GLOMB, ORGANIZATION SCIENCE, 2018', x: 34, y: 232, family: mono, size: 10.5, weight: 500, tracking: 1.2, color: meta });
  return { runs, rules };
}

/** The brand signature on the slip: the real ToggleMark + wordmark, in ink on paper. */
export const SlipMark: React.FC<{ on: number }> = ({ on }) => {
  const { W } = SLIP;
  const w = 210;
  return (
    <foreignObject x={W - 34 - w} y={214} width={w} height={26}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 7, height: 26 }}>
        <ToggleMark on={on} height={13} offTrack={mixColor(palette.paper, palette.ui.text, 0.18)} offKnob={palette.ui.surface} />
        <div style={{ fontFamily: fonts.sans, fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.015em', color: palette.ui.text, whiteSpace: 'nowrap' }}>
          MAKE WORK <span style={{ color: mixColor(palette.ui.text, palette.signalOnLight, on) }}>CLICK</span>
        </div>
      </div>
    </foreignObject>
  );
};

/** Paper tabs still joining stub and body (those ahead of the tear front), stretched by `pull`. */
export const Bridges: React.FC<{ front: number; body: (p: V) => V }> = ({ front, body }) => {
  const h = SLIP.holeH / 2 + 0.25;
  return (
    <g>
      {TABS.filter((t) => (t.x0 + t.x1) / 2 >= front).map((t, i) => (
        <path key={i} d={pathOf([{ x: t.x0, y: -h }, { x: t.x1, y: -h }, body({ x: t.x1, y: h }), body({ x: t.x0, y: h })])} fill={SLIP_TONE} />
      ))}
    </g>
  );
};

export const SlipFibres: React.FC<{ fibres: Fibre[]; upTo: number }> = ({ fibres, upTo }) => (
  <g>
    {fibres.map((f, i) => {
      const x = Number(f.d.slice(1).split(' ')[0]);
      return x < upTo ? <path key={i} d={f.d} fill="none" stroke={withAlpha(FIBRE, f.a)} strokeWidth={f.w} strokeLinecap="round" /> : null;
    })}
  </g>
);

export { TextLayer };
