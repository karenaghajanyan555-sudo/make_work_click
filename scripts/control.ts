/**
 * Production Control Center — the local dashboard + in-process runner.
 *
 *   npm run control [-- --port 4318]   → http://127.0.0.1:4318
 *
 * Local only (binds 127.0.0.1). Works the queue one job at a time while it holds the
 * runner lease; a CLI runner (`npm run produce -- run`) and this never run jobs at once.
 * Ctrl-C interrupts the current stage cleanly; resume it from the dashboard later.
 * On start it writes a verified database backup to data/backups/ (newest 14 kept).
 */
import path from 'node:path';
import { backupDb, backupFile, DB_PATH, openDb, pruneBackups } from '../src/orchestrator/db.ts';
import { startControlCenter } from '../src/orchestrator/server.ts';

const i = process.argv.indexOf('--port');
const port = i > -1 ? Number(process.argv[i + 1]) : 4318;
const db = openDb();
// A verified copy of the database every time the Control Center starts (newest 14 kept).
try {
  const b = await backupDb(db, backupFile(path.dirname(DB_PATH), 'auto'));
  pruneBackups('auto', 14);
  console.log(`database backed up → ${path.relative(process.cwd(), b.file)} (${(b.bytes / 1024).toFixed(0)} KB, integrity ok)`);
} catch (e) {
  console.error(`✗ database backup failed: ${(e as Error).message} — not starting; run npm run db -- check`);
  process.exit(1);
}
const cc = startControlCenter(db, { port });
console.log(`MAKE WORK CLICK — Production Control Center: http://127.0.0.1:${port}`);
let n = 0;
const stop = async () => {
  if (++n > 1) process.exit(130);
  console.log('\n■ stopping (interrupting the current stage)…');
  await cc.close();
  db.close();
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
