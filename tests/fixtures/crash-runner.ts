/** Child process for the crash test: runs a job with fake stages and blocks in one stage until killed. */
import { openDb } from '../../src/orchestrator/db.ts';
import type { StageName } from '../../src/orchestrator/model.ts';
import { Runner } from '../../src/orchestrator/runner.ts';
import { acquireLease } from '../../src/orchestrator/store.ts';
import { fakeStages } from './fake-stages.ts';

const [file, jobId, stage, logRoot] = process.argv.slice(2);
const db = openDb(file!);
if (!acquireLease(db, `crash-test ${process.pid}`)) throw new Error('lease held');
await new Runner(db, fakeStages({ block: stage as StageName }), { logRoot: logRoot! }).runJob(jobId!);
