/**
 * Structured content definition for a video. Content files (content/videos/*.ts)
 * export a VideoSpec. Specs must stay JSON-compatible (no functions, no classes)
 * so they can later be generated, stored in SQLite, or edited by tools.
 *
 * A content file may be written with narration-relative timing (lines without `at`,
 * scenes without `duration`, beats written against spoken words) and resolved with
 * `defineVideo()` (src/video/define.ts) against the video's timing lock.
 */
import type { FormatId } from '../brand/format.ts';
import type { PresetName } from '../brand/presets.ts';
import type { ThemeName } from '../brand/theme.ts';
import type { ChaosToSystemProps } from './scenes/chaosToSystem.ts';
import type { HookProps, PayoffProps, ProblemProps, StatementProps } from './scenes/editorial.ts';
import type { EndCardProps } from './scenes/endCard.ts';
import type { FlowRunProps } from './scenes/flowRun.ts';
import type { ComparisonProps, DashboardProps, DataProps, NotificationsProps, TimelineProps } from './scenes/product.ts';
import type { SceneSound } from './scenes/model.ts';
import { sceneModel } from './scenes/registry.ts';
import { validateNarration, type NarrationSpec } from './narration.ts';
import type { ComposePlan } from '../sound/compose.ts';
import type { ScoreSpec } from '../sound/score.ts';
import { validatePublish, type PublishSpec } from './publish.ts';
import { partnerOf, validateAffiliate, type AffiliateSpec } from './affiliate.ts';
import { isPartnerId } from '../brand/partners.ts';

/**
 * Scene hand-offs. `cut` and `focusPull` are the v001 language; the rest serve the presets:
 * fade (minimal), slide (data), zoom (product), blur (cinematic), wipe (a masked reveal).
 */
export type TransitionSpec =
  | { type: 'cut' }
  | { type: 'focusPull' }
  | { type: 'fade' }
  | { type: 'slide' }
  | { type: 'zoom' }
  | { type: 'blur' }
  | { type: 'wipe' };

type SceneBase = {
  /** Unique within the video; used in cue names ("hook.click"). */
  id: string;
  /** Seconds. */
  duration: number;
  /** How this scene hands over to the next one. Default: the preset's transition. */
  transitionOut?: TransitionSpec;
  /** Chapter labels shown in the signature frame, attached to scene cue points. */
  chapters?: Array<{ cue: string; label: string }>;
  /** Narration lines spoken over this scene (ids). Drives auto timing (define.ts). */
  say?: string[];
  /** Auto timing: seconds the scene starts before its first spoken line (default 0.35). */
  lead?: number;
  /** Extra sounds on this scene's cues, on top of what the scene type plays (src/sound/effects.ts). */
  sounds?: SceneSound[];
};

export type SceneSpec =
  | (SceneBase & { type: 'chaosToSystem'; props: ChaosToSystemProps })
  | (SceneBase & { type: 'flowRun'; props: FlowRunProps })
  | (SceneBase & { type: 'endCard'; props: EndCardProps })
  | (SceneBase & { type: 'hook'; props: HookProps })
  | (SceneBase & { type: 'problem'; props: ProblemProps })
  | (SceneBase & { type: 'statement'; props: StatementProps })
  | (SceneBase & { type: 'payoff'; props: PayoffProps })
  | (SceneBase & { type: 'dashboard'; props: DashboardProps })
  | (SceneBase & { type: 'notifications'; props: NotificationsProps })
  | (SceneBase & { type: 'timeline'; props: TimelineProps })
  | (SceneBase & { type: 'comparison'; props: ComparisonProps })
  | (SceneBase & { type: 'data'; props: DataProps });

export type SceneType = SceneSpec['type'];

export type VideoSpec = {
  /** Composition id: letters, digits, dashes. e.g. "v001-memory". */
  id: string;
  title: string;
  /** Series mark printed in the signature frame, e.g. "N° 001". */
  series: string;
  format: FormatId;
  theme: ThemeName;
  /** Visual preset (src/brand/presets.ts). Default: editorial (the v001 look). */
  preset?: PresetName;
  status: 'prototype' | 'draft' | 'final';
  /** Editorial intent: what the video is about and for whom (planning + review; not rendered). */
  brief?: { topic: string; audience: string; hook: string; cta: string };
  scenes: SceneSpec[];
  /** Spoken lines + caption phrases (src/video/narration.ts). Voice: src/brand/voice.ts. */
  narration?: NarrationSpec;
  /** Narration captions. Default: on. Scenes that set their own type caption themselves. */
  captions?: { enabled: boolean };
  /** Hand-written original score (content/scores/<id>.ts). */
  score?: ScoreSpec;
  /** Music + effects. `compose` generates an original score from a preset (src/sound/compose.ts). */
  audio?: { compose?: ComposePlan; sfx?: boolean };
  /** Delivery overrides (src/pipeline/deliver.ts DELIVERY). */
  export?: { crf?: number };
  /** Post copy + cover moment (src/video/publish.ts). Required before a video is final. */
  publish?: PublishSpec;
  /**
   * Affiliate videos only (opt-in, D42): the paid partner (src/brand/partners.ts). Adds the
   * disclosure on the end card, in the caption and on the post sheet; without it no partner
   * may be named anywhere in the video (src/video/affiliate.ts).
   */
  affiliate?: AffiliateSpec;
  /** Set by defineVideo(): timing problems (stale or missing timing lock). */
  timingIssues?: string[];
};

/** A scene of a spec, by id and type (for videos derived from another one). */
export function sceneOf<T extends SceneType>(spec: Pick<VideoSpec, 'id' | 'scenes'>, id: string, type: T): Extract<SceneSpec, { type: T }> {
  const s = spec.scenes.find((x) => x.id === id);
  if (!s || s.type !== type) throw new Error(`${spec.id}: no ${type} scene "${id}"`);
  return s as Extract<SceneSpec, { type: T }>;
}

/** Scene-local cue points (seconds) for any scene. */
export function sceneCuePoints(scene: SceneSpec): Record<string, number> {
  return sceneModel(scene).cues(scene.props, scene.duration);
}

export function validateSpec(spec: VideoSpec): string[] {
  const errors: string[] = [];
  if (!/^[a-zA-Z0-9-]+$/.test(spec.id)) errors.push(`id "${spec.id}" must be letters, digits and dashes`);
  if (spec.scenes.length === 0) errors.push('a video needs at least one scene');
  const ids = new Set<string>();
  for (const scene of spec.scenes) {
    const where = `scene "${scene.id}"`;
    const model = sceneModel(scene);
    if (ids.has(scene.id)) errors.push(`${where}: duplicate id`);
    ids.add(scene.id);
    if (!(scene.duration > 0)) errors.push(`${where}: duration must be > 0`);
    else if (scene.duration < model.minDuration) errors.push(`${where}: ${model.name} needs ≥ ${model.minDuration}s (got ${scene.duration.toFixed(2)}s)`);
    const cues = sceneCuePoints(scene);
    for (const c of scene.chapters ?? []) {
      if (!(c.cue in cues)) errors.push(`${where}: chapter cue "${c.cue}" does not exist`);
    }
    for (const [name, t] of Object.entries(cues)) {
      if (t > scene.duration) errors.push(`${where}: cue "${name}" at ${t.toFixed(2)}s is after the scene ends (${scene.duration.toFixed(2)}s)`);
    }
    errors.push(...model.validate(scene.props, scene.duration).map((e) => `${where}: ${e}`));
    for (const snd of scene.sounds ?? []) if (!(snd.cue in cues)) errors.push(`${where}: sound on unknown cue "${snd.cue}"`);
    for (const line of scene.say ?? []) {
      if (!spec.narration?.lines.some((l) => l.id === line)) errors.push(`${where}: says "${line}", which is not a narration line`);
    }
  }
  if (spec.narration) errors.push(...validateNarration(spec.narration));
  errors.push(...(spec.timingIssues ?? []));
  // Scene durations summed: an upper bound on the length (hand-offs overlap a few frames).
  // publish-pack re-checks the cover frame against the exact timeline.
  // An affiliate video names its partner in the post copy ("systeme.io" looks like a link).
  const named = spec.affiliate && isPartnerId(spec.affiliate.partner) ? [partnerOf(spec.affiliate).name] : [];
  if (spec.publish) errors.push(...validatePublish(spec.publish, spec.scenes.reduce((s, sc) => s + sc.duration, 0), named));
  errors.push(...validateAffiliate(spec));
  if (spec.status === 'final' && !spec.publish) errors.push('a final video needs publish copy (publish)');
  if (spec.status === 'final' && spec.narration && !spec.narration.take) errors.push('a final video needs an approved narration take');
  return errors;
}
