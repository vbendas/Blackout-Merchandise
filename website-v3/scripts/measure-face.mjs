#!/usr/bin/env node
// Measure the display face and print (or write) its metric-block values
// (Round 9 plan 4.2 / 4.6, WP4).
//
//   node scripts/measure-face.mjs                       # auto-find the display face
//   node scripts/measure-face.mjs --file a.woff2,b.woff2 [--lh 0.9] [--tracking -0.01]
//   node scripts/measure-face.mjs --family Anton --write # patch design-tokens/type.css
//   node scripts/measure-face.mjs --json
//
// What it measures, from the font files themselves (fontkit):
//   - average caps advance per em for the fitted words (MERCHFROM and the
//     per-locale APPLY words), with and without the display tracking;
//   - cap height and the vertical ink of ACCENTED caps (umlauts, tildes,
//     circumflexes, cedillas) in em;
//   - for the chosen --display-lh, how far that ink pokes outside the line
//     box on the top and bottom, under each vertical-metrics set a browser may
//     use (hhea, OS/2 typo, OS/2 win), and the symmetric padding
//     (--display-pad) that contains it.
//
// Font discovery: when no --file is given, the @font-face rules next/font
// emitted for --family (default: the family named in design-tokens/type.css
// notes, "Anton") are read from .next/dev/static/chunks or .next/static, and
// every unicode-range subset file is merged (latin first, then latin-ext).
// Run `npm run dev` (or a build) once first so those files exist.
//
// --write edits ONLY the measured lines of the metric block in
// design-tokens/type.css (--display-fit, --display-pad).
// Weight, tracking and line height are design choices: pass --lh/--tracking.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const typeCss = path.resolve(root, '../design-tokens/type.css');
const args = process.argv.slice(2);
const val = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};
const flag = (k) => args.includes(k);

const family = val('--family', 'Anton');
const lh = Number(val('--lh', readVar('--display-lh') ?? '0.9'));
const tracking = parseEm(val('--tracking', readVar('--display-tracking') ?? '-0.01em'));
const asJson = flag('--json');

function readVar(name) {
  try {
    const css = fs.readFileSync(typeCss, 'utf8');
    const m = css.match(new RegExp(`${name}:\\s*([^;]+);`));
    return m ? m[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

function parseEm(v) {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

// ── 1. Find the font files ────────────────────────────────────────────────
function findFiles() {
  const explicit = val('--file');
  if (explicit) return explicit.split(',').map((f) => path.resolve(f));
  const cssDirs = [
    '.next/dev/static/chunks',
    '.next/static/css',
    '.next/static/chunks',
  ].map((d) => path.join(root, d));
  const hits = [];
  for (const dir of cssDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.css')) continue;
      const full = path.join(dir, f);
      const css = fs.readFileSync(full, 'utf8');
      const re = /@font-face\s*\{([^}]*)\}/g;
      let m;
      while ((m = re.exec(css))) {
        const body = m[1];
        const fam = body.match(/font-family:\s*['"]?([^;'"]+)['"]?\s*;/)?.[1]?.trim();
        if (fam !== family) continue;
        const src = body.match(/url\(["']?([^)"']+\.woff2)["']?\)/)?.[1];
        if (!src) continue;
        const file = path.resolve(path.dirname(full), src);
        if (!fs.existsSync(file)) continue;
        const range = body.match(/unicode-range:\s*([^;]+);/)?.[1] ?? '';
        hits.push({ file, range, mtime: fs.statSync(full).mtimeMs });
      }
    }
  }
  // Newest stylesheet first; dedupe by file. latin (covers U+0000-00FF) first.
  hits.sort((a, b) => b.mtime - a.mtime);
  const seen = new Set();
  const uniq = hits.filter((h) => (seen.has(h.file) ? false : seen.add(h.file)));
  uniq.sort((a, b) => Number(/U\+0000-00FF|U\+\?\?/.test(b.range)) - Number(/U\+0000-00FF|U\+\?\?/.test(a.range)));
  return uniq.map((h) => h.file);
}

const files = findFiles();
if (!files.length) {
  console.error(`measure-face: no font files for "${family}". Run \`npm run dev\` once, or pass --file a.woff2,b.woff2`);
  process.exit(2);
}
const fonts = files.map((f) => {
  const font = fontkit.openSync(f);
  return font.fonts ? font.fonts[0] : font;
});
const base = fonts[0];
const upem = base.unitsPerEm;

function fontFor(cp) {
  return fonts.find((f) => f.hasGlyphForCodePoint(cp));
}

// ── 2. Per-word metrics ───────────────────────────────────────────────────
function measureWord(word) {
  let advance = 0;
  let yMax = -Infinity;
  let yMin = Infinity;
  const missing = [];
  for (const ch of word) {
    const cp = ch.codePointAt(0);
    const f = fontFor(cp);
    if (!f) {
      missing.push(ch);
      continue;
    }
    const run = f.layout(ch);
    for (const g of run.glyphs) {
      advance += g.advanceWidth / f.unitsPerEm;
      const bb = g.bbox;
      if (bb && bb.maxY > bb.minY) {
        yMax = Math.max(yMax, bb.maxY / f.unitsPerEm);
        yMin = Math.min(yMin, bb.minY / f.unitsPerEm);
      }
    }
  }
  const n = [...word].length;
  return { word, chars: n, advance, perChar: advance / n, perCharTracked: advance / n + tracking, yMax, yMin, missing };
}

// Kerning-aware width of the whole string (what the browser really lays out).
function laidOutAdvance(word) {
  const f = base;
  const run = f.layout(word);
  return run.glyphs.reduce((s, g) => s + g.advanceWidth, 0) / f.unitsPerEm;
}

// Fitted words in the six locales: the masthead, APPLY (waitlist.apply) and
// accented stress words for the 404 headline and long inner-page titles.
const FIT_WORDS = {
  masthead: ['MERCHFROM'],
  apply: ['APPLY', 'BEWERBEN', 'SOLICITAR', 'POSTULER', 'AANMELDEN', 'CANDIDATAR'],
  // Every accented capital the six locales can put in a fitted word.
  accented: [
    'ÄÖÜ', // de
    'ÁÂÃÀÇÉÊÍÓÔÕÚ', // pt
    'ÈËÎÏÙÛÜŸŒÀÂÇÉÊÔ', // fr
    'ÁÉÍÓÚÑÜ', // es
    'ÉËÏÓ', // nl
  ],
  // Latin Extended-A stress (artist names, other languages). Reported only.
  stress: ['ÅÆØŁŠŽĆČĘ'],
};

const results = {};
for (const [group, words] of Object.entries(FIT_WORDS)) results[group] = words.map(measureWord);

const mast = results.masthead[0];
const mastLaid = laidOutAdvance('MERCHFROM');

// ── 3. Vertical metrics under each metrics set a browser may use ──────────
const os2 = base['OS/2'] || {};
const hhea = base.hhea || {};
const sets = {
  hhea: { asc: hhea.ascent / upem, desc: -hhea.descent / upem },
  typo: { asc: os2.typoAscender / upem, desc: -os2.typoDescender / upem },
  win: { asc: os2.winAscent / upem, desc: os2.winDescent / upem },
};
for (const s of Object.values(sets)) {
  if (![s.asc, s.desc].every(Number.isFinite)) {
    s.asc = NaN;
    s.desc = NaN;
  }
}

// Horizontal overshoot of a single glyph's ink past its advance box (em):
// a circumflex or diaeresis on a narrow letter (I) is wider than the letter.
let inlineOvershoot = 0;
let inlineOvershootChar = '';
for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜÃÕÇÁÂÀÉÊÈËÍÎÏÓÔÚÛÙÑŒŸ') {
  const f = fontFor(ch.codePointAt(0));
  if (!f) continue;
  const g = f.layout(ch).glyphs[0];
  const o = Math.max((g.bbox.maxX - g.advanceWidth) / f.unitsPerEm, -g.bbox.minX / f.unitsPerEm);
  if (o > inlineOvershoot) {
    inlineOvershoot = o;
    inlineOvershootChar = ch;
  }
}

const accentInk = results.accented.reduce(
  (acc, w) => ({ yMax: Math.max(acc.yMax, w.yMax), yMin: Math.min(acc.yMin, w.yMin) }),
  { yMax: -Infinity, yMin: Infinity },
);
const capInk = results.masthead[0];
const stressInk = results.stress.reduce(
  (acc, w) => ({ yMax: Math.max(acc.yMax, w.yMax), yMin: Math.min(acc.yMin, w.yMin) }),
  { yMax: -Infinity, yMin: Infinity },
);
const allInk = {
  yMax: Math.max(accentInk.yMax, ...results.apply.map((w) => w.yMax), capInk.yMax),
  yMin: Math.min(accentInk.yMin, ...results.apply.map((w) => w.yMin), capInk.yMin),
};

// Ink position relative to the line box (em of the font size). Baseline sits at
// L/2 + (asc - desc)/2 from the line-box top (CSS half-leading model).
function overshoot(set, L, ink) {
  const baseline = L / 2 + (set.asc - set.desc) / 2;
  const top = baseline - ink.yMax; // negative = above the line box
  const bottom = baseline - ink.yMin; // beyond L = below the line box
  return { above: Math.max(0, -top), below: Math.max(0, bottom - L) };
}

const perSet = {};
let needTop = 0; // accented caps above the line box, any metrics set
let needBottomAccent = 0; // cedilla etc. below, hhea/typo (macOS, Linux, Android)
let needBottomCaps = 0; // plain caps below, any metrics set
let winBottomAccent = 0; // cedilla below under OS/2 win metrics (Windows), reported
for (const [name, set] of Object.entries(sets)) {
  if (!Number.isFinite(set.asc)) continue;
  const o = overshoot(set, lh, allInk);
  const capsOnly = overshoot(set, lh, { yMax: results.masthead[0].yMax, yMin: results.masthead[0].yMin });
  perSet[name] = { ...set, accentedAbove: o.above, accentedBelow: o.below, mastheadAbove: capsOnly.above, mastheadBelow: capsOnly.below };
  needTop = Math.max(needTop, o.above);
  needBottomCaps = Math.max(needBottomCaps, capsOnly.below);
  if (name === 'win') winBottomAccent = o.below;
  else needBottomAccent = Math.max(needBottomAccent, o.below);
}
const needBottom = Math.max(needBottomAccent, needBottomCaps);

const round = (n, p = 3) => Number(n.toFixed(p));
// The stroke (half of it sits outside the glyph) and the 2px misregistration
// copy add px of ink that do not scale with the font size, so at the smallest
// fitted size (the 390px masthead, about 74px) they are a larger share of an em.
const STROKE_PX = Number(parseFloat(readVar('--display-stroke') ?? '2.5')) / 2;
const MISREG_PX = 2;
const MIN_FIT_PX = 74;
const fixedInkEm = (STROKE_PX + MISREG_PX) / MIN_FIT_PX;
// Pad rounded UP to the next 0.01em (anti-aliasing and rounding headroom).
const up = (n) => Math.ceil((n + 0.002) * 100) / 100;
// One symmetric token: the larger of the top and bottom needs, plus the
// size-independent px ink above.
const pad = Number(up(Math.max(needTop, needBottom) + fixedInkEm).toFixed(2));

// Clip the old fixed 0.12em padding would leave (the number WP3 reported).
const oldPad = 0.12;
const clipAtOldPad = Math.max(0, needTop - oldPad);

const summary = {
  family,
  files: files.map((f) => path.relative(root, f)),
  unitsPerEm: upem,
  lineHeight: lh,
  tracking,
  capHeightEm: round(base.capHeight / upem),
  mastheadPerCharEm: round(mast.perChar),
  mastheadPerCharKernedEm: round(mastLaid / mast.chars),
  mastheadPerCharTrackedEm: round(mastLaid / mast.chars + tracking),
  mastheadFitEm: round((mastLaid + (mast.chars - 1) * tracking) / mast.chars),
  applyPerCharEm: results.apply.map((w) => ({ word: w.word, perChar: round(w.perChar) })),
  accentedInkEm: { top: round(accentInk.yMax), bottom: round(accentInk.yMin) },
  inlineOvershootEm: { em: round(inlineOvershoot), char: inlineOvershootChar },
  latinExtStressInkEm: { top: round(stressInk.yMax), bottom: round(stressInk.yMin) },
  verticalMetrics: perSet,
  worstOvershootEm: { above: round(needTop), below: round(needBottom), belowWindowsCedilla: round(winBottomAccent) },
  clipAtPad012Em: round(clipAtOldPad),
  recommend: {
    '--display-fit': round((mastLaid + (mast.chars - 1) * tracking) / mast.chars),
    '--display-pad': `${pad}em`,
  },
  missingGlyphs: Object.values(results)
    .flat()
    .flatMap((w) => w.missing),
};

if (asJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`face: ${family}   files: ${summary.files.length}   upem: ${upem}   lh: ${lh}   tracking: ${tracking}em`);
  console.log(`cap height: ${summary.capHeightEm}em`);
  console.log(`MERCHFROM em/char: raw ${summary.mastheadPerCharEm}, kerned ${summary.mastheadPerCharKernedEm}, with tracking ${summary.mastheadPerCharTrackedEm}, fit (no trailing spacing) ${summary.mastheadFitEm}`);
  console.log(`APPLY words em/char: ${summary.applyPerCharEm.map((w) => `${w.word} ${w.perChar}`).join(', ')}`);
  console.log(`accented caps ink: top ${summary.accentedInkEm.top}em, bottom ${summary.accentedInkEm.bottom}em (em above/below baseline)`);
  console.log(`latin-ext stress ink (reported, not used for the pad): top ${summary.latinExtStressInkEm.top}em, bottom ${summary.latinExtStressInkEm.bottom}em`);
  console.log(`inline overshoot: ${inlineOvershootChar} pokes ${round(inlineOvershoot)}em past its advance box on each side; a fitted word must not START or END with it (the wrapper clips at the box edge).`);
  console.log('');
  console.log('overshoot outside the line box (em), per vertical-metrics set:');
  for (const [name, s] of Object.entries(perSet)) {
    console.log(
      `  ${name.padEnd(5)} asc ${round(s.asc)} desc ${round(s.desc)}  | accented: above ${round(s.accentedAbove)} below ${round(s.accentedBelow)}  | MERCHFROM: above ${round(s.mastheadAbove)} below ${round(s.mastheadBelow)}`,
    );
  }
  console.log(`  at the old --display-pad 0.12em the accented caps clip by ${summary.clipAtPad012Em}em`);
  console.log('');
  console.log('recommended metric-block values:');
  for (const [k, v] of Object.entries(summary.recommend)) console.log(`  ${k}: ${v};`);
  if (summary.missingGlyphs.length) console.log(`\nmissing glyphs: ${[...new Set(summary.missingGlyphs)].join(' ')}`);
  console.log('');
  console.log(`pad includes ${round(fixedInkEm)}em for the ${STROKE_PX}px half-stroke + ${MISREG_PX}px misregistration at ${MIN_FIT_PX}px.`);
  console.log(`bottom: a cedilla under Windows (OS/2 win) metrics would still clip by ${round(Math.max(0, winBottomAccent - pad))}em at this pad; plain caps never do.`);
  console.log('Note: top clearance (L/2 + pad) and bottom clearance trade 1:1 against line height,');
  console.log('so raising --display-lh by 2x adds exactly the same total height as raising the pad by x.');
  console.log('Pad is preferred: it only affects fitted words, not every heading and stat.');
}

if (flag('--write')) {
  let css = fs.readFileSync(typeCss, 'utf8');
  const setVar = (name, value) => {
    const re = new RegExp(`(${name}:\\s*)([^;]+)(;)`);
    if (!re.test(css)) {
      console.error(`measure-face: ${name} not found in type.css, skipped`);
      return;
    }
    css = css.replace(re, `$1${value}$3`);
  };
  setVar('--display-fit', String(summary.recommend['--display-fit']));
  setVar('--display-pad', summary.recommend['--display-pad']);
  fs.writeFileSync(typeCss, css);
  console.log('\nwrote --display-fit and --display-pad to design-tokens/type.css');
}
