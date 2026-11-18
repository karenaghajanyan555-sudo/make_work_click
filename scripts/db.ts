/**
 * Production database: backup, restore, integrity check.
 *
 *   npm run db -- backup [file]     verified online copy → data/backups/studio-<time>-manual.db
 *                                   (safe while the Control Center runs: SQLite backup API)
 *   npm run db -- list              backups, newest first
 *   npm run db -- check             integrity + foreign keys + schema version
 *   npm run db -- restore <file>    replace data/studio.db with a backup. Refused while a
 *                                   runner (Control Center or CLI) is active: stop it first.
 *                                   The current database is backed up before it is replaced.
 *
 * The Control Center backs up on every start (newest 14 kept); every migration backs up first.
 * MWC_DB=<file> points any command at another database (tests, the end-to-end check).
 */
import path from 'node:path';
import { backupDb, backupFile, checkDb, DB_PATH, listBackups, openDb, restoreDb, SCHEMA_VERSION } from '../src/orchestrator/db.ts';
import { currentLease, leaseLive } from '../src/orchestrator/store.ts';

const [cmd, arg] = process.argv.slice(2);
const rel = (f: string) => path.relative(process.cwd(), f);
const die = (m: string): never => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

switch (cmd) {
  case 'backup': {
    const db = openDb();
    const b = await backupDb(db, arg ? path.resolve(arg) : backupFile(path.dirname(DB_PATH), 'manual'));
    db.close();
    console.log(`✓ ${rel(b.file)}  ${(b.bytes / 1024).toFixed(0)} KB · integrity ${b.check.integrity} · schema ${b.check.schema}`);
    break;
  }
  case 'list': {
    const list = listBackups();
    if (!list.length) console.log('No backups yet: npm run db -- backup');
    for (const b of list) console.log(`${b.at.replace('T', ' ').slice(0, 19)}  ${String((b.bytes / 1024).toFixed(0)).padStart(6)} KB  ${rel(b.file)}`);
    break;
  }
  case 'check': {
    const db = openDb();
    const c = checkDb(db);
    const counts = ['ideas', 'jobs', 'stage_runs', 'approvals', 'packages'].map((t) => `${t} ${(db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n}`);
    db.close();
    console.log(`${c.ok ? '✓' : '✗'} ${rel(DB_PATH)}: integrity ${c.integrity}, ${c.foreignKeyErrors} foreign-key errors, schema ${c.schema}/${SCHEMA_VERSION} · ${counts.join(', ')}`);
    if (!c.ok) process.exit(1);
    break;
  }
  case 'restore': {
    if (!arg) die('restore <backup file> (npm run db -- list shows them)');
    const db = openDb();
    const lease = currentLease(db);
    db.close();
    if (lease && leaseLive(lease)) die(`a runner is active (${lease.label}, pid ${lease.pid}): stop it (Ctrl-C in its terminal) and run restore again`);
    const r = restoreDb(path.resolve(arg!));
    console.log(`✓ restored ${rel(path.resolve(arg!))} → ${rel(DB_PATH)} (integrity ${r.check.integrity}, schema ${r.check.schema})`);
    if (r.safetyCopy) console.log(`  the database it replaced is kept at ${rel(r.safetyCopy)}`);
    break;
  }
  default:
    console.log('Commands: backup [file] | list | check | restore <file>   (head of scripts/db.ts)');
}
