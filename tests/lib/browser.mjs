/**
 * Shared headless Edge/Chrome + CDP helpers (Node built-ins only, Node 22+).
 * Usage:
 *   const b = await launchBrowser();            // exits with code 2 if no browser found
 *   await b.addScript(src); await b.navigate(url);
 *   await b.eval('window.__mud.BRAND.title');   await b.close();
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PAGE_URL = pathToFileURL(path.join(here, '..', '..', 'index.html')).href;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function findBrowser() {
  const candidates = [
    process.env.BROWSER_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) || null;
}

/** Locate a browser or exit(2) before any scenario runs. */
export function requireBrowser() {
  const b = findBrowser();
  if (!b) { console.error('No Edge/Chrome found. Set BROWSER_PATH.'); process.exit(2); }
  return b;
}

export async function launchBrowser({ width = 1280, height = 800 } = {}) {
  const browser = requireBrowser();
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(path.join(tmpdir(), 'mud-lib-'));
  const proc = spawn(browser, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run',
    `--window-size=${width},${height}`, 'about:blank'
  ], { stdio: 'ignore' });

  const consoleErrors = [];
  let ws; let nextId = 1; const waiting = new Map();
  let closed = false;

  async function connect() {
    for (let i = 0; i < 60; i++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
        const page = list.find((t) => t.type === 'page');
        if (page) return page.webSocketDebuggerUrl;
      } catch { /* browser not ready */ }
      await sleep(250);
    }
    throw new Error('browser did not start');
  }

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = nextId++; waiting.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }

  async function close() {
    if (closed) return; closed = true;
    try { ws && ws.close(); } catch { /* ignore */ }
    try { proc.kill(); } catch { /* ignore */ }
    await sleep(400);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  try {
    ws = new WebSocket(await connect());
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && waiting.has(d.id)) { const w = waiting.get(d.id); waiting.delete(d.id); d.error ? w.reject(new Error(d.error.message)) : w.resolve(d.result); }
      else if (d.method === 'Runtime.exceptionThrown') consoleErrors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
      else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') consoleErrors.push(d.params.args.map((a) => a.value || a.description).join(' '));
    };
    await new Promise((r) => { ws.onopen = r; });
    await send('Runtime.enable'); await send('Page.enable');
  } catch (e) { await close(); throw e; }

  return {
    browser, port, profile, consoleErrors, send, eval: evaluate, close,
    addScript: (source) => send('Page.addScriptToEvaluateOnNewDocument', { source }),
    /** Navigate and wait until window.__mud exists (up to ~20s). Returns true if ready. */
    async navigate(url = PAGE_URL) {
      await send('Page.navigate', { url });
      for (let i = 0; i < 80; i++) {
        if (await evaluate(`typeof window.__mud === 'object'`).catch(() => false)) return true;
        await sleep(250);
      }
      return false;
    },
    setViewport: (width, height, mobile = false, deviceScaleFactor = 1) =>
      send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile })
  };
}
