/**
 * Storyboard planner (pure): script + kit → library scenes, beats pinned to spoken words.
 *
 * Arcs are the reusable choreography:
 *   signature  the v001-v2 look — chaosToSystem (hook → the to-dos flip into the flow →
 *              the click) → flowRun (follow camera, live light, merge field, read receipt,
 *              order value, stamp counter) → endCard (burst + swell), all with the opt-in
 *              `smooth` motion (one camera glide, soft light, gentle reveals; D40).
 *   editorial  the v002 sequence — one library scene per line (hook, problem, product
 *              scenes, payoff, outro) from the kit's scene material.
 * Pins stay unresolved here; the spec stage resolves them against the timing lock.
 */
import type { PresetName } from '../brand/presets.ts';
import type { ComposePlan } from '../sound/compose.ts';
import type { SceneSound } from '../video/scenes/model.ts';
import type { SceneSpec, TransitionSpec } from '../video/spec.ts';
import { headlineFrom, pin, typo, type Arc, type Harmony, type Pin, type StoryKit } from './kit.ts';
import type { Script, ScriptLine } from './writer.ts';

export type StoryboardScene = {
  id: string;
  type: SceneSpec['type'];
  say: string[];
  /** What this scene is for (review). */
  purpose: string;
  props: Record<string, unknown>;
  chapters: Array<{ cue: string; label: string }>;
  transitionOut?: TransitionSpec;
  sounds?: SceneSound[];
  lead?: number;
};
export type Storyboard = {
  arc: Arc;
  preset: PresetName;
  harmony: Harmony;
  scenes: StoryboardScene[];
  compose: ComposePlan;
  /** Lines the scenes set as type themselves (headline, resolution, statement, CTA): no caption track for them. */
  sceneText: string[];
};
export type StoryboardEdit = { preset?: PresetName; harmony?: Harmony };

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const chapter = (n: number, label: string) => `${String(n).padStart(2, '0')} — ${label}`;

export function planStoryboard(script: Script, kit: StoryKit, o: { series: string; preset: PresetName; harmony: Harmony; edit?: StoryboardEdit }): Storyboard {
  const preset = o.edit?.preset ?? o.preset;
  const harmony = o.edit?.harmony ?? o.harmony;
  const line = (id: string): ScriptLine => {
    const l = script.lines.find((x) => x.id === id);
    if (!l) throw new Error(`storyboard: the script has no line "${id}" (kit ${kit.id})`);
    return l;
  };
  const scenes = script.arc === 'signature' ? signatureArc(kit, line, o.series) : editorialArc(kit, script, line, o.series);
  const compose: ComposePlan =
    script.arc === 'signature'
      ? {
          harmony,
          anchor: 'hook.click',
          sections: [
            { at: 'hook.start', style: 'intro' },
            { at: 'hook.click', style: 'pulse' },
            { at: 'run.arrive2', style: 'lift' },
            { at: 'run.resolve', style: 'hold' },
            { at: 'end.click', style: 'home' },
          ],
        }
      : { harmony, ...(kit.compose ?? { anchor: 'hook.start', sections: [{ at: 'hook.start', style: 'intro' }, { at: 'end.click', style: 'home' }] }) };
  const sceneText =
    script.arc === 'signature'
      ? ['hook', 'system', 'cta']
      : kit.beats.filter((b) => b.id === 'cta' || ['hook', 'payoff', 'statement'].includes(b.scene?.type ?? '')).map((b) => b.id);
  return { arc: script.arc, preset, harmony, scenes, compose, sceneText };
}

// ---------- signature arc ----------
const STEP_LINES = ['step1', 'step2', 'step3'] as const;

function signatureArc(kit: StoryKit, line: (id: string) => ScriptLine, series: string): StoryboardScene[] {
  const m = kit.signature;
  if (!m) throw new Error(`kit ${kit.id} has no signature material`);
  const hook = line('hook');
  const system = line('system');
  const steps = STEP_LINES.slice(0, m.flow.length - 1).map((id) => line(id));
  const payoff = line('payoff');
  const resolved = m.fragments
    .filter((f): f is typeof f & { becomes: number } => f.becomes !== undefined)
    .sort((a, b) => a.becomes - b.becomes)
    .map((f) => ({ text: f.text, ...(f.tag ? { tag: f.tag } : {}), resolved: m.resolved[f.becomes]! }));
  const first = steps[0]!.id;
  const runSounds: SceneSound[] = [];
  m.details.forEach((d, i) => {
    if (!d) return;
    runSounds.push({ cue: `open${i}`, id: 'open' });
    if (d.kind === 'email') runSounds.push({ cue: `merge${i}`, id: 'tick', variant: 4 }, { cue: `opened${i}`, id: 'notify' });
    if (d.kind === 'goal') runSounds.push({ cue: `order${i}`, id: 'notify', variant: 1 });
  });
  runSounds.push({ cue: 'stamp', id: 'notify', variant: 1 });
  const hookChapterLabel = kit.beats.find((b) => b.id === 'hook')?.label ?? 'By hand';
  const systemChapterLabel = kit.beats.find((b) => b.id === 'system')?.label ?? 'By system';
  return [
    {
      id: 'hook',
      type: 'chaosToSystem',
      say: ['hook', 'system'],
      purpose: 'Hook over the scattered to-dos; they flip into the workflow; the system clicks on.',
      transitionOut: { type: 'cut' },
      chapters: [
        { cue: 'start', label: chapter(1, hookChapterLabel) },
        { cue: 'click', label: chapter(2, systemChapterLabel) },
      ],
      props: {
        headline: headlineFrom(hook.text, 3),
        resolution: system.caption ?? headlineFrom(system.text, 2),
        workspace: m.workspace,
        fragments: m.fragments,
        flow: m.flow,
        smooth: true,
        beats: {
          hookOut: pin('hook', undefined, { fallback: 'end', offset: 0.03 }),
          gather: pin('hook', undefined, { fallback: 'end', offset: 0.09 }),
          caption: pin('system', undefined, { offset: 0.1 }),
          flip: pin('system', undefined, { offset: 0.5 }),
          click: pin('system', undefined, { fallback: 'end', offset: 0.08 }),
          captionOut: pin('system', undefined, { fallback: 'end', offset: 0.28 }),
          run: pin(first, undefined, { offset: 0.38 }),
        },
      },
    },
    {
      id: 'run',
      type: 'flowRun',
      say: [...steps.map((s) => s.id), 'payoff'],
      purpose: 'The workflow runs by itself, step by step, each detail showing what it did; the to-dos resolve.',
      lead: -0.4,
      transitionOut: { type: 'cut' },
      chapters: [
        ...steps.map((s, i) => ({ cue: `arrive${i + 1}`, label: chapter(i + 3, s.label) })),
        { cue: 'resolve', label: chapter(steps.length + 3, payoff.label) },
      ],
      sounds: runSounds,
      props: {
        workspace: m.workspace,
        flow: m.flow,
        details: m.details,
        resolved,
        camera: 'follow',
        glow: 'follow',
        // Premium motion (owner review of v003, 2026-11-17): one camera glide, soft light, the
        // to-dos curve into the switch (the straight light trails read as scratches).
        smooth: true,
        trails: false,
        stamp: m.stamp,
        beats: {
          push: 0,
          trigger: pin(first, undefined, { offset: 0.65 }),
          steps: m.pins.steps,
          loop: pin('payoff', undefined, { offset: -0.7 }),
          pullBack: pin('payoff', undefined, { offset: -0.7 }),
          resolve: pin('payoff', undefined, { offset: 0.15 }),
          converge: pin('payoff', undefined, { fallback: 'end', offset: 0.1 }),
        },
      },
    },
    endCard(kit, series, { lead: 0.3, handedOver: true, n: steps.length + 4, smooth: true }),
  ];
}

function endCard(_kit: StoryKit, _series: string, o: { lead: number; handedOver: boolean; n: number; smooth?: boolean }): StoryboardScene {
  return {
    id: 'end',
    type: 'endCard',
    say: ['cta'],
    purpose: 'Brand click, wordmark, follow CTA.',
    lead: o.lead,
    chapters: [{ cue: 'click', label: chapter(o.n, 'Follow') }],
    sounds: [{ cue: 'click', id: 'swell' }],
    props: {
      cta: 'Follow for more *systems* like this.',
      burst: true,
      ...(o.smooth ? { smooth: true } : {}),
      ...(o.handedOver ? { switchHandedOver: true } : {}),
      beats: o.handedOver
        ? { click: 0.15, wordmark: 0.3, cta: pin('cta', undefined, { offset: 0.45 }) as Pin }
        : { click: 0.15, wordmark: 0.35, cta: pin('cta', 'follow') as Pin },
    },
  };
}

// ---------- editorial arc ----------
function editorialArc(kit: StoryKit, script: Script, line: (id: string) => ScriptLine, series: string): StoryboardScene[] {
  const out: StoryboardScene[] = [];
  let n = 0;
  for (const b of kit.beats) {
    const l = line(b.id);
    if (b.id === 'cta') {
      out.push(endCard(kit, series, { lead: 0.75, handedOver: false, n: ++n }));
      continue;
    }
    if (!b.scene) throw new Error(`kit ${kit.id}: beat "${b.id}" has no scene`);
    const props = clone(b.scene.props);
    if (b.scene.type === 'hook') {
      props.headline = l.origin === 'kit' && typeof props.headline === 'string' && props.headline ? props.headline : headlineFrom(l.text, 3);
      props.eyebrow = `${series} · ${kit.short}`;
    }
    if (b.scene.type === 'payoff' && (l.origin !== 'kit' || typeof props.statement !== 'string' || !props.statement)) props.statement = headlineFrom(l.text, 2);
    if (b.scene.type === 'statement' && (l.origin !== 'kit' || typeof props.text !== 'string')) props.text = headlineFrom(typo(l.text), 2);
    out.push({
      id: b.id,
      type: b.scene.type,
      say: [b.id],
      purpose: `${b.section}: ${b.label}`,
      props,
      chapters: [{ cue: b.scene.chapterCue ?? 'start', label: chapter(++n, b.label) }],
      ...(b.scene.transitionOut ? { transitionOut: b.scene.transitionOut } : {}),
      ...(b.scene.sounds ? { sounds: b.scene.sounds } : {}),
      ...(b.scene.lead !== undefined ? { lead: b.scene.lead } : {}),
    });
  }
  void script;
  return out;
}
