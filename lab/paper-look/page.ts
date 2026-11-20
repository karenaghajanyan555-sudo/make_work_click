/**
 * LOOK TEST ONLY: the source page, typeset by us from the verbatim Q&A (storyboard F8), and the
 * five pieces of the reconstruction. Text positions come from real font metrics (measure), so the
 * tears fall between lines and right after "seconds,".
 *
 * Source (verified 2026-11-18): Gallup Business Journal, "Too Many Interruptions at Work?",
 * June 8, 2006, interviewed by Jennifer Robison. "--" is set as an em dash; nothing else changed.
 */
import { fonts, palette } from '../../src/brand/tokens.ts';
import { outline, tearAt, v, type Edge, type Outline, type Tear } from './geometry.ts';

export type Measure = (text: string, font: string) => number;
export type Run = { text: string; x: number; y: number; family: string; size: number; weight: number; italic?: boolean; tracking?: number; color: string };
export type Mark = { kind: 'underline' | 'band'; x0: number; x1: number; y: number; size: number };

export const PAGE = {
  W: 860,
  mx: 54,
  body: 24,
  lead: 36,
  q: 25,
  qLead: 33,
} as const;

const Q = 'How long does it take to get back to work after an interruption?';
const A1 = "There's good news and bad news. To have a uniform comparison, we looked at all work that was interrupted and resumed on the same day. The good news is that most interrupted work was resumed on the same day — 81.9 percent — and it was resumed,";
export const STRIP = 'on average, in 23 minutes and 15 seconds,';
const STRIP_REST = 'which I guess is not so long.';
const A2 = "But the bad news is, when you're interrupted, you don't immediately go back to the task you were doing before you were interrupted. There are about two intervening tasks before you go back to your original task, so it takes more effort to reorient back to the original task. Also, interruptions change the physical environment. For example, someone has asked you for information and you have opened new windows on your desktop, or people have given you papers that are now arranged on your desk. So often the physical layout of your environment has changed, and it's harder to reconstruct where you were. So there's a cognitive cost to an interruption.";

const font = (family: string, size: number, weight = 400, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px ${family}`;

function wrap(m: Measure, text: string, f: string, width: number, firstIndent: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    const avail = lines.length === 0 ? width - firstIndent : width;
    if (cur && m(next, f) > avail) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export type PieceId = 'p1' | 'p2' | 'p3' | 'p4';
export type PageLayout = {
  W: number;
  H: number;
  runs: Run[];
  rules: Array<{ x0: number; x1: number; y: number }>;
  marks: Mark[];
  pieces: Record<PieceId, Outline>;
  /** Strip baseline and the torn edge after "seconds," (for cameras). */
  strip: { base: number; x0: number; tornX: number };
  tears: { t1: Tear; t2: Tear; t3: Tear };
};

export function layoutPage(m: Measure, fibreDensity = 1): PageLayout {
  const { W, mx, body, lead, q, qLead } = PAGE;
  const col = W - 2 * mx;
  const runs: Run[] = [];
  const marks: Mark[] = [];
  const ink = palette.ui.text;
  const meta = palette.smoke;
  const serif = fonts.serif;
  const sans = fonts.sans;
  const mono = fonts.mono;

  // Header.
  const hdr = 13;
  runs.push({ text: 'BUSINESS JOURNAL', x: mx, y: 62, family: mono, size: hdr, weight: 500, tracking: 2.1, color: meta });
  const date = 'JUNE 8, 2006';
  runs.push({ text: date, x: W - mx - m(date, font(mono, hdr, 500)) - 2.1 * date.length, y: 62, family: mono, size: hdr, weight: 500, tracking: 2.1, color: meta });
  runs.push({ text: 'Too Many Interruptions at Work?', x: mx, y: 122, family: serif, size: 46, weight: 400, color: ink });
  runs.push({ text: 'Interviewed by Jennifer Robison', x: mx, y: 154, family: sans, size: 15, weight: 450, color: meta });
  const rules = [{ x0: mx, x1: W - mx, y: 176 }];

  // Question (italic) with the speaker label.
  const label = (t: string, x: number, y: number) => runs.push({ text: t, x, y, family: sans, size: 12.5, weight: 650, tracking: 1.2, color: meta });
  let y = 222;
  const qLabel = 'GMJ';
  label(qLabel, mx, y);
  const qIndent = m(qLabel, font(sans, 12.5, 650)) + 1.2 * qLabel.length + 12;
  const qf = font(serif, q, 400, true);
  const qLines = wrap(m, Q, qf, col, qIndent);
  const lines: Array<{ text: string; x: number; y: number; f: string; size: number }> = [];
  qLines.forEach((t, i) => {
    const x = mx + (i === 0 ? qIndent : 0);
    runs.push({ text: t, x, y, family: serif, size: q, weight: 400, italic: true, color: ink });
    lines.push({ text: t, x, y, f: qf, size: q });
    y += qLead;
  });

  // Answer, part 1 — ends at "and it was resumed," (the strip starts the next line).
  y += 12;
  const aLabel = 'MARK';
  label(aLabel, mx, y);
  const aIndent = m(aLabel, font(sans, 12.5, 650)) + 1.2 * aLabel.length + 12;
  const bf = font(serif, body);
  const a1 = wrap(m, A1, bf, col, aIndent);
  a1.forEach((t, i) => {
    const x = mx + (i === 0 ? aIndent : 0);
    runs.push({ text: t, x, y, family: serif, size: body, weight: 400, color: ink });
    lines.push({ text: t, x, y, f: bf, size: body });
    y += lead;
  });
  const lastA1 = y - lead;

  // The strip line: "on average, in 23 minutes and 15 seconds, which I guess is not so long."
  const stripBase = y;
  const full = `${STRIP} ${STRIP_REST}`;
  runs.push({ text: full, x: mx, y: stripBase, family: serif, size: body, weight: 400, color: ink });
  lines.push({ text: full, x: mx, y: stripBase, f: bf, size: body });
  y += lead + 14;

  // Answer, part 2 — the bad news.
  const firstA2 = y;
  const a2 = wrap(m, A2, bf, col, 0);
  a2.forEach((t) => {
    runs.push({ text: t, x: mx, y, family: serif, size: body, weight: 400, color: ink });
    lines.push({ text: t, x: mx, y, f: bf, size: body });
    y += lead;
  });
  const H = Math.round(y - lead + 58);

  // Marks: a ruled underline or a soft graphite band, only on single-line phrases.
  const find = (phrase: string, kind: Mark['kind']) => {
    for (const l of lines) {
      const i = l.text.indexOf(phrase);
      if (i < 0) continue;
      const x0 = l.x + m(l.text.slice(0, i), l.f);
      marks.push({ kind, x0, x1: x0 + m(phrase, l.f), y: l.y, size: l.size });
      return;
    }
  };
  find('get back to work', 'underline');
  find('The good news', 'band');
  find('But the bad news', 'band');
  find('about two intervening tasks', 'underline');
  find('harder to reconstruct where you were', 'underline');

  // Tears: T1 between "…resumed," and the strip, T2 between the strip and the bad news, T3 right
  // after "seconds," (inside the word space).
  const desc = body * 0.24;
  const asc = body * 0.7;
  const y1 = (lastA1 + desc + stripBase - asc) / 2;
  const y2 = (stripBase + desc + firstA2 - asc) / 2;
  const t1: Tear = { id: 'v010/t1', a: v(0, y1), b: v(W, y1), amp: 2.4 };
  const t2: Tear = { id: 'v010/t2', a: v(0, y2), b: v(W, y2), amp: 3.6 };
  const xs = mx + m(STRIP, bf);
  const xw = mx + m(`${STRIP} `, bf);
  const x3 = xs + (xw - xs) * 0.78;
  const t3: Tear = { id: 'v010/t3', a: tearAt(t1, x3), b: tearAt(t2, x3), amp: 1.2, taper: true };
  const L3 = Math.hypot(t3.b.x - t3.a.x, t3.b.y - t3.a.y);
  const x3b = t3.b.x;

  const p3: Edge[] = [{ kind: 'cut', to: v(W, 0) }, { kind: 'cut', to: tearAt(t1, W) }, { kind: 'tear', tear: t1, side: -1, from: W, to: 0 }, { kind: 'cut', to: v(0, 0) }];
  const p1: Edge[] = [
    { kind: 'tear', tear: t1, side: 1, from: 0, to: x3 },
    { kind: 'tear', tear: t3, side: 1, from: 0, to: L3 },
    { kind: 'tear', tear: t2, side: -1, from: x3b, to: 0 },
  ];
  const p2: Edge[] = [
    { kind: 'tear', tear: t1, side: 1, from: x3, to: W },
    { kind: 'cut', to: tearAt(t2, W) },
    { kind: 'tear', tear: t2, side: -1, from: W, to: x3b },
    { kind: 'tear', tear: t3, side: -1, from: L3, to: 0 },
  ];
  const p4: Edge[] = [{ kind: 'tear', tear: t2, side: 1, from: 0, to: W }, { kind: 'cut', to: v(W, H) }, { kind: 'cut', to: v(0, H) }];

  return {
    W,
    H,
    runs,
    rules,
    marks,
    pieces: {
      p3: outline(v(0, 0), p3, fibreDensity),
      p1: outline(tearAt(t1, 0), p1, fibreDensity),
      p2: outline(tearAt(t1, x3), p2, fibreDensity),
      p4: outline(tearAt(t2, 0), p4, fibreDensity),
    },
    strip: { base: stripBase, x0: mx, tornX: x3 },
    tears: { t1, t2, t3 },
  };
}
