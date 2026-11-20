/**
 * Start a new video. Reuse the engine, not the creative experience (D46): the scaffold has no
 * story, no scene sequence and no ending — those come from the creative direction chosen in the
 * storyboard.
 *
 *   npm run new-video -- v010-slug "Title"
 *
 * Writes:
 *   docs/storyboards/<id>.md      from docs/storyboards/_template.md: three directions, the
 *                                 comparison with the last five, the opening, the scene sheets,
 *                                 the creative review (Gate 2c)
 *   content/creative/<id>.ts      the creative record (status planned), registered in
 *                                 content/creative/index.ts
 *   content/videos/<id>.ts        a neutral placeholder spec (one TODO statement scene, so Studio
 *                                 opens) — replace its scenes with the chosen direction's
 *   content/timing/<id>.ts        placeholder until `npm run voice`
 * and registers the video in content/index.ts.
 *
 * A full render is refused until `npm run diversity -- <id> --stage render` passes (stills work).
 * Guide: the mwc-video skill (§ Engine steps).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/pipeline/paths.ts';
import { RECORDS } from '../content/creative/index.ts';

const [id, title = 'Untitled'] = process.argv.slice(2);
if (!id || !/^v\d{3}-[a-z0-9-]+$/.test(id)) {
  console.error('Usage: npm run new-video -- v010-slug "Title"   (id: vNNN-lowercase-slug)');
  process.exit(2);
}
const file = path.join(ROOT, 'content', 'videos', `${id}.ts`);
const lock = path.join(ROOT, 'content', 'timing', `${id}.ts`);
const recordFile = path.join(ROOT, 'content', 'creative', `${id}.ts`);
const board = path.join(ROOT, 'docs', 'storyboards', `${id}.md`);
for (const f of [file, recordFile, board]) {
  if (existsSync(f)) {
    console.error(`${path.relative(ROOT, f)} already exists`);
    process.exit(1);
  }
}
const name = id.replace(/^v(\d{3})-(.*)$/, (_, n: string, slug: string) => `v${n}${slug.replace(/(^|-)([a-z0-9])/g, (_m: string, _d: string, c: string) => c.toUpperCase())}`);
const series = `N° ${id.slice(1, 4)}`;
const seq = RECORDS.reduce((m, r) => Math.max(m, r.seq), 0) + 1;

// ---- storyboard (the creative work happens here first)
writeFileSync(board, readFileSync(path.join(ROOT, 'docs', 'storyboards', '_template.md'), 'utf8').replaceAll('{{id}}', id).replaceAll('{{title}}', title).replaceAll('{{series}}', series));

// ---- creative record: nothing decided yet (unknown fails the check until the storyboard fills it)
writeFileSync(
  recordFile,
  `import type { CreativeRecord } from '../../src/creative/diversity.ts';

/**
 * ${series} — "${title}": creative record (D46). Fill it from docs/storyboards/${id}.md, then
 * \`npm run diversity -- ${id}\`. Kinds: VOCABULARY in src/creative/diversity.ts. Basis: 'planned'
 * for decisions made for this video; never 'observed' before it exists.
 */
export const record: CreativeRecord = {
  id: '${id}',
  seq: ${seq},
  title: ${JSON.stringify(title)},
  status: 'planned',
  subject: { basis: 'unknown', note: 'TODO: the subject in one line' },
  opening: { basis: 'unknown', note: 'TODO: the opening concept (storyboard § Opening)' },
  hook: { basis: 'unknown', note: 'TODO: the hook mechanism and line (storyboard § Hooks)' },
  structure: { basis: 'unknown', note: 'TODO: the narrative structure' },
  visual: { basis: 'unknown', note: 'TODO: the visual metaphor' },
  demonstration: { basis: 'unknown', note: 'TODO: how it demonstrates' },
  ending: { basis: 'unknown', note: 'TODO: how it ends' },
  intent: { basis: 'unknown', note: 'TODO: why this direction suits the subject' },
  directions: { basis: 'planned', value: [] },
  review: { basis: 'planned', value: {} },
  hypothesis: { basis: 'unknown', note: 'TODO: what we expect from the audience, and why' },
};
`,
);
const recIndex = path.join(ROOT, 'content', 'creative', 'index.ts');
let rec = readFileSync(recIndex, 'utf8');
rec = rec.replace(/((?:import \{ record as \w+ \} from '\.\/[^']+';\n)+)/, `$1import { record as ${name} } from './${id}.ts';\n`);
rec = rec.replace(/(export const RECORDS: readonly CreativeRecord\[\] = \[)([^\]]*)\]/, (_m, a: string, b: string) => `${a}${b}, ${name}]`);
writeFileSync(recIndex, rec);

// ---- placeholder spec: one neutral scene so Studio opens; no story, no sequence, no ending
writeFileSync(
  lock,
  `// Placeholder until \`npm run voice -- ${id}\` writes the real timing lock.\nimport type { TimingLock } from '../../src/video/timing.ts';\n\nexport const timing: TimingLock | undefined = undefined;\n`,
);
writeFileSync(
  file,
  `import { defineVideo } from '../../src/video/define.ts';
import { timing } from '../timing/${id}.ts';

/**
 * ${series} — "${title}". PLACEHOLDER: replace the narration and scenes with the chosen creative
 * direction (docs/storyboards/${id}.md). Nothing here is a default to keep — not the scene, not
 * the preset, not the ending. Written against the narration (src/video/define.ts).
 */
export const ${name} = defineVideo(
  {
    id: '${id}',
    title: ${JSON.stringify(title)},
    series: '${series}',
    format: 'vertical',
    theme: 'ink',
    status: 'draft',
    brief: { topic: 'TODO', audience: 'TODO', hook: 'TODO', cta: 'TODO' },
    narration: {
      voice: 'bella-nicole-v1',
      lines: [{ id: 'idea', text: 'TODO: the first line, from the storyboard.' }],
    },
    scenes: [{ id: 'idea', type: 'statement', say: ['idea'], props: { text: 'TODO: the chosen\\ndirection’s *scenes.*' } }],
    audio: { compose: { harmony: 'clarity', anchor: 'idea.start', sections: [{ at: 'idea.start', style: 'intro' }] } },
  },
  timing,
);
`,
);

const index = path.join(ROOT, 'content', 'index.ts');
let src = readFileSync(index, 'utf8');
src = src.replace(/(import \{ \w+ \} from '\.\/videos\/[^']+';\n)(?!import \{ \w+ \} from '\.\/videos)/, `$1import { ${name} } from './videos/${id}.ts';\n`);
src = src.replace(/(export const VIDEOS: readonly VideoSpec\[\] = \[)([^\]]*)\]/, (_m, a: string, b: string) => `${a}${b}, ${name}]`);
writeFileSync(index, src);
for (const f of [board, recordFile, file, lock]) console.log(`✓ ${path.relative(ROOT, f)}`);
console.log(`✓ registered in content/index.ts and content/creative/index.ts as ${name}`);
console.log(`Next: the storyboard (three directions, hooks, scenes, review) → the record → npm run diversity -- ${id} → the spec → npm run voice -- ${id} → stills → npm run make -- ${id}`);
