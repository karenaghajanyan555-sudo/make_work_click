/**
 * MAKE WORK CLICK — brand tokens. The single source of truth for colour, type,
 * shape and motion. Scenes and components must use these, never raw values.
 * Rationale and usage rules: docs/BRAND.md.
 *
 * All sizes are in base units: 1u = 1px on a 1080px-wide frame. Scale with
 * `layout.u` (see format.ts) so compositions stay correct at other sizes.
 */

export const palette = {
  // Brand world (dark editorial)
  ink: '#0A0B0D',
  graphite: '#16191E',
  paper: '#F3F1EC',
  fog: '#9AA0A9',
  smoke: '#62676F',
  hairline: 'rgba(243,241,236,0.10)',
  hairlineStrong: 'rgba(243,241,236,0.30)',
  memoryCard: 'rgba(26,29,35,0.92)',
  memoryText: '#DCDDE0',

  // The one accent. Means only: "the system did this for you".
  signal: '#C9F25D',
  signalDeep: '#8DB82E',
  signalInk: '#18200A',
  /** Signal used as text on light UI (lime itself is unreadable on white). */
  signalOnLight: '#3F5612',

  // "Before" state only: overdue, forgotten, manual.
  friction: '#FF8A65',

  // Product world (light software UI)
  ui: {
    canvas: '#F4F3EF',
    surface: '#FFFFFF',
    well: '#F2F1ED',
    border: '#E7E5DF',
    borderStrong: '#D8D5CD',
    text: '#15171B',
    textMuted: '#676C75',
    textFaint: '#9A9EA6',
    live: '#7FB51E',
    /** Light card surface floating on the dark ground (notifications). */
    float: 'rgba(250,249,246,0.97)',
    chartBar: '#D9D6CE',
  },

  /** Avatar tiles for fictional people and workspaces: [from, to, ink]. */
  avatar: {
    warm: ['#EBDDC8', '#D7C09F', '#5B452C'],
    peach: ['#F3DCCB', '#DDB79B', '#5B452C'],
    sage: ['#DDE6D3', '#B9C9A6', '#3E4A30'],
    sky: ['#D9E2EE', '#B3C3D9', '#334155'],
    lilac: ['#E3DDEE', '#C6BBDB', '#463C5C'],
  },
} as const;

export type AvatarTone = keyof typeof palette.avatar;

export const fonts = {
  sans: '"Geist", system-ui, sans-serif',
  serif: '"Instrument Serif", Georgia, serif',
  mono: '"Geist Mono", ui-monospace, monospace',
} as const;

/** Type roles (base units). Pick a role; never invent a size inside a scene. */
export const type = {
  display: { size: 112, weight: 620, tracking: '-0.045em', leading: 1.0 },
  title: { size: 88, weight: 620, tracking: '-0.042em', leading: 1.02 },
  /** Narration captions (phrase-based, ≤ 2 lines in the caption band). */
  caption: { size: 62, weight: 600, tracking: '-0.035em', leading: 1.08 },
  /** Supporting line on the end card (CTA). */
  lead: { size: 46, weight: 500, tracking: '-0.025em', leading: 1.2 },
  /** The MAKE WORK CLICK wordmark set as a lockup. */
  wordmark: { size: 74, weight: 700, tracking: '-0.02em' },
  /** Emphasis words inside display/title: serif italic, optically enlarged. */
  emphasis: { scale: 1.12, weight: 400, tracking: '-0.015em' },
  uiTitle: { size: 30, weight: 620, tracking: '-0.025em' },
  uiBody: { size: 22, weight: 450, tracking: '-0.005em' },
  uiChip: { size: 21, weight: 620, tracking: '-0.005em' },
  memo: { size: 31, weight: 500, tracking: '-0.015em' },
  /** Big numbers in metric cards (tabular). */
  metric: { size: 66, weight: 620, tracking: '-0.04em' },
  label: { size: 19, weight: 500, tracking: '0.10em' },
} as const;

export const radius = {
  window: 34,
  card: 24,
  icon: 17,
  chip: 999,
  memo: 22,
} as const;

/** Durations in seconds. Convert with useTime().s(). */
export const duration = {
  micro: 0.2,
  quick: 0.33,
  base: 0.55,
  slow: 0.8,
  travel: 0.95,
} as const;

/** Stagger between sibling entrances, seconds. */
export const stagger = {
  word: 0.1,
  item: 0.1,
} as const;
