#!/usr/bin/env node
// i18n gate (WP5). Parses lib/i18n/types.ts for the key lists and each
// locale file for its keys/values (static text scan, no TS build needed).
//
//  - English must define every BaseKey and NewKey.
//  - Other locales must define every BaseKey (error) and are reported per
//    locale for NewKey gaps (error with --strict-new, otherwise listed as
//    "pending" until the translator agents / WP21 land).
//  - No value may contain: premium, eco-friendly, Issue 01, TODO, lorem,
//    XXX, or a hard-coded run/SKU literal (RUN 0042, MF-0001).
//  - Keys in PENDING_WP12 still hold pre-Round 9 copy; they are reported as
//    warnings until WP12 rewrites them. Empty the set then.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'lib', 'i18n');
const LOCALES = ['en', 'pt', 'es', 'fr', 'nl', 'de'];
const strictNew = process.argv.includes('--strict-new');

const PENDING_WP12 = new Set(['home.header.line', 'home.cloth.eco']);

const BANNED = [
  [/premium/i, 'premium'],
  [/eco-friendly/i, 'eco-friendly'],
  [/issue\s*01/i, 'Issue 01'],
  [/\bTODO\b/, 'TODO'],
  [/lorem/i, 'lorem'],
  [/\bXXX\b/, 'XXX'],
  [/\bRUN\s*\d+/i, 'hard-coded run number'],
  [/\bMF-\d+/i, 'hard-coded SKU'],
];

function unionKeys(src, name) {
  const m = src.match(new RegExp(`export type ${name} =([\\s\\S]*?);\\n`));
  if (!m) throw new Error(`type ${name} not found in types.ts`);
  return [...m[1].matchAll(/\|\s*'([^']+)'/g)].map((x) => x[1]);
}

// Reads 'key': 'value' | "value" | `value` entries, including a value on the
// following line. Handles \' escapes.
function readDict(file) {
  const src = readFileSync(file, 'utf8');
  const out = new Map();
  const re = /^\s*'([^']+)':\s*(?:\n\s*)?('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)\s*,/gm;
  let m;
  while ((m = re.exec(src))) out.set(m[1], m[2].slice(1, -1));
  return out;
}

const types = readFileSync(join(dir, 'types.ts'), 'utf8');
const base = unionKeys(types, 'BaseKey');
const added = unionKeys(types, 'NewKey');

let errors = 0;
let warnings = 0;
const log = (lvl, msg) => {
  if (lvl === 'error') errors++;
  if (lvl === 'warn') warnings++;
  console.log(`${lvl.padEnd(5)} ${msg}`);
};

for (const lang of LOCALES) {
  const dict = readDict(join(dir, `${lang}.ts`));
  const missBase = base.filter((k) => !dict.has(k));
  const missNew = added.filter((k) => !dict.has(k));
  if (missBase.length) log('error', `${lang}: ${missBase.length} base keys missing: ${missBase.join(', ')}`);
  if (missNew.length) {
    const lvl = lang === 'en' || strictNew ? 'error' : 'warn';
    log(lvl, `${lang}: ${missNew.length}/${added.length} Round 9 keys missing${lang === 'en' ? '' : ' (English fallback)'}${missNew.length <= 12 ? ': ' + missNew.join(', ') : ''}`);
  }
  const known = new Set([...base, ...added]);
  for (const k of dict.keys()) if (!known.has(k)) log('error', `${lang}: unknown key ${k}`);
  for (const [k, v] of dict) {
    for (const [re, label] of BANNED) {
      if (re.test(v)) log(PENDING_WP12.has(k) ? 'warn' : 'error', `${lang}: ${k} contains ${label}${PENDING_WP12.has(k) ? ' (pending WP12)' : ''}`);
    }
    if (added.includes(k)) {
      for (const s of v.split(/(?<=[.!?])\s+/)) {
        const words = s.trim().split(/\s+/).filter(Boolean).length;
        if (words > 14) log('warn', `${lang}: ${k} has a sentence over 14 words (${words})`);
      }
    }
  }
}

console.log(`\ni18n: ${errors} error(s), ${warnings} warning(s); ${base.length} base + ${added.length} new keys`);
process.exit(errors ? 1 : 0);
