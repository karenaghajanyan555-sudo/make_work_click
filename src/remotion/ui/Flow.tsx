import { fonts, palette, radius, type } from '../../brand/tokens.ts';
import { CHAOS_TO_SYSTEM_LAYOUT, type FlowStep } from '../../video/scenes/chaosToSystem.ts';
import { lerp, mixColor } from '../lib/anim.ts';
import { Spinner } from '../motion/Signal.tsx';
import { CheckIcon, STEP_ICON } from './icons.tsx';

/**
 * Product-world UI kit for automation flows. Fictional, unbranded app; no OS chrome.
 * All sizes are base units — pass `u` from useLayout().
 */
export const FLOW_METRICS = CHAOS_TO_SYSTEM_LAYOUT.flow;

export type ChipState = 'idle' | 'pending' | 'busy' | 'done';

const CHIP_STYLE: Record<ChipState, { bg: string; fg: string; border: string }> = {
  idle: { bg: 'rgba(255,255,255,0)', fg: palette.ui.textFaint, border: palette.ui.border },
  pending: { bg: palette.ui.surface, fg: palette.ui.text, border: palette.ui.borderStrong },
  busy: { bg: palette.ui.surface, fg: palette.ui.textMuted, border: palette.ui.border },
  done: { bg: palette.signal, fg: palette.signalInk, border: '#B5DD48' },
};

export const Chip: React.FC<{ state: ChipState; label: string; u: number; pop?: number }> = ({ state, label, u, pop = 0 }) => {
  const c = CHIP_STYLE[state];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8 * u,
        padding: `${10 * u}px ${18 * u}px`,
        borderRadius: radius.chip,
        background: c.bg,
        border: `${1.5 * u}px solid ${c.border}`,
        color: c.fg,
        fontFamily: fonts.sans,
        fontSize: type.uiChip.size * u,
        fontWeight: type.uiChip.weight,
        letterSpacing: type.uiChip.tracking,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        transform: `scale(${1 + Math.sin(Math.min(1, pop) * Math.PI) * 0.08})`,
      }}
    >
      {state === 'busy' && <Spinner size={20 * u} />}
      {state === 'done' && <CheckIcon size={21 * u} strokeWidth={2.7} />}
      {label}
    </div>
  );
};

/** Inner content of a flow node: icon well, title, subtitle, status chip. */
export const NodeBody: React.FC<{ step: FlowStep; chip: ChipState; chipLabel: string; u: number; pop?: number; avatar?: number }> = ({
  step,
  chip,
  chipLabel,
  u,
  pop,
}) => {
  const Icon = STEP_ICON[step.kind];
  const done = chip === 'done';
  const m = FLOW_METRICS;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 24 * u, padding: `0 ${m.padX * u}px`, fontFamily: fonts.sans }}>
      <div
        style={{
          width: m.icon * u,
          height: m.icon * u,
          borderRadius: radius.icon * u,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: done ? palette.ui.text : palette.ui.well,
          color: done ? palette.signal : palette.ui.text,
        }}
      >
        <Icon size={28 * u} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: type.uiTitle.size * u, fontWeight: type.uiTitle.weight, letterSpacing: type.uiTitle.tracking, color: palette.ui.text, whiteSpace: 'nowrap' }}>
          {step.title}
        </div>
        <div
          style={{
            fontSize: type.uiBody.size * u,
            fontWeight: type.uiBody.weight,
            letterSpacing: type.uiBody.tracking,
            color: palette.ui.textMuted,
            marginTop: 5 * u,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {step.subtitle}
        </div>
      </div>
      <Chip state={chip} label={chipLabel} u={u} pop={pop} />
    </div>
  );
};

/**
 * Node surface style. `active` 0..1 adds the signal focus ring used while a step runs.
 * `morph` 0..1 blends from the brand-world memo card to the product-world node.
 */
export function nodeSurface(u: number, active: number, morph = 1): React.CSSProperties {
  return {
    borderRadius: lerp(radius.memo, radius.card, morph) * u,
    background: mixColor(palette.memoryCard, palette.ui.surface, morph),
    border: `${1.5 * u}px solid ${mixColor(palette.hairline, palette.ui.border, morph)}`,
    boxShadow: [
      `0 0 0 ${lerp(0, 5, active) * u}px rgba(201,242,93,${0.6 * active})`,
      `0 ${lerp(24, lerp(2, 18, active), morph) * u}px ${lerp(50, lerp(8, 40, active), morph) * u}px ${-14 * u}px rgba(10,12,16,${lerp(0.8, lerp(0.1, 0.24, active), morph)})`,
    ].join(', '),
  };
}

/** Vertical connector between two nodes with fill progress and a travelling signal pulse. */
export const Connector: React.FC<{ x: number; y: number; height: number; u: number; fill: number; pulse?: number }> = ({
  x,
  y,
  height,
  u,
  fill,
  pulse,
}) => {
  const w = 3 * u;
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y, width: w, height }}>
      <div style={{ position: 'absolute', inset: 0, background: palette.ui.borderStrong, borderRadius: w }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: `${Math.min(1, fill) * 100}%`, background: palette.signalDeep, borderRadius: w }} />
      {pulse !== undefined && pulse > 0 && pulse < 1 && (
        <div
          style={{
            position: 'absolute',
            left: w / 2 - 8 * u,
            top: `calc(${pulse * 100}% - ${8 * u}px)`,
            width: 16 * u,
            height: 16 * u,
            borderRadius: 16 * u,
            background: palette.signal,
            boxShadow: `0 0 0 ${5 * u}px rgba(201,242,93,0.28), 0 0 ${24 * u}px ${4 * u}px rgba(201,242,93,0.7)`,
          }}
        />
      )}
    </div>
  );
};
