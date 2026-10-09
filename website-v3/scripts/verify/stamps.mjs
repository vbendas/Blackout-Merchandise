#!/usr/bin/env node
// Mornsey stamp guardrails (Round 9 plan 4.5, WP6b).
//
//   npx tsx scripts/verify/stamps.mjs [--text 'ABC'] [--max 2]
//
// 1. Glyph coverage: every string in lib/stamps.ts (all locales, all words) is
//    checked, glyph by glyph, against the cmap of the ORIGINAL Mornsey TTF
//    (Assets/Fonts/Mornsey-PUA.ttf, opentype.js). A missing glyph fails the
//    run. --text 'ÀÇ¿' checks an ad-hoc string as well (used to prove the
//    check bites: A-grave exists, C-cedilla exists, inverted question mark
//    does not).
// 2. Page budget: for each app/**/page.* (page.tsx, page.dev.tsx, ...) walk the
//    static import graph with the TypeScript compiler API (resolving the @/
//    alias from tsconfig.json), including the layouts and templates above the
//    page, and count <Stamp JSX elements in reachable modules. More than --max
//    (default 2) per page fails. The count is static: a Stamp inside a
//    conditional or a .map() counts once per JSX site.
//
// Runs under tsx so lib/stamps.ts can be imported directly (npm script
// "verify:stamps" is `node scripts/verify/stamps.mjs`; node cannot import the
// .ts file, so this file re-executes itself under tsx when needed).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '../..');
const repo = path.resolve(site, '..');
const require = createRequire(import.meta.url);

// Re-exec under tsx when started with plain node (the npm script does that).
if (!process.env.MF_STAMPS_TSX) {
  const tsxBin = path.join(site, 'node_modules/.bin/tsx');
  const r = spawnSync(tsxBin, [fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, MF_STAMPS_TSX: '1' },
  });
  process.exit(r.status ?? 1);
}

const args = process.argv.slice(2);
const val = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const MAX = Number(val('--max') ?? 2);
const extraText = val('--text');

const opentype = require('opentype.js');
const ts = require('typescript');
const { STAMPS } = await import(pathToFileURL(path.join(site, 'lib/stamps.ts')).href);

let failed = false;
const fail = (msg) => {
  failed = true;
  console.error(`FAIL  ${msg}`);
};

// ── 1. cmap coverage ───────────────────────────────────────────────────
const ttf = path.join(repo, 'Assets/Fonts/Mornsey-PUA.ttf');
const buf = fs.readFileSync(ttf);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const has = (ch) => font.charToGlyphIndex(ch) > 0;

function checkString(label, text) {
  const missing = [...new Set([...text].filter((ch) => !/\s/.test(ch) && !has(ch)))];
  if (missing.length) {
    fail(`${label} "${text}" has no glyph for: ${missing.map((c) => `${c} (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`).join(', ')}`);
  }
  return missing.length === 0;
}

let checked = 0;
for (const [lang, words] of Object.entries(STAMPS)) {
  for (const [word, text] of Object.entries(words)) {
    checked++;
    checkString(`${lang}/${word}`, text);
  }
}
if (extraText !== undefined) {
  checked++;
  checkString('--text', extraText);
}
console.log(`cmap   ${checked} strings checked against Mornsey-PUA.ttf (${font.glyphs.length} glyphs)`);

// ── 2. <Stamp per page ─────────────────────────────────────────────────
const tsconfig = ts.readConfigFile(path.join(site, 'tsconfig.json'), ts.sys.readFile).config;
const compilerOptions = ts.convertCompilerOptionsFromJson(tsconfig.compilerOptions, site).options;
const hostRes = { ...ts.sys };

function resolveModule(spec, from) {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null; // bare package or next/*
  const r = ts.resolveModuleName(spec, from, compilerOptions, hostRes).resolvedModule;
  if (!r) return null;
  const f = r.resolvedFileName;
  if (f.includes('node_modules') || f.endsWith('.d.ts')) return null;
  return f;
}

const cache = new Map(); // file -> { imports: string[], stamps: number }
function scan(file) {
  if (cache.has(file)) return cache.get(file);
  const info = { imports: [], stamps: 0 };
  cache.set(file, info);
  const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const add = (spec) => {
    const r = resolveModule(spec, file);
    if (r) info.imports.push(r);
  };
  const visit = (n) => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      add(n.moduleSpecifier.text);
    } else if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) {
      add(n.arguments[0].text);
    } else if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      if (n.tagName.getText(src) === 'Stamp') info.stamps++;
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
  return info;
}

function reachable(entries) {
  const seen = new Set();
  const stack = [...entries];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const i of scan(f).imports) stack.push(i);
  }
  return seen;
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/^page\.(?:[a-z]+\.)?(tsx|ts|jsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

const appDir = path.join(site, 'app');
const pages = walk(appDir, []).sort();
const rows = [];
for (const page of pages) {
  // Layouts and templates from app/ down to the page's folder render with it.
  const entries = [page];
  let dir = path.dirname(page);
  while (dir.startsWith(appDir)) {
    for (const n of ['layout', 'template']) {
      for (const ext of ['tsx', 'ts', 'jsx', 'js']) {
        const f = path.join(dir, `${n}.${ext}`);
        if (fs.existsSync(f)) entries.push(f);
      }
    }
    if (dir === appDir) break;
    dir = path.dirname(dir);
  }
  let count = 0;
  const where = [];
  for (const f of reachable(entries)) {
    const n = scan(f).stamps;
    if (n) {
      count += n;
      where.push(`${path.relative(site, f)}:${n}`);
    }
  }
  rows.push({ page: path.relative(appDir, page) || page, count, where });
  if (count > MAX) fail(`${path.relative(site, page)} reaches ${count} <Stamp (max ${MAX}): ${where.join(', ')}`);
}
for (const r of rows) {
  console.log(`pages  ${String(r.count).padStart(2)}  ${r.page}${r.where.length ? `  [${r.where.join(', ')}]` : ''}`);
}

console.log(failed ? 'stamps: FAIL' : 'stamps: ok');
process.exit(failed ? 1 : 0);
