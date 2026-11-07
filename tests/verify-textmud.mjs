/**
 * Automated browser verification for Dinosaur Survival MUD 3D.
 *
 * Runs index.html in headless Edge/Chrome through the DevTools protocol (no npm dependencies, Node 22+).
 * All AI traffic here is a FAKE fetch: it proves the game logic and ordering rules only.
 * It does NOT prove that the real Gemini API works. Use tests/verify-live-gemini.mjs for that.
 *
 * Usage: node tests/verify-textmud.mjs
 * Optional: BROWSER_PATH=<path to msedge.exe / chrome.exe>
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(path.join(here, '..', 'index.html')).href;
const candidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) { console.error('No Edge/Chrome found. Set BROWSER_PATH.'); process.exit(2); }

const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(path.join(tmpdir(), 'mud-verify-'));
const proc = spawn(browser, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-first-run', '--window-size=1280,800', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
const failures = [];
const cases = [];
let feature = null; // Korean feature name recorded with each case in tests/.results/textmud.json
function check(name, cond, detail, expected) {
  const ok = !!cond;
  let d = '';
  try { d = detail === undefined ? '' : JSON.stringify(detail); } catch { d = String(detail); }
  if (!ok && expected !== undefined) d = 'expected ' + JSON.stringify(expected) + ' actual ' + d;
  cases.push({ feature, name, status: ok ? 'pass' : 'fail', detail: d.slice(0, 500) });
  if (ok) { passed++; console.log('  PASS ' + name); }
  else { failures.push(name); console.log('  FAIL [' + (feature || '-') + '] ' + name + (d ? '  -> ' + d : '')); }
}
function writeResults() {
  try {
    const out = path.join(here, '.results', 'textmud.json');
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({ suite: 'textmud', env: { browser: path.basename(browser || ''), viewport: '1280x800' }, cases }, null, 2));
  } catch (e) { console.error('could not write results:', e.message); }
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

// Fake Gemini: every request is held until the test replies, so ordering can be controlled.
const FAKE_FETCH = `
  window.__pending = [];
  window.fetch = (url, opts) => new Promise((resolve, reject) => {
    const body = JSON.parse(opts.body);
    const sys = body.system_instruction.parts[0].text;
    const p = { id: window.__pending.length, kind: sys.indexOf('AI narrator') >= 0 ? 'narr' : 'world', resolve, reject, key: opts.headers['x-goog-api-key'] };
    window.__pending.push(p);
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
const settle = (ms = 60) => sleep(ms);
const joined = async () => (await tr()).join('\n');

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
  check('page booted (Three.js loaded, test hook present)', await ev(`typeof window.__mud === 'object' && typeof THREE === 'object'`));

  // ---------------- 1. Taser stun and combat regression ----------------
  console.log('\n[1] Taser stun and combat');
  feature = '테이저와 스턴';
  await fresh(false);
  let s = await st();
  check('fresh state: 100 HP, 3 shells, 2 flares, 3 taser charges, no recovery', s.hp === 100 && s.shells === 3 && s.flares === 2 && s.taserCharges === 3 && s.stunRecovery === false, s);

  await ev(`window.__rv = {'14,21': 14, '8,17': 10}`);
  await cmd('shock'); s = await st();
  check('shock 1: pack 45->31, no counter-attack, HP 100, charges 2, stun recovery set', s.raptorHp === 31 && s.hp === 100 && s.taserCharges === 2 && s.stunRecovery === true, s);
  check('shock 1: raptor stun animation active', (await fx()).raptorMode === 'stun');
  check('shock 1: log says stunned', (await joined()).includes('Stunned by the voltage'));

  await cmd('shock'); s = await st();
  check('shock 2 (recovery): damage applies, pack 31->17, counter-attack 10, HP 90, no stun', s.raptorHp === 17 && s.hp === 90 && s.taserCharges === 1 && s.stunRecovery === false, s);
  check('shock 2: raptors lunge, not stun', (await fx()).raptorMode === 'lunge');

  await cmd('shock'); s = await st();
  check('shock 3: stun again, pack 17->3, HP stays 90, charges 0', s.raptorHp === 3 && s.hp === 90 && s.taserCharges === 0 && s.stunRecovery === true, s);

  await cmd('shock'); const s4 = await st();
  check('shock 4 on empty taser: nothing changes (no damage, no counter, no recovery change)', JSON.stringify(s4) === JSON.stringify(s), s4);
  check('empty taser message shown', (await joined()).includes('The taser is out of charges.'));
  check('badge shows TASER 0', (await ev(`document.getElementById('ammo-badge').textContent`)).includes('TASER 0'));
  await cmd('status'); check('status reports taser charges', (await joined()).includes('Taser charges 0'));
  await cmd('inventory'); check('inventory reports taser charges', (await joined()).includes('Cattle Prod Taser (0 charges)'));

  // flare clears recovery and blinds without counter
  await fresh(false);
  await ev(`window.__rv = {'14,21': 14, '8,17': 10}`);
  await cmd('shock'); await cmd('flare'); s = await st();
  check('shock then flare: flare blinds (no counter), recovery cleared, flares 1, HP 100', s.hp === 100 && s.flares === 1 && s.stunRecovery === false && s.raptorHp === 31, s);
  await cmd('shock'); s = await st();
  check('shock after flare stuns again (no counter)', s.hp === 100 && s.stunRecovery === true && s.raptorHp === 17, s);
  // shotgun after stun is a normal turn with counter-attack
  await ev(`window.__rv = {'20,35': 20, '8,17': 10}`);
  await cmd('shoot'); s = await st();
  check('shoot after stun: pack 17->0 lethal, no counter', s.raptorHp === 0 && s.raptorsAlive === false && s.hp === 100 && s.shells === 2 && s.stunRecovery === false, s);

  // shotgun non-lethal still counters; blast alias; ammo exhaustion
  await fresh(false);
  await ev(`window.__rv = {'20,35': 20, '8,17': 9}`);
  await cmd('blast'); s = await st();
  check('blast alias: shell used, counter-attack 9, no stun', s.shells === 2 && s.hp === 91 && s.raptorHp === 25 && s.stunRecovery === false, s);
  await fresh(false);
  await ev(`window.__mud.getState().raptorHp = 1000; window.__rv = {'20,35': 20, '8,17': 1}`);
  await cmd('shoot'); await cmd('shoot'); await cmd('shoot'); await cmd('shoot'); s = await st();
  check('shotgun: 3 shells then *click* (no 4th effect)', s.shells === 0 && (await joined()).includes('*click*'), s);
  // lethal shock
  await fresh(false);
  await ev(`window.__rv = {'20,35': 35, '14,21': 21, '8,17': 10}`);
  await cmd('shoot'); await cmd('shock'); s = await st(); // 45-35=10, shock 21 kills
  check('lethal shock: pack dead, no stun, no counter, HP 90', s.raptorsAlive === false && s.stunRecovery === false && s.hp === 90, s);
  await cmd('flare'); check('flare after pack dead: nothing to use it on, flare not consumed', (await st()).flares === 2);

  // game over and restart
  await fresh(false);
  await ev(`window.__mud.getState().hp = 10; window.__rv = {'14,21': 14, '8,17': 17}`);
  await cmd('shock'); await cmd('shock'); s = await st();  // second shock: counter 17 kills
  check('game over: HP 0, over=true', s.hp === 0 && s.over === true, s);
  const before = JSON.stringify(await st());
  await cmd('shock'); await cmd('shoot'); await cmd('north');
  check('after game over, combat/move commands are blocked', JSON.stringify(await st()) === before);
  await cmd('restart'); s = await st();
  check('restart: full reset (HP, ammo, taser, recovery, room, raptors, flags)', s.hp === 100 && s.shells === 3 && s.flares === 2 && s.taserCharges === 3 && s.stunRecovery === false && s.room === 'lobby' && s.raptorsAlive && s.raptorHp === 45 && !s.over && !s.won && !s.hasCard, s);
  check('restart: badge shows TASER 3 and HP 100', (await ev(`document.getElementById('ammo-badge').textContent + '|' + document.getElementById('player-hp-badge').textContent`)).includes('TASER 3') );

  // ---------------- 2. Room graph, card, victories ----------------
  console.log('\n[2] Rooms, card, victory paths');
  feature = '방 이동';
  await fresh(false);
  await ev(`window.__rv = {'20,35': 35, '8,17': 8}`);
  await cmd('shoot'); await cmd('shoot'); // kill pack (35 + 35 >= 45)
  s = await st(); check('pack cleared with two shells', s.raptorsAlive === false && s.shells === 1, s);
  const expectRoom = async (c, room, name) => {
    await cmd(c); const r = (await st()).room; const g = (await fx()).groups;
    check(`${name}: "${c}" -> ${room}, only that 3D group visible`, r === room && Object.entries(g).every(([k, v]) => v === (k === room)), { r, g });
  };
  await expectRoom('north', 'control', 'lobby->control');
  await expectRoom('east', 'generator', 'control->generator');
  await cmd('restore power'); check('generator without card: access denied, not won', !(await st()).won && (await joined()).includes('ACCESS DENIED'));
  await expectRoom('west', 'control', 'generator->control (return)');
  await expectRoom('south', 'lobby', 'control->lobby (return)');
  await expectRoom('east', 'lab', 'lobby->lab');
  await cmd('take card'); check('card taken in lab', (await st()).hasCard === true);
  check('badge shows CARD', (await ev(`document.getElementById('ammo-badge').textContent`)).includes('CARD'));
  await expectRoom('west', 'lobby', 'lab->lobby (return)');
  await expectRoom('west', 'pen', 'lobby->pen');
  await expectRoom('east', 'lobby', 'pen->lobby (return)');
  await cmd('west'); await cmd('west'); check('pen has no further exits (west blocked)', (await st()).room === 'pen');
  await cmd('east');
  await cmd('north'); await cmd('east');
  await cmd('restore power'); s = await st();
  check('victory path B: restore power at generator with card', s.won === true && s.room === 'generator', s);
  await cmd('restart');
  await cmd('take card'); // not in lab
  check('take card outside the lab is refused', (await st()).hasCard === false);
  await ev(`window.__rv = {'20,35': 35, '8,17': 8}`);
  await cmd('shoot'); await cmd('shoot'); await cmd('east'); await cmd('take card'); await cmd('west'); await cmd('north');
  await cmd('restore power'); s = await st();
  check('victory path A: restore power at control room with card (existing path preserved)', s.won === true && s.room === 'control', s);
  await cmd('north'); check('after victory movement is blocked until restart', (await st()).room === 'control');
  await fresh(false);
  await cmd('north'); s = await st();
  check('leaving lobby with live pack costs 8-17 HP', s.hp < 100 && s.hp >= 83, s);

  // ---------------- 3. AI: base info first, stale replies ----------------
  console.log('\n[3] AI responses (fake fetch)');
  feature = null;
  await fresh(true);
  await cmd('look');
  let t = await joined();
  let pend = await ev(`window.__pending.length`);
  check('key set: look prints description, threat and exits BEFORE any AI reply', pend === 1 && t.includes('== VISITOR CENTER LOBBY ==') && t.includes('THREAT:') && t.includes('Exits: NORTH to MAIN CONTROL ROOM'), { pend });
  check('fake key header was used for the (fake) request, nothing real was sent', await ev(`window.__pending[0].key === 'FAKE-TEST-KEY'`));
  await ev(`window.__replyText(0, 'A cold wind whistles through the shattered glass. Something clicks in the dark.')`); await settle();
  check('AI narration is appended after base info', (await joined()).includes('A cold wind whistles'));

  // failure keeps base info
  await fresh(true); await cmd('look');
  await ev(`window.__fail(0)`); await settle();
  t = await joined();
  check('AI HTTP failure: base info remains, controls still work', t.includes('Exits:') && (await cmd('status'), (await joined()).includes('STATUS:')));
  // delay (never answered) keeps controls working
  await fresh(true); await cmd('look'); await cmd('inventory');
  check('AI never answers: inventory still instant', (await joined()).includes('INVENTORY:') && (await joined()).includes('Exits:'));

  // stale free-text across room change
  await fresh(true);
  await ev(`window.__rv = {'20,35': 35, '8,17': 8}`);
  await cmd('shoot'); await cmd('shoot'); // make the lobby safe for the test
  await cmd('dance wildly'); // request id 0 (world)
  const wi = await ev(`window.__pending.findIndex(p => p.kind === 'world')`);
  await cmd('east'); // lab; its look also sends a narration request
  await ev(`window.__replyWorld(${wi}, 'STALE-LOBBY-NARRATIVE', '#ff0000')`); await settle();
  check('late lobby reply is NOT narrated in the lab', !(await joined()).includes('STALE-LOBBY-NARRATIVE'));
  const f = await fx();
  check('late lobby reply did NOT change lab light/fog/camera', f.hudLight === '#00ff88' && f.currentAnim !== 'CAST' && f.targetLightIntensity === 2.2 && f.targetFogDensity === 0.05, f);

  // stale narration across room change (look in lobby, then move)
  await fresh(true);
  await ev(`window.__rv = {'20,35': 35}`); await cmd('shoot'); await cmd('shoot');
  await cmd('look');
  const li = await ev(`window.__pending.length - 1`);
  await cmd('north');
  await ev(`window.__replyText(${li}, 'STALE-LOOK-STORY')`); await settle();
  check('late "look" narration from the previous room is dropped', !(await joined()).includes('STALE-LOOK-STORY'));
  // the new room's own narration still lands
  const ni = await ev(`window.__pending.length - 1`);
  await ev(`window.__replyText(${ni}, 'FRESH-CONTROL-STORY')`); await settle();
  check('current room narration still applies', (await joined()).includes('FRESH-CONTROL-STORY'));

  // restart drops in-flight replies
  await fresh(true);
  await cmd('dance'); const ri = await ev(`window.__pending.findIndex(p => p.kind === 'world')`);
  await cmd('restart');
  await ev(`window.__replyWorld(${ri}, 'STALE-BEFORE-RESTART', '#ff0000')`); await settle();
  check('reply requested before restart is dropped', !(await joined()).includes('STALE-BEFORE-RESTART') && (await fx()).hudLight === '#ff6a00');

  // game over drops in-flight replies
  await fresh(true);
  await ev(`window.__mud.getState().hp = 5; window.__rv = {'8,17': 17}`);
  await cmd('dance'); const gi = await ev(`window.__pending.findIndex(p => p.kind === 'world')`);
  await cmd('shock'); // survives, but counter-attack kills (stun only at recovery=false => stun!)
  s = await st();
  if (!s.over) { await cmd('shock'); s = await st(); }
  check('player reached game over', s.over === true, s);
  await ev(`window.__replyWorld(${gi}, 'STALE-AFTER-GAMEOVER', '#ff0000')`); await settle();
  check('reply arriving after game over is dropped', !(await joined()).includes('STALE-AFTER-GAMEOVER'));

  // reverse-order replies in the same room
  await fresh(true);
  await cmd('dance'); await cmd('sing');
  const idx = await ev(`window.__pending.map((p, i) => p.kind === 'world' ? i : -1).filter(i => i >= 0)`);
  await ev(`window.__replyWorld(${idx[1]}, 'NEWER-REPLY', '#00ffcc')`); await settle();
  await ev(`window.__replyWorld(${idx[0]}, 'OLDER-REPLY', '#ff0000')`); await settle();
  t = await joined();
  check('reverse order: newer reply applied, older late reply dropped', t.includes('NEWER-REPLY') && !t.includes('OLDER-REPLY'));
  // in-order replies both apply
  await fresh(true);
  await cmd('dance'); await cmd('sing');
  const io = await ev(`window.__pending.map((p, i) => p.kind === 'world' ? i : -1).filter(i => i >= 0)`);
  await ev(`window.__replyWorld(${io[0]}, 'FIRST-REPLY')`); await settle();
  await ev(`window.__replyWorld(${io[1]}, 'SECOND-REPLY')`); await settle();
  t = await joined();
  check('in-order replies both apply', t.includes('FIRST-REPLY') && t.includes('SECOND-REPLY'));

  // offline mode: no request at all
  await fresh(false);
  await cmd('look'); await cmd('dance');
  check('no key: no network request, unknown-command hint shown', (await ev(`window.__pending.length`)) === 0 && (await joined()).includes('Unknown command "dance"'));

  // ---------------- 5. Task 5.2 scenarios (separate fresh cases) ----------------
  console.log('\n[5] Movement edges, resources, card, victories, restart');
  const island = await ev(`${M}.BRAND.island`);
  const killPack = async () => { await ev(`window.__rv = {'20,35': 35, '8,17': 8}`); await cmd('shoot'); await cmd('shoot'); };
  const marked = async (c) => { await ev(`${M}.transcript.push('@@MARK')`); await cmd(c); const all = await tr(); return all.slice(all.lastIndexOf('@@MARK') + 1).join('\n'); };
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const sameState = async (before, label) => { const a = await st(); check(label, eq(a, before), a, before); };

  // 5.1 every edge and its return edge (pack cleared first so movement damage cannot interfere)
  feature = '방 이동';
  await fresh(false); await killPack();
  const edges = [
    ['north', 'control', 'south', 'lobby'], ['east', 'lab', 'west', 'lobby'], ['west', 'pen', 'east', 'lobby']
  ];
  for (const [go, room, back, home] of edges) {
    await cmd(go); let r = (await st()).room;
    check(`edge lobby -${go}-> ${room}`, r === room, r, room);
    await cmd(back); r = (await st()).room;
    check(`return edge ${room} -${back}-> ${home}`, r === home, r, home);
  }
  await cmd('north'); await cmd('east');
  check('edge control -east-> generator', (await st()).room === 'generator', (await st()).room, 'generator');
  await cmd('west');
  check('return edge generator -west-> control', (await st()).room === 'control', (await st()).room, 'control');
  await cmd('south');
  check('return edge control -south-> lobby', (await st()).room === 'lobby', (await st()).room, 'lobby');
  await cmd('south'); check('invalid exit keeps room', (await st()).room === 'lobby');

  // 5.2 resource deltas per command (pack alive, rng pinned at 8 counter damage, 20 shot damage)
  feature = '샷건';
  await fresh(false); await ev(`window.__rv = {'20,35': 20, '8,17': 8}`);
  let b = await st(); await cmd('shoot'); let a = await st();
  check('shoot: shells -1 exactly, taser/flares unchanged', a.shells === b.shells - 1 && a.taserCharges === b.taserCharges && a.flares === b.flares, { b, a }, { shells: b.shells - 1 });
  feature = '테이저와 스턴';
  await fresh(false); await ev(`window.__rv = {'14,21': 14, '8,17': 8}`);
  b = await st(); await cmd('shock'); a = await st();
  check('shock: taserCharges -1 exactly, shells/flares unchanged', a.taserCharges === b.taserCharges - 1 && a.shells === b.shells && a.flares === b.flares, { b, a }, { taserCharges: b.taserCharges - 1 });
  feature = '조명탄';
  await fresh(false); await ev(`window.__rv = {'8,17': 8}`);
  b = await st(); await cmd('flare'); a = await st();
  check('flare: flares -1 exactly, shells/taser unchanged', a.flares === b.flares - 1 && a.shells === b.shells && a.taserCharges === b.taserCharges, { b, a }, { flares: b.flares - 1 });

  // 5.3 card pickup, duplicate pickup
  feature = '카드 획득';
  await fresh(false); await killPack(); await cmd('east');
  b = await st(); const msgs = await marked('take card'); a = await st();
  check('take card: hasCard true (inventory +1) and pickup message', b.hasCard === false && a.hasCard === true && msgs.includes('You pocket the'), { b: b.hasCard, a: a.hasCard, msgs });
  check('take card: only hasCard changed', eq({ ...a, hasCard: false }, b), a, b);
  check('inventory lists the card', (await (async () => { await cmd('inventory'); return joined(); })()).includes(await ev(`${M}.BRAND.card`)));
  const afterTake = await st();
  const dupMsg = await marked('take card');
  check('duplicate take card: still one card and already-carried message', (await st()).hasCard === true && dupMsg.includes('You already carry'), dupMsg);
  await sameState(afterTake, 'duplicate take card: state otherwise unchanged');

  // 5.4 victories, each a fresh case
  feature = '관제실 승리';
  await fresh(false); await killPack(); await cmd('east'); await cmd('take card'); await cmd('west'); await cmd('north');
  await cmd('restore power'); s = await st();
  check('control room win: won true in control', s.won === true && s.room === 'control', s);
  check('control room win: victory text contains BRAND.island', (await joined()).includes('VICTORY') && (await joined()).includes(island), island);
  feature = '발전소 승리';
  await fresh(false); await killPack(); await cmd('east'); await cmd('take card'); await cmd('west'); await cmd('north'); await cmd('east');
  await cmd('restore power'); s = await st();
  check('generator win: won true in generator', s.won === true && s.room === 'generator', s);
  check('generator win: victory text contains BRAND.island', (await joined()).includes('VICTORY') && (await joined()).includes(island), island);

  // 5.5 rejected restore power leaves state unchanged
  feature = '관제실 승리';
  await fresh(false); await killPack(); await cmd('north');
  b = await st(); const m2 = await marked('restore power');
  check('restore power without card: reject message', m2.includes('ACCESS DENIED'), m2);
  await sameState(b, 'restore power without card: state unchanged');
  await fresh(false); await killPack();
  await ev(`window.__mud.getState().hasCard = true`);
  b = await st(); const m3 = await marked('restore power');
  check('restore power with card in wrong room (lobby): reject message', m3.includes('Restore power at the'), m3);
  await sameState(b, 'restore power with card in wrong room: state unchanged');
  await cmd('east'); b = await st(); const m4 = await marked('restore power');
  check('restore power with card in lab: reject message', m4.includes('Restore power at the'), m4);
  await sameState(b, 'restore power with card in lab: state unchanged');

  // 5.6 game over then restart: every field back to initial
  feature = '게임 오버와 재시작';
  await fresh(false);
  const init = await st();
  await ev(`window.__mud.getState().hp = 10; window.__mud.getState().hasCard = true; window.__rv = {'14,21': 14, '8,17': 17}`);
  await cmd('flare'); await cmd('shoot'); await cmd('shock'); await cmd('shock');
  s = await st();
  check('game over reached with mutated state', s.over === true && s.hp === 0 && s.hasCard === true, s);
  await cmd('restart'); a = await st();
  const keys = ['room', 'hp', 'shells', 'flares', 'taserCharges', 'hasCard', 'over', 'won', 'stunRecovery'];
  const got = Object.fromEntries(keys.map((k) => [k, a[k]])); const want = Object.fromEntries(keys.map((k) => [k, init[k]]));
  check('restart after game over: fields equal initial values', eq(got, want), got, want);

  // ---------------- 6. Task 5.3 name consistency ----------------
  console.log('\n[6] Name consistency');
  feature = '이름 일관성';
  const fs = await import('node:fs');
  const { scanLegacyTerms } = await import('./verify-legacy-terms.mjs');
  const legacy = JSON.parse(fs.readFileSync(path.join(here, 'legacy-terms.json'), 'utf8')).terms;
  const BR = await ev(`JSON.parse(JSON.stringify(${M}.BRAND))`);
  const brandVals = [BR.title, BR.island, BR.company, BR.card];
  const hasBrand = (txt) => brandVals.some((v) => txt.includes(v));
  const noLegacy = (label, txt) => { const h = scanLegacyTerms(txt, legacy); check(label + ': 0 legacy terms', h.length === 0, h, []); };

  const wantTitle = BR.title;
  const wantHeader = '\u26A1 ' + BR.title.toUpperCase() + ' :: ' + BR.island.toUpperCase();
  const docTitle = await ev('document.title'); const headerTxt = await ev(`document.getElementById('brand-header').textContent`);
  check('document.title equals BRAND.title', docTitle === wantTitle, docTitle, wantTitle);
  check('#brand-header text equals expected', headerTxt === wantHeader, headerTxt, wantHeader);
  const htmlSrc = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
  const staticTitle = (htmlSrc.match(/<title>([^<]*)<\/title>/) || [])[1];
  check('static <title> literal equals BRAND.title', staticTitle === BR.title, staticTitle, BR.title);

  // intro after restart
  await fresh(false);
  const introTxt = await joined();
  check('intro contains a BRAND value', hasBrand(introTxt) || introTxt.toUpperCase().includes(BR.island.toUpperCase()), introTxt.slice(0, 200));
  noLegacy('intro', introTxt);

  // rooms
  const roomNames = { lobby: 'VISITOR CENTER LOBBY', lab: 'GENETICS LABORATORY', control: 'MAIN CONTROL ROOM', pen: 'RAPTOR PEN', generator: 'GEOTHERMAL GENERATOR' };
  const roomsNow = await ev(`JSON.parse(JSON.stringify(${M}.ROOMS))`);
  for (const [k, n] of Object.entries(roomNames)) check(`room name unchanged: ${k}`, roomsNow[k] && roomsNow[k].name === n, roomsNow[k] && roomsNow[k].name, n);
  const roomTexts = [];
  for (const k of Object.keys(roomNames)) {
    for (const card of [false, true]) {
      const txt = await ev(`(() => { const s = ${M}.getState(); s.room = ${JSON.stringify(k)}; s.hasCard = ${card}; return ${M}.describeRoom(); })()`);
      roomTexts.push(txt);
      noLegacy(`describeRoom ${k} hasCard=${card}`, txt);
    }
  }
  check('describeRoom across the set contains a BRAND value', roomTexts.some(hasBrand), roomTexts.length);

  // scripted full playthrough (victory), transcript scanned
  await fresh(false); await killPack(); await cmd('help'); await cmd('status'); await cmd('look');
  await cmd('east'); await cmd('look');
  const pickMsg = await marked('take card');
  check('pickup text contains BRAND.card', pickMsg.includes(BR.card), pickMsg);
  const invMsg = await marked('inventory');
  check('inventory text contains BRAND.card', invMsg.includes(BR.card), invMsg);
  await cmd('west'); await cmd('north');
  await cmd('west'); // invalid exit in control: harmless
  await cmd('restore power');
  const winTxt = await joined();
  check('victory text contains BRAND.island', winTxt.includes('VICTORY') && winTxt.includes(BR.island), BR.island);
  noLegacy('full playthrough transcript', winTxt);
  // reject text without card
  await fresh(false); await killPack(); await cmd('north');
  const rejMsg = await marked('restore power');
  check('reject text contains company', rejMsg.includes(BR.company.split(' ')[0]), rejMsg);
  noLegacy('reject text', rejMsg);
  // game-over text
  await fresh(false);
  await ev(`window.__mud.getState().hp = 1; window.__rv = {'8,17': 17}`);
  await cmd('shoot'); await cmd('shoot'); // non-lethal shots; counter-attack kills
  const goTxt = await joined();
  check('game over reached for text check', (await st()).over === true, await st());
  noLegacy('game-over transcript', goTxt);

  // prompts
  const sysP = await ev(`${M}.SYSTEM_PROMPT`); const narP = await ev(`${M}.NARRATOR_PROMPT`);
  for (const [n, p] of [['SYSTEM_PROMPT', sysP], ['NARRATOR_PROMPT', narP]]) {
    check(`${n} includes BRAND.title, island and company`, [BR.title, BR.island, BR.company].every((v) => p.includes(v)), p.slice(0, 200));
    noLegacy(n, p);
  }

  // card command variants
  await fresh(false); await killPack(); await cmd('east');
  // Legacy-word command built piecewise so the source never contains the legacy term literally.
  const LEGACY_CARD_CMD = 'take ' + 'in' + 'gen card';
  b = await st(); const ingenMsg = (await marked(LEGACY_CARD_CMD)).split(LEGACY_CARD_CMD).join('<legacy card cmd>'); a = await st();
  check('legacy-word card command -> unknown-command hint', ingenMsg.includes('Unknown command'), ingenMsg);
  check('legacy-word card command: hasCard unchanged', a.hasCard === b.hasCard && a.hasCard === false, a.hasCard, false);
  for (const c of ['take passcard', 'take security passcard']) {
    const cls = await ev(`${M}.classifyCommand(${JSON.stringify(c)}).type`);
    check(`"${c}" classified TAKE_CARD`, cls === 'TAKE_CARD', cls, 'TAKE_CARD');
  }
  await cmd('take passcard'); check('"take passcard" in lab gives the card', (await st()).hasCard === true);
  await fresh(false); await killPack(); await cmd('east'); await cmd('take security passcard');
  check('"take security passcard" in lab gives the card', (await st()).hasCard === true);

  // ---------------- 7. Task 5.4 stun cases (separate fresh cases, pinned rng) ----------------
  console.log('\n[7] Stun cases (task 5.4)');
  feature = '테이저와 스턴';
  const pin = (o) => ev(`window.__rv = ${JSON.stringify(o)}`);
  const STUN_RNG = { '14,21': 14, '8,17': 10 };
  const countOf = (txt, needle) => txt.split(needle).length - 1;

  // 스턴 교대: stun -> recovery (damage + counter, no stun) -> stun again
  await fresh(false); await pin(STUN_RNG);
  await cmd('shock'); s = await st();
  check('7 alternate 1: stun (no counter, recovery set)', s.stunRecovery === true && s.hp === 100 && s.raptorHp === 31 && s.taserCharges === 2, s);
  await cmd('shock'); s = await st();
  check('7 alternate 2: recovery turn deals damage and takes counter, no stun', s.stunRecovery === false && s.hp === 90 && s.raptorHp === 17 && s.taserCharges === 1, s);
  await cmd('shock'); s = await st();
  check('7 alternate 3: stun again, no counter', s.stunRecovery === true && s.hp === 90 && s.raptorHp === 3 && s.taserCharges === 0, s);

  // 회복 턴: next shoot, and separately next flare
  await fresh(false); await pin({ '14,21': 14, '8,17': 10, '20,35': 20 });
  await cmd('shock'); await cmd('shoot'); s = await st();
  check('7 recovery turn (shoot): processed normally, counter applied, stunRecovery cleared', s.stunRecovery === false && s.hp === 90 && s.raptorHp === 11 && s.shells === 2, s);
  await fresh(false); await pin(STUN_RNG);
  await cmd('shock'); await cmd('flare'); s = await st();
  check('7 recovery turn (flare): blinds without counter, stunRecovery cleared', s.stunRecovery === false && s.hp === 100 && s.flares === 1 && s.raptorHp === 31, s);
  check('7 recovery turn (flare): raptor fx mode is blind', (await fx()).raptorMode === 'blind');

  // 치명 타격
  await fresh(false); await pin({ '20,35': 35, '14,21': 21, '8,17': 10 });
  await cmd('shoot'); b = await st(); await cmd('shock'); s = await st();
  check('7 lethal shock: raptorsAlive false, no stun, no counter (HP unchanged by the shock)', s.raptorsAlive === false && s.raptorHp === 0 && s.stunRecovery === false && s.hp === b.hp && s.taserCharges === 2, { b, s });

  // 빈 테이저
  await fresh(false); await pin(STUN_RNG);
  await ev(`window.__mud.getState().taserCharges = 0`);
  b = await st(); const emptyMsg = await marked('shock');
  await sameState(b, '7 empty taser: state deep-equal to before');
  check('7 empty taser: exactly one fail message', countOf(emptyMsg, 'The taser is out of charges.') === 1, emptyMsg);

  // stun log once per stun, STUN_SECONDS, fx mode
  await fresh(false); await pin(STUN_RNG);
  const stunMsg = await marked('shock');
  check('7 stun log line appears exactly once per stun', countOf(stunMsg, 'Stunned by the voltage') === 1, stunMsg);
  check('7 raptor fx mode is stun right after the stun', (await fx()).raptorMode === 'stun');
  const stunSec = Number((htmlSrc.match(/const\s+STUN_SECONDS\s*=\s*([0-9.]+)/) || [])[1]);
  check('7 STUN_SECONDS (index.html source) within 1.0-1.4', stunSec >= 1.0 && stunSec <= 1.4, stunSec);
  const recMsg = await marked('shock');
  check('7 recovery shock logs no stun line', countOf(recMsg, 'Stunned by the voltage') === 0, recMsg);

  // game over clears stunRecovery immediately
  await fresh(false); await pin({ '14,21': 14, '8,17': 17 });
  await ev(`window.__mud.getState().hp = 10`);
  await cmd('shock'); b = await st();
  await cmd('shock'); s = await st();
  check('7 stun precondition: first shock sets recovery', b.stunRecovery === true, b);
  check('7 game over: stunRecovery false when over', s.over === true && s.hp === 0 && s.stunRecovery === false, s);

  // resolveStunTurn pure checks
  const rst = (inp) => ev(`JSON.parse(JSON.stringify(${M}.resolveStunTurn(${inp})))`);
  const R = (a, b2, c) => ({ stunned: a, nextStunRecovery: b2, counterAllowed: c });
  check('7 resolveStunTurn: shock on live pack stuns', eq(await rst(`{ type: 'shock', raptorHp: 20, stunRecovery: false }`), R(true, true, false)));
  check('7 resolveStunTurn: shock during recovery does not stun, counter allowed', eq(await rst(`{ type: 'shock', raptorHp: 20, stunRecovery: true }`), R(false, false, true)));
  check('7 resolveStunTurn: lethal shock -> all false', eq(await rst(`{ type: 'shock', raptorHp: 0, stunRecovery: false }`), R(false, false, false)));
  check('7 resolveStunTurn: shoot on live pack -> counter allowed, no stun', eq(await rst(`{ type: 'shoot', raptorHp: 20, stunRecovery: true }`), R(false, false, true)));
  for (const bad of ['undefined', 'null', "'x'", '42', `{ type: 'shock', raptorHp: 'abc' }`, `{ type: 'shock', raptorHp: NaN }`]) {
    let r; try { r = await rst(bad); } catch (e) { r = 'threw: ' + e.message; }
    check(`7 resolveStunTurn: bad input ${bad} -> all false, no throw`, eq(r, R(false, false, false)), r);
  }

  // ---------------- 4. Console health ----------------
  feature = null;
  console.log('\n[4] Console');
  check('0 console errors / uncaught exceptions', consoleErrors.length === 0, consoleErrors.slice(0, 5));
}

let code = 0;
try { await main(); } catch (e) { console.error('HARNESS ERROR:', e.message); code = 2; }
try { ws && ws.close(); } catch { /* ignore */ }
proc.kill();
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* profile may be locked briefly */ }
writeResults();
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('Failed: ' + failures.join(' | ')); code = code || 1; }
process.exit(code);
