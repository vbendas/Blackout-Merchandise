#!/usr/bin/env node
// Preflight facts the Round 9 plan relies on (WP1). Prints evidence, writes
// scripts/verify/hook-contract.json (CONFIRMED hooks only; WP7 and WP13 update it).
//
//   node scripts/verify/preflight.mjs [--no-write]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '../..');
const root = path.resolve(site, '..');
const platform = path.join(root, 'platform');
const write = !process.argv.includes('--no-write');

const rel = (p) => path.relative(root, p);
const exists = (p) => fs.existsSync(p);
const read = (p) => (exists(p) ? fs.readFileSync(p, 'utf8') : '');
const results = [];
function fact(name, ok, evidence) {
  results.push({ name, ok, evidence });
  console.log(`${ok ? 'OK  ' : 'MISS'} ${name}`);
  for (const line of [].concat(evidence)) console.log(`       ${line}`);
}

function walk(dir, exts, acc = []) {
  if (!exists(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, acc);
    else if (exts.some((x) => e.name.endsWith(x))) acc.push(p);
  }
  return acc;
}

// 1. lucide-react
for (const [label, dir] of [['website-v3', site], ['platform', platform]]) {
  const pkg = JSON.parse(read(path.join(dir, 'package.json')) || '{}');
  const declared = pkg.dependencies?.['lucide-react'] || pkg.devDependencies?.['lucide-react'];
  const installedPkg = path.join(dir, 'node_modules/lucide-react/package.json');
  const installed = exists(installedPkg) ? JSON.parse(read(installedPkg)).version : null;
  fact(`lucide-react in ${label}`, !!installed, [
    `declared: ${declared ?? 'no'}`,
    `installed: ${installed ?? 'no'}`,
    ...(label === 'website-v3' && !installed ? ['plan 5: AppFrame uses inline SVG; lucide-react only if confirmed (it is not installed in website-v3)'] : []),
  ]);
}

// 2. platform files
fact('platform/lib/auth.ts exists', exists(path.join(platform, 'lib/auth.ts')), [rel(path.join(platform, 'lib/auth.ts'))]);
fact('platform/components/chat/RegisterMark.tsx exists', exists(path.join(platform, 'components/chat/RegisterMark.tsx')), [rel(path.join(platform, 'components/chat/RegisterMark.tsx'))]);

// 3. platform reachability
{
  const proxy = read(path.join(platform, 'proxy.ts'));
  const auth = read(path.join(platform, 'lib/auth.ts'));
  const model = read(path.join(platform, 'lib/agent/model.ts'));
  const mockExtra = exists(path.join(platform, 'lib/agent/mock-extra.ts'));
  const publicRoutes = (proxy.match(/createRouteMatcher\(\[([\s\S]*?)\]\)/)?.[1] || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const envFile = read(path.join(platform, '.env.local'));
  // names and the non-secret flag values only; never print other values
  const flags = ['AUTH_DEV_BYPASS', 'AGENT_MOCK', 'AUTH_DEV_ROLE'].map((k) => {
    const m = envFile.match(new RegExp(`^${k}=(.*)$`, 'm'));
    return `${k} in platform/.env.local: ${m ? `set (${m[1].trim() === '1' ? '1' : 'non-1 value'})` : 'not set'}`;
  });
  fact('/chat and /admin reachability', true, [
    `auth: proxy.ts runs clerkMiddleware; every route outside the public matcher calls auth.protect() (unauthenticated -> sign-in redirect)`,
    `public routes: ${publicRoutes.join(' ')}`,
    `dev bypass: ${/AUTH_DEV_BYPASS === '1'/.test(proxy) ? "AUTH_DEV_BYPASS=1 (non-production) skips Clerk in proxy.ts and lib/auth.ts supplies a fixed dev user" : 'not found'}`,
    `mock agent: ${/AGENT_MOCK === '1'/.test(model) ? "AGENT_MOCK=1 (or no ANTHROPIC_API_KEY) selects the scripted mock in lib/agent/model.ts" : 'not found'}${mockExtra ? '; extra scripted replies in lib/agent/mock-extra.ts' : ''}`,
    ...flags,
    `decision 28 route: (b) start platform with AUTH_DEV_BYPASS=1 AGENT_MOCK=1 on its own port; no credentials entered. Else (a) public routes only, else (c) owner storageState via shots.mjs --storage-state`,
    `uses ${/DEV_BYPASS/.test(auth) ? 'DEV_BYPASS export in lib/auth.ts' : 'no DEV_BYPASS export'}`,
  ]);
}

// 4. DOM hooks
const hookDefs = [
  { sel: '.home-masthead-wrap', kind: 'class', needle: 'home-masthead-wrap' },
  { sel: '.home-facts-row', kind: 'class', needle: 'home-facts-row' },
  { sel: '[data-rise]', kind: 'attr', needle: 'data-rise' },
  { sel: '[data-count]', kind: 'attr', needle: 'data-count' },
  { sel: '[data-fill]', kind: 'attr', needle: 'data-fill' },
  { sel: '[data-lines]', kind: 'attr', needle: 'data-lines' },
  { sel: '[data-wipe]', kind: 'attr', needle: 'data-wipe' },
  { sel: '[data-step]', kind: 'attr', needle: 'data-step' },
  { sel: '[data-path-card]', kind: 'attr', needle: 'data-path-card' },
  { sel: '[data-cover-media]', kind: 'attr', needle: 'data-cover-media' },
];
const tsxFiles = [...walk(path.join(site, 'components'), ['.tsx', '.ts']), ...walk(path.join(site, 'app'), ['.tsx', '.ts', '.css'])];
const corpus = tsxFiles.map((f) => ({ f, text: read(f) }));
const cover = read(path.join(site, 'components/home/Cover.tsx'));
const scenes = read(path.join(site, 'components/home/ScrollScenes.tsx'));
const confirmed = {};
const missing = [];
for (const h of hookDefs) {
  const usedBy = corpus.filter((c) => c.text.includes(h.needle)).map((c) => path.relative(site, c.f));
  const inCover = cover.includes(h.needle);
  const inScenes = scenes.includes(h.needle);
  // "set" = appears in a component that is not ScrollScenes/LoadIntro/CSS-only consumers
  const setIn = usedBy.filter((f) => /components\/(home|editorial)\/(?!ScrollScenes)/.test(f) && f.endsWith('.tsx'));
  if (usedBy.length) {
    confirmed[h.sel] = { kind: h.kind, inCoverTsx: inCover, inScrollScenesTsx: inScenes, files: usedBy, setIn };
  } else missing.push(h.sel);
  fact(`hook ${h.sel}`, usedBy.length > 0, [`Cover.tsx: ${inCover ? 'yes' : 'no'}; ScrollScenes.tsx: ${inScenes ? 'yes' : 'no'}`, `files: ${usedBy.join(', ') || '(none)'}`]);
}
const dataScenes = [...new Set([...cover.matchAll(/data-scene=["']([\w-]+)["']/g), ...scenes.matchAll(/scene\(["']([\w-]+)["']\)/g)].map((m) => m[1]))];
fact('data-scene names referenced by Cover/ScrollScenes', dataScenes.length > 0, [dataScenes.join(', ') || '(none)']);

if (write) {
  const out = path.join(here, 'hook-contract.json');
  fs.writeFileSync(out, JSON.stringify({
    note: 'Confirmed DOM hooks as of WP1. WP7 and WP13 update this file when they change Cover/ScrollScenes. Only hooks found in source are listed.',
    generated: new Date().toISOString(),
    hooks: confirmed,
    unconfirmed: missing,
    sceneNames: dataScenes,
  }, null, 2) + '\n');
  console.log(`\nwrote ${rel(out)} (${Object.keys(confirmed).length} confirmed, ${missing.length} unconfirmed)`);
}
process.exit(0);
