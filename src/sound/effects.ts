/**
 * The sound-effect vocabulary (pure). Scene models say which of their cues make which
 * sound (`SceneModel.sounds`); the sounds themselves are built in
 * src/pipeline/sound/sfx.ts from CC0 recordings. Few and meaningful: every id means one
 * thing, in every video (docs/SOUND.md § Sound effects).
 */
export const SFX = {
  click: 'The brand switch turns on: the system takes over. The signature sound.',
  flip: 'A card turns over (to-do ↔ step).',
  day: 'A day passes on a schedule.',
  check: 'Something gets done by the system (check-off).',
  sent: 'A message is delivered.',
  notify: 'A notification arrives.',
  tick: 'A small UI step: an item lands, a value updates.',
  open: 'A panel or detail opens.',
  swell: 'A soft rise that lands exactly on its cue (into a click or a payoff).',
} as const;

export type SfxId = keyof typeof SFX;
export type SfxEvent = { t: number; id: SfxId; variant: number };
