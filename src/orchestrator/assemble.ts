/**
 * Storyboard + script + timing lock → an authored engine spec (pure), fitted until valid.
 *
 * The fit only adds silence (`pause`) between lines: pauses move lines on the timeline
 * without changing the recorded audio, so fitting never re-synthesises the voice. Each
 * round adds 0.1 s before the lines of a scene that fails validation (and before the next
 * scene's first line), up to 0.8 s, then gives up with the engine's own errors.
 */
import { defineVideo, type AuthoredLine, type AuthoredScene, type AuthoredVideo } from '../video/define.ts';
import type { PublishSpec } from '../video/publish.ts';
import { validateSpec, type VideoSpec } from '../video/spec.ts';
import { estimateLock, type TimingLock } from '../video/timing.ts';
import { resolvePins, spokenWords } from './kit.ts';
import type { Storyboard } from './storyboard.ts';
import type { Script } from './writer.ts';

export type SpecMeta = {
  id: string;
  title: string;
  series: string;
  brief: { topic: string; audience: string; hook: string; cta: string };
  publish: Omit<PublishSpec, 'coverAt'>;
  /** Approved take for this exact script, if one was frozen ("take-01"). */
  take?: string;
};

export function authoredVideo(meta: SpecMeta, script: Script, sb: Storyboard, lock?: TimingLock, pauses: Record<string, number> = {}): AuthoredVideo {
  const wordsOf = (id: string): string[] | undefined => {
    const l = lock?.lines.find((x) => x.id === id);
    if (l) return l.words.map((w) => w[0]);
    const s = script.lines.find((x) => x.id === id);
    return s ? spokenWords(s.text) : undefined;
  };
  const shown = new Set(sb.sceneText);
  const lines: AuthoredLine[] = script.lines.map((l, k) => {
    const pause = Number(((l.pause ?? 0) + (pauses[l.id] ?? 0)).toFixed(2));
    const caption = shown.has(l.id) ? undefined : l.caption;
    return { id: l.id, text: l.text, ...(caption !== undefined ? { caption } : {}), ...(k > 0 && pause > 0 ? { pause } : {}) };
  });
  const scenes = sb.scenes.map(
    (s) =>
      ({
        id: s.id,
        type: s.type,
        say: s.say,
        ...(s.lead !== undefined ? { lead: s.lead } : {}),
        ...(s.transitionOut ? { transitionOut: s.transitionOut } : {}),
        chapters: s.chapters,
        ...(s.sounds?.length ? { sounds: s.sounds } : {}),
        props: resolvePins(s.props, wordsOf),
      }) as unknown as AuthoredScene,
  );
  return {
    id: meta.id,
    title: meta.title,
    series: meta.series,
    format: 'vertical',
    theme: 'ink',
    preset: sb.preset,
    status: 'draft',
    brief: meta.brief,
    narration: { voice: 'bella-nicole-v1', ...(meta.take ? { take: meta.take } : {}), lines },
    scenes,
    audio: { compose: sb.compose },
    publish: { coverAt: 0, ...meta.publish },
  };
}

/** Cover: the hook fully on screen, just before its last word ends. */
function coverAt(spec: VideoSpec, lock: TimingLock): number {
  const first = spec.narration?.lines[0];
  const l = first ? lock.lines.find((x) => x.id === first.id) : undefined;
  return first && l ? Number(Math.max(0.5, first.at + l.duration - 0.2).toFixed(2)) : 1;
}

export type FitResult = { authored: AuthoredVideo; spec: VideoSpec; pauses: Record<string, number>; adjustments: string[]; errors: string[] };

export function fitVideo(meta: SpecMeta, script: Script, sb: Storyboard, lock: TimingLock | undefined, maxRounds = 8): FitResult {
  const pauses: Record<string, number> = {};
  const adjustments: string[] = [];
  const timing = lock ?? estimateLock(meta.id, script.lines.map(({ id, text }) => ({ id, text })));
  for (let round = 0; ; round++) {
    const authored = authoredVideo(meta, script, sb, lock, pauses);
    let spec = defineVideo(authored, lock);
    authored.publish!.coverAt = coverAt(spec, timing);
    spec = defineVideo(authored, lock);
    const errors = validateSpec(spec).filter((e) => lock || !e.includes('timing lock'));
    if (!errors.length || round >= maxRounds) return { authored, spec, pauses, adjustments, errors };
    const failing = new Set(errors.map((e) => /^scene "([^"]+)"/.exec(e)?.[1]).filter((x): x is string => Boolean(x)));
    if (!failing.size) return { authored, spec, pauses, adjustments, errors };
    // A cue past the scene's end needs room after the scene (the next scene's first line);
    // anything else needs room between the scene's own lines.
    const bump: string[] = [];
    sb.scenes.forEach((s, k) => {
      const mine = errors.filter((e) => e.startsWith(`scene "${s.id}"`));
      if (!mine.length) return;
      const next = sb.scenes[k + 1]?.say[0];
      for (const e of mine) {
        // "step N: its result must stay readable": room after step N's line only.
        const step = /step (\d+): its result must stay readable/.exec(e);
        if (step && s.say[Number(step[1])]) bump.push(s.say[Number(step[1])]!);
        else if (e.includes('is after the scene ends') || e.includes('needs ≥')) {
          if (next) bump.push(next);
        } else bump.push(...s.say.slice(1), ...(next ? [next] : []));
      }
    });
    for (const id of new Set(bump)) pauses[id] = Number(((pauses[id] ?? 0) + 0.1).toFixed(2));
    adjustments.push(`round ${round + 1}: +0.1 s before ${[...new Set(bump)].join(', ')} (${[...failing].join(', ')}: ${errors[0]})`);
  }
}
