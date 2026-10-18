/**
 * Mockup rendering smoke test.
 *
 * Draws a bold, high-contrast test design (a black circle plus a few bars,
 * on a transparent background — easy to eyeball placement/scale on) and
 * renders it on a T-shirt, a hoodie and a tote, exercising the full
 * lib/services/mockups.ts pipeline (packshot lookup, print-area placement,
 * blend-mode choice, fabric-fold overlay, storage upload).
 *
 * Every rendered mockup is also downloaded to the scratchpad so it can be
 * reviewed with an image-capable tool.
 *
 * Run with: `npx tsx scripts/mockup-smoke.ts` (from `platform/`).
 */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const SCRATCHPAD_DIR =
  '/private/tmp/claude-501/-Users-victorbendas-Documents-GitHub-blackout-merchandise/aafbb810-8b88-41f0-9749-7944de292195/scratchpad/mockups';

async function buildTestDesign(): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  const size = 2000;
  // SVG is the simplest way to draw a bold circle + bars with crisp edges and real alpha
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size * 0.4}" r="${size * 0.28}" fill="#0a0a0a" />
      <rect x="${size * 0.15}" y="${size * 0.72}" width="${size * 0.7}" height="${size * 0.08}" fill="#0a0a0a" />
      <rect x="${size * 0.15}" y="${size * 0.84}" width="${size * 0.5}" height="${size * 0.08}" fill="#0a0a0a" />
    </svg>
  `;
  // trim to the visible marks, same as a real print-ready upload would be —
  // an untrimmed square canvas would pad the top with transparent margin and
  // throw off the vertical anchoring this test is meant to check
  return sharp(Buffer.from(svg)).png().trim({ threshold: 10 }).toBuffer();
}

async function downloadTo(url: string, filePath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(filePath, buffer);
}

interface Case {
  label: string;
  blankCode: string;
  colourCode: string;
}

const CASES: Case[] = [
  { label: 'tshirt-white', blankCode: 'STTU169', colourCode: 'C001' },
  { label: 'tshirt-black', blankCode: 'STTU169', colourCode: 'C002' },
  { label: 'hoodie', blankCode: 'STSU177', colourCode: 'C002' },
  { label: 'tote', blankCode: 'STAU760', colourCode: 'C002' },
];

async function main() {
  const { putFile } = await import('../lib/services/storage');
  const { renderDesignOnBlank } = await import('../lib/services/mockups');

  await mkdir(SCRATCHPAD_DIR, { recursive: true });

  const designBuffer = await buildTestDesign();
  await writeFile(path.join(SCRATCHPAD_DIR, 'test-design.png'), designBuffer);

  const stored = await putFile({
    data: designBuffer,
    contentType: 'image/png',
    filename: 'mockup-smoke-design.png',
    folder: 'smoke/designs',
  });
  console.log('Uploaded test design:', stored.url);

  for (const testCase of CASES) {
    const url = await renderDesignOnBlank({
      designUrl: stored.url,
      blankCode: testCase.blankCode,
      colourCode: testCase.colourCode,
      placement: { position: 'front_chest', widthCm: 28 },
    });
    console.log(`${testCase.label} (${testCase.blankCode}/${testCase.colourCode}):`, url);

    const ext = path.extname(new URL(url).pathname) || '.webp';
    const localPath = path.join(SCRATCHPAD_DIR, `${testCase.label}${ext}`);
    await downloadTo(url, localPath);
    console.log('  saved to', localPath);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
