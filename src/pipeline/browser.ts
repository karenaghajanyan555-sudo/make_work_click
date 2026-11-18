/**
 * Read a web page as a person sees it: Remotion's bundled chrome-headless-shell, driven over the
 * DevTools protocol (Node's built-in WebSocket). For pages that render their text client-side
 * (pricing grids, help centres) where a raw HTML fetch sees nothing. Used by the affiliate
 * verifier (`npm run verify-affiliate`); never at render time.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './paths.ts';

/** The bundled headless Chrome binary (any platform folder under node_modules/.remotion). */
export function chromeBinary(): string {
  const dir = path.join(ROOT, 'node_modules/.remotion/chrome-headless-shell');
  const walk = (d: string, depth: number): string | null => {
    if (depth > 4 || !existsSync(d)) return null;
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) {
        const hit = walk(p, depth + 1);
        if (hit) return hit;
      } else if (f === 'chrome-headless-shell' || f === 'chrome-headless-shell.exe') return p;
    }
    return null;
  };
  const bin = walk(dir, 0);
  if (!bin) throw new Error('chrome-headless-shell not found: run npm run setup');
  return bin;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type PageReader = {
  /** The page's visible text after it has rendered; `click` = exact text of an element to click first. */
  text(url: string, opts?: { click?: string; settleMs?: number }): Promise<{ status: number | null; text: string }>;
  close(): Promise<void>;
};

export async function openPageReader(): Promise<PageReader> {
  const profile = mkdtempSync(path.join(os.tmpdir(), 'mwc-reader-'));
  const proc = spawn(chromeBinary(), ['--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,2400', 'about:blank'], { stdio: 'ignore' });
  let port = 0;
  for (let i = 0; i < 80 && !port; i++) {
    const f = path.join(profile, 'DevToolsActivePort');
    if (existsSync(f)) port = Number(readFileSync(f, 'utf8').split('\n')[0]);
    if (!port) await sleep(100);
  }
  if (!port) {
    proc.kill('SIGKILL');
    throw new Error('headless Chrome did not start');
  }
  const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as Array<{ type: string; webSocketDebuggerUrl: string }>;
  const ws = new WebSocket(targets.find((t) => t.type === 'page')!.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let seq = 0;
  const pending = new Map<number, (r: { result?: Record<string, unknown>; error?: { message: string } }) => void>();
  const listeners: Array<(method: string, params: Record<string, unknown>) => void> = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(String(m.data)) as { id?: number; method?: string; params?: Record<string, unknown>; result?: Record<string, unknown>; error?: { message: string } };
    if (d.id !== undefined) pending.get(d.id)?.(d), pending.delete(d.id);
    else if (d.method) for (const l of listeners) l(d.method, d.params ?? {});
  };
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const id = ++seq;
      pending.set(id, (r) => (r.error ? reject(new Error(`${method}: ${r.error.message}`)) : resolve(r.result ?? {})));
      ws.send(JSON.stringify({ id, method, params }));
    });
  await send('Page.enable');
  await send('Network.enable');

  return {
    async text(url, opts = {}) {
      let status: number | null = null;
      let loaded = false;
      const onEvent = (method: string, params: Record<string, unknown>) => {
        if (method === 'Network.responseReceived' && (params.type as string) === 'Document' && status === null) status = (params.response as { status: number }).status;
        if (method === 'Page.loadEventFired') loaded = true;
      };
      listeners.push(onEvent);
      try {
        await send('Page.navigate', { url });
        for (let i = 0; i < 300 && !loaded; i++) await sleep(100);
        await sleep(opts.settleMs ?? 4000);
        if (opts.click) {
          const expr = `(() => { const want = ${JSON.stringify(opts.click)}; const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === want); if (el) el.click(); return Boolean(el); })()`;
          const r = (await send('Runtime.evaluate', { expression: expr, returnByValue: true })) as { result?: { value?: boolean } };
          if (!r.result?.value) throw new Error(`nothing to click with the text "${opts.click}"`);
          await sleep(2500);
        }
        const r = (await send('Runtime.evaluate', { expression: 'document.body ? document.body.innerText : ""', returnByValue: true })) as { result?: { value?: string } };
        return { status, text: r.result?.value ?? '' };
      } finally {
        listeners.splice(listeners.indexOf(onEvent), 1);
      }
    },
    async close() {
      try {
        ws.close();
      } finally {
        proc.kill('SIGKILL');
        await sleep(200);
        rmSync(profile, { recursive: true, force: true });
      }
    },
  };
}
