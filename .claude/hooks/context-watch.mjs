#!/usr/bin/env node
// Context watch — hooks UserPromptSubmit, PostToolUse, PreCompact (.claude/settings.json).
//
// Reads the main session transcript's most recent API usage: input + cache_creation + cache_read
// tokens = the context Claude processed on its last call (the formula the status line documents
// for context_window.used_percentage). Hook input carries no token counts, so the transcript is
// the source; it is written asynchronously and can lag by one call.
//
// Below MWC_CONTEXT_SOFT: silent. At SOFT and at HARD: one short notice per level per session
// (state in the OS temp dir; reset when the context drops below SOFT, e.g. after compaction).
// PreCompact: tells the compaction summary what must survive. Subagent calls are ignored.
// Read-only apart from the state file; never blocks (always exit 0).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SOFT = Number(process.env.MWC_CONTEXT_SOFT ?? 200_000);
const HARD = Number(process.env.MWC_CONTEXT_HARD ?? 350_000);

/** Context tokens of the last main-session API call in a JSONL transcript, or null. */
export function lastContext(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    for (let chunk = 512 * 1024; ; chunk *= 4) {
      const start = Math.max(0, size - chunk);
      const buf = Buffer.alloc(size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      const lines = buf.toString('utf8').split('\n');
      if (start > 0) lines.shift(); // first line may be cut
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line.includes('"usage"')) continue;
        let e;
        try { e = JSON.parse(line); } catch { continue; }
        const u = e?.message?.usage;
        if (e.type !== 'assistant' || e.isSidechain || !u) continue;
        const total = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
        if (total > 0) return total; // zero = a synthetic entry (error, interruption): look further back
      }
      if (start === 0 || chunk >= 32 * 1024 * 1024) return null;
    }
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function main() {
  let input;
  try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { return; }
  if (input.agent_id) return; // a subagent's tool call: not the main context
  const event = input.hook_event_name;

  if (event === 'PreCompact') {
    process.stdout.write(
      'MAKE WORK CLICK compaction: keep (1) unfinished work: the task, what is done, what remains, ' +
      'files edited and not yet verified; (2) the exact next action; (3) decisions and owner ' +
      'approvals from this session; (4) verification state (tests, QA, measurements) with numbers. ' +
      'The durable record is docs/SESSION-HANDOFF.md: run skill mwc-handoff if it is stale.\n',
    );
    return;
  }

  const tokens = input.transcript_path ? lastContext(input.transcript_path) : null;
  if (tokens === null) return;
  const dir = path.join(os.tmpdir(), 'mwc-context-watch');
  const stateFile = path.join(dir, `${String(input.session_id ?? 'unknown').replace(/[^\w-]/g, '')}.json`);
  let warned = [];
  try { warned = JSON.parse(fs.readFileSync(stateFile, 'utf8')).warned ?? []; } catch {}

  if (tokens < SOFT) {
    if (warned.length) fs.rmSync(stateFile, { force: true }); // context shrank: re-arm
    return;
  }
  const level = tokens >= HARD ? 'hard' : 'soft';
  if (warned.includes(level)) return;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify({ warned: [...warned, level], tokens }));

  const k = Math.round(tokens / 1000);
  const advice = level === 'hard'
    ? `Context ${k}k tokens (hard limit ${HARD / 1000}k). Finish only the current atomic step, run skill ` +
      'mwc-handoff now, then stop and ask the owner to start a fresh session with "Continue MAKE WORK CLICK".'
    : `Context ${k}k tokens (soft limit ${SOFT / 1000}k). Do not start a new large subtask here. At the next ` +
      'natural break run skill mwc-handoff and suggest a fresh session ("Continue MAKE WORK CLICK").';
  process.stdout.write(JSON.stringify({
    systemMessage: `Context ${k}k tokens: handoff ${level === 'hard' ? 'now' : 'at the next break'} (skill mwc-handoff).`,
    hookSpecificOutput: { hookEventName: event, additionalContext: advice },
  }));
}

main();
