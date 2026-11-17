/**
 * Start a new video from the engine template.
 *
 *   npm run new-video -- v003-invoices "Invoices that chase themselves"
 *
 * Writes content/videos/<id>.ts (a narration-timed spec using library scenes),
 * content/timing/<id>.ts (placeholder until `npm run voice`), and registers the video in
 * content/index.ts. Next: write the script and scenes, `npm run voice -- <id>`, preview in
 * `npm run studio`, then `npm run make -- <id>`. Guide: CLAUDE.md § Making a video.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/pipeline/paths.ts';

const [id, title = 'Untitled'] = process.argv.slice(2);
if (!id || !/^v\d{3}-[a-z0-9-]+$/.test(id)) {
  console.error('Usage: npm run new-video -- v003-slug "Title"   (id: vNNN-lowercase-slug)');
  process.exit(2);
}
const file = path.join(ROOT, 'content', 'videos', `${id}.ts`);
const lock = path.join(ROOT, 'content', 'timing', `${id}.ts`);
if (existsSync(file)) {
  console.error(`${path.relative(ROOT, file)} already exists`);
  process.exit(1);
}
const name = id.replace(/^v(\d{3})-(.*)$/, (_, n: string, slug: string) => `v${n}${slug.replace(/(^|-)([a-z0-9])/g, (_m: string, _d: string, c: string) => c.toUpperCase())}`);
const series = `N° ${id.slice(1, 4)}`;

writeFileSync(
  lock,
  `// Placeholder until \`npm run voice -- ${id}\` writes the real timing lock.\nimport type { TimingLock } from '../../src/video/timing.ts';\n\nexport const timing: TimingLock | undefined = undefined;\n`,
);
writeFileSync(
  file,
  `import { defineVideo } from '../../src/video/define.ts';
import { timing } from '../timing/${id}.ts';

/**
 * ${series} — "${title}". Written against the narration (src/video/define.ts): lines follow
 * the take's rhythm, scenes last as long as what they say, beats pin to spoken words.
 * Scene catalogue: docs/ARCHITECTURE.md. Businesses, people and apps are fictional.
 */
export const ${name} = defineVideo(
  {
    id: '${id}',
    title: ${JSON.stringify(title)},
    series: '${series}',
    format: 'vertical',
    theme: 'ink',
    preset: 'editorial',
    status: 'draft',
    brief: { topic: 'TODO', audience: 'TODO', hook: 'TODO', cta: 'Follow for more systems like this.' },
    narration: {
      voice: 'bella-nicole-v1',
      lines: [
        { id: 'hook', text: 'TODO: the hook, said out loud in one breath.' },
        { id: 'turn', text: 'TODO: the turn, where the system takes over.', caption: 'TODO: where the system\\n*takes over.*', pause: 0.3 },
        { id: 'payoff', text: 'TODO: the payoff, what the viewer gets back.', pause: 0.3 },
        { id: 'cta', text: 'Follow for more systems like this.', pause: 0.35 },
      ],
    },
    scenes: [
      { id: 'hook', type: 'hook', say: ['hook'], props: { headline: 'TODO:\\nthe *hook.*', fragments: [{ text: 'TODO: a to-do', tag: 'Overdue · 2d' }] } },
      { id: 'turn', type: 'statement', say: ['turn'], props: { text: 'TODO' } },
      { id: 'payoff', type: 'payoff', say: ['payoff'], props: { statement: 'TODO *payoff.*', items: [{ text: 'TODO: a to-do', resolved: 'Done' }] } },
      { id: 'end', type: 'endCard', say: ['cta'], lead: 0.75, props: { cta: 'Follow for more *systems* like this.', beats: { click: 0.15, wordmark: 0.35, cta: { line: 'cta', word: 'follow' } } } },
    ],
    audio: {
      compose: {
        harmony: 'clarity',
        anchor: 'turn.start',
        sections: [
          { at: 'hook.start', style: 'intro' },
          { at: 'turn.start', style: 'pulse' },
          { at: 'payoff.start', style: 'hold' },
          { at: 'end.click', style: 'home' },
        ],
      },
    },
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
console.log(`✓ ${path.relative(ROOT, file)}\n✓ ${path.relative(ROOT, lock)} (placeholder)\n✓ registered in content/index.ts as ${name}`);
console.log(`Next: write the script + scenes → npm run voice -- ${id} → npm run studio → npm run make -- ${id}`);
