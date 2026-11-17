/**
 * Runs a command and measures wall time plus memory of its whole process tree
 * (node + every Chrome process Remotion spawns). Linux-only: reads /proc.
 *
 * Memory is summed as PSS (proportional set size), which splits shared pages
 * between processes, so Chrome's many processes are not double-counted.
 *
 * Usage: node scripts/profile-render.ts <label> -- <command> [args...]
 * Writes a JSON summary to out/profile/<label>.json.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const SAMPLE_MS = 250;

function readMeminfoKb(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of readFileSync('/proc/meminfo', 'utf8').split('\n')) {
    const m = /^(\w+):\s+(\d+)/.exec(line);
    if (m && m[1] && m[2]) out[m[1]] = Number(m[2]);
  }
  return out;
}

function childrenMap(): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const entry of readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const stat = readFileSync(`/proc/${entry}/stat`, 'utf8');
      // Field 4 is ppid; the command name (field 2) may contain spaces, so split after ')'.
      const ppid = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1]);
      const list = map.get(ppid) ?? [];
      list.push(Number(entry));
      map.set(ppid, list);
    } catch {
      // process exited between readdir and read
    }
  }
  return map;
}

function treePssKb(root: number): { pssKb: number; processes: number } {
  const map = childrenMap();
  const stack = [root];
  let pssKb = 0;
  let processes = 0;
  while (stack.length > 0) {
    const pid = stack.pop()!;
    try {
      const rollup = readFileSync(`/proc/${pid}/smaps_rollup`, 'utf8');
      const m = /^Pss:\s+(\d+)/m.exec(rollup);
      if (m && m[1]) pssKb += Number(m[1]);
      processes++;
    } catch {
      // exited or not readable
    }
    stack.push(...(map.get(pid) ?? []));
  }
  return { pssKb, processes };
}

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const label = argv[0];
if (!label || sep !== 1 || argv.length < 3) {
  console.error('Usage: node scripts/profile-render.ts <label> -- <command> [args...]');
  process.exit(2);
}
const [cmd, ...args] = argv.slice(2) as [string, ...string[]];

const before = readMeminfoKb();
const swapUsedBefore = (before.SwapTotal ?? 0) - (before.SwapFree ?? 0);
let peakPssKb = 0;
let peakProcesses = 0;
let minAvailableKb = before.MemAvailable ?? 0;
let maxSwapUsedKb = swapUsedBefore;

const started = performance.now();
const child = spawn(cmd, args, { stdio: 'inherit' });

const timer = setInterval(() => {
  if (child.pid === undefined) return;
  const { pssKb, processes } = treePssKb(child.pid);
  peakPssKb = Math.max(peakPssKb, pssKb);
  peakProcesses = Math.max(peakProcesses, processes);
  const mem = readMeminfoKb();
  minAvailableKb = Math.min(minAvailableKb, mem.MemAvailable ?? minAvailableKb);
  maxSwapUsedKb = Math.max(maxSwapUsedKb, (mem.SwapTotal ?? 0) - (mem.SwapFree ?? 0));
}, SAMPLE_MS);

child.on('exit', (code) => {
  clearInterval(timer);
  const mb = (kb: number) => Math.round(kb / 1024);
  const summary = {
    label,
    command: [cmd, ...args].join(' '),
    exitCode: code,
    wallSeconds: Number(((performance.now() - started) / 1000).toFixed(1)),
    peakTreePssMb: mb(peakPssKb),
    peakProcesses,
    memAvailableBeforeMb: mb(before.MemAvailable ?? 0),
    memAvailableMinMb: mb(minAvailableKb),
    swapGrowthMb: mb(maxSwapUsedKb - swapUsedBefore),
    sampledEveryMs: SAMPLE_MS,
    at: new Date().toISOString(),
  };
  mkdirSync('out/profile', { recursive: true });
  writeFileSync(`out/profile/${label}.json`, JSON.stringify(summary, null, 2) + '\n');
  console.log('\nPROFILE ' + JSON.stringify(summary));
  process.exit(code ?? 1);
});
