import { fonts, palette, radius, type } from '../../brand/tokens.ts';
import { formatValue, type ValueFormat } from '../../video/scenes/product.ts';
import { lerp } from '../lib/anim.ts';
import { cardSurface, UILabel } from './Card.tsx';
import { Chip } from './Flow.tsx';

/**
 * MetricCard: a label, a big tabular number and an optional lime note. `value` is already
 * interpolated by the scene (count-up); `lit` 0..1 marks it as the system's result.
 */
export const MetricCard: React.FC<{
  label: string;
  value: number;
  format?: ValueFormat;
  delta?: string;
  deltaIn?: number;
  lit?: number;
  u: number;
  width: number;
  height: number;
  compact?: boolean;
}> = ({ label, value, format, delta, deltaIn = 1, lit = 0, u, width, height, compact }) => (
  <div style={{ position: 'relative', width, height, ...cardSurface(u, lit * 0.6), padding: `${(compact ? 18 : 26) * u}px ${26 * u}px`, boxSizing: 'border-box', fontFamily: fonts.sans }}>
    <UILabel u={u}>{label}</UILabel>
    <div
      style={{
        marginTop: (compact ? 6 : 12) * u,
        fontSize: (compact ? type.metric.size * 0.72 : type.metric.size) * u,
        fontWeight: type.metric.weight,
        letterSpacing: type.metric.tracking,
        color: palette.ui.text,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}
    >
      {formatValue(value, format)}
    </div>
    {delta && (
      <div
        style={{
          position: 'absolute',
          left: 26 * u,
          bottom: (compact ? 16 : 24) * u,
          display: 'inline-flex',
          alignItems: 'center',
          padding: `${5 * u}px ${12 * u}px`,
          borderRadius: radius.chip,
          background: `rgba(201,242,93,${0.32 * deltaIn})`,
          color: palette.signalOnLight,
          fontSize: type.uiChip.size * 0.9 * u,
          fontWeight: 620,
          opacity: deltaIn,
          transform: `translateY(${(1 - deltaIn) * 8 * u}px)`,
          whiteSpace: 'nowrap',
        }}
      >
        {delta}
      </div>
    )}
  </div>
);

/**
 * Chart: bars or a line, drawn in by `progress` (0..1 per bar, or 0..1 for the line).
 * The highlighted index is the system's result (signal colour); the rest stay neutral.
 * Divs for bars (crisp text), SVG for the line. Values are scaled to the max.
 */
export const Chart: React.FC<{
  kind: 'bar' | 'line';
  labels: string[];
  values: number[];
  highlight?: number;
  format?: ValueFormat;
  progress: number[];
  u: number;
  width: number;
  height: number;
  /** Lime note on the highlighted bar and its 0..1 entrance. */
  callout?: string;
  calloutIn?: number;
}> = ({ kind, labels, values, highlight, format, progress, u, width, height, callout, calloutIn = 0 }) => {
  const n = values.length;
  const max = Math.max(...values) * 1.12 || 1;
  const labelH = 40 * u;
  const plotH = height - labelH - 46 * u;
  const top = 46 * u;
  const gap = 18 * u;
  const barW = (width - gap * (n - 1)) / n;
  const x = (i: number) => i * (barW + gap);
  const grid = [0.25, 0.5, 0.75, 1].map((g) => top + plotH * (1 - g));
  return (
    <div style={{ position: 'relative', width, height, fontFamily: fonts.sans }}>
      {grid.map((y, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: y, height: Math.max(1, u), background: palette.ui.border, opacity: 0.8 }} />
      ))}
      {kind === 'bar' &&
        values.map((v, i) => {
          const p = progress[i] ?? 0;
          const h = (v / max) * plotH * p;
          const hi = i === highlight;
          return (
            <div key={i}>
              <div
                style={{
                  position: 'absolute',
                  left: x(i),
                  top: top + plotH - h,
                  width: barW,
                  height: h,
                  borderRadius: `${10 * u}px ${10 * u}px ${3 * u}px ${3 * u}px`,
                  background: hi ? palette.signal : palette.ui.chartBar,
                  boxShadow: hi ? `0 0 ${30 * u}px rgba(201,242,93,${0.45 * p})` : undefined,
                }}
              />
              {hi && p > 0.6 && (
                <div style={{ position: 'absolute', left: x(i) - 40 * u, width: barW + 80 * u, top: top + plotH - h - 40 * u, textAlign: 'center', opacity: (p - 0.6) / 0.4 }}>
                  <UILabel u={u} color={palette.ui.text}>
                    {formatValue(v, format)}
                  </UILabel>
                </div>
              )}
            </div>
          );
        })}
      {kind === 'line' && (
        <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
          {(() => {
            const p = progress[0] ?? 0;
            const pts = values.map((v, i) => [x(i) + barW / 2, top + plotH - (v / max) * plotH] as const);
            const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ');
            let len = 0;
            for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
            const area = `${d} L${pts.at(-1)![0]},${top + plotH} L${pts[0]![0]},${top + plotH} Z`;
            const shown = Math.floor(p * (pts.length - 1) + 1e-6);
            return (
              <>
                <path d={area} fill={palette.signal} opacity={0.12 * p} />
                <path d={d} fill="none" stroke={palette.signalDeep} strokeWidth={4 * u} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
                {pts.map(([px, py], i) =>
                  i <= shown ? <circle key={i} cx={px} cy={py} r={(i === highlight ? 9 : 6) * u} fill={i === highlight ? palette.signal : palette.ui.surface} stroke={palette.signalDeep} strokeWidth={3 * u} /> : null,
                )}
              </>
            );
          })()}
        </svg>
      )}
      {callout && highlight !== undefined && calloutIn > 0 && (
        <div
          style={{
            position: 'absolute',
            right: width - (x(highlight) + barW),
            top: top + plotH - (values[highlight]! / max) * plotH - 96 * u + (1 - calloutIn) * 12 * u,
            opacity: Math.min(1, calloutIn * 2),
          }}
        >
          <Chip state="done" label={callout} u={u} pop={calloutIn} />
        </div>
      )}
      {labels.map((l, i) => (
        <div key={i} style={{ position: 'absolute', left: x(i), width: barW, top: height - labelH, textAlign: 'center' }}>
          <UILabel u={u} color={i === highlight ? palette.ui.text : palette.ui.textFaint}>
            {l}
          </UILabel>
        </div>
      ))}
    </div>
  );
};

/** Value of a count-up at progress p (eased by the caller). */
export const countUp = (from: number, to: number, p: number) => lerp(from, to, p);
