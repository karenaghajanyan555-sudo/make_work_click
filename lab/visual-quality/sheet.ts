/** LAB ONLY: contact sheet of lab stills for review (reuses the QA sheet code).
 *   node lab/visual-quality/sheet.ts <out.png> <tileW> <columns> <still-name-prefix>...  */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { sheetFromImages } from '../../src/pipeline/sheet.ts';
import { ROOT } from '../../src/pipeline/paths.ts';

const [out, tileW, columns, ...prefixes] = process.argv.slice(2);
const dir = path.join(ROOT, 'out/lab/visual-quality/stills');
const files = prefixes.flatMap((p) => readdirSync(dir).filter((f) => f.startsWith(p)).sort().map((f) => ({ file: path.join(dir, f), label: f.replace('.png', '') })));
await sheetFromImages(files, path.resolve(out!), Number(tileW), Number(columns));
console.log(`${files.length} stills → ${out}`);
