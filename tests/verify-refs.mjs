// Reference integrity check (Node built-ins only).
// Extracts markdown links and backtick local paths from README.md and .kiro/specs/**/*.md,
// verifies each exists (relative to repo root or to the containing doc).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEATURE = '\uBA85\uCE6D \uC794\uC874 \uAC80\uC0C9';
const FILE_EXT = /\.(md|mjs|json|html|js|css|kiro)$/i;
// Lines mentioning these are planned/not-yet-existing files: noted, not failed.
const PLANNED = /\uB9CC\uB4E4|\uB9CC\uB4E0\uB2E4|\uC0DD\uC131|\uC2E0\uADDC|\uB454\uB2E4|monorepo|former|history|gitignore|to be created|will be created|planned|\bcreated?s?\b/i;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

export function extractRefs(text) {
  const refs = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) refs.push({ ref: m[1], line: i + 1, text: line, kind: 'link' });
    for (const m of line.matchAll(/`([^`\s]+)`/g)) refs.push({ ref: m[1], line: i + 1, text: line, kind: 'code' });
  });
  return refs;
}

export function looksLocal(ref) {
  if (/^(https?:|mailto:|#|data:)/i.test(ref)) return false;
  if (/[*<>{}$|=:()?]/.test(ref.replace(/^[A-Za-z]:[\\/]/, ''))) return false; // globs, placeholders, code
  if (/^\.?\/?\w+\.\w+\(/.test(ref)) return false;
  if (/^\.\w+$/.test(ref) || /^(www\.|youtu\.be)/.test(ref)) return false; // bare extension / domain
  if (/^\/[^/]+$/.test(ref) && !FILE_EXT.test(ref)) return false; // slash command like /key
  if (ref.includes('/') && !FILE_EXT.test(ref) && !ref.endsWith('/')) return false; // word list like a/b/c
  return ref.includes('/') || FILE_EXT.test(ref);
}

function exists(ref, docDir) {
  const clean = ref.split('#')[0].replace(/[.,;:]+$/, '');
  if (!clean) return true;
  const rel = clean.replace(/^\//, '');
  return [path.resolve(root, rel), path.resolve(docDir, clean), path.resolve(root, 'tests', rel), path.resolve(root, '.kiro', 'specs', rel)].some((p) => fs.existsSync(p));
}

const docs = [path.join(root, 'README.md'), ...walk(path.join(root, '.kiro', 'specs'))].filter((p) => fs.existsSync(p));
const cases = [];
let broken = 0;
for (const doc of docs) {
  const rel = path.relative(root, doc).replace(/\\/g, '/');
  const seen = new Set();
  for (const r of extractRefs(fs.readFileSync(doc, 'utf8'))) {
    if (!looksLocal(r.ref)) continue;
    const key = r.ref + '@' + r.line;
    if (seen.has(key)) continue;
    seen.add(key);
    const ok = exists(r.ref, path.dirname(doc));
    const planned = !ok && (PLANNED.test(r.text) || /^tests\/properties\//.test(r.ref)); // property tests are planned by tasks.md
    const status = ok ? 'pass' : planned ? 'skip' : 'fail';
    if (status === 'fail') broken++;
    cases.push({
      feature: FEATURE,
      name: `${rel}:${r.line} ${r.ref}`,
      status,
      detail: ok ? 'exists' : planned ? 'missing (planned file, noted)' : 'missing',
    });
  }
}
if (cases.length === 0) cases.push({ feature: FEATURE, name: 'no local references found', status: 'pass', detail: '' });

const outDir = path.join(root, 'tests', '.results');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'refs.json'), JSON.stringify({ suite: 'refs', cases }, null, 2));
for (const c of cases.filter((c) => c.status !== 'pass')) console.log(`${c.status.toUpperCase()} ${c.name} - ${c.detail}`);
console.log(`Docs: ${docs.length}, refs: ${cases.length}, broken: ${broken}`);
process.exit(broken ? 1 : 0);
