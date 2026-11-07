/**
 * Task 5.5: fake-fetch AI scenarios (late/stale replies, ordering, failures, no-key, determinism).
 * Everything here uses a FAKE fetch with manual resolve. Nothing touches the network and the
 * key is the literal 'FAKE-TEST-KEY'. This proves game logic only, not the real Gemini API.
 * Exit codes: 0 pass, 1 failure, 2 no browser.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, sleep } from './lib/browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ENDPOINT_PREFIX = 'https://generativelanguage.googleapis.com/';

const FAKE_FETCH = `
  window.__pending = []; window.__fetchLog = [];
  window.fetch = (url, opts) => new Promise((resolve, reject) => {
    window.__fetchLog.push({ url: String(url), fake: true });
    const body = JSON.parse(opts.body);
    const sys = body.system_instruction.parts[0].text;
    const p = { id: window.__pending.length, kind: sys.indexOf('AI narrator') >= 0 ? 'narr' : 'world', resolve, reject, key: opts.headers['x-goog-api-key'], aborted: false, hasSignal: !!opts.signal };
    window.__pending.push(p);
    if (opts.signal) opts.signal.addEventListener('abort', () => { p.aborted = true; const e = new Error('The operation was aborted.'); e.name = 'AbortError'; reject(e); });
  });
  const wrap = (text) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });
  window.__replyText = (id, text) => window.__pending[id].resolve(wrap(text));
  window.__replyWorld = (id, narrative, color) => window.__replyText(id, JSON.stringify({ narrativeText: narrative, scene3D: { characterAnimation: 'CAST', lightColor: color || '#ff0000', lightIntensity: 3, fogDensity: 0.1, cameraShake: true } }));
  window.__failMode = (id, mode) => {
    const p = window.__pending[id];
    if (mode === 'http500') p.resolve({ ok: false, status: 500, json: async () => ({}) });
    else if (mode === 'throw') p.reject(new TypeError('Failed to fetch'));
    else if (mode === 'badjson') p.resolve({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token < in JSON'); } });
    else if (mode === 'badworld') window.__replyText(id, 'this is {not json');
    else if (mode === 'empty') p.resolve({ ok: true, status: 200, json: async () => ({ candidates: [] }) });
  };
`;

const M = 'window.__mud';
const rngDefault = `${M}.setRng((lo, hi) => (window.__rv && window.__rv[lo + ',' + hi] !== undefined) ? window.__rv[lo + ',' + hi] : lo)`;
const SAFE_LOBBY = `window.__rv = {'20,35': 35, '8,17': 8}`;

const cases = [];
let feature = '늦은 AI 응답 차단';
function check(name, ok, expected, actual) {
  cases.push({
    feature, name, status: ok ? 'pass' : 'fail',
    detail: ok ? 'ok' : `expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`,
    kind: 'fake'
  });
  if (!ok) console.log(`  FAIL [${feature}] ${name}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
}

const b = await launchBrowser({ width: 1280, height: 800 });
const ev = (e) => b.eval(e);
let exitCode = 0;
try {
  await b.addScript(FAKE_FETCH);
  const ready = await b.navigate();
  if (!ready) { console.error('page did not boot'); await b.close(); process.exit(1); }

  const fresh = (withKey) => ev(`localStorage.${withKey ? "setItem('GEMINI_API_KEY','FAKE-TEST-KEY')" : "removeItem('GEMINI_API_KEY')"}; window.__pending = []; window.__fetchLog = []; window.__rv = {}; ${rngDefault}; ${M}.setAiTimeout(10000); ${M}.restartGame(); true`);
  const st = () => ev(`JSON.parse(JSON.stringify(${M}.getState()))`);
  const fxAll = () => ev(`JSON.parse(JSON.stringify(${M}.scene3D()))`);
  const fx = async () => { const f = await fxAll(); return { hudLight: f.hudLight, currentAnim: f.currentAnim, targetLightIntensity: f.targetLightIntensity, targetFogDensity: f.targetFogDensity }; };
  const tr = () => ev(`${M}.transcript.slice()`);
  const cmd = (c) => ev(`${M}.executeCmd(${JSON.stringify(c)}); true`);
  const settle = (ms = 60) => sleep(ms);
  const joined = async () => (await tr()).join('\n');
  const worldIdx = () => ev(`window.__pending.map((p, i) => p.kind === 'world' ? i : -1).filter(i => i >= 0)`);
  const lastIdx = () => ev(`window.__pending.length - 1`);
  const killPack = async () => { await ev(SAFE_LOBBY); await cmd('shoot'); await cmd('shoot'); };
  const same = (a, c) => JSON.stringify(a) === JSON.stringify(c);

  // ---- scenario 1: lobby request resolved after moving to lab ----
  async function scenario1() {
    await fresh(true); await killPack();
    await cmd('dance wildly');
    const [wi] = await worldIdx();
    await cmd('east');
    // Room move starts setAnim('WALK', 1000) which reverts to IDLE by timer; let its own effects finish before the snapshot.
    // Poll (headless hidden pages throttle timers, so a fixed sleep is not enough).
    for (let i = 0; i < 50 && (await fx()).currentAnim !== 'IDLE'; i++) await sleep(200);
    const before = await fx();
    const trLen = (await tr()).length;
    await ev(`window.__replyWorld(${wi}, 'STALE-LOBBY-NARRATIVE', '#ff0000')`); await settle();
    const after = await fx();
    const text = await joined();
    return {
      noNarration: !text.includes('STALE-LOBBY-NARRATIVE'),
      noNewLog: (await tr()).length === trLen,
      fxUnchanged: same(before, after),
      labFx: after.hudLight === '#00ff88' && after.currentAnim !== 'CAST' && after.targetLightIntensity === 2.2 && after.targetFogDensity === 0.05,
      after, before
    };
  }

  // ---- scenario 3: ordering ----
  async function scenario3() {
    await fresh(true);
    await cmd('dance'); await cmd('sing');
    let idx = await worldIdx();
    await ev(`window.__replyWorld(${idx[1]}, 'NEWER-REPLY', '#00ffcc')`); await settle();
    await ev(`window.__replyWorld(${idx[0]}, 'OLDER-REPLY', '#ff0000')`); await settle();
    const rev = await joined(); const revFx = await fx();
    await fresh(true);
    await cmd('dance'); await cmd('sing');
    idx = await worldIdx();
    await ev(`window.__replyWorld(${idx[0]}, 'FIRST-REPLY')`); await settle();
    await ev(`window.__replyWorld(${idx[1]}, 'SECOND-REPLY')`); await settle();
    const ord = await joined();
    return {
      revNewerOnly: rev.includes('NEWER-REPLY') && !rev.includes('OLDER-REPLY'),
      revFxNewer: revFx.hudLight === '#00ffcc',
      inOrderBoth: ord.includes('FIRST-REPLY') && ord.includes('SECOND-REPLY')
    };
  }

  // ================= 1. late reply after room move =================
  feature = '늦은 AI 응답 차단';
  const s1 = await scenario1();
  check('1. lobby reply after moving to lab: no narration in lab', s1.noNarration, true, s1.noNarration);
  check('1. lobby reply after moving to lab: no new log lines', s1.noNewLog, true, s1.noNewLog);
  check('1. lobby reply after moving to lab: light/fog/intensity/anim unchanged', s1.fxUnchanged && s1.labFx, 'lab theme unchanged', s1.after);

  // ================= 2. after restart / game over / win =================
  {
    await fresh(true);
    await cmd('dance'); const [ri] = await worldIdx();
    await cmd('restart');
    const f0 = await fx(); const n0 = (await tr()).length;
    await ev(`window.__replyWorld(${ri}, 'STALE-BEFORE-RESTART', '#ff0000')`); await settle();
    check('2. reply after restart is discarded (no log)', !(await joined()).includes('STALE-BEFORE-RESTART') && (await tr()).length === n0, 'no log', (await tr()).length - n0);
    check('2. reply after restart: no fx change', same(f0, await fx()), f0, await fx());

    await fresh(true);
    await ev(`${M}.getState().hp = 5; window.__rv = {'8,17': 17}`);
    await cmd('dance'); const [gi] = await worldIdx();
    await cmd('shock'); let s = await st();
    if (!s.over) { await cmd('shock'); s = await st(); }
    check('2. setup: player reached game over', s.over === true, true, s.over);
    const f1 = await fx(); const n1 = (await tr()).length;
    await ev(`window.__replyWorld(${gi}, 'STALE-AFTER-GAMEOVER', '#ff0000')`); await settle();
    check('2. reply after game over is discarded (no log)', !(await joined()).includes('STALE-AFTER-GAMEOVER') && (await tr()).length === n1, 'no log', (await tr()).length - n1);
    check('2. reply after game over: no fx change', same(f1, await fx()), f1, await fx());

    await fresh(true); await killPack();
    await cmd('east'); await cmd('take card'); await cmd('west'); await cmd('north');
    await cmd('dance'); const [wi] = await worldIdx();
    await cmd('restore power'); s = await st();
    check('2. setup: player won', s.won === true, true, s.won);
    const f2 = await fx(); const n2 = (await tr()).length;
    await ev(`window.__replyWorld(${wi}, 'STALE-AFTER-WIN', '#ff0000')`); await settle();
    check('2. reply after win is discarded (no log)', !(await joined()).includes('STALE-AFTER-WIN') && (await tr()).length === n2, 'no log', (await tr()).length - n2);
    check('2. reply after win: no fx change', same(f2, await fx()), f2, await fx());
  }

  // ================= 3. ordering =================
  const s3 = await scenario3();
  check('3. reverse-order replies: only newer applied', s3.revNewerOnly && s3.revFxNewer, 'NEWER only', s3);
  check('3. in-order replies: both applied', s3.inOrderBoth, true, s3.inOrderBoth);

  // ================= 4. failures =================
  feature = '네트워크 실패 처리';
  const errBase = b.consoleErrors.length;
  const modes = [['http500', 'HTTP 500'], ['throw', 'fetch throws'], ['badjson', 'invalid JSON body'], ['empty', 'empty candidates'], ['timeout', 'no response until timeout']];
  for (const [mode, label] of modes) {
    for (const via of ['look', 'text']) {
      await fresh(true); await killPack();
      const room0 = (await st()).room;
      const desc0 = await ev(`${M}.describeRoom()`);
      if (mode === 'timeout') await ev(`${M}.setAiTimeout(150)`);
      const n0 = (await tr()).length;
      await cmd(via === 'look' ? 'look' : 'dance');
      const afterCmd = await tr();
      const idx = await lastIdx();
      if (mode === 'timeout') await sleep(600); else { await ev(`window.__failMode(${idx}, '${mode}')`); await settle(120); }
      const aborted = mode === 'timeout' ? await ev(`window.__pending[${idx}].aborted`) : null;
      const t = await tr();
      const added = t.slice(n0).join('\n');
      const s = await st();
      const baseOk = via === 'look'
        ? t.length === afterCmd.length && added.includes('Exits:')
        : added.includes('Unknown command "dance"') && t.length === afterCmd.length + 1;
      check(`4. ${label} via ${via}: base text unchanged, no extra AI text`, baseOk, 'no lines after base', { added: added.slice(0, 160), extra: t.length - afterCmd.length });
      check(`4. ${label} via ${via}: room and exits unchanged`, s.room === room0 && (await ev(`${M}.describeRoom()`)) === desc0, { room: room0 }, { room: s.room });
      if (mode === 'timeout') check(`4. ${label} via ${via}: abort fired on fake signal`, aborted === true, true, aborted);
      const m = (await tr()).length;
      await cmd('status');
      check(`4. ${label} via ${via}: next command (status) works`, (await tr()).length > m, 'status output', (await tr()).length - m);
      if (mode === 'timeout') await ev(`${M}.setAiTimeout(10000)`);
    }
  }
  // invalid JSON in a world reply (HTTP 200 but non-JSON text) falls back to the hint
  await fresh(true); await cmd('dance'); await ev(`window.__failMode(0, 'badworld')`); await settle(120);
  check('4. world reply with unparsable text: offline hint, state intact', (await joined()).includes('Gemini unreachable') && (await st()).room === 'lobby', 'hint', (await tr()).slice(-2));
  const errs = b.consoleErrors.slice(errBase);
  check('4. failures produced 0 uncaught exceptions/console errors', errs.length === 0, 0, errs);

  // ================= 5. base text first =================
  feature = '기본 정보 우선 출력';
  await fresh(true);
  await cmd('look');
  let t = await joined();
  const pend = await ev(`window.__pending.length`);
  const iHead = t.lastIndexOf('== VISITOR CENTER LOBBY =='), iThreat = t.lastIndexOf('THREAT:'), iExits = t.lastIndexOf('Exits:');
  check('5. look with key: header, THREAT, Exits logged while reply pending', pend === 1 && iHead >= 0 && iThreat > iHead && iExits > iThreat && !t.includes('AI-STORY-LOOK'), 'base text in order, 1 pending', { pend, iHead, iThreat, iExits });
  await ev(`window.__replyText(0, 'AI-STORY-LOOK a cold wind blows.')`); await settle();
  t = await joined();
  check('5. AI text appended after base text on resolve', t.indexOf('AI-STORY-LOOK') > t.lastIndexOf('Exits:') && t.indexOf('AI-STORY-LOOK') > 0, 'AI after Exits', { ai: t.indexOf('AI-STORY-LOOK'), exits: t.lastIndexOf('Exits:') });

  // ================= 6. no key =================
  feature = '네트워크 실패 처리';
  await fresh(false); await killPack();
  const n6 = (await ev(`window.__fetchLog.length`));
  await cmd('look'); await cmd('dance'); await cmd('east'); await cmd('west');
  const calls = await ev(`window.__fetchLog.length`);
  check('6. no key: 0 fetch calls for look/free text/move', n6 === 0 && calls === 0, 0, calls);

  // ================= 7. determinism =================
  feature = '늦은 AI 응답 차단';
  const s1b = await scenario1(); const s3b = await scenario3();
  // Compare the verdict flags only: `after` holds live animation values (currentAnim, lerp targets) that may differ by timer phase.
const verdict = ({ after, before, ...flags }) => flags;
  check('7. scenario 1 identical on second run', same(verdict(s1), verdict(s1b)), s1, s1b);
  check('7. scenario 3 identical on second run', same(s3, s3b), s3, s3b);

  // ================= 8. timeout constant =================
  const src = readFileSync(path.join(here, '..', 'index.html'), 'utf8');
  const mt = src.match(/const GEMINI_TIMEOUT_MS = (\d+)/);
  check('8. default timeout constant is 10000', !!mt && Number(mt[1]) === 10000, 10000, mt && mt[1]);
  // restore default and prove it holds: a pending request must not be aborted after 400ms
  await fresh(true);
  await ev(`${M}.setAiTimeout(150)`); await ev(`${M}.setAiTimeout(10000)`);
  await cmd('look'); await sleep(400);
  const abortedAfterRestore = await ev(`window.__pending[0].aborted`);
  check('8. timeout restored to default after tests (no abort at 400ms)', abortedAfterRestore === false, false, abortedAfterRestore);

  // ================= global: only fake network =================
  feature = '네트워크 실패 처리';
  const allLog = await ev(`window.__fetchLog`);
  const pendingTotal = await ev(`window.__pending.length`);
  check('network: every fetch was intercepted by the fake, URLs are the Gemini endpoint only', allLog.every((e) => e.fake && e.url.startsWith(ENDPOINT_PREFIX)) && allLog.length === pendingTotal, 'log count == pending count (this case)', { log: allLog.length, pending: pendingTotal });
  const keyUsed = await ev(`window.__pending.every(p => p.key === 'FAKE-TEST-KEY')`);
  check('network: only the fake key was sent', keyUsed === true, true, keyUsed);
  check('overall: 0 console errors/uncaught exceptions', b.consoleErrors.length === 0, 0, b.consoleErrors);
} catch (e) {
  console.error('harness error:', e && e.stack || e);
  cases.push({ feature: '네트워크 실패 처리', name: 'harness ran to completion', status: 'fail', detail: String(e && e.message || e), kind: 'fake' });
  exitCode = 1;
} finally {
  await b.close();
}

const failed = cases.filter((c) => c.status === 'fail');
const out = {
  suite: 'ai-fake',
  env: { browser: path.basename(b.browser), viewport: '1280x800' },
  cases
};
mkdirSync(path.join(here, '.results'), { recursive: true });
writeFileSync(path.join(here, '.results', 'ai-fake.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`ai-fake: ${cases.length - failed.length} passed, ${failed.length} failed (${cases.length} cases)`);
process.exit(failed.length || exitCode ? 1 : 0);
