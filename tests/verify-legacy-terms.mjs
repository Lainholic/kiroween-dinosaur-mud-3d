// Legacy term scanner (Node built-ins only).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mov', '.ico']);
const SKIP_DIRS = new Set(['node_modules', '.git']);
const SELF_OUTPUT = 'tests/.results/legacy-scan.json';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTerm(t) {
  return typeof t === 'string' ? { term: t, wordBoundary: true } : t;
}

/** Pure: returns [{line, term}] for every term occurrence (case-insensitive). */
export function scanLegacyTerms(text, terms) {
  const hits = [];
  try {
    const lines = String(text ?? '').split(/\r?\n/);
    const patterns = (terms || []).map(normalizeTerm).filter((t) => t && t.term).map((t) => {
      const body = escapeRegex(t.term);
      const src = t.wordBoundary === false ? body : `(?<![A-Za-z0-9_])${body}(?![A-Za-z0-9_])`;
      return { term: t.term, re: new RegExp(src, 'i') };
    });
    lines.forEach((ln, i) => {
      for (const p of patterns) if (p.re.test(ln)) hits.push({ line: i + 1, term: p.term });
    });
  } catch {
    return hits;
  }
  return hits;
}

function targets(root) {
  const files = [];
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  for (const f of ['index.html', 'README.md']) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) files.push(p);
  }
  walk(path.join(root, '.kiro'));
  walk(path.join(root, 'tests'));
  return files;
}

/** Scans target files. allowlist: [{path, reason}] */
export function scanFiles(root, terms, allowlist = []) {
  const allowSet = new Set((allowlist || []).map((a) => a.path.replace(/\\/g, '/')));
  const result = { scannedCount: 0, hits: [], allowed: [], unresolved: 0, binarySkipped: [] };
  for (const file of targets(root)) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (rel === SELF_OUTPUT) continue;
    if (BINARY_EXT.has(path.extname(file).toLowerCase())) {
      result.binarySkipped.push(rel);
      continue;
    }
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    result.scannedCount++;
    for (const h of scanLegacyTerms(text, terms)) {
      const rec = { path: rel, line: h.line, term: h.term };
      if (allowSet.has(rel)) result.allowed.push(rec);
      else { result.hits.push(rec); result.unresolved++; }
    }
  }
  return result;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read = (f) => JSON.parse(fs.readFileSync(path.join(root, 'tests', f), 'utf8'));
  const terms = read('legacy-terms.json').terms;
  const allowlist = read('legacy-allowlist.json').entries;
  const r = scanFiles(root, terms, allowlist);
  console.log(`Scanned files: ${r.scannedCount}`);
  console.log(`Hits (unresolved): ${r.unresolved}`);
  for (const h of r.hits) console.log(`  ${h.path}:${h.line}:${h.term}`);
  console.log(`Allowed hits: ${r.allowed.length}`);
  for (const h of r.allowed) console.log(`  ${h.path}:${h.line}:${h.term}`);
  console.log(`Unverified (binary/media skipped): ${r.binarySkipped.length}`);
  for (const b of r.binarySkipped) console.log(`  ${b}`);
  const outDir = path.join(root, 'tests', '.results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'legacy-scan.json'),
    JSON.stringify({ suite: 'legacy-scan', ...r }, null, 2) + '\n'
  );
  process.exit(r.unresolved === 0 ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
