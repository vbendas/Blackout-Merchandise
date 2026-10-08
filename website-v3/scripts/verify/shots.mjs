#!/usr/bin/env node
// Round 9 screenshot harness (WP1).
//
//   node scripts/verify/shots.mjs --out .verify/before --routes /,/about --lang en
//
// Per route it writes, into --out:
//   <name>-desktop-NN.jpg   1440x900, scrolled through (matches baseline naming)
//   <name>-mobile-NN.jpg    390x844, scrolled through
//   <name>-reduced-NN.jpg   1440x900, prefers-reduced-motion: reduce
//   heights.json            scroll heights / widths per route and viewport
//
// Locale is NOT a cookie: lib/i18n/index.ts reads localStorage['mf-lang'] and
// loads the dictionary chunk client-side. We seed localStorage before any page
// script runs, then wait for <html lang> to flip (the provider sets it only
// once the dictionary has arrived) and for document.fonts.ready.
//
// Flags:
//   --base <url>            default http://localhost:3004
//   --out <dir>             default .verify/shots-<timestamp>
//   --routes a,b,c          default /,/about,/contact,/waitlist,/catalog,/gallery,/nope
//   --lang <code[,code]>    default en. With several codes, files get a -<lang> suffix
//   --shots d,m,r           subset of desktop,mobile,reduced (default all three)
//   --step-desktop 760      scroll step in px (baseline used 760)
//   --step-mobile 700       scroll step in px (baseline used 700)
//   --settle 1400           ms to wait after each scroll (and after load)
//   --max-shots 40          cap per route/viewport
//   --format jpg|png        default jpg (quality 80)
//   --intro                 let the one-time load intro play (default: skipped
//                           via sessionStorage so captures are deterministic)
//   --storage-state <file>  Playwright storageState JSON (platform pages, decision 28)
//   --specimen              WP3 mode: route /dev/specimen, full-page captures per
//                           lang, optional --query "d=anton&m=jetbrains&g=...&l=..."
//                           and --themes ink,paper (adds &theme=<t> to the URL)
//   --seed <n>              seed Math.random (default 1337) so shuffled grids (catalog,
//                           gallery) render identically on every visit; --seed off disables
//   --focus <sel,sel>       also Tab (keyboard modality, so :focus-visible applies) to each
//                           selector and save <name>-<kind>-focus-<id>.<ext> (viewport)
//   --headed                show the browser
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true;
    else { a[key] = next; i++; }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const base = String(args.base || 'http://localhost:3004').replace(/\/$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = path.resolve(String(args.out || `.verify/shots-${stamp}`));
const langs = String(args.lang || 'en').split(',').map((s) => s.trim()).filter(Boolean);
const specimen = !!args.specimen;
const routes = specimen
  ? ['/dev/specimen']
  : String(args.routes || '/,/about,/contact,/waitlist,/catalog,/gallery,/nope').split(',').map((s) => s.trim()).filter(Boolean);
const wanted = new Set(
  String(args.shots || 'desktop,mobile,reduced').split(',').map((s) => {
    const t = s.trim().toLowerCase();
    return t === 'd' ? 'desktop' : t === 'm' ? 'mobile' : t === 'r' ? 'reduced' : t;
  })
);
const stepDesktop = Number(args['step-desktop'] || 760);
const stepMobile = Number(args['step-mobile'] || 700);
const settle = Number(args.settle || 1400);
const maxShots = Number(args['max-shots'] || 40);
const format = args.format === 'png' ? 'png' : 'jpg';
const storageState = args['storage-state'] ? path.resolve(String(args['storage-state'])) : undefined;
const themes = String(args.themes || '').split(',').map((s) => s.trim()).filter(Boolean);
const seed = args.seed === 'off' ? null : Number(args.seed ?? 1337);
const focusSels = args.focus ? String(args.focus).split(',').map((s) => s.trim()).filter(Boolean) : [];
const query = args.query ? String(args.query).replace(/^\?/, '') : '';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, step: stepDesktop, reduced: false, mobile: false },
  mobile: { width: 390, height: 844, step: stepMobile, reduced: false, mobile: true },
  reduced: { width: 1440, height: 900, step: stepDesktop, reduced: true, mobile: false },
};

const nameOf = (route) => {
  const clean = route.split('?')[0].replace(/^\/+|\/+$/g, '');
  return clean === '' ? 'home' : clean.replace(/\//g, '-');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ready(page, lang) {
  await page.waitForLoadState('load');
  await page.evaluate(() => document.fonts.ready);
  if (lang !== 'en') {
    await page.waitForFunction((l) => document.documentElement.lang === l, lang, { timeout: 15000 });
  }
  // two frames so layout effects and FittedWord measurement have run
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.evaluate(() => document.fonts.ready);
  await sleep(Math.min(settle, 600));
}

async function headerText(page) {
  return page.evaluate(() => (document.querySelector('header')?.innerText || '').replace(/\s+/g, ' ').trim());
}

async function newContext(browser, vp, lang) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    reducedMotion: vp.reduced ? 'reduce' : 'no-preference',
    locale: 'en-US', // navigator.language stays English; only localStorage drives i18n
    ...(storageState ? { storageState } : {}),
  });
  if (seed !== null) {
    await ctx.addInitScript((sd) => {
      let a = sd >>> 0; // mulberry32
      Math.random = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }, seed);
  }
  await ctx.addInitScript(
    ([l, skipIntro]) => {
      try { localStorage.setItem('mf-lang', l); } catch {}
      if (skipIntro) { try { sessionStorage.setItem('mf-intro-seen', '1'); } catch {} }
    },
    [lang, !args.intro]
  );
  return ctx;
}

async function save(page, file, fullPage = false) {
  const opts = { path: file, fullPage, animations: 'allow', ...(format === 'jpg' ? { type: 'jpeg', quality: 80 } : { type: 'png' }) };
  await page.screenshot(opts);
}

async function focusProbe(page, prefix, sels) {
  const done = [];
  for (const sel of sels) {
    const present = await page.evaluate((q) => !!document.querySelector(q), sel);
    if (!present) continue;
    await page.evaluate((q) => { document.activeElement?.blur?.(); document.querySelector(q).scrollIntoView({ block: 'center' }); }, sel);
    await sleep(Math.min(settle, 800));
    let hit = false;
    for (let i = 0; i < 150 && !hit; i++) {
      await page.keyboard.press('Tab');
      hit = await page.evaluate((q) => document.activeElement === document.querySelector(q), sel);
    }
    const id = sel.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (hit) {
      await sleep(300);
      await save(page, `${prefix}-focus-${id}.${format}`);
      const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`; });
      done.push({ selector: sel, reached: true, outline: ring });
    } else done.push({ selector: sel, reached: false });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  return done;
}

async function scrollThrough(page, prefix, vp) {
  const count = [];
  let y = 0;
  let n = 0;
  let last = { scrollHeight: 0 };
  for (;;) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await sleep(settle);
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      scrollY: Math.round(window.scrollY),
      innerHeight: window.innerHeight,
    }));
    last = m;
    await save(page, `${prefix}-${String(n).padStart(2, '0')}.${format}`);
    count.push(m.scrollY);
    n++;
    if (n >= maxShots || y + m.innerHeight >= m.scrollHeight - 1) break;
    y += vp.step;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return { shots: n, scrollYs: count, lastScrollHeight: last.scrollHeight };
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: !args.headed });
  const heights = { base, lang: langs, generated: new Date().toISOString(), format, routes: {} };
  let enHeader = null;

  try {
    for (const lang of langs) {
      const suffix = langs.length > 1 ? `-${lang}` : '';

      // Reference English header text, to prove a non-EN capture is translated.
      if (lang !== 'en' && enHeader === null) {
        const ctx = await newContext(browser, VIEWPORTS.desktop, 'en');
        const p = await ctx.newPage();
        await p.goto(base + '/', { waitUntil: 'load' });
        await ready(p, 'en');
        enHeader = await headerText(p);
        await ctx.close();
      }

      for (const [kind, vp] of Object.entries(VIEWPORTS)) {
        if (!wanted.has(kind) && !(specimen && kind === 'desktop')) continue;
        const ctx = await newContext(browser, vp, lang);
        const page = await ctx.newPage();
        const consoleErrors = [];
        page.on('pageerror', (e) => consoleErrors.push(String(e.message || e)));

        const variants = specimen && themes.length ? themes : [null];
        for (const route of routes) {
          for (const theme of variants) {
            let url = base + route;
            const qs = [query, theme ? `theme=${theme}` : ''].filter(Boolean).join('&');
            if (qs) url += (url.includes('?') ? '&' : '?') + qs;
            const resp = await page.goto(url, { waitUntil: 'load' });
            await ready(page, lang);
            const name = nameOf(route) + (theme ? `-${theme}` : '') + suffix;
            const prefix = path.join(out, `${name}-${kind}`);

            const langOk = await page.evaluate((l) => document.documentElement.lang === l, lang);
            let translated = null;
            if (lang !== 'en' && enHeader) translated = (await headerText(page)) !== enHeader;

            let entry;
            if (specimen) {
              const file = `${prefix}-full.${format}`;
              await save(page, file, true);
              const metrics = await page.evaluate(() => window.__specimenMetrics ?? null);
              entry = { fullPage: path.basename(file), metrics };
            } else {
              entry = await scrollThrough(page, prefix, vp);
              if (focusSels.length && kind !== 'reduced') entry.focus = await focusProbe(page, prefix, focusSels);
            }

            const dims = await page.evaluate(() => ({
              scrollHeight: document.documentElement.scrollHeight,
              scrollWidth: document.documentElement.scrollWidth,
              innerWidth: window.innerWidth,
              htmlLang: document.documentElement.lang,
            }));
            const key = `${name}-${kind}`;
            heights.routes[key] = {
              route, lang, kind, status: resp?.status() ?? null,
              ...dims,
              horizontalScroll: dims.scrollWidth > dims.innerWidth,
              langVerified: langOk,
              headerTranslated: translated,
              pageErrors: consoleErrors.splice(0),
              ...entry,
            };
            if (!langOk) console.warn(`WARN ${key}: html lang is ${dims.htmlLang}, expected ${lang}`);
            if (translated === false) console.warn(`WARN ${key}: header text identical to English; dictionary may not have applied`);
            console.log(`${key}: ${entry.shots ?? 1} shot(s), height ${dims.scrollHeight}`);
          }
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(out, 'heights.json'), JSON.stringify(heights, null, 2) + '\n');
  console.log(`wrote ${path.join(out, 'heights.json')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
