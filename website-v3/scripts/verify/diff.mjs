#!/usr/bin/env node
// Pixel diff between two screenshot folders (WP1).
//
//   node scripts/verify/diff.mjs <before-dir> <after-dir> [--max-diff 0.1]
//        [--report <file>] [--diff-dir <dir>] [--threshold 0.1] [--match <substr>]
//
// Files are paired by name (.jpg and .png both supported). A pair fails when
// more than --max-diff PERCENT of its pixels differ, or when the sizes differ.
// The report lists, for every changed pair, the bounding box of the changed
// pixels, so "the diff touches only the two inputs" can be read off directly.
// Exit code 1 when any pair fails or a file is missing on either side.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import pixelmatch from 'pixelmatch';

const argv = process.argv.slice(2);
const pos = [];
const opt = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    const n = argv[i + 1];
    if (n === undefined || n.startsWith('--')) opt[argv[i].slice(2)] = true;
    else { opt[argv[i].slice(2)] = n; i++; }
  } else pos.push(argv[i]);
}
const dirA = path.resolve(String(opt.a || pos[0] || ''));
const dirB = path.resolve(String(opt.b || pos[1] || ''));
if (!pos[0] && !opt.a || !pos[1] && !opt.b) {
  console.error('usage: diff.mjs <before-dir> <after-dir> [--max-diff 0.1] [--report file] [--diff-dir dir] [--threshold 0.1] [--match substr]');
  process.exit(2);
}
const maxDiff = Number(opt['max-diff'] ?? 0.1); // percent
const threshold = Number(opt.threshold ?? 0.1);
const report = path.resolve(String(opt.report || path.join(dirB, 'diff-report.md')));
const diffDir = opt['diff-dir'] ? path.resolve(String(opt['diff-dir'])) : path.join(dirB, 'diff');
const match = opt.match ? String(opt.match) : '';

const isImg = (f) => /\.(jpe?g|png)$/i.test(f);
const list = (d) => fs.readdirSync(d).filter((f) => isImg(f) && f.includes(match)).sort();

function decode(file) {
  const buf = fs.readFileSync(file);
  if (/\.png$/i.test(file)) {
    const p = PNG.sync.read(buf);
    return { width: p.width, height: p.height, data: p.data };
  }
  const j = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
  return { width: j.width, height: j.height, data: j.data };
}

const a = new Set(list(dirA));
const b = new Set(list(dirB));
const all = [...new Set([...a, ...b])].sort();
fs.mkdirSync(diffDir, { recursive: true });

const rows = [];
let failed = 0;
for (const f of all) {
  if (!a.has(f)) { rows.push({ f, status: 'ONLY-AFTER' }); failed++; continue; }
  if (!b.has(f)) { rows.push({ f, status: 'ONLY-BEFORE' }); failed++; continue; }
  const A = decode(path.join(dirA, f));
  const B = decode(path.join(dirB, f));
  if (A.width !== B.width || A.height !== B.height) {
    rows.push({ f, status: 'SIZE', note: `${A.width}x${A.height} vs ${B.width}x${B.height}` });
    failed++;
    continue;
  }
  const out = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, out.data, A.width, A.height, { threshold });
  const pct = (n / (A.width * A.height)) * 100;
  let bbox = null;
  if (n > 0) {
    let x0 = A.width, y0 = A.height, x1 = -1, y1 = -1;
    for (let y = 0; y < A.height; y++) {
      for (let x = 0; x < A.width; x++) {
        const i = (y * A.width + x) * 4;
        // pixelmatch paints differing pixels red (255,0,0) in the output
        if (out.data[i] === 255 && out.data[i + 1] === 0 && out.data[i + 2] === 0) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 >= 0) bbox = [x0, y0, x1, y1];
    fs.writeFileSync(path.join(diffDir, f.replace(/\.\w+$/, '') + '.diff.png'), PNG.sync.write(out));
  }
  const ok = pct <= maxDiff;
  if (!ok) failed++;
  rows.push({ f, status: ok ? (n ? 'ok (changed)' : 'identical') : 'FAIL', n, pct, bbox });
}

const changed = rows.filter((r) => r.n > 0 || !['identical'].includes(r.status));
const md = [];
md.push('# Screenshot diff report', '');
md.push(`- before: \`${dirA}\``, `- after: \`${dirB}\``);
md.push(`- max-diff: ${maxDiff}% of pixels, pixelmatch threshold ${threshold}`);
md.push(`- pairs: ${rows.length}, identical: ${rows.filter((r) => r.status === 'identical').length}, failing: ${failed}`, '');
md.push('| file | status | changed px | % | bbox (x0,y0,x1,y1) |', '|---|---|---|---|---|');
for (const r of changed) {
  md.push(`| ${r.f} | ${r.status}${r.note ? ' ' + r.note : ''} | ${r.n ?? ''} | ${r.pct !== undefined ? r.pct.toFixed(4) : ''} | ${r.bbox ? r.bbox.join(',') : ''} |`);
}
if (!changed.length) md.push('| (none) | all identical | | | |');
md.push('');
fs.writeFileSync(report, md.join('\n'));
console.log(md.slice(2, 5).join('\n'));
for (const r of changed) console.log(`${r.status.padEnd(12)} ${r.f}${r.pct !== undefined ? `  ${r.pct.toFixed(4)}%` : ''}${r.bbox ? `  bbox ${r.bbox.join(',')}` : ''}`);
console.log(`report: ${report}`);
process.exit(failed ? 1 : 0);
