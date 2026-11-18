/**
 * The production database: SQLite through Node's built-in `node:sqlite` (D4, no native
 * dependency). One file, data/studio.db (gitignored; `MWC_DB` overrides the path). WAL mode
 * so the dashboard can read while a CLI runner writes. Schema changes are numbered
 * migrations below; never edit an applied one, add the next. Before an existing database
 * is migrated it is backed up to data/backups/ (restore: `npm run db -- restore <file>`).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';
import { ROOT } from '../pipeline/paths.ts';

export const REAL_DB = path.join(ROOT, 'data', 'studio.db');
export const DB_PATH = process.env.MWC_DB ? path.resolve(process.env.MWC_DB) : REAL_DB;
export const BACKUP_DIR = path.join(path.dirname(DB_PATH), 'backups');

export const MIGRATIONS: readonly string[] = [
  /* 1 — production records */ `
  CREATE TABLE ideas (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    audience TEXT NOT NULL,
    category TEXT NOT NULL,
    hook TEXT,
    value_note TEXT,
    audience_value INTEGER NOT NULL DEFAULT 3,
    engagement INTEGER NOT NULL DEFAULT 3,
    commercial INTEGER NOT NULL DEFAULT 3,
    arc TEXT,
    preset TEXT,
    notes TEXT,
    origin TEXT NOT NULL DEFAULT 'manual',
    score REAL,
    priority INTEGER,
    priority_override INTEGER,
    research_status TEXT NOT NULL DEFAULT 'none',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE idea_sources (
    id INTEGER PRIMARY KEY,
    idea_id TEXT NOT NULL REFERENCES ideas(id),
    url TEXT NOT NULL,
    claim TEXT NOT NULL,
    quote TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL REFERENCES ideas(id),
    video_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    options TEXT NOT NULL DEFAULT '{}',
    current_stage TEXT,
    error TEXT,
    notes TEXT,
    runner_pid INTEGER,
    cancel_requested INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE stage_runs (
    id INTEGER PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id),
    stage TEXT NOT NULL,
    attempt INTEGER NOT NULL,
    status TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    output_hash TEXT,
    output TEXT,
    error TEXT,
    log_path TEXT,
    child_pid INTEGER,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    seconds REAL
  );
  CREATE INDEX stage_runs_job ON stage_runs(job_id, stage, id);
  CREATE TABLE research (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, idea_id TEXT NOT NULL, input_hash TEXT NOT NULL,
    provider TEXT NOT NULL, status TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE sources (
    id INTEGER PRIMARY KEY, research_id INTEGER NOT NULL REFERENCES research(id),
    url TEXT NOT NULL, title TEXT, fetched_at TEXT, http_status INTEGER, content_sha256 TEXT, ok INTEGER NOT NULL, error TEXT
  );
  CREATE TABLE claims (
    id INTEGER PRIMARY KEY, research_id INTEGER NOT NULL REFERENCES research(id),
    ref TEXT NOT NULL, text TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL,
    source_id INTEGER REFERENCES sources(id), quote TEXT, evidence TEXT, required INTEGER NOT NULL DEFAULT 0, note TEXT
  );
  CREATE TABLE briefs (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, input_hash TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE scripts (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, input_hash TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE storyboards (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, input_hash TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE asset_manifests (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, input_hash TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE renders (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, video_id TEXT NOT NULL, input_hash TEXT NOT NULL,
    upload_path TEXT NOT NULL, upload_sha256 TEXT NOT NULL, bytes INTEGER NOT NULL, video_seconds REAL NOT NULL,
    segments_rendered INTEGER, segments_total INTEGER, build_seconds REAL, data TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE qa_reports (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, upload_sha256 TEXT NOT NULL, pass INTEGER NOT NULL,
    checks_total INTEGER NOT NULL, checks_failed INTEGER NOT NULL, report_path TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE approvals (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, target TEXT NOT NULL, target_hash TEXT NOT NULL,
    decision TEXT NOT NULL, notes TEXT, decided_by TEXT NOT NULL, decided_at TEXT NOT NULL
  );
  CREATE TABLE edits (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, target TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE packages (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, approval_id INTEGER NOT NULL, dir TEXT NOT NULL, manifest TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE publications (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL, video_id TEXT NOT NULL, platform TEXT NOT NULL,
    platform_video_id TEXT, url TEXT, published_at TEXT NOT NULL, hook TEXT, category TEXT, arc TEXT, preset TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE metrics (
    id INTEGER PRIMARY KEY, publication_id INTEGER NOT NULL REFERENCES publications(id), captured_at TEXT NOT NULL,
    views INTEGER, avg_watch_seconds REAL, retention TEXT, completion_rate REAL, saves INTEGER, shares INTEGER,
    comments INTEGER, profile_visits INTEGER, link_clicks INTEGER, affiliate_conversions INTEGER, notes TEXT
  );
  CREATE TABLE events (id INTEGER PRIMARY KEY, job_id TEXT, at TEXT NOT NULL, kind TEXT NOT NULL, message TEXT NOT NULL);
  CREATE INDEX events_job ON events(job_id, id);
  CREATE TABLE runner (id INTEGER PRIMARY KEY CHECK (id = 1), pid INTEGER NOT NULL, started_at TEXT NOT NULL, heartbeat_at TEXT NOT NULL, label TEXT NOT NULL);
  `,
  /* 2 — integrity: foreign keys on every job record, one active job per idea, claim
     evidence fields (support level, confidence, limitations), editorial reports. Tables
     are rebuilt (SQLite cannot add a foreign key in place) with foreign keys off; the
     runner checks foreign_key_check before committing. */ `
  CREATE TABLE research_new (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), idea_id TEXT NOT NULL REFERENCES ideas(id), input_hash TEXT NOT NULL,
    provider TEXT NOT NULL, status TEXT NOT NULL, summary TEXT NOT NULL, created_at TEXT NOT NULL
  );
  INSERT INTO research_new SELECT * FROM research; DROP TABLE research; ALTER TABLE research_new RENAME TO research;
  CREATE TABLE briefs_new (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), input_hash TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
  INSERT INTO briefs_new SELECT * FROM briefs; DROP TABLE briefs; ALTER TABLE briefs_new RENAME TO briefs;
  CREATE TABLE scripts_new (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), input_hash TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
  INSERT INTO scripts_new SELECT * FROM scripts; DROP TABLE scripts; ALTER TABLE scripts_new RENAME TO scripts;
  CREATE TABLE storyboards_new (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), input_hash TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
  INSERT INTO storyboards_new SELECT * FROM storyboards; DROP TABLE storyboards; ALTER TABLE storyboards_new RENAME TO storyboards;
  CREATE TABLE asset_manifests_new (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), input_hash TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
  INSERT INTO asset_manifests_new SELECT * FROM asset_manifests; DROP TABLE asset_manifests; ALTER TABLE asset_manifests_new RENAME TO asset_manifests;
  CREATE TABLE renders_new (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), video_id TEXT NOT NULL, input_hash TEXT NOT NULL,
    upload_path TEXT NOT NULL, upload_sha256 TEXT NOT NULL, bytes INTEGER NOT NULL, video_seconds REAL NOT NULL,
    segments_rendered INTEGER, segments_total INTEGER, build_seconds REAL, data TEXT NOT NULL, created_at TEXT NOT NULL
  );
  INSERT INTO renders_new SELECT * FROM renders; DROP TABLE renders; ALTER TABLE renders_new RENAME TO renders;
  CREATE TABLE qa_reports_new (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), upload_sha256 TEXT NOT NULL, pass INTEGER NOT NULL,
    checks_total INTEGER NOT NULL, checks_failed INTEGER NOT NULL, report_path TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL
  );
  INSERT INTO qa_reports_new SELECT * FROM qa_reports; DROP TABLE qa_reports; ALTER TABLE qa_reports_new RENAME TO qa_reports;
  CREATE TABLE approvals_new (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), target TEXT NOT NULL CHECK (target IN ('script', 'video')), target_hash TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'revise')), notes TEXT, decided_by TEXT NOT NULL, decided_at TEXT NOT NULL
  );
  INSERT INTO approvals_new SELECT * FROM approvals; DROP TABLE approvals; ALTER TABLE approvals_new RENAME TO approvals;
  CREATE TABLE edits_new (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), target TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL);
  INSERT INTO edits_new SELECT * FROM edits; DROP TABLE edits; ALTER TABLE edits_new RENAME TO edits;
  CREATE TABLE packages_new (id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), approval_id INTEGER NOT NULL REFERENCES approvals(id), dir TEXT NOT NULL, manifest TEXT NOT NULL, created_at TEXT NOT NULL);
  INSERT INTO packages_new SELECT * FROM packages; DROP TABLE packages; ALTER TABLE packages_new RENAME TO packages;
  CREATE TABLE publications_new (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), video_id TEXT NOT NULL, platform TEXT NOT NULL,
    platform_video_id TEXT, url TEXT, published_at TEXT NOT NULL, hook TEXT, category TEXT, arc TEXT, preset TEXT, created_at TEXT NOT NULL
  );
  INSERT INTO publications_new SELECT * FROM publications; DROP TABLE publications; ALTER TABLE publications_new RENAME TO publications;
  CREATE TABLE events_new (id INTEGER PRIMARY KEY, job_id TEXT REFERENCES jobs(id), at TEXT NOT NULL, kind TEXT NOT NULL, message TEXT NOT NULL);
  INSERT INTO events_new SELECT * FROM events; DROP TABLE events; ALTER TABLE events_new RENAME TO events;
  CREATE INDEX events_job ON events(job_id, id);
  CREATE INDEX research_job ON research(job_id, id);
  CREATE INDEX briefs_job ON briefs(job_id, id);
  CREATE INDEX scripts_job ON scripts(job_id, id);
  CREATE INDEX storyboards_job ON storyboards(job_id, id);
  CREATE INDEX asset_manifests_job ON asset_manifests(job_id, id);
  CREATE INDEX renders_job ON renders(job_id, id);
  CREATE INDEX qa_reports_job ON qa_reports(job_id, id);
  CREATE INDEX approvals_job ON approvals(job_id, target, target_hash, id);
  CREATE INDEX edits_job ON edits(job_id, target, id);
  CREATE INDEX packages_job ON packages(job_id, id);
  CREATE INDEX sources_research ON sources(research_id);
  CREATE INDEX claims_research ON claims(research_id);
  CREATE UNIQUE INDEX jobs_one_active_per_idea ON jobs(idea_id) WHERE status NOT IN ('done', 'cancelled', 'rejected');
  ALTER TABLE claims ADD COLUMN support TEXT;
  ALTER TABLE claims ADD COLUMN confidence TEXT;
  ALTER TABLE claims ADD COLUMN quote_match TEXT;
  ALTER TABLE claims ADD COLUMN coverage REAL;
  ALTER TABLE claims ADD COLUMN limitations TEXT;
  ALTER TABLE claims ADD COLUMN retrieved_at TEXT;
  CREATE TABLE editorial_reports (
    id INTEGER PRIMARY KEY, job_id TEXT NOT NULL REFERENCES jobs(id), input_hash TEXT NOT NULL, upload_sha256 TEXT NOT NULL,
    attention INTEGER NOT NULL, problems INTEGER NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE INDEX editorial_job ON editorial_reports(job_id, id);
  `,
];

export type Db = DatabaseSync;
export const SCHEMA_VERSION = MIGRATIONS.length;

const isReal = (file: string) => file !== ':memory:' && path.resolve(file) === REAL_DB;

/** Open (and migrate) the database. `:memory:` for tests. */
export function openDb(file = DB_PATH): Db {
  // Tests never touch production history: node --test sets NODE_TEST_CONTEXT in test processes.
  if (process.env.NODE_TEST_CONTEXT && isReal(file)) throw new Error('tests must use a temporary database (":memory:" or a temp file), never data/studio.db');
  if (file !== ':memory:') mkdirSync(path.dirname(file), { recursive: true });
  const existed = file !== ':memory:' && existsSync(file) && statSync(file).size > 0;
  const db = new DatabaseSync(file);
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  let version = schemaVersion(db);
  if (version > MIGRATIONS.length) throw new Error(`${file}: schema ${version} is newer than this code (${MIGRATIONS.length}); update the code, or restore an older backup`);
  if (existed && version > 0 && version < MIGRATIONS.length) {
    const f = backupFile(path.dirname(file), `pre-migration-${version}-to-${MIGRATIONS.length}`);
    backupSync(db, f);
  }
  while (version < MIGRATIONS.length) {
    // Foreign keys must be off while tables are rebuilt (they cannot change inside a transaction).
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(MIGRATIONS[version]!);
      const broken = db.prepare('PRAGMA foreign_key_check').all();
      if (broken.length) throw new Error(`migration ${version + 1}: ${broken.length} rows break a foreign key (${JSON.stringify(broken.slice(0, 3))})`);
      version++;
      db.prepare("INSERT INTO meta (key, value) VALUES ('schema', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(version));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      db.exec('PRAGMA foreign_keys = ON');
      throw e;
    }
    db.exec('PRAGMA foreign_keys = ON');
  }
  return db;
}

export function schemaVersion(db: Db): number {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema'").get() as { value: string } | undefined;
  return row ? Number(row.value) : 0;
}

const depth = new WeakMap<Db, number>();
/**
 * Run `fn` atomically: all its writes land, or none do. BEGIN IMMEDIATE takes the write
 * lock up front, so a check-then-insert (e.g. one active job per idea) cannot interleave
 * with another process. Nested calls become savepoints.
 */
export function tx<T>(db: Db, fn: () => T): T {
  const d = depth.get(db) ?? 0;
  const sp = `sp${d}`;
  db.exec(d === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${sp}`);
  depth.set(db, d + 1);
  try {
    const r = fn();
    if (r instanceof Promise) throw new Error('tx(): the function must be synchronous');
    db.exec(d === 0 ? 'COMMIT' : `RELEASE ${sp}`);
    return r;
  } catch (e) {
    db.exec(d === 0 ? 'ROLLBACK' : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
    throw e;
  } finally {
    depth.set(db, d);
  }
}

/** Plain-language message for SQLite errors people will see (dashboard, CLI). */
export function dbErrorMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/database is locked|SQLITE_BUSY/i.test(m)) return 'the database is busy (another process held the write lock for over 5 s): try again';
  if (/UNIQUE constraint failed: jobs\.idea_id/.test(m)) return 'this idea already has an active job: resume or cancel it';
  if (/FOREIGN KEY constraint failed/.test(m)) return 'refused: the record refers to something that does not exist';
  if (/database disk image is malformed|SQLITE_CORRUPT/i.test(m)) return `the database file is damaged: stop the Control Center and restore a backup (npm run db -- list, then restore) — ${m}`;
  return m;
}

// ---------- backup / restore ----------
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
export const backupFile = (dir: string, label: string) => path.join(dir, 'backups', `studio-${stamp()}-${label}.db`);

/** Integrity of a database file (or open handle): SQLite's own check plus foreign keys. */
export function checkDb(db: Db): { ok: boolean; integrity: string; foreignKeyErrors: number; schema: number } {
  const integrity = (db.prepare('PRAGMA integrity_check').all() as Array<{ integrity_check: string }>).map((r) => r.integrity_check).join('; ');
  const fk = db.prepare('PRAGMA foreign_key_check').all().length;
  return { ok: integrity === 'ok' && fk === 0, integrity, foreignKeyErrors: fk, schema: schemaVersion(db) };
}

/** Synchronous backup through a second connection (used before migrations). */
function backupSync(db: Db, dest: string): void {
  mkdirSync(path.dirname(dest), { recursive: true });
  db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
}

/**
 * Consistent online copy of the live database (SQLite backup API: safe while the
 * Control Center is running), then verified by opening the copy and checking it.
 */
export async function backupDb(db: Db, dest: string): Promise<{ file: string; bytes: number; check: ReturnType<typeof checkDb> }> {
  mkdirSync(path.dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  rmSync(part, { force: true });
  await backup(db, part);
  const copy = new DatabaseSync(part, { readOnly: true });
  const check = checkDb(copy);
  copy.close();
  if (!check.ok) {
    rmSync(part, { force: true });
    throw new Error(`backup failed verification: ${check.integrity}, ${check.foreignKeyErrors} foreign-key errors`);
  }
  renameSync(part, dest);
  return { file: dest, bytes: statSync(dest).size, check };
}

export function listBackups(dir = BACKUP_DIR): Array<{ file: string; bytes: number; at: string }> {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => ({ file: path.join(dir, f), bytes: statSync(path.join(dir, f)).size, at: statSync(path.join(dir, f)).mtime.toISOString() }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Keep the newest `keep` automatic backups with this label suffix. */
export function pruneBackups(suffix: string, keep: number, dir = BACKUP_DIR): void {
  for (const b of listBackups(dir).filter((x) => x.file.endsWith(`-${suffix}.db`)).slice(keep)) rmSync(b.file, { force: true });
}

/**
 * Replace the database at `target` with the backup `from`. The caller must make sure no
 * process has the database open (the CLI refuses while a runner holds the lease). The
 * current file is backed up first, the backup is verified, and the swap is a rename.
 */
export function restoreDb(from: string, target = DB_PATH): { safetyCopy: string | null; check: ReturnType<typeof checkDb> } {
  if (!existsSync(from)) throw new Error(`no backup at ${from}`);
  const probe = new DatabaseSync(from, { readOnly: true });
  const check = checkDb(probe);
  probe.close();
  if (!check.ok) throw new Error(`${from} fails its integrity check (${check.integrity}, ${check.foreignKeyErrors} foreign-key errors): not restored`);
  if (check.schema > MIGRATIONS.length) throw new Error(`${from} has schema ${check.schema}, newer than this code (${MIGRATIONS.length})`);
  let safetyCopy: string | null = null;
  if (existsSync(target)) {
    const cur = new DatabaseSync(target);
    safetyCopy = backupFile(path.dirname(target), 'before-restore');
    mkdirSync(path.dirname(safetyCopy), { recursive: true });
    cur.exec(`VACUUM INTO '${safetyCopy.replace(/'/g, "''")}'`);
    cur.close();
  }
  const part = `${target}.restore-part`;
  copyFileSync(from, part);
  for (const ext of ['-wal', '-shm']) rmSync(`${target}${ext}`, { force: true });
  renameSync(part, target);
  return { safetyCopy, check };
}

export const now = () => new Date().toISOString();

/** Parse a JSON column (null-safe). */
export function json<T>(s: unknown, fallback: T): T {
  if (typeof s !== 'string' || !s) return fallback;
  return JSON.parse(s) as T;
}
