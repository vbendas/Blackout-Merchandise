#!/usr/bin/env node
// Production guard (WP3, Round 9 plan 11.10).
//
// Run AFTER `npm run build` (and, for the HTTP check, with `npm run start`):
//
//   node scripts/verify/prod-guard.mjs [--base http://localhost:3000] [--allow-missing]
//
// Asserts about the PRODUCTION build output in .next:
//   1. no /dev/* route (route manifests, app output folders);
//   2. no dev-only specimen asset (Mornsey-specimen font);
//   3. no GC Grind font file (by file name AND by the font's own name table),
//      unless design-tokens/LICENCES.md records the licence, i.e. carries the
//      marker comment `<!-- gc-grind-licence: recorded -->` (it ships as
//      `pending`);
// and, with --base (a running `next start`):
//   4. /dev/specimen and /dev/styleguide answer 404.
//
// SPECIMEN=1 (in this script's environment) mirrors a build/start that opted
// in to the dev routes: the routes are then allowed and the HTTP check is
// skipped, but the GC Grind licence rule still applies (an opted-in specimen
// build ships GC Grind). Exit 0 = pass, 1 = fail, 2 = bad usage.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const nextDir = path.join(root, '.next');
const licencesFile = path.resolve(root, '../design-tokens/LICENCES.md');

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[k.slice(2)] = true;
    else { a[k.slice(2)] = next; i++; }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const optedIn = process.env.SPECIMEN === '1';
const failures = [];
const notes = [];
const fail = (m) => failures.push(m);

// ── 0. there must be a production build ──────────────────────────────────
if (!fs.existsSync(path.join(nextDir, 'BUILD_ID'))) {
  const msg = 'prod-guard: no production build in .next (BUILD_ID missing). Run "npm run build" first.';
  if (args['allow-missing']) {
    console.log(`${msg} Skipping (--allow-missing).`);
    process.exit(0);
  }
  console.error(msg);
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(['dev', 'cache', 'diagnostics', 'trace', 'types']);

function walk(dir, out = [], top = true) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (top && SKIP_DIRS.has(e.name)) continue; // .next/dev is the dev server's output
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out, false);
    else out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(root, p);
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };

function collectRoutes(value, out) {
  if (typeof value === 'string') { if (value.startsWith('/')) out.add(value); return; }
  if (Array.isArray(value)) { value.forEach((v) => collectRoutes(v, out)); return; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('/')) out.add(k);
      collectRoutes(v, out);
    }
  }
}

// ── 1. no /dev/* route ───────────────────────────────────────────────────
const manifests = [
  'routes-manifest.json',
  'app-path-routes-manifest.json',
  'server/app-paths-manifest.json',
  'server/pages-manifest.json',
  'prerender-manifest.json',
  'build-manifest.json',
];
const routes = new Set();
for (const m of manifests) {
  const data = readJson(path.join(nextDir, m));
  if (data) collectRoutes(data, routes);
}
const devRoutes = [...routes].filter((r) => r === '/dev' || r.startsWith('/dev/'));
const devOutput = [path.join(nextDir, 'server/app/dev'), path.join(nextDir, 'server/app/dev.html')].filter((p) =>
  fs.existsSync(p)
);
if (optedIn) {
  notes.push('SPECIMEN=1: /dev/* routes allowed');
} else {
  for (const r of devRoutes) fail(`route ${r} is in the production build (the dev.tsx page extension must not be registered)`);
  for (const p of devOutput) fail(`${rel(p)} exists in the production output`);
}
notes.push(`${routes.size} routes inspected, ${devRoutes.length} under /dev`);

// ── 2 + 3. fonts ─────────────────────────────────────────────────────────
const files = walk(nextDir);
const fontFiles = files.filter((f) => /\.(woff2?|ttf|otf)$/i.test(f));

let fontkit = null;
try {
  fontkit = createRequire(path.join(root, 'package.json'))('fontkit');
} catch {
  notes.push('fontkit not installed: GC Grind is checked by file name only');
}

const licenceText = fs.existsSync(licencesFile) ? fs.readFileSync(licencesFile, 'utf8') : '';
const grindLicensed = /<!--\s*gc-grind-licence:\s*recorded\s*-->/i.test(licenceText);
notes.push(`GC Grind licence ${grindLicensed ? 'RECORDED' : 'not recorded'} in design-tokens/LICENCES.md`);

const families = [];
for (const f of fontFiles) {
  const name = path.basename(f);
  let family = '';
  if (fontkit) {
    try {
      const font = fontkit.create(fs.readFileSync(f));
      family = [font.familyName, font.fullName, font.postscriptName].filter(Boolean).join(' | ');
    } catch {
      // unreadable font: name-only checks still run
    }
  }
  families.push(`${name}${family ? ` (${family})` : ''}`);

  if (/specimen/i.test(name) && !optedIn) {
    fail(`${rel(f)}: dev-only specimen font in the production build`);
  }
  const isGrind = /gc[-_ ]?grind/i.test(name) || /gc[-_ ]?grind/i.test(family);
  if (isGrind && !grindLicensed) {
    fail(`${rel(f)}: GC Grind is in the build but design-tokens/LICENCES.md does not record the licence`);
  }
}
notes.push(`${fontFiles.length} font file(s) in the build`);
if (args.verbose) for (const f of families) notes.push(`  font ${f}`);

// ── 4. HTTP: /dev/* answers 404 (needs a running `next start`) ───────────
if (args.base && args.base !== true) {
  const base = String(args.base).replace(/\/$/, '');
  if (optedIn) {
    notes.push('SPECIMEN=1: HTTP 404 check skipped');
  } else {
    for (const p of ['/dev/specimen', '/dev/styleguide']) {
      try {
        const res = await fetch(base + p, { redirect: 'manual' });
        if (res.status !== 404) fail(`${base}${p} answered ${res.status}, expected 404`);
        else notes.push(`${p} -> 404`);
      } catch (e) {
        fail(`${base}${p}: request failed (${e.message}). Is "npm run start" running?`);
      }
    }
  }
} else {
  notes.push('HTTP check skipped (pass --base http://localhost:3000 with `npm run start` running)');
}

// ── report ───────────────────────────────────────────────────────────────
for (const n of notes) console.log(`prod-guard: ${n}`);
if (failures.length) {
  for (const f of failures) console.error(`prod-guard FAIL: ${f}`);
  console.error(`prod-guard: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('prod-guard: pass');
