#!/usr/bin/env node
// Token and type guardrails (Round 9 plan 3.7 / 11.3, WP2b).
//
//   node scripts/verify/check-tokens.mjs --files <comma,list | list-file>   hard check
//   node scripts/verify/check-tokens.mjs --all [--strict]                   repo report
//
// Flags, per file:
//   outline-none      `outline: none|0` (CSS rule without :not(:focus-visible) in
//                     its selector), inline `outline: 'none'`, or `outline-none`
//   weight-300        font-weight 300, fontWeight 300, `font-light`
//   banned-face       Space Grotesk, Arial (the 'Arial Narrow' fallback in the
//                     display stack is allowed), liquidGL, lil-gui
//   gradient-text     background-clip: text, bg-clip-text
//   shadcn-name       any definition or read of a shadcn variable (--accent,
//                     --muted, --border, --ring, --primary, --input, --card,
//                     --popover, --secondary, --destructive, and their
//                     -foreground forms) inside design-tokens/** (decision 11)
//
// Modes:
//   --files   Each WP's own acceptance. Exit 1 on any hit, EXCEPT in legacy files
//             (website-v3/app/styles/**, the WP2a partials), which only warn
//             until WP21. --strict makes legacy hits fail too.
//   --all     website-v3 app/components/lib + design-tokens. WARN-ONLY (exit 0)
//             until WP21; --strict makes it fail on any hit.
// Comments are ignored. Paths may be relative to the cwd, website-v3/ or the
// repo root.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '../..');
const repo = path.resolve(site, '..');
const args = process.argv.slice(2);
const has = (k) => args.includes(k);
const val = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const strict = has('--strict');

if (!has('--files') && !has('--all')) {
  console.error('usage: check-tokens.mjs --files <comma,list|list-file> | --all [--strict]');
  process.exit(2);
}

function resolvePath(p) {
  for (const base of [process.cwd(), site, repo]) {
    const abs = path.resolve(base, p);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(css|tsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

let files = [];
const missing = [];
if (has('--files')) {
  const spec = val('--files') || '';
  // A list file is any existing file that is not itself a source file.
  const isListFile = fs.existsSync(spec) && fs.statSync(spec).isFile() && !/\.(css|tsx?|mjs|js)$/.test(spec);
  const list = isListFile
    ? fs.readFileSync(spec, 'utf8').split('\n')
    : spec.split(',');
  for (const raw of list.map((s) => s.trim()).filter(Boolean)) {
    const abs = resolvePath(raw);
    if (!abs) missing.push(raw);
    else if (fs.statSync(abs).isDirectory()) walk(abs, files);
    else files.push(abs);
  }
} else {
  for (const d of ['app', 'components', 'lib']) walk(path.join(site, d), files);
  walk(path.join(repo, 'design-tokens'), files);
}
files = [...new Set(files)].filter((f) => /\.(css|tsx?|mjs|js)$/.test(f));

// Blank out comments but keep newlines so line numbers survive.
function blankComments(src, isCss) {
  const keepNl = (m) => m.replace(/[^\n]/g, ' ');
  let out = src.replace(/\/\*[\s\S]*?\*\//g, keepNl);
  if (!isCss) out = out.replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
  return out;
}

const SHADCN = '(?:accent|muted|border|ring|primary|input|card|popover|secondary|destructive)(?:-foreground)?';
const checks = [
  { id: 'weight-300', re: /font-weight\s*:\s*300\b|fontWeight\s*:\s*['"]?300\b|(?:^|[\s'"`])font-light(?=[\s'"`]|$)/g },
  { id: 'banned-face', re: /Space Grotesk|\bArial\b(?!\s+Narrow)|liquidGL|lil-gui/g },
  { id: 'gradient-text', re: /background-clip\s*:\s*text|backgroundClip\s*:\s*['"]text|(?:^|[\s'"`])bg-clip-text(?=[\s'"`]|$)/g },
  { id: 'outline-none', re: /outline\s*:\s*['"]?(?:none|0)\b|outline\s*:[^,;}\n]*?['"](?:none|0)['"]|(?:^|[\s'"`])outline-none(?=[\s'"`]|$)/g, css: false },
];

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

// CSS outline:none check needs the selector: walk blocks with a light parser.
function cssOutlineHits(src) {
  const hits = [];
  const re =/outline\s*:\s*(?:none|0)\b/g;
  let m;
  while ((m = re.exec(src))) {
    // Find the innermost selector that encloses this declaration.
    let depth = 0;
    let j = m.index;
    let selector = '';
    for (; j >= 0; j--) {
      if (src[j] === '}') depth++;
      else if (src[j] === '{') {
        if (depth === 0) {
          const before = src.slice(0, j);
          const cut = Math.max(before.lastIndexOf('}'), before.lastIndexOf('{'), before.lastIndexOf(';'));
          selector = before.slice(cut + 1).trim();
          break;
        }
        depth--;
      }
    }
    if (!/:not\(\s*:focus-visible\s*\)/.test(selector)) hits.push({ idx: m.index, text: `${selector} { ${m[0]} }` });
  }
  return hits;
}

const report = [];
for (const file of files) {
  const rel = path.relative(repo, file);
  const isCss = file.endsWith('.css');
  const isTokens = rel.startsWith('design-tokens' + path.sep);
  const isLegacy = rel.startsWith(path.join('website-v3', 'app', 'styles') + path.sep);
  if (rel.endsWith(path.join('scripts', 'verify', 'check-tokens.mjs'))) continue;
  const src = blankComments(fs.readFileSync(file, 'utf8'), isCss);
  const hits = [];
  for (const c of checks) {
    if (c.id === 'outline-none' && isCss) continue;
    c.re.lastIndex = 0;
    let m;
    while ((m = c.re.exec(src))) hits.push({ id: c.id, line: lineOf(src, m.index), text: m[0].trim() });
  }
  if (isCss) for (const h of cssOutlineHits(src)) hits.push({ id: 'outline-none', line: lineOf(src, h.idx), text: h.text });
  if (isTokens) {
    const re = new RegExp(`(?:^|[\\s;{(,])(--${SHADCN})(?![\\w-])\\s*:|var\\(\\s*(--${SHADCN})(?![\\w-])`, 'g');
    let m;
    while ((m = re.exec(src))) hits.push({ id: 'shadcn-name', line: lineOf(src, m.index), text: (m[1] || m[2]) });
  }
  if (hits.length) report.push({ rel, hits, warnOnly: (has('--all') || isLegacy) && !strict });
}

let hard = 0;
let warn = 0;
for (const r of report) {
  for (const h of r.hits) {
    const tag = r.warnOnly ? 'warn' : 'FAIL';
    if (r.warnOnly) warn++;
    else hard++;
    console.log(`${tag}  ${r.rel}:${h.line}  [${h.id}]  ${h.text}`);
  }
}
for (const m of missing) {
  console.log(`FAIL  ${m}  [missing]  file not found`);
  hard++;
}
console.log(`\ncheck-tokens: ${files.length} file(s), ${hard} failure(s), ${warn} warning(s)${has('--all') && !strict ? ' (--all is warn-only until WP21)' : ''}.`);
process.exit(hard ? 1 : 0);
