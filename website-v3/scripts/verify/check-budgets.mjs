#!/usr/bin/env node
// Accent, stamp and primary-button budgets per viewport (Round 9 plan 4.5, 11.5, WP6b).
//
//   node scripts/verify/check-budgets.mjs [--base http://localhost:3004]
//        [--routes /,/about,...] [--lang en] [--settle 700] [--out <dir>]
//
// For every route, at 1440x900 and 390x844, the page is scrolled one viewport
// at a time (no overlap) and each viewport is screenshotted and measured:
//
//   stamps   count of [data-stamp] elements intersecting the viewport. FAIL > 1.
//   brand    share of screenshot pixels within +-12 per channel of #ff5a2c or
//            #ff4a1c (the brand orange and its fill twin). FAIL > 6%, WARN > 5%.
//   primary  count of .mf-btn[data-variant='primary'] intersecting the
//            viewport. FAIL > 1.
//
// Prints one row per route x viewport x scroll step and a summary; exits 1 on
// any FAIL. --out keeps the PNG of each step (default: not kept). The one-time
// load intro is skipped through sessionStorage like shots.mjs, so captures are
// deterministic. Locale comes from localStorage['mf-lang'].
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) a[key] = true;
    else { a[key] = next; i++; }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const base = String(args.base || 'http://localhost:3004').replace(/\/$/, '');
const routes = String(args.routes || '/,/about,/contact,/waitlist,/catalog,/gallery,/nope')
  .split(',').map((s) => s.trim()).filter(Boolean);
const lang = String(args.lang || 'en');
const settle = Number(args.settle || 700);
const out = args.out ? path.resolve(String(args.out)) : null;
const maxShots = Number(args['max-shots'] || 40);

const TARGETS = [[0xff, 0x5a, 0x2c], [0xff, 0x4a, 0x1c]];
const TOL = 12;
const FAIL_SHARE = 0.06;
const WARN_SHARE = 0.05;

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900, mobile: false },
  { name: '390x844', width: 390, height: 844, mobile: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function brandShare(png) {
  const { data, width, height } = png;
  let hit = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    for (const [tr, tg, tb] of TARGETS) {
      if (Math.abs(r - tr) <= TOL && Math.abs(g - tg) <= TOL && Math.abs(b - tb) <= TOL) { hit++; break; }
    }
  }
  return hit / (width * height);
}

function inView() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const seen = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    if (getComputedStyle(el).visibility === 'hidden') return false;
    return r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
  };
  return {
    stamps: [...document.querySelectorAll('[data-stamp]')].filter(seen).length,
    primary: [...document.querySelectorAll(".mf-btn[data-variant='primary']")].filter(seen).length,
    scrollY: Math.round(window.scrollY),
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: vh,
  };
}

const rows = [];
const browser = await chromium.launch({ headless: true });
try {
  if (out) fs.mkdirSync(out, { recursive: true });
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      reducedMotion: 'no-preference',
      locale: 'en-US',
    });
    await ctx.addInitScript((l) => {
      try { localStorage.setItem('mf-lang', l); } catch {}
      try { sessionStorage.setItem('mf-intro-seen', '1'); } catch {}
    }, lang);
    for (const route of routes) {
      const page = await ctx.newPage();
      let status = 0;
      try {
        const res = await page.goto(base + route, { waitUntil: 'load', timeout: 45000 });
        status = res ? res.status() : 0;
        await page.evaluate(() => document.fonts.ready);
        await sleep(settle);
        let y = 0;
        for (let n = 0; n < maxShots; n++) {
          await page.evaluate((yy) => window.scrollTo(0, yy), y);
          await sleep(settle);
          await page.evaluate(() => document.fonts.ready);
          const m = await page.evaluate(inView);
          const buf = await page.screenshot({ type: 'png', animations: 'allow' });
          if (out) {
            const nm = (route.replace(/^\/+|\/+$/g, '') || 'home').replace(/\//g, '-');
            fs.writeFileSync(path.join(out, `${nm}-${vp.width}-${String(n).padStart(2, '0')}.png`), buf);
          }
          const share = brandShare(PNG.sync.read(buf));
          const notes = [];
          let verdict = 'ok';
          if (m.stamps > 1) { verdict = 'FAIL'; notes.push(`${m.stamps} stamps in view`); }
          if (m.primary > 1) { verdict = 'FAIL'; notes.push(`${m.primary} primary buttons in view`); }
          if (share > FAIL_SHARE) { verdict = 'FAIL'; notes.push('brand share over 6%'); }
          else if (share > WARN_SHARE) { if (verdict === 'ok') verdict = 'warn'; notes.push('brand share over 5%'); }
          rows.push({ route, vp: vp.name, y: m.scrollY, stamps: m.stamps, primary: m.primary, share, verdict, notes: notes.join('; '), status });
          if (m.scrollY + m.innerHeight >= m.scrollHeight - 1) break;
          y = m.scrollY + m.innerHeight;
        }
      } catch (e) {
        rows.push({ route, vp: vp.name, y: 0, stamps: 0, primary: 0, share: 0, verdict: 'FAIL', notes: `load error: ${e.message.split('\n')[0]}`, status });
      } finally {
        await page.close();
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('route', 28)}${pad('viewport', 10)}${pad('scrollY', 9)}${pad('stamps', 8)}${pad('primary', 9)}${pad('brand %', 9)}result`);
for (const r of rows) {
  console.log(
    `${pad(r.route, 28)}${pad(r.vp, 10)}${pad(r.y, 9)}${pad(r.stamps, 8)}${pad(r.primary, 9)}${pad((r.share * 100).toFixed(2), 9)}${r.verdict}${r.notes ? `  ${r.notes}` : ''}`
  );
}
const fails = rows.filter((r) => r.verdict === 'FAIL').length;
const warns = rows.filter((r) => r.verdict === 'warn').length;
console.log(`\nbudgets: ${rows.length} viewports, ${fails} fail, ${warns} warn`);
process.exit(fails ? 1 : 0);
