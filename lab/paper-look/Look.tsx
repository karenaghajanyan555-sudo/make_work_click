/**
 * LOOK TEST ONLY (v010 "The other half"): four shots built from the lab paper renderer and the
 * real brand parts (Backdrop ground + grain, SpecFrame, caption type via KineticPhrase, ToggleMark,
 * tokens, easings). Not registered with the production engine; renders through its own entry
 * (lab/paper-look/index.ts), so no file in any cache key changes.
 */
import { useMemo } from 'react';
import { AbsoluteFill, random, staticFile } from 'remotion';
import { CAPTION_BAND } from '../../src/brand/format.ts';
import { fonts, palette, type } from '../../src/brand/tokens.ts';
import { Backdrop } from '../../src/remotion/brand/Backdrop.tsx';
import { KineticPhrase } from '../../src/remotion/brand/KineticPhrase.tsx';
import { SpecFrame } from '../../src/remotion/brand/SpecFrame.tsx';
import { ease, lerp, progress, softRadial, sub, withAlpha } from '../../src/remotion/lib/anim.ts';
import { measureText, useFontsReady } from '../../src/remotion/lib/fonts.ts';
import { useLayout, useTime } from '../../src/remotion/lib/hooks.ts';
import { embeddedFibres, outline, pathOf, type V } from './geometry.ts';
import { layoutPage, type Measure, type PageLayout, type PieceId } from './page.ts';
import { AmbientShadow, bbox, ContactShadow, PaperDefs, Piece, TextLayer, type Place } from './Paper.tsx';
import { Bridges, SLIP, SLIP_TONE, SlipFibres, SlipMark, slipOutlines, slipRuns } from './Slip.tsx';

export const measure: Measure = (t, f) => measureText(t, f);
const GRAIN = staticFile('textures/grain-256.png');

export type Cam = { s: number; r: number; F: V; Q: V };
export function camT(c: Cam): string {
  const a = (c.r * Math.PI) / 180;
  const fx = c.F.x * c.s;
  const fy = c.F.y * c.s;
  const tx = c.Q.x - (fx * Math.cos(a) - fy * Math.sin(a));
  const ty = c.Q.y - (fx * Math.sin(a) + fy * Math.cos(a));
  return `translate(${tx.toFixed(3)} ${ty.toFixed(3)}) rotate(${c.r.toFixed(4)}) scale(${c.s.toFixed(5)})`;
}

export type Caption = { markup: string; at: number; out?: number };

/** The brand frame around every shot: ground + desk light, the world, photographic grain,
 *  the spec frame, narration captions in the caption band, the piece counter. */
export const Frame: React.FC<{ children: React.ReactNode; pool: { x: number; y: number; rx: number; ry: number; a: number }; captions: Caption[]; counter?: { text: string; at: number } }> = ({ children, pool, captions, counter }) => {
  const { frame, f } = useTime();
  const layout = useLayout();
  const gx = Math.floor(random(`look-grain-x-${frame}`) * 256);
  const gy = Math.floor(random(`look-grain-y-${frame}`) * 256);
  const k = counter ? progress(frame, f(counter.at), f(0.5), ease.out) : 0;
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ background: softRadial(palette.paper, pool.a, pool.rx, pool.ry, `${pool.x}px`, `${pool.y}px`) }} />
      <AbsoluteFill>{children}</AbsoluteFill>
      <AbsoluteFill style={{ backgroundImage: `url("${GRAIN}")`, backgroundPosition: `${gx}px ${gy}px`, opacity: 0.035 }} />
      <SpecFrame series="N° 010" chapters={[]} />
      {captions.map((c, i) => (
        <div key={i} style={{ position: 'absolute', left: layout.gutter, right: layout.gutter, top: CAPTION_BAND.top * layout.u }}>
          <KineticPhrase markup={c.markup} role="caption" at={c.at} out={c.out} />
        </div>
      ))}
      {counter ? (
        <div style={{ position: 'absolute', right: layout.gutter, top: 236 * layout.u, opacity: k, transform: `translateY(${(1 - k) * 8}px)`, fontFamily: fonts.mono, fontSize: type.uiTitle.size * layout.u, letterSpacing: '0.12em', color: palette.fog }}>
          {counter.text}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const World: React.FC<{ cam: Cam; children: React.ReactNode }> = ({ cam, children }) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
    <PaperDefs />
    <g transform={camT(cam)}>{children}</g>
  </svg>
);

export function usePage(): PageLayout | null {
  const ready = useFontsReady();
  return useMemo(() => (ready ? layoutPage(measure) : null), [ready]);
}

export const rest = (id: string, page: PageLayout, k = 1): Place => {
  const b = bbox(page.pieces[id as PieceId].fringe);
  return { dx: (random(`${id}/dx`) - 0.5) * 1.6 * k, dy: (random(`${id}/dy`) - 0.5) * 1.3 * k, rot: (random(`${id}/r`) - 0.5) * 0.45 * k, cx: b.x + b.w / 2, cy: b.y + b.h / 2, lift: 0.7 };
};

/** Shot A — the first 3.5 s: the scrap alone, a draught lifting its torn end, light passing. */
export const LookOpening: React.FC = () => {
  const page = usePage();
  const { t } = useTime();
  const emb = useMemo(() => (page ? embeddedFibres('p1', page.strip.tornX + 20, page.H, 900) : []), [page]);
  if (!page) return null;
  const { strip } = page;
  const p1 = page.pieces.p1;
  const b1 = bbox(p1.fringe);
  const hinge = strip.tornX * 0.5;
  const draught = 4.2 + 2.6 * Math.sin(t * 1.8 + 0.7);
  const liftFn = (q: V) => {
    const x = Math.min(1, Math.max(0, (q.x - hinge) / (strip.tornX - hinge)));
    return 0.6 + draught * x * x * (3 - 2 * x);
  };
  const place1: Place = { dx: 0, dy: 0, rot: 0, cx: b1.x + b1.w / 2, cy: b1.y + b1.h / 2, lift: liftFn };
  const e = ease.glide(Math.min(1, t / 3.5));
  const cam: Cam = { s: lerp(2.85, 2.97, e), r: -4.2, F: { x: strip.tornX - 6, y: strip.base - 8 }, Q: { x: lerp(1210, 770, e), y: 850 } };
  // The light passing across the paper: a moving opening in a soft shade.
  const lx = lerp(strip.tornX * 0.45, strip.tornX + 220, Math.min(1, t / 3.6));
  // Piece 2 drifting in from the right, out of focus, from 2.5 s.
  const k2 = ease.glide(sub(t, 2.0, 4.0));
  const p2 = page.pieces.p2;
  const b2 = bbox(p2.fringe);
  const place2: Place = { dx: lerp(150, 62, k2), dy: lerp(4, 2, k2), rot: lerp(5, 2.6, k2), cx: b2.x + b2.w / 2, cy: b2.y + b2.h / 2, lift: 10, blur: lerp(3.2, 2.0, k2) };
  const frameLight = { x: lerp(470, 760, Math.min(1, t / 3.6)), y: 850 };
  return (
    <Frame
      pool={{ x: frameLight.x, y: frameLight.y, rx: 900, ry: 560, a: 0.11 }}
      captions={[{ markup: 'You’ve seen this number:', at: 0.05, out: 1.7 }, { markup: '23 minutes to refocus', at: 1.75, out: 3.4 }, { markup: 'after an interruption.', at: 3.45 }]}
      counter={{ text: '1 / 5', at: 1.0 }}
    >
      <World cam={cam}>
        <AmbientShadow id="p1" o={p1} place={place1} />
        {t >= 2.0 ? <AmbientShadow id="p2" o={p2} place={place2} strength={0.8} /> : null}
        <ContactShadow id="p1" o={p1} place={place1} />
        <Piece
          id="p1"
          o={p1}
          place={place1}
          embedded={emb}
          sheen={
            <>
              <defs>
                <radialGradient id="sweep" gradientUnits="userSpaceOnUse" cx={lx} cy={strip.base - 10} r={300} gradientTransform={`translate(${lx} ${strip.base - 10}) scale(1 0.42) translate(${-lx} ${-(strip.base - 10)})`}>
                  <stop offset="0" stopColor="#000" stopOpacity={0} />
                  <stop offset="0.55" stopColor="#000" stopOpacity={0.02} />
                  <stop offset="1" stopColor="#000" stopOpacity={0.075} />
                </radialGradient>
                <linearGradient id="liftSheen" gradientUnits="userSpaceOnUse" x1={hinge} y1={0} x2={strip.tornX} y2={0}>
                  <stop offset="0" stopColor="#fff" stopOpacity={0} />
                  <stop offset="1" stopColor="#fff" stopOpacity={0.05 + draught * 0.012} />
                </linearGradient>
              </defs>
              <rect x={b1.x - 20} y={b1.y - 20} width={b1.w + 40} height={b1.h + 40} fill="url(#sweep)" />
              <rect x={hinge} y={b1.y - 20} width={strip.tornX - hinge + 30} height={b1.h + 40} fill="url(#liftSheen)" />
            </>
          }
        >
          <TextLayer runs={page.runs} />
        </Piece>
        {t >= 2.0 ? (
          <Piece id="p2" o={p2} place={place2}>
            <TextLayer runs={page.runs} />
          </Piece>
        ) : null}
      </World>
    </Frame>
  );
};

/** The page pieces with the source text, in z-order (later pieces lie on the earlier ones). */
export const Pieces: React.FC<{ page: PageLayout; ids: PieceId[]; places: Record<string, Place>; marks: number[] }> = ({ page, ids, places, marks }) => {
  const m = page.marks.filter((_, i) => marks.includes(i));
  return (
    <>
      {ids.map((id) => <AmbientShadow key={`a${id}`} id={id} o={page.pieces[id]} place={places[id]!} />)}
      {ids.map((id) => (
        <g key={id}>
          <ContactShadow id={id} o={page.pieces[id]} place={places[id]!} />
          <Piece id={id} o={page.pieces[id]} place={places[id]!}>
            <TextLayer runs={page.runs} marks={m} rules={page.rules} />
          </Piece>
        </g>
      ))}
    </>
  );
};

/** Shot B1 — 3 / 5: the scrap and its other half joined, the top piece just landed. */
export const LookThree: React.FC = () => {
  const page = usePage();
  if (!page) return null;
  const places: Record<string, Place> = { p3: { ...rest('p3', page), dy: -1.2, rot: -0.35, lift: 2.2 }, p1: rest('p1', page), p2: rest('p2', page) };
  const cam: Cam = { s: 1.5, r: -1.4, F: { x: page.strip.tornX - 40, y: page.strip.base - 70 }, Q: { x: 560, y: 1000 } };
  return (
    <Frame pool={{ x: 560, y: 960, rx: 1000, ry: 760, a: 0.09 }} captions={[{ markup: 'And that was the good news.', at: -1 }]} counter={{ text: '3 / 5', at: -1 }}>
      <World cam={cam}>
        <Pieces page={page} ids={['p3', 'p1', 'p2']} places={places} marks={[0, 1]} />
      </World>
    </Frame>
  );
};

/** Shot B2 — 5 / 5: the whole page reconstructed, the slip under it. */
export const LookPage: React.FC = () => {
  const page = usePage();
  const slipText = useMemo(() => (page ? slipRuns(measure) : null), [page]);
  if (!page || !slipText) return null;
  const places: Record<string, Place> = { p3: rest('p3', page, 3), p1: rest('p1', page, 3), p2: rest('p2', page, 3), p4: rest('p4', page, 3) };
  const { body, stub } = slipOutlines();
  const slipAt = { x: 82, y: page.H + 7, rot: -0.9 };
  const slipPlace: Place = { dx: 0, dy: 0, rot: 0, cx: 0, cy: 0, lift: 0.6 };
  const cam: Cam = { s: 0.74, r: -0.5, F: { x: page.W / 2, y: (page.H + SLIP.H) / 2 }, Q: { x: 548, y: 512 + ((page.H + SLIP.H) / 2) * 0.74 } };
  return (
    <Frame pool={{ x: 540, y: 880, rx: 1000, ry: 820, a: 0.075 }} captions={[{ markup: 'Before you switch,', at: -1 }]} counter={{ text: '5 / 5', at: -1 }}>
      <World cam={cam}>
        <g transform={`translate(${slipAt.x} ${slipAt.y}) rotate(${slipAt.rot})`}>
          <AmbientShadow id="slipB" o={body} place={slipPlace} />
          <ContactShadow id="slipB" o={body} place={slipPlace} />
          <Piece id="stub" o={stub} place={slipPlace} tone={SLIP_TONE} />
          <Bridges front={-1} body={(p) => p} />
          <Piece id="slipB" o={body} place={slipPlace} tone={SLIP_TONE}>
            <TextLayer runs={slipText.runs} rules={slipText.rules} />
            <SlipMark on={0} />
          </Piece>
        </g>
        <Pieces page={page} ids={['p3', 'p1', 'p2', 'p4']} places={places} marks={[0, 1, 2, 3, 4]} />
      </World>
    </Frame>
  );
};

/** Shot C — the tear, in macro: the slip separates along the perforation, is pulled toward the
 *  viewer (the camera follows it, the page leaves the frame), lifts and holds alone for a screenshot. */
export const LookTear: React.FC = () => {
  const page = usePage();
  const slipText = useMemo(() => (page ? slipRuns(measure) : null), [page]);
  const { t } = useTime();
  if (!page || !slipText) return null;
  const places: Record<string, Place> = { p3: rest('p3', page, 3), p1: rest('p1', page, 3), p2: rest('p2', page, 3), p4: rest('p4', page, 3) };
  const { body, stub } = slipOutlines();
  const slipAt = { x: 82, y: page.H + 7, rot: -0.9 };
  const tear = ease.inOut(sub(t, 0.3, 1.0));
  const front = lerp(-8, SLIP.W + 8, tear);
  const pullK = ease.out(sub(t, 0.25, 1.05));
  const away = ease.glide(sub(t, 1.0, 2.5));
  const pull = { x: -1.6 * pullK, y: 3.2 * pullK };
  const lift = lerp(0.6, 20, away);
  const scale = lerp(1, 1.06, away);
  const rot = lerp(0, -1.5, ease.out(sub(t, 0.3, 1.05))) * (1 - away); // the left end drops as it tears; level at the end
  const travel = lerp(0, 980, away);
  const blur = lerp(0, 3, away);
  const dim = lerp(0.06, 0.7, away);
  const on = ease.out(sub(t, 2.85, 3.15));
  const cx = SLIP.W / 2;
  const cy = SLIP.H / 2;
  // Camera: macro on the perforation, following the tear front, then out to the slip as it travels.
  const perf = { x: slipAt.x + lerp(SLIP.W * 0.36, SLIP.W * 0.6, tear), y: slipAt.y - 10 };
  const centre = { x: slipAt.x + cx + pull.x, y: slipAt.y + cy + pull.y + travel };
  const cam: Cam = { s: lerp(2.05, 1.27, away), r: 0.9, F: { x: lerp(perf.x, centre.x, away), y: lerp(perf.y, centre.y, away) }, Q: { x: lerp(540, 522, away), y: lerp(800, 880, away) } };
  const bodyT = `translate(${pull.x} ${pull.y + travel}) rotate(${rot} ${SLIP.W} 0) translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;
  const flat: Place = { dx: 0, dy: 0, rot: 0, cx, cy, lift };
  const th = (rot * Math.PI) / 180;
  const bodyAt = (p: V): V => ({ x: SLIP.W + (p.x - SLIP.W) * Math.cos(th) - p.y * Math.sin(th) + pull.x, y: (p.x - SLIP.W) * Math.sin(th) + p.y * Math.cos(th) + pull.y + travel });
  // Macro depth of field: focus on the perforation; the page beyond goes soft, then all of it as the slip comes up.
  const focusY = slipAt.y - 4;
  const dofSharp = 1 - away;
  return (
    <Frame pool={{ x: 540, y: lerp(800, 880, away), rx: 900, ry: 700, a: lerp(0.08, 0.11, away) }} captions={[{ markup: 'Keep this piece.', at: 2.2 }]}>
      <World cam={cam}>
        <defs>
          <filter id="pageDof" filterUnits="userSpaceOnUse" x={-300} y={-300} width={page.W + 600} height={page.H + 700}>
            <feGaussianBlur stdDeviation={(3.2 + blur).toFixed(2)} />
          </filter>
          <linearGradient id="focusBand" gradientUnits="userSpaceOnUse" x1={0} y1={focusY - 190} x2={0} y2={focusY + 30}>
            <stop offset="0" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.62" stopColor="#fff" stopOpacity={dofSharp} />
            <stop offset="1" stopColor="#fff" stopOpacity={dofSharp} />
          </linearGradient>
          <mask id="focusMask" maskUnits="userSpaceOnUse" x={-400} y={-400} width={page.W + 800} height={page.H + 1000}>
            <rect x={-400} y={-400} width={page.W + 800} height={page.H + 1000} fill="url(#focusBand)" />
          </mask>
        </defs>
        {[false, true].map((sharp) => (
          <g key={String(sharp)} filter={sharp ? undefined : 'url(#pageDof)'} mask={sharp ? 'url(#focusMask)' : undefined}>
            <g transform={`translate(${slipAt.x} ${slipAt.y}) rotate(${slipAt.rot})`}>
              <AmbientShadow id={`stub${sharp}`} o={stub} place={{ ...flat, lift: 0.6 }} />
              <Piece id={`stub${sharp}`} o={stub} place={{ ...flat, lift: 0.6 }} tone={SLIP_TONE} />
              <SlipFibres fibres={stub.fibres} upTo={front} />
            </g>
            <Pieces page={page} ids={['p3', 'p1', 'p2', 'p4']} places={places} marks={[0, 1, 2, 3, 4]} />
            <rect x={-30} y={-30} width={page.W + 60} height={page.H + 60} fill={withAlpha(palette.ink, dim)} />
          </g>
        ))}
        <g transform={`translate(${slipAt.x} ${slipAt.y}) rotate(${slipAt.rot})`}>
          <Bridges front={front} body={bodyAt} />
          <g transform={bodyT}>
            <AmbientShadow id="slipB" o={body} place={flat} />
            <ContactShadow id="slipB" o={body} place={flat} />
            <Piece id="slipB" o={body} place={{ ...flat, lift: 0 }} tone={SLIP_TONE}>
              <TextLayer runs={slipText.runs} rules={slipText.rules} />
              <SlipMark on={on} />
            </Piece>
            <SlipFibres fibres={body.fibres} upTo={front} />
          </g>
        </g>
      </World>
    </Frame>
  );
};

/** Shot T — the turn (4 / 5): piece 4 is slammed in, the reconstruction is knocked askew, two
 *  other-task sheets drop onto it, the light falls. (Still: the moment the second sheet lands.) */
export const LookTurn: React.FC = () => {
  const page = usePage();
  if (!page) return null;
  const knock = (id: string, k: number, r: number): Place => ({ ...rest(id, page, 1), dx: (random(`${id}/kx`) - 0.5) * k, dy: (random(`${id}/ky`) - 0.5) * k, rot: (random(`${id}/kr`) - 0.5) * r });
  const places: Record<string, Place> = { p3: knock('p3', 14, 2.2), p1: knock('p1', 18, 3.4), p2: knock('p2', 18, 3.0), p4: { ...knock('p4', 8, 1.6), lift: 1.4 } };
  const sheet = (id: string, x: number, y: number, w: number, h: number) => outline({ x, y }, [{ kind: 'cut', to: { x: x + w, y } }, { kind: 'cut', to: { x: x + w, y: y + h } }, { kind: 'cut', to: { x, y: y + h } }]);
  const s2 = sheet('task2', -40, page.strip.base - 250, 640, 420);
  const s3 = sheet('task3', 300, page.strip.base - 120, 600, 400);
  const sp2: Place = { dx: 0, dy: 0, rot: -7, cx: 280, cy: page.strip.base - 40, lift: 1.2 };
  const sp3: Place = { dx: 0, dy: 0, rot: 9, cx: 600, cy: page.strip.base + 80, lift: 9, blur: 1.4 };
  const label = (t: string, x: number, y: number) => [{ text: t, x, y, family: fonts.mono, size: 15, weight: 600, tracking: 2.6, color: palette.ui.text }];
  const cam: Cam = { s: 1.32, r: -1.4, F: { x: page.W / 2, y: page.strip.base - 10 }, Q: { x: 540, y: 900 } };
  return (
    <Frame pool={{ x: 560, y: 900, rx: 820, ry: 600, a: 0.045 }} captions={[{ markup: 'The bad news:', at: -1 }]} counter={{ text: '4 / 5', at: -1 }}>
      <World cam={cam}>
        <Pieces page={page} ids={['p3', 'p1', 'p2', 'p4']} places={places} marks={[0, 1, 2, 3, 4]} />
        <rect x={-30} y={-30} width={page.W + 60} height={page.H + 60} fill={withAlpha(palette.ink, 0.16)} />
        <AmbientShadow id="task2" o={s2} place={sp2} />
        <ContactShadow id="task2" o={s2} place={sp2} />
        <Piece id="task2" o={s2} place={sp2}>
          <TextLayer runs={label('TASK 2', 60, page.strip.base - 190)} />
        </Piece>
        <AmbientShadow id="task3" o={s3} place={sp3} />
        <Piece id="task3" o={s3} place={sp3}>
          <TextLayer runs={label('TASK 3', 340, page.strip.base - 70)} />
        </Piece>
      </World>
    </Frame>
  );
};

export const pathForDebug = pathOf;
