#!/usr/bin/env node
// Contrast check for the shared design tokens (Round 9 plan 3.7, WP2b).
//
//   node scripts/contrast.mjs [--tokens <dir>] [--json]
//
// 1. Parses design-tokens/primitives.css into a `--p-*` table.
// 2. Parses design-tokens/semantic.css per theme block (`:root` /
//    [data-theme='ink'] and [data-theme='paper']) and resolves every token by
//    following var() chains (with fallbacks) down to a literal colour. A
//    nested paper insert is resolved by the paper block alone.
// 3. Composites alpha: a translucent ground over the theme's resolved --bg,
//    then a translucent foreground over that ground.
// 4. Evaluates every pair in design-tokens/contrast-pairs.json (token names,
//    never hex; nothing is hard-coded here), the `forbid` rules (brand-fill on
//    paper as text, brand on paper as body text), and a static CSS scan for
//    `color: var(--brand*)` inside paper scopes and in .t-* classes whose
//    minimum size is below the large-text threshold.
// Prints a table and exits 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argVal = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
const tokensDir = path.resolve(argVal('--tokens') || path.join(here, '../../design-tokens'));
const repoRoot = path.resolve(tokensDir, '..');
const asJson = args.includes('--json');

// ── Minimal CSS parser: comments stripped, nested blocks (@layer, @media)
// flattened into rules carrying their at-rule context. ──────────────────
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseRules(css) {
  const src = stripComments(css);
  const rules = [];
  const stack = []; // prelude strings of open blocks
  let buf = '';
  let i = 0;
  let quote = null;
  let parenDepth = 0;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      buf += c;
      if (c === '\\') { buf += src[i + 1] ?? ''; i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; buf += c; i++; continue; }
    if (c === '(') parenDepth++;
    if (c === ')') parenDepth--;
    if (c === '{' && parenDepth === 0) {
      stack.push({ prelude: buf.trim(), decls: [], body: '' });
      buf = '';
      i++;
      continue;
    }
    if (c === '}' && parenDepth === 0) {
      const block = stack.pop();
      if (!block) { i++; buf = ''; continue; }
      const tail = buf.trim();
      if (tail) block.body += tail;
      buf = '';
      const decls = parseDecls(block.body);
      if (!block.prelude.startsWith('@') && decls.length) {
        rules.push({
          selector: block.prelude,
          selectors: splitTopLevel(block.prelude, ','),
          at: stack.filter((b) => b.prelude.startsWith('@')).map((b) => b.prelude),
          decls,
        });
      }
      i++;
      continue;
    }
    if (c === ';' && parenDepth === 0 && stack.length) {
      stack[stack.length - 1].body += buf + ';';
      buf = '';
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  return rules;
}

function splitTopLevel(s, sep) {
  const out = [];
  let depth = 0;
  let cur = '';
  let quote = null;
  for (const c of s) {
    if (quote) { cur += c; if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (c === sep && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseDecls(body) {
  return splitTopLevel(body, ';')
    .map((d) => {
      const idx = d.indexOf(':');
      if (idx < 0) return null;
      return { prop: d.slice(0, idx).trim(), value: d.slice(idx + 1).trim() };
    })
    .filter((d) => d && d.prop);
}

// ── Colour parsing and WCAG maths ──────────────────────────────────────
function parseColor(str) {
  const s = str.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (k) => parseInt(h.slice(k, k + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = s.match(/^rgba?\((.*)\)$/);
  if (m) {
    const parts = m[1].includes(',')
      ? m[1].split(',').map((x) => x.trim())
      : m[1].replace('/', ' ').split(/\s+/).filter(Boolean);
    const ch = (x) => (x.endsWith('%') ? (parseFloat(x) * 255) / 100 : parseFloat(x));
    const al = (x) => (x === undefined ? 1 : x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x));
    const [r, g, b, a] = parts;
    const out = { r: ch(r), g: ch(g), b: ch(b), a: al(a) };
    return [out.r, out.g, out.b, out.a].some(Number.isNaN) ? null : out;
  }
  return null;
}

function over(top, bottom) {
  const a = top.a + bottom.a * (1 - top.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (k) => (top[k] * top.a + bottom[k] * bottom.a * (1 - top.a)) / a;
  return { r: mix('r'), g: mix('g'), b: mix('b'), a };
}

function luminance({ r, g, b }) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const hex = (c) =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('') +
  (c.a < 1 ? ` @${+c.a.toFixed(2)}` : '');

// ── Build token tables ─────────────────────────────────────────────────
const read = (f) => fs.readFileSync(path.join(tokensDir, f), 'utf8');
const primitiveRules = parseRules(read('primitives.css'));
const primitives = {};
for (const r of primitiveRules) for (const d of r.decls) if (d.prop.startsWith('--')) primitives[d.prop] = d.value;

const semanticRules = parseRules(read('semantic.css')).filter((r) => r.at.every((a) => a.startsWith('@layer')));
const isInk = (sel) => sel === ':root' || /^\[data-theme=['"]?ink['"]?\]$/.test(sel);
const isPaper = (sel) => /^\[data-theme=['"]?paper['"]?\]$/.test(sel);
const themes = { ink: {}, paper: {} };
for (const r of semanticRules) {
  const target = r.selectors.some(isInk) ? 'ink' : r.selectors.some(isPaper) ? 'paper' : null;
  if (!target) continue;
  for (const d of r.decls) if (d.prop.startsWith('--')) themes[target][d.prop] = d.value;
}

function resolve(theme, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`circular var(): ${[...seen, name].join(' -> ')}`);
  seen.add(name);
  const raw = themes[theme][name] ?? primitives[name];
  if (raw === undefined) return undefined;
  return resolveValue(theme, raw, seen);
}

function resolveValue(theme, value, seen) {
  const v = value.trim();
  const m = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]*))?\)$/);
  if (m) {
    const got = resolve(theme, m[1], new Set(seen));
    if (got !== undefined) return got;
    if (m[2] !== undefined) return resolveValue(theme, m[2], seen);
    return undefined;
  }
  return v;
}

function colorOf(theme, token) {
  const name = token.startsWith('--') ? token : `--${token}`;
  const v = resolve(theme, name);
  if (v === undefined) throw new Error(`${theme}: token ${name} is not defined`);
  const c = parseColor(v);
  if (!c) throw new Error(`${theme}: token ${name} resolves to "${v}", not a colour`);
  return c;
}

// ── Evaluate pairs ─────────────────────────────────────────────────────
const config = JSON.parse(fs.readFileSync(path.join(tokensDir, 'contrast-pairs.json'), 'utf8'));
const rows = [];
const failures = [];

for (const p of config.pairs) {
  for (const theme of p.themes) {
    try {
      const ground = colorOf(theme, 'bg');
      const bg = over(colorOf(theme, p.bg), ground);
      const fg = over(colorOf(theme, p.fg), bg);
      const r = ratio(fg, bg);
      const ok = r + 1e-9 >= p.min;
      rows.push({ theme, fg: p.fg, bg: p.bg, use: p.use, fgHex: hex(fg), bgHex: hex(bg), ratio: r, min: p.min, ok });
      if (!ok) failures.push(`${theme}: --${p.fg} on --${p.bg} is ${r.toFixed(2)}:1, needs ${p.min}:1 (${p.use})`);
    } catch (e) {
      failures.push(String(e.message || e));
    }
  }
}

for (const f of config.forbid || []) {
  for (const p of config.pairs) {
    if (p.fg !== f.fg || !f.use.includes(p.use)) continue;
    for (const theme of p.themes) {
      if (f.themes.includes(theme)) {
        failures.push(`forbidden registration: --${p.fg} as ${p.use} on --${p.bg} in ${theme} (${f.reason})`);
      }
    }
  }
}

// ── Static scan: brand used as text where it is not text-safe ──────────
const scan = config.staticChecks || {};
const largeMin = Number(scan.largeTextMinPx || 24);
const cssFiles = [];
for (const rel of scan.scan || []) {
  const abs = path.join(repoRoot, rel);
  if (!fs.existsSync(abs)) continue;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.css')) cssFiles.push(p);
    }
  };
  if (fs.statSync(abs).isDirectory()) walk(abs);
  else cssFiles.push(abs);
}

// Minimum px of each .t-* class, from its font-size token in type.css.
function minPx(value) {
  const v = resolveValue('ink', value, new Set());
  if (!v) return null;
  const clamp = v.match(/^clamp\(\s*([\d.]+)px/);
  if (clamp) return parseFloat(clamp[1]);
  const px = v.match(/^([\d.]+)px$/);
  return px ? parseFloat(px[1]) : null;
}
const typeRules = fs.existsSync(path.join(tokensDir, 'type.css')) ? parseRules(read('type.css')) : [];
for (const r of typeRules) for (const d of r.decls) if (d.prop.startsWith('--t-')) themes.ink[d.prop] ??= d.value;
const tClassMin = {};
for (const r of typeRules) {
  const size = r.decls.find((d) => d.prop === 'font-size');
  if (!size) continue;
  for (const sel of r.selectors) {
    const m = sel.match(/^\.(t-[\w-]+)$/);
    if (m) tClassMin[m[1]] = minPx(size.value);
  }
}

const brandText = /^var\(\s*--brand(?:-fill)?\s*[,)]/;
for (const file of cssFiles) {
  const rel = path.relative(repoRoot, file);
  for (const r of parseRules(fs.readFileSync(file, 'utf8'))) {
    const colorDecl = r.decls.find((d) => d.prop === 'color' && brandText.test(d.value));
    if (!colorDecl) continue;
    for (const sel of r.selectors) {
      if (/\[data-theme=['"]?paper['"]?\]/.test(sel)) {
        failures.push(`${rel}: "${sel}" sets color: ${colorDecl.value} inside a paper scope (brand is fill only / large text only on paper)`);
      }
      for (const [cls, px] of Object.entries(tClassMin)) {
        if (new RegExp(`\\.${cls}(?![\\w-])`).test(sel) && px !== null && px < largeMin) {
          failures.push(`${rel}: "${sel}" sets color: ${colorDecl.value} on .${cls} (min ${px}px < ${largeMin}px)`);
        }
      }
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────
if (asJson) {
  console.log(JSON.stringify({ rows, failures }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`Contrast check: ${path.relative(process.cwd(), tokensDir) || tokensDir}`);
  console.log(pad('theme', 6), pad('fg', 11), pad('bg', 11), pad('use', 6), pad('fg hex', 10), pad('bg hex', 10), pad('ratio', 7), pad('min', 4), 'result');
  for (const r of rows) {
    console.log(
      pad(r.theme, 6), pad(r.fg, 11), pad(r.bg, 11), pad(r.use, 6), pad(r.fgHex, 10), pad(r.bgHex, 10),
      pad(r.ratio.toFixed(2), 7), pad(r.min, 4), r.ok ? 'pass' : 'FAIL'
    );
  }
  console.log(`Static scan: ${cssFiles.length} CSS file(s) for brand-as-text in paper scopes and .t-* below ${largeMin}px.`);
  if (failures.length) {
    console.log(`\n${failures.length} failure(s):`);
    for (const f of failures) console.log(`  - ${f}`);
  } else {
    console.log('\nAll contrast checks pass.');
  }
}
process.exit(failures.length ? 1 : 0);
