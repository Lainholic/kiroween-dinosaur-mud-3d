/**
 * Viewport layout check (R15.4-15.7): header, intro node, longest room description, chips and input
 * must stay inside the viewport; #log and .terminal-panel must have 0px horizontal overflow.
 * Headless software rendering only; real display not checked.
 * Usage: node tests/verify-layout.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, sleep } from './lib/browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const FEATURE = '왼쪽 텍스트 잘림';
const VIEWPORTS = [[1920, 1080], [1280, 720]];
const cases = [];
let failed = 0;

const b = await launchBrowser();
// Headless pages can report visibilityState=hidden, which throttles the typewriter timers; emulate focus/visibility.
const keepVisible = async () => { await b.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {}); await b.send('Page.bringToFront').catch(() => {}); };
try {
  if (!(await b.navigate())) { console.error('page did not become ready'); process.exitCode = 1; }
  const browserName = b.browser;
  const env = (vp) => ({ browser: browserName, viewport: vp });
  for (const [w, h] of VIEWPORTS) {
    const vp = `${w}x${h}`;
    await b.setViewport(w, h);
    await b.navigate();
    await keepVisible();
    await b.eval(`(async () => { window.__mud.restartGame(); window.dispatchEvent(new Event('resize')); })()`);
    await sleep(1500);
    // Longest room description: print it via look in that room.
    await b.eval(`(async () => {
      const R = window.__mud.ROOMS; let best = null, len = -1;
      for (const k of Object.keys(R)) { const n = (R[k].name + R[k].desc).length; if (n > len) { len = n; best = k; } }
      window.__longKey = best;
      window.__mud.getState().room = best;
      window.__mud.executeCmd('look');
    })()`);
    // Typewriter queue: wait until the log is quiescent (no growth) AND the look echo plus a room header after it are printed.
    let lastLen = -1, stable = 0;
    for (let i = 0; i < 120 && stable < 4; i++) {
      await sleep(500);
      const st = await b.eval(`(() => { const ns = [...document.getElementById('log').children]; const li = ns.findIndex((n) => n.textContent.trim() === '> look'); const last = ns[ns.length - 1]; return { len: ns.reduce((a, n) => a + n.textContent.length, 0) + ns.length, ok: li >= 0 && ns.length - 1 > li && last.textContent.startsWith('== ') }; })()`);
      if (st.ok && st.len === lastLen) stable++; else stable = 0;
      lastLen = st.len;
    }
    const data = await b.eval(`(() => {
      const R = window.__mud.ROOMS[window.__longKey];
      const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const log = document.getElementById('log');
      const panel = document.querySelector('.terminal-panel');
      const pr = panel.getBoundingClientRect();
      const nodes = [...log.children];
      const roomNode = nodes.reverse().find((n) => n.textContent.includes(R.desc.slice(0, 20)));
      const firstNode = log.firstElementChild;
      const firstCharLeft = (n) => {
        if (!n) return null;
        const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
        const t = w.nextNode(); if (!t || !t.length) return null;
        const rg = document.createRange(); rg.setStart(t, 0); rg.setEnd(t, 1);
        return rg.getBoundingClientRect().left;
      };
      return {
        iw: innerWidth, ih: innerHeight, longKey: window.__longKey, panelLeft: pr.left, panelRight: pr.right,
        header: document.querySelector('header') ? rect(document.querySelector('header')) : null,
        brand: rect(document.getElementById('brand-header')),
        intro: firstNode ? rect(firstNode) : null,
        room: roomNode ? rect(roomNode) : null,
        introChar: firstCharLeft(firstNode), roomChar: firstCharLeft(roomNode),
        chips: [...document.querySelectorAll('.chip')].map((c) => ({ name: c.dataset.cmd || c.id || c.textContent.trim(), r: rect(c), vis: c.offsetParent !== null })),
        input: rect(document.getElementById('mud-input')),
        logOverflow: [log.scrollWidth, log.clientWidth],
        panelOverflow: [panel.scrollWidth, panel.clientWidth]
      };
    })()`);
    const record = (name, ok, detail) => {
      cases.push({ feature: FEATURE, name: `${vp} ${name}`, status: ok ? 'pass' : 'fail', detail, env: env(vp) });
      console.log(`${ok ? 'PASS' : 'FAIL'} [${vp}] ${name}${ok ? '' : ' :: ' + detail}`);
      if (!ok) failed++;
    };
    const fmt = (r) => `l=${r.l.toFixed(1)} t=${r.t.toFixed(1)} r=${r.r.toFixed(1)} b=${r.b.toFixed(1)} (viewport ${data.iw}x${data.ih})`;
    const inView = (name, r) => {
      if (!r) return record(name, false, 'element missing');
      const ok = r.l >= 0 && r.t >= 0 && r.r <= data.iw + 0.5 && r.b <= data.ih + 0.5;
      record(name, ok, fmt(r));
    };
    const logNode = (name, r, ch) => {
      if (!r) return record(name, false, 'log node missing');
      const ok = r.l >= 0 && r.r <= Math.min(data.iw, data.panelRight) + 0.5 && (ch === null || ch >= data.panelLeft - 0.5);
      record(name, ok, `${fmt(r)} firstCharLeft=${ch} panelLeft=${data.panelLeft.toFixed(1)} panelRight=${data.panelRight.toFixed(1)}`);
    };
    inView('header', data.header);
    inView('#brand-header', data.brand);
    logNode('intro first log node', data.intro, data.introChar);
    logNode(`longest room description (${data.longKey})`, data.room, data.roomChar);
    for (const c of data.chips) { if (c.vis) inView(`.chip ${c.name}`, c.r); }
    inView('#mud-input', data.input);
    record('#log scrollWidth<=clientWidth', data.logOverflow[0] <= data.logOverflow[1], `scrollWidth=${data.logOverflow[0]} clientWidth=${data.logOverflow[1]}`);
    record('.terminal-panel scrollWidth<=clientWidth', data.panelOverflow[0] <= data.panelOverflow[1], `scrollWidth=${data.panelOverflow[0]} clientWidth=${data.panelOverflow[1]}`);
  }
} finally {
  await b.close();
}
const out = {
  suite: 'layout',
  env: { browser: b.browser },
  note: 'headless software rendering only; real display not checked',
  cases
};
mkdirSync(path.join(here, '.results'), { recursive: true });
writeFileSync(path.join(here, '.results', 'layout.json'), JSON.stringify(out, null, 2));
console.log(`\n${cases.length - failed}/${cases.length} passed (headless software rendering only; real display not checked)`);
process.exit(failed || process.exitCode ? 1 : 0);
