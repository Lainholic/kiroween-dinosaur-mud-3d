/**
 * Reproduction check for bugs 1-4 (spec dinosaur-survival-mud-rebrand, task 4.1).
 * Read-only: runs the CURRENT index.html in headless Edge/Chrome via CDP with a FAKE fetch.
 * No real network, no API key (only the literal FAKE-TEST-KEY), Node built-ins only.
 *
 * "reproduced" = the bug/gap is still present in the current code (expected behavior NOT met).
 * Output: tests/.results/repro.json   Exit: 0 ok, 2 no browser / harness error.
 * Usage: node tests/repro-bugs.mjs   (optional BROWSER_PATH)
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(here, '..', 'index.html');
const pageUrl = pathToFileURL(htmlPath).href;
const outDir = path.join(here, '.results');
const outFile = path.join(outDir, 'repro.json');
mkdirSync(outDir, { recursive: true });
const source = readFileSync(htmlPath, 'utf8');

const candidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  writeFileSync(outFile, JSON.stringify({ browserFound: false, note: 'No Edge/Chrome found. Set BROWSER_PATH.', scenarios: [] }, null, 2));
  console.error('No Edge/Chrome found. Set BROWSER_PATH.');
  process.exit(2);
}

const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(path.join(tmpdir(), 'mud-repro-'));
const proc = spawn(browser, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--window-size=1280,800', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function rec(bug, name, input, expected, actual, ok) {
  const reproduced = !ok;
  results.push({ bug, name, input, expected, actual, reproduced });
  console.log(`  ${reproduced ? 'REPRODUCED' : 'not reproduced'}  [bug ${bug}] ${name}` + (reproduced ? '  actual=' + JSON.stringify(actual) : ''));
}

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

const consoleErrors = [];
let ws; let nextId = 1; const waiting = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++; waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

// Fake Gemini: each request is held until the test replies. Also records setTimeout delays set while a request starts.
const FAKE_FETCH = `
  window.__pending = []; window.__timeouts = [];
  const __st = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...a) => { window.__timeouts.push(ms); return __st(fn, ms, ...a); };
  window.__rejectNext = false;
  window.fetch = (url, opts) => new Promise((resolve, reject) => {
    if (window.__rejectNext) { reject(new Error('network down (fake)')); return; }
    const body = JSON.parse(opts.body);
    const sys = body.system_instruction.parts[0].text;
    window.__pending.push({ id: window.__pending.length, kind: sys.indexOf('AI narrator') >= 0 ? 'narr' : 'world', resolve, reject });
  });
  const wrap = (text) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });
  window.__replyText = (id, text) => window.__pending[id].resolve(wrap(text));
  window.__replyWorld = (id, narrative, color) => window.__replyText(id, JSON.stringify({ narrativeText: narrative, scene3D: { characterAnimation: 'CAST', lightColor: color || '#ff0000', lightIntensity: 3, fogDensity: 0.1, cameraShake: true } }));
  window.__fail = (id) => window.__pending[id].resolve({ ok: false, status: 500, json: async () => ({}) });
`;

const M = 'window.__mud';
const rngDefault = `${M}.setRng((lo, hi) => (window.__rv && window.__rv[lo + ',' + hi] !== undefined) ? window.__rv[lo + ',' + hi] : lo)`;
async function fresh(withKey) {
  await ev(`localStorage.${withKey ? "setItem('GEMINI_API_KEY','FAKE-TEST-KEY')" : "removeItem('GEMINI_API_KEY')"}; window.__pending = []; window.__rv = {}; ${rngDefault}; ${M}.restartGame(); true`);
}
const st = () => ev(`JSON.parse(JSON.stringify(${M}.getState()))`);
const fx = () => ev(`JSON.parse(JSON.stringify(${M}.scene3D()))`);
const tr = () => ev(`${M}.transcript.slice()`);
const cmd = (c) => ev(`${M}.executeCmd(${JSON.stringify(c)}); true`);
const joined = async () => (await tr()).join('\n');
const count = async (needle) => (await joined()).split(needle).length - 1;
const rv = (o) => ev(`window.__rv = ${JSON.stringify(o)}`);
const worldIdx = () => ev(`window.__pending.map((p, i) => p.kind === 'world' ? i : -1).filter(i => i >= 0)`);
const clearLobby = async () => { await rv({ '20,35': 35, '8,17': 8 }); await cmd('shoot'); await cmd('shoot'); };

async function main() {
  ws = new WebSocket(await connect());
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && waiting.has(d.id)) { const w = waiting.get(d.id); waiting.delete(d.id); d.error ? w.reject(new Error(d.error.message)) : w.resolve(d.result); }
    else if (d.method === 'Runtime.exceptionThrown') consoleErrors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') consoleErrors.push(d.params.args.map((a) => a.value || a.description).join(' '));
  };
  await new Promise((r) => { ws.onopen = r; });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: FAKE_FETCH });
  await send('Page.navigate', { url: pageUrl });
  for (let i = 0; i < 80; i++) { if (await ev(`typeof window.__mud === 'object'`).catch(() => false)) break; await sleep(250); }
  if (!(await ev(`typeof window.__mud === 'object'`))) throw new Error('test hook window.__mud missing');

  // ---------------- Bug 1: taser stun ----------------
  console.log('\n[Bug 1] Taser stun');
  const SHOCK = { '14,21': 14, '8,17': 10 };
  await fresh(false); await rv(SHOCK);
  await cmd('shock'); let s = await st(); let f = await fx();
  rec(1, 'surviving shock stuns: no counter, stunRecovery true', 'fresh; shock (dmg 14, counter would be 10)', 'hp 100, raptorHp 31, taser 2, stunRecovery true, raptorMode stun',
    { hp: s.hp, raptorHp: s.raptorHp, taser: s.taserCharges, stunRecovery: s.stunRecovery, mode: f.raptorMode },
    s.hp === 100 && s.raptorHp === 31 && s.taserCharges === 2 && s.stunRecovery === true && f.raptorMode === 'stun');
  rec(1, 'stun log line printed exactly once', 'shock', '1 line "Stunned by the voltage"', { lines: await count('Stunned by the voltage') }, (await count('Stunned by the voltage')) === 1);
  await cmd('shock'); s = await st();
  rec(1, 'next action is normal with counter; shock during recovery does not stun', 'shock, shock', 'hp 90, raptorHp 17, stunRecovery false',
    { hp: s.hp, raptorHp: s.raptorHp, stunRecovery: s.stunRecovery }, s.hp === 90 && s.raptorHp === 17 && s.stunRecovery === false);
  await cmd('shock'); await cmd('shock'); const sE = await st(); const msgBefore = await count('The taser is out of charges.');
  await cmd('shock'); const sE2 = await st();
  const msgAfter = await count('The taser is out of charges.');
  rec(1, 'empty taser: state unchanged and exactly one fail message', 'drain 3 charges then shock', 'state identical, +1 fail message',
    { unchanged: JSON.stringify(sE) === JSON.stringify(sE2), newMessages: msgAfter - msgBefore }, JSON.stringify(sE) === JSON.stringify(sE2) && msgAfter - msgBefore === 1);

  await fresh(false); await rv({ '20,35': 35, '14,21': 21, '8,17': 10 });
  await cmd('shoot'); const hpMid = (await st()).hp; await cmd('shock'); s = await st();
  rec(1, 'lethal shock: no stun, no counter', 'shoot (45->10), shock 21', 'raptorsAlive false, stunRecovery false, hp unchanged by shock',
    { alive: s.raptorsAlive, stunRecovery: s.stunRecovery, hpBefore: hpMid, hpAfter: s.hp }, s.raptorsAlive === false && s.stunRecovery === false && s.hp === hpMid);

  await fresh(false); await rv(SHOCK);
  await cmd('shock'); await cmd('restart'); s = await st();
  rec(1, 'restart resets stunRecovery', 'shock; restart', 'stunRecovery false', { stunRecovery: s.stunRecovery }, s.stunRecovery === false);
  await fresh(false); await rv(SHOCK);
  await cmd('shock'); await ev(`${M}.getState().hp = 5`); await cmd('north'); s = await st();
  const overRecovery = s.stunRecovery;
  await cmd('restart'); const sR = await st();
  rec(1, 'game over then restart resets stunRecovery', 'shock; hp=5; north (killed in lobby exit); restart', 'over true, then stunRecovery false after restart',
    { over: s.over, stunRecoveryAtGameOver: overRecovery, stunRecoveryAfterRestart: sR.stunRecovery }, s.over === true && overRecovery === false && sR.stunRecovery === false);
  const m = source.match(/const STUN_SECONDS\s*=\s*([0-9.]+)/);
  const stunSec = m ? parseFloat(m[1]) : null;
  rec(1, 'STUN_SECONDS within 1.0-1.4', 'static read of index.html', '1.0 <= STUN_SECONDS <= 1.4', { STUN_SECONDS: stunSec }, stunSec >= 1.0 && stunSec <= 1.4);

  // ---------------- Bug 2: stale AI replies ----------------
  console.log('\n[Bug 2] Stale AI replies');
  await fresh(true); await clearLobby();
  await cmd('dance wildly'); const wi = (await worldIdx())[0];
  await cmd('east');
  const before = await fx();
  await ev(`window.__replyWorld(${wi}, 'STALE-LOBBY-NARRATIVE', '#ff0000')`); await sleep(80);
  const after = await fx();
  rec(2, 'lobby free-text reply resolved in lab: no narration', 'clear pack; "dance wildly"; east (lab); resolve lobby reply', 'text absent from transcript', { present: (await joined()).includes('STALE-LOBBY-NARRATIVE') }, !(await joined()).includes('STALE-LOBBY-NARRATIVE'));
  rec(2, 'stale reply leaves light/fog/intensity/anim unchanged', 'same', 'hudLight, anim, fog, intensity identical',
    { before: [before.hudLight, before.currentAnim, before.targetFogDensity, before.targetLightIntensity], after: [after.hudLight, after.currentAnim, after.targetFogDensity, after.targetLightIntensity] },
    before.hudLight === after.hudLight && before.currentAnim === after.currentAnim && before.targetFogDensity === after.targetFogDensity && before.targetLightIntensity === after.targetLightIntensity);

  await fresh(true); await cmd('dance'); const ri = (await worldIdx())[0]; await cmd('restart');
  await ev(`window.__replyWorld(${ri}, 'STALE-BEFORE-RESTART')`); await sleep(80);
  rec(2, 'reply after restart discarded', '"dance"; restart; resolve', 'text absent', { present: (await joined()).includes('STALE-BEFORE-RESTART') }, !(await joined()).includes('STALE-BEFORE-RESTART'));

  await fresh(true); await ev(`${M}.getState().hp = 5`); await rv({ '8,17': 17 });
  await cmd('dance'); const gi = (await worldIdx())[0]; await cmd('north'); s = await st();
  await ev(`window.__replyWorld(${gi}, 'STALE-AFTER-GAMEOVER')`); await sleep(80);
  rec(2, 'reply after game over discarded', 'hp=5; "dance"; north (dies); resolve', 'over true, text absent', { over: s.over, present: (await joined()).includes('STALE-AFTER-GAMEOVER') }, s.over === true && !(await joined()).includes('STALE-AFTER-GAMEOVER'));

  await fresh(true); await clearLobby(); await cmd('east'); await cmd('take card'); await cmd('west'); await cmd('north');
  await cmd('dance'); const vi = (await worldIdx())[0]; await cmd('restore power'); s = await st();
  await ev(`window.__replyWorld(${vi}, 'STALE-AFTER-WIN')`); await sleep(80);
  rec(2, 'reply after win discarded', 'win via control room; resolve earlier reply', 'won true, text absent', { won: s.won, present: (await joined()).includes('STALE-AFTER-WIN') }, s.won === true && !(await joined()).includes('STALE-AFTER-WIN'));

  await fresh(true); await cmd('dance'); await cmd('sing'); const ro = await worldIdx();
  await ev(`window.__replyWorld(${ro[1]}, 'NEWER-REPLY', '#00ffcc')`); await sleep(80);
  await ev(`window.__replyWorld(${ro[0]}, 'OLDER-REPLY', '#ff0000')`); await sleep(80);
  let t = await joined();
  rec(2, 'reverse-order replies: only newer applied', 'two requests; resolve newer then older', 'NEWER present, OLDER absent', { newer: t.includes('NEWER-REPLY'), older: t.includes('OLDER-REPLY') }, t.includes('NEWER-REPLY') && !t.includes('OLDER-REPLY'));

  const ctxBody = (source.match(/function captureAiContext\(kind\)\s*\{([^}]*)\}/) || [, ''])[1];
  rec(2, 'context token includes request sequence (R8.1)', 'static read of captureAiContext()', 'token contains a request seq field', { captureAiContextBody: ctxBody.trim(), staleChecks: 'shouldApplyAiReply(ctx,currentAiView()) incl. seq>=aiAppliedSeq (free text) + seq!==narrationSeq (rooms)' }, /seq/i.test(ctxBody));

  // ---------------- Bug 3: base text first ----------------
  console.log('\n[Bug 3] Base text before AI');
  await fresh(true); await cmd('look');
  t = await joined(); const pend = await ev(`window.__pending.length`);
  const i0 = t.lastIndexOf('== VISITOR CENTER LOBBY ==');
  rec(3, 'key set, fetch pending: room text, THREAT, Exits already shown', 'key; look; no reply yet', 'base text present, 1 pending request', { pending: pend, room: i0 >= 0, threat: t.includes('THREAT:'), exits: t.includes('Exits:') }, pend === 1 && i0 >= 0 && t.includes('THREAT:') && t.includes('Exits:'));
  await ev(`window.__replyText(0, 'AI-APPENDED-TEXT. It is dark.')`); await sleep(80);
  t = await joined();
  rec(3, 'AI text appended after base text', 'resolve narration', 'AI index > base room index', { baseIdx: t.lastIndexOf('Exits:'), aiIdx: t.indexOf('AI-APPENDED-TEXT') }, t.indexOf('AI-APPENDED-TEXT') > t.lastIndexOf('Exits:'));
  await fresh(true); await cmd('look'); await ev(`window.__fail(0)`); await sleep(80);
  t = await joined();
  rec(3, 'AI failure (HTTP 500) keeps base text', 'look; 500', 'base text intact, no AI text', { exits: t.includes('Exits:'), threat: t.includes('THREAT:') }, t.includes('Exits:') && t.includes('THREAT:'));
  await fresh(false); await cmd('look'); await cmd('dance'); await cmd('east');
  rec(3, 'no key: zero fetch calls', 'no key; look; dance; east', '0 pending/fetch calls', { calls: await ev(`window.__pending.length`) }, (await ev(`window.__pending.length`)) === 0);

  // ---------------- Bug 4: timeout, never-reject, console.error, cap ----------------
  console.log('\n[Bug 4] Timeout / robustness');
  const tm = source.match(/const GEMINI_TIMEOUT_MS\s*=\s*(\d+)/);
  const timeoutMs = tm ? parseInt(tm[1], 10) : null;
  await fresh(true); await ev(`window.__timeouts = []`); await cmd('look');
  const delays = await ev(`window.__timeouts.slice()`);
  rec(4, 'GEMINI_TIMEOUT_MS equals 10000', 'static read + observed setTimeout delays during look', 'timeout 10000', { GEMINI_TIMEOUT_MS: timeoutMs, observedDelays: delays }, timeoutMs === 10000 && delays.includes(10000));

  await fresh(true); await ev(`window.__rejectNext = true`);
  const settled = await ev(`${M}.callGeminiWorldEngine('x').then(v => ({ resolved: true, value: v }), e => ({ resolved: false, err: String(e) }))`);
  await ev(`window.__rejectNext = false`);
  rec(4, 'AI call never rejects (fetch throws)', 'fetch rejects; callGeminiWorldEngine("x")', 'resolves to null', settled, settled.resolved === true && settled.value === null);
  const geminiGenBody = (source.match(/async function geminiGenerate[\s\S]*?\n    \}\n/) || [''])[0];
  const errUses = [...source.matchAll(/console\.error\([^)]*\)/g)].map((x) => x[0]);
  rec(4, 'AI path does not use console.error (warn only)', 'static read of geminiGenerate; transcript failure scenarios', 'no console.error in AI path; 0 console errors at runtime',
    { geminiGenerateUsesConsoleError: /console\.error/.test(geminiGenBody), allConsoleErrorUsesInFile: errUses, runtimeConsoleErrors: consoleErrors.length }, !/console\.error/.test(geminiGenBody) && consoleErrors.length === 0);

  const longOk = 'The wind howls. '.repeat(100); // 1600 chars
  const longBad = 'The wind howls. '.repeat(140); // 2240 chars
  const r1 = await ev(`${M}.sanitizeNarration(${JSON.stringify(longOk)}).length`);
  const r2 = await ev(`${M}.sanitizeNarration(${JSON.stringify(longBad)}).length`);
  const r3 = await ev(`${M}.sanitizeNarration('   ').length`);
  rec(4, 'sanitizeNarration length rule: <=2000 kept whole, >2000 -> empty', '1600-char text, 2240-char text, whitespace', '1600 kept (len 1600), 2240 -> 0, blank -> 0',
    { len1600: r1, len2240: r2, lenBlank: r3, currentCap: 420 }, r1 === longOk.trim().length && r2 === 0 && r3 === 0);

  rec(0, 'console health during all scenarios', 'whole run', '0 console errors', { errors: consoleErrors.slice(0, 5) }, consoleErrors.length === 0);
}

let code = 0;
try { await main(); } catch (e) { console.error('HARNESS ERROR:', e.message); code = 2; results.push({ bug: 0, name: 'harness', input: '', expected: 'run completes', actual: e.message, reproduced: null }); }
try { ws && ws.close(); } catch { /* ignore */ }
proc.kill();
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* profile may be locked briefly */ }
const summary = {};
for (const r of results) { const k = 'bug' + r.bug; summary[k] = summary[k] || { reproduced: 0, notReproduced: 0 }; if (r.reproduced === true) summary[k].reproduced++; else summary[k].notReproduced++; }
writeFileSync(outFile, JSON.stringify({ browserFound: true, browser: path.basename(browser), generatedBy: 'tests/repro-bugs.mjs', summary, scenarios: results }, null, 2));
console.log('\nWrote ' + outFile);
console.log(JSON.stringify(summary));
process.exit(code);
