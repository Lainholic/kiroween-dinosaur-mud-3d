/**
 * LIVE Gemini check (real network calls, uses your real API key). Run by hand:
 *   $env:GEMINI_API_KEY = '<your key>'; node tests/verify-live-gemini.mjs
 *
 * Exit codes:
 *   0  at least one call returned HTTP 200
 *   3  GEMINI_API_KEY missing/empty (not run, no network; live.json status "미검증")
 *   4  key present but no call returned HTTP 200 (all "미검증")
 *   (unexpected internal error -> 4 as well)
 *
 * Privacy: the key and response bodies are never printed or stored. Per call only the HTTP status,
 * response text length, shape (isJson, hasText) and legacyTermsFound (yes/no) are recorded.
 * All output goes through scrub(). Results: tests/.results/live.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrub } from './lib/scrub.mjs';
import { scanLegacyTerms } from './verify-legacy-terms.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const key = process.env.GEMINI_API_KEY || '';
const out = (s) => console.log(scrub(s, key));
const MAX_CALLS = 3;
const TIMEOUT_MS = 30000;

function writeLive(obj) {
  try {
    const dir = path.join(here, '.results');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'live.json'), scrub(JSON.stringify(obj, null, 2), key) + '\n');
  } catch (e) { out('could not write live.json: ' + (e && e.name)); }
}

async function main() {
  if (!key.trim()) {
    writeLive({ status: '미검증', reason: '키 없음' });
    out('NOT RUN: GEMINI_API_KEY is not set (status 미검증).');
    return 3;
  }

  let endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';
  let brand = { title: 'Dinosaur Survival MUD 3D', island: 'Ashfen Island', company: 'Calderyn Biosciences' };
  try {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const m = html.match(/const\s+GEMINI_ENDPOINT\s*=\s*'([^']+)'/);
    if (m) endpoint = m[1];
    for (const k of Object.keys(brand)) {
      const b = html.match(new RegExp(k + ":\\s*'([^']+)'"));
      if (b) brand[k] = b[1];
    }
  } catch { /* use defaults */ }

  let terms = [];
  try { terms = JSON.parse(fs.readFileSync(path.join(here, 'legacy-terms.json'), 'utf8')).terms || []; } catch { /* none */ }

  const prompt = 'You are the AI narrator for "' + brand.title + '" on ' + brand.island + ', a facility of ' + brand.company +
    '. Write exactly 2 atmospheric, tense sentences describing the current chamber, reflecting the survivor\'s recent combat wounds, gunfire smoke, and the state of the room. ' +
    'Never mention other franchises or film names. Second person, present tense. Plain text only: no markdown, no lists, no quotes. ' +
    'Do not invent exits, items, or enemies beyond the provided context.';
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: prompt }] },
    contents: [{ parts: [{ text: 'Game context: {"room":"Control Room","hp":80}' }] }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 160 }
  });

  const calls = [];
  for (let i = 0; i < MAX_CALLS; i++) {
    const rec = { n: i + 1 };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body, signal: ctrl.signal
      });
      rec.httpStatus = res.status;
      const raw = await res.text();
      let json = null;
      try { json = JSON.parse(raw); } catch { /* not json */ }
      let text = '';
      try { text = (json?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(''); } catch { text = ''; }
      rec.responseTextLength = text.length;
      rec.shape = { isJson: json !== null, hasText: text.length > 0 };
      rec.legacyTermsFound = scanLegacyTerms(text, terms).length > 0 ? 'yes' : 'no';
      if (res.status !== 200) { rec.status = '미검증'; rec.errorKind = 'http-' + res.status; }
      else rec.status = 'ok';
    } catch (e) {
      rec.status = '미검증';
      rec.errorKind = e && e.name === 'AbortError' ? 'timeout' : 'network-error';
    } finally { clearTimeout(timer); }
    calls.push(rec);
    out(`call ${rec.n}: ` + JSON.stringify(rec));
  }

  const okCount = calls.filter((c) => c.httpStatus === 200).length;
  const status = okCount > 0 ? 'ok' : '미검증';
  writeLive({ status, okCount, calls });
  out('live result: ' + status + ` (${okCount}/${calls.length} HTTP 200)`);
  return okCount > 0 ? 0 : 4;
}

let code = 4;
try { code = await main(); } catch (e) { out('LIVE CHECK ERROR: ' + (e && e.name)); writeLive({ status: '미검증', reason: 'internal-error' }); code = 4; }
process.exit(code);
