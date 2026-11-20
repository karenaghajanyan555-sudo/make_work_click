/**
 * LAB ONLY — E4 character + lip sync. An original geometric character (paper superellipse head,
 * graphite shoulders, ink pill eyes, a parametric mouth) speaking the v008 hook (approved take,
 * read-only, played through <Audio>). Everything except the mouth is identical across variants,
 * so the clips compare only the lip-sync method:
 *   e4-mouth-env     A · loudness → jaw opening (one shape family)
 *   e4-mouth-g2v     B · word timing + letter visemes (8 shapes, closures)
 *   e4-mouth-hybrid  C · B's shapes × A's loudness, word ends trimmed to the voice (lab addition)
 *   e4-mouth-compare all three side by side + a timeline of loudness vs each mouth's opening
 * Mouth tracks are generated offline (e4-prep.ts → E4-data.ts): the component only looks up.
 * Neutral palette (paper / graphite / ink): no lime (nothing here is the system acting), no coral.
 */
import { Audio, Sequence, staticFile } from 'remotion';
import { fonts, palette, type } from '../../../src/brand/tokens.ts';
import { ease, lerp, mixColor, progress, withAlpha } from '../../../src/remotion/lib/anim.ts';
import { useLayout, useTime } from '../../../src/remotion/lib/hooks.ts';
import { Stage } from '../shared.tsx';
import { E4 } from './E4-data.ts';

export type Track = 'env' | 'g2v' | 'hybrid';
/** Audio starts this many frames into the composition (a breath of pre-roll). */
export const PRE = 12;
export const E4_FRAMES = PRE + E4.frames + 18;

type P = { o: number; w: number; r: number; t: number; g: number; p: number };
const REST: P = { o: 0, w: 0.5, r: 0, t: 0, g: 0, p: 0 };
function mouthAt(track: Track, frame: number): P {
  const i = frame - PRE;
  const row = E4.tracks[track][i];
  if (!row) return REST;
  const [o, w, r, t, g, p] = row;
  return { o, w, r, t, g, p };
}
const envAt = (frame: number) => E4.env[frame - PRE] ?? 0;

// ---------------------------------------------------------------------------------------------
// Pure geometry (base units, head-local: origin = head centre, head 520 × 560)

export const HEAD = { w: 520, h: 560, n: 3.6 };
/** Superellipse outline |x/a|^n + |y/b|^n = 1 as an SVG path (deterministic, 96 points). */
export function superellipse(a: number, b: number, n: number, pts = 96): string {
  const out: string[] = [];
  for (let k = 0; k < pts; k++) {
    const th = (k / pts) * Math.PI * 2;
    const c = Math.cos(th), s = Math.sin(th);
    const x = a * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = b * Math.sign(s) * Math.abs(s) ** (2 / n);
    out.push(`${k ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${out.join(' ')} Z`;
}
const MOUTH = { y: 150, maxW: 190, maxH: 128 };
/** The mouth from its parameters: half-width, upper/lower opening and the lip-curve shape. */
export function mouthGeometry(m: P) {
  const half = (MOUTH.maxW / 2) * (0.4 + 0.9 * m.w) * (1 - 0.28 * m.r);
  const open = MOUTH.maxH * m.o;
  const up = open * 0.32; // the jaw drops: the lower lip travels further than the upper
  const down = open * 0.68;
  const c = 0.5 - 0.5 * m.r; // 0 = round corners (O), 0.5 = almond corners (wide mouth)
  const k = 4 / 3; // a symmetric cubic peaks at 3/4 of its control offset
  const cavity =
    `M ${-half} 0 C ${(-half + half * c).toFixed(2)} ${(-up * k).toFixed(2)} ${(half - half * c).toFixed(2)} ${(-up * k).toFixed(2)} ${half.toFixed(2)} 0 ` +
    `C ${(half - half * c).toFixed(2)} ${(down * k).toFixed(2)} ${(-half + half * c).toFixed(2)} ${(down * k).toFixed(2)} ${(-half).toFixed(2)} 0 Z`;
  return { half, open, up, down, cavity };
}

// ---------------------------------------------------------------------------------------------

const Mouth: React.FC<{ m: P }> = ({ m }) => {
  const g = mouthGeometry(m);
  const lipInk = withAlpha(palette.ink, 0.86);
  const id = `mc-${Math.round(m.o * 1000)}-${Math.round(m.w * 1000)}-${Math.round(m.r * 1000)}`;
  if (g.open < 3) {
    // Closed: relaxed (slight smile) or pressed (flatter, firmer, a little narrower).
    const half = g.half * (1 - 0.08 * m.p);
    const sag = lerp(-6, 1.5, m.p);
    return (
      <path
        d={`M ${-half} 0 Q 0 ${sag * 2} ${half} 0`}
        transform={`translate(0 ${MOUTH.y})`}
        fill="none"
        stroke={lipInk}
        strokeWidth={lerp(6.5, 10, m.p)}
        strokeLinecap="round"
      />
    );
  }
  const teethH = Math.min(g.up + g.down, 24) * m.t;
  const tongueR = (g.half * 0.62) * Math.min(1, 0.35 + m.g);
  return (
    <g transform={`translate(0 ${MOUTH.y})`}>
      <defs>
        <clipPath id={id}>
          <path d={g.cavity} />
        </clipPath>
      </defs>
      <path d={g.cavity} fill={palette.graphite} />
      <g clipPath={`url(#${id})`}>
        {teethH > 0.5 ? <rect x={-g.half} y={-g.up * 1.4} width={g.half * 2} height={g.up * 0.4 + teethH} fill={palette.ui.surface} /> : null}
        {m.g > 0.05 || m.o > 0.6 ? <ellipse cx={0} cy={g.down * 1.02} rx={tongueR} ry={tongueR * 0.55} fill={palette.avatar.peach[1]} opacity={0.9} /> : null}
      </g>
      <path d={g.cavity} fill="none" stroke={lipInk} strokeWidth={5.5} strokeLinejoin="round" />
    </g>
  );
};

/** Blinks (frames) and gaze: identical for every variant. */
const BLINKS = [31, 86];
function blinkAt(frame: number): number {
  let s = 1;
  for (const b of BLINKS) {
    const d = frame - b;
    if (d >= 0 && d < 6) s = Math.min(s, [0.55, 0.08, 0.08, 0.4, 0.8, 1][d]!);
  }
  return s;
}

export const Character: React.FC<{ track: Track; cx: number; cy: number; scale: number }> = ({ track, cx, cy, scale }) => {
  const { frame } = useTime();
  const { u } = useLayout();
  // Head motion from a slow loudness follower (same for all variants): lift on stress, tiny sway.
  let slow = 0;
  for (let f = 0; f <= frame; f++) slow += (envAt(f) - slow) * 0.18;
  const lift = slow * 10;
  const tilt = Math.sin(frame / 23) * 0.9 + (slow - 0.35) * 1.4;
  const arrive = progress(frame, 0, 14, ease.out);
  const brow = progress(frame, PRE + 47, 6, ease.out) * (1 - progress(frame, PRE + 66, 10, ease.inOut)); // "ten"
  const blink = blinkAt(frame);
  const gx = lerp(-6, 4, progress(frame, PRE + 20, 18, ease.inOut));
  const m = mouthAt(track, frame);
  const s = scale * u;
  const headPath = superellipse(HEAD.w / 2, HEAD.h / 2, HEAD.n);
  const shoulder = `M -330 420 C -330 330, -230 300, -120 292 L 120 292 C 230 300, 330 330, 330 420 L 330 640 L -330 640 Z`;
  const shade = mixColor(palette.paper, palette.fog, 0.32);
  const gid = `head-${track}-${Math.round(cx)}`;
  return (
    <svg
      viewBox="-400 -420 800 1080"
      width={800 * s}
      height={1080 * s}
      style={{ position: 'absolute', left: cx * u - 400 * s, top: cy * u - 420 * s, overflow: 'visible', opacity: arrive }}
    >
      <defs>
        <radialGradient id={`${gid}-lit`} cx="34%" cy="26%" r="82%">
          <stop offset="0%" stopColor={palette.paper} />
          <stop offset="62%" stopColor={mixColor(palette.paper, palette.fog, 0.12)} />
          <stop offset="100%" stopColor={shade} />
        </radialGradient>
        <linearGradient id={`${gid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={mixColor(palette.graphite, palette.smoke, 0.35)} />
          <stop offset="55%" stopColor={palette.graphite} />
          <stop offset="100%" stopColor={palette.ink} />
        </linearGradient>
        <radialGradient id={`${gid}-contact`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={withAlpha(palette.ink, 0.55)} />
          <stop offset="100%" stopColor={withAlpha(palette.ink, 0)} />
        </radialGradient>
      </defs>
      <path d={shoulder} fill={`url(#${gid}-body)`} />
      <path d="M -120 293 L 120 293" stroke={palette.hairlineStrong} strokeWidth={2} />
      <g transform={`translate(0 ${(-lift).toFixed(2)}) rotate(${tilt.toFixed(3)} 0 280)`}>
        <ellipse cx={0} cy={300} rx={200} ry={30} fill={`url(#${gid}-contact)`} />
        <path d={headPath} fill={`url(#${gid}-lit)`} />
        <path d={headPath} fill="none" stroke={withAlpha(palette.paper, 0.6)} strokeWidth={2} />
        {[-1, 1].map((side) => (
          <g key={side} transform={`translate(${side * 104 + gx} -46)`}>
            <path d={`M ${-34} ${-78 - brow * 14} Q 0 ${-92 - brow * 18} 34 ${-80 - brow * 12}`} stroke={palette.ink} strokeWidth={9} strokeLinecap="round" fill="none" opacity={0.8} />
            <rect x={-22} y={-43 * blink} width={44} height={86 * blink} rx={22 * Math.min(1, blink * 1.6)} fill={palette.ink} />
            {blink > 0.5 ? <circle cx={-7} cy={-22 * blink} r={6.5} fill={palette.paper} opacity={0.85} /> : null}
          </g>
        ))}
        <Mouth m={m} />
      </g>
    </svg>
  );
};

const NarrationAudio: React.FC = () => (
  <Sequence from={PRE} layout="none">
    <Audio src={staticFile(E4.src)} />
  </Sequence>
);

const LABEL: Record<Track, string> = { env: 'A · loudness', g2v: 'B · word timing', hybrid: 'C · hybrid' };

const Single: React.FC<{ track: Track; tag: string }> = ({ track, tag }) => {
  const { safe, u } = useLayout();
  return (
    <Stage tag={tag}>
      <NarrationAudio />
      <Character track={track} cx={540} cy={safe.cy / u - 60} scale={1} />
    </Stage>
  );
};

export const MouthEnv: React.FC = () => <Single track="env" tag="E4 · A · lip sync from loudness (jaw only)" />;
export const MouthG2v: React.FC = () => <Single track="g2v" tag="E4 · B · lip sync from word timing + letters" />;
export const MouthHybrid: React.FC = () => <Single track="hybrid" tag="E4 · C · hybrid: letter shapes × loudness" />;

/** All three at once, plus a timeline: loudness (bars) and each mouth's opening (lines), playhead. */
export const MouthCompare: React.FC = () => {
  const { frame } = useTime();
  const { u, safe } = useLayout();
  const tracks: Track[] = ['env', 'g2v', 'hybrid'];
  const TL = { x: 90, y: 1010, w: 900, row: 54 };
  const fx = (i: number) => TL.x + (i / (E4.frames - 1)) * TL.w;
  const line = (track: Track, base: number) =>
    E4.tracks[track].map((r, i) => `${i ? 'L' : 'M'}${fx(i).toFixed(1)} ${(base - r[0] * (TL.row - 10)).toFixed(1)}`).join(' ');
  const head = Math.min(E4.frames - 1, Math.max(0, frame - PRE));
  return (
    <Stage tag="E4 · D · A / B / C side by side, same audio">
      <NarrationAudio />
      {tracks.map((t, k) => (
        <div key={t}>
          <Character track={t} cx={190 + k * 350} cy={600} scale={0.4} />
          <div style={{ position: 'absolute', left: (190 + k * 350 - 150) * u, width: 300 * u, top: 870 * u, textAlign: 'center', fontFamily: fonts.mono, fontSize: type.label.size * 1.3 * u, letterSpacing: type.label.tracking, color: palette.fog, textTransform: 'uppercase' }}>
            {LABEL[t]}
          </div>
        </div>
      ))}
      <svg width={1080 * u} height={400 * u} viewBox="0 900 1080 400" style={{ position: 'absolute', left: 0, top: 900 * u }}>
        {E4.rel.map((r, i) => (
          <rect key={i} x={fx(i) - 3.5} y={TL.y + TL.row - Math.min(1, r) * (TL.row - 6)} width={7} height={Math.min(1, r) * (TL.row - 6)} fill={withAlpha(palette.paper, i <= head && frame >= PRE ? 0.55 : 0.18)} />
        ))}
        {tracks.map((t, k) => (
          <g key={t}>
            <text x={TL.x - 10} y={TL.y + TL.row * (k + 2) - 14} textAnchor="end" fontFamily={fonts.mono} fontSize={type.label.size} fill={palette.smoke}>
              {'ABC'[k]}
            </text>
            <path d={line(t, TL.y + TL.row * (k + 2))} fill="none" stroke={palette.fog} strokeWidth={2.5} />
          </g>
        ))}
        <line x1={fx(head)} x2={fx(head)} y1={TL.y - 6} y2={TL.y + TL.row * 4 + 4} stroke={palette.paper} strokeWidth={2} opacity={frame >= PRE ? 1 : 0} />
        {E4.words.map((w) => (
          <text key={w.text} x={fx(w.start * E4.fps)} y={TL.y - 14} fontFamily={fonts.sans} fontSize={type.uiChip.size} fill={palette.smoke}>
            {w.text}
          </text>
        ))}
      </svg>
      <div style={{ position: 'absolute', left: safe.left, top: safe.top, fontFamily: fonts.mono, fontSize: type.label.size * u, letterSpacing: type.label.tracking, color: palette.smoke, textTransform: 'uppercase' }}>
        loudness · opening A / B / C
      </div>
    </Stage>
  );
};
