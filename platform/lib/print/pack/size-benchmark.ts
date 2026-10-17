// Size, time and memory of the screen PSD at production size (Plan 6.1, 15):
// a full front (28 x 33.6 cm print; 10 mm margins at the sides, 27 mm above and
// below) at 600 ppi with 8 films and a 4K original. Not a test; run one case per
// process so peak memory is that case's own:
//
//   npx tsx lib/print/pack/size-benchmark.ts typical rle --check
//   npx tsx lib/print/pack/size-benchmark.ts heavy zip
//
// typical: spot films like the approved mock (each ink about 7% of the print,
// a band of halftone each). heavy: every film halftoned across the whole print,
// the worst case for RLE (simulated process).
import sharp from 'sharp';
import type { InkPlate, ScreenSet } from '@/lib/print/types';
import { describePackFile, runChecks } from './index';
import { buildPackManifest } from './manifest';
import { writeScreenPsdWithStats } from './psd-write';
import type { PsdCompression } from './rle';
import { drawTargets } from '@/lib/print/engine/marks';
import { amDot, drawLabelStrip, syntheticScreenSet, type SyntheticSet } from './synthetic';

const MB = 1024 * 1024;

function heavy(base: SyntheticSet): ScreenSet {
  const { widthPx: W, art, ppi } = base.set.canvas;
  const { lpi, angleDeg, minDot, maxDot } = base.recipe.halftone;
  const cell = ppi / lpi;
  const cos = Math.cos((angleDeg * Math.PI) / 180);
  const sin = Math.sin((angleDeg * Math.PI) / 180);
  const plates: InkPlate[] = base.set.plates.map((p, i) => {
    const data = new Uint8Array(p.plate.data.length);
    for (let y = 0; y < art.height; y++) {
      const fy = y / art.height;
      const row = (art.y + y) * W + art.x;
      for (let x = 0; x < art.width; x++) {
        const fx = x / art.width;
        let c = 0.5 + 0.45 * Math.sin(6.3 * fx * (1 + i * 0.37) + 4.1 * fy * (1 + i * 0.23) + i);
        if (p.role === 'underbase') c = 0.75 + 0.25 * c;
        if (c < minDot) c = 0;
        else if (c > maxDot) c = 1;
        if (amDot(art.x + x, art.y + y, cell, cos, sin, c)) data[row + x] = 255;
      }
    }
    drawTargets(data, base.set.canvas);
    drawLabelStrip(data, base.set.canvas, i + 1);
    let ink = 0;
    for (let y = art.y; y < art.y + art.height; y++) for (let x = art.x; x < art.x + art.width; x++) if (data[y * W + x]) ink++;
    return { ...p, plate: { ...p.plate, data }, coverage: ink / (art.width * art.height) };
  });
  return { ...base.set, plates };
}

/** 4K art like a generated final: gradients, shapes and a little grain. */
async function original(): Promise<{ bytes: Buffer; filename: string; mime: string; widthPx: number; heightPx: number }> {
  const w = 4096;
  const h = 4915;
  const data = Buffer.alloc(w * h * 4);
  let seed = 7;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      const n = ((seed >>> 16) % 13) - 6;
      const p = (y * w + x) * 4;
      const fx = x / w;
      const fy = y / h;
      const inside = Math.hypot(fx - 0.5, fy - 0.45) < 0.42 || (fy > 0.8 && fy < 0.95 && fx > 0.1 && fx < 0.9);
      data[p] = Math.max(0, Math.min(255, Math.round(200 * fx + 40 + n)));
      data[p + 1] = Math.max(0, Math.min(255, Math.round(150 * fy + 30 + n)));
      data[p + 2] = Math.max(0, Math.min(255, Math.round(220 - 140 * fx * fy + n)));
      data[p + 3] = inside ? 255 : 0;
    }
  }
  const bytes = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  return { bytes, filename: 'underwriter-v3-final-4k.png', mime: 'image/png', widthPx: w, heightPx: h };
}

async function main(): Promise<void> {
  const kind = process.argv[2] === 'heavy' ? 'heavy' : 'typical';
  const compression: PsdCompression = process.argv[3] === 'zip' ? 'zip' : 'rle';
  const check = process.argv.includes('--check');

  let t = Date.now();
  const base = syntheticScreenSet({ widthMm: 280, heightMm: 336, plates: 8, ppi: 600 });
  const set = kind === 'heavy' ? heavy(base) : base.set;
  const art = await original();
  const prepMs = Date.now() - t;
  const rssBefore = process.memoryUsage().rss;

  t = Date.now();
  const { bytes, stats } = await writeScreenPsdWithStats({ set, garments: base.garments, original: art, label: base.label, inks: base.inks }, { compression });
  const writeMs = Date.now() - t;
  const peakAfterWrite = process.resourceUsage().maxRSS * 1024;

  const out: Record<string, unknown> = {
    case: kind,
    compression,
    canvasPx: `${stats.widthPx} x ${stats.heightPx}`,
    psb: stats.psb,
    totalMB: +(bytes.length / MB).toFixed(1),
    filmsMB: +(stats.layers.filter((l) => /^\d+\//.test(l.name)).reduce((n, l) => n + l.bytes, 0) / MB).toFixed(1),
    perFilmMB: stats.layers.filter((l) => /^\d+\//.test(l.name)).map((l) => +(l.bytes / MB).toFixed(1)),
    garmentFillsMB: +(stats.layers.filter((l) => l.name.startsWith('GARMENT')).reduce((n, l) => n + l.bytes, 0) / MB).toFixed(1),
    originalRasterMB: +((stats.layers.find((l) => l.name.startsWith('ORIGINAL'))?.bytes ?? 0) / MB).toFixed(1),
    embeddedOriginalMB: +(stats.embeddedBytes / MB).toFixed(1),
    mergedImageMB: +(stats.compositeBytes / MB).toFixed(1),
    coverage: set.plates.map((p) => +(p.coverage * 100).toFixed(1)),
    prepMs,
    writeMs,
    rssBeforeWriteMB: Math.round(rssBefore / MB),
    peakRssMB: Math.round(peakAfterWrite / MB),
  };

  if (check && compression === 'rle') {
    t = Date.now();
    const files = [{ file: describePackFile({ kind: 'screen_psd', name: 'bench.psd', key: 'bench', bytes }), bytes }];
    const manifest = buildPackManifest({
      designId: 'bench',
      designVersionId: 'bench',
      versionNumber: 1,
      placement: base.placement,
      technique: 'screen',
      screenSetKey: set.key,
      garmentCodes: set.garmentCodes,
      method: 'spot',
      files: files.map((f) => f.file),
      inputHash: 'bench',
      set,
      inkSystem: base.inks,
    });
    const checks = await runChecks({ technique: 'screen', manifest, files, recipe: base.recipe, inks: base.inks, garments: base.garments, expected: { set } });
    out.checksMs = Date.now() - t;
    out.checks = Object.fromEntries(checks.map((c) => [c.id, c.state]));
    out.peakRssWithChecksMB = Math.round((process.resourceUsage().maxRSS * 1024) / MB);
  }
  console.log(JSON.stringify(out));
}

// Only when run as a script: importing this file runs nothing.
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
