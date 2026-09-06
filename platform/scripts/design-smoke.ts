/**
 * Design intake smoke test. Hits the real fal API (FAL_API_KEY) and the real
 * DB — no AGENT_MOCK involved, this exercises lib/services/designs.ts and
 * lib/services/fal.ts directly. Kept to one fal call per step to keep cost
 * minimal: upload -> analyze -> clean (remove_bg) -> generate (one capsule).
 *
 * Run with: `npx tsx scripts/design-smoke.ts` (from `platform/`).
 *
 * Env vars must load before any module that opens a DB connection at import
 * time (lib/db.ts calls neon() at module scope) — see scripts/agent-smoke.ts
 * for the same dynamic-import-after-dotenv pattern.
 */

import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

async function main() {
  const sharp = (await import('sharp')).default;
  const { db, schema } = await import('../lib/db');
  const { createDesignFromUpload, analyzeDesign, cleanDesign, generateDesign } = await import('../lib/services/designs');
  const { listStyleCapsules } = await import('../lib/services/style-capsules');

  const [store] = await db.select().from(schema.artistStores).limit(1);
  if (!store) throw new Error('No artist_stores row found — seed one before running this script.');
  console.log(`Using store: ${store.name} (${store.id})`);

  // 1. A small black skull-ish blob on a transparent background, drawn with sharp.
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <circle cx="200" cy="180" r="140" fill="black"/>
    <rect x="150" y="290" width="100" height="60" fill="black"/>
    <circle cx="150" cy="170" r="32" fill="white"/>
    <circle cx="250" cy="170" r="32" fill="white"/>
    <rect x="170" y="240" width="12" height="30" fill="white"/>
    <rect x="194" y="240" width="12" height="30" fill="white"/>
    <rect x="218" y="240" width="12" height="30" fill="white"/>
  </svg>`;
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  console.log('\n--- upload (transparent PNG) ---');
  const uploaded = await createDesignFromUpload({
    storeId: store.id,
    data: pngBuffer,
    contentType: 'image/png',
    filename: 'skull-smoke.png',
  });
  console.log(JSON.stringify(uploaded, null, 2));

  console.log('\n--- analyze ---');
  const analyzed = await analyzeDesign(uploaded.designId);
  console.log(JSON.stringify(analyzed, null, 2));

  // 2. Same artwork flattened onto white and re-encoded as JPEG (no alpha),
  // to exercise the remove_bg cleanup path on an opaque background.
  const jpegBuffer = await sharp(pngBuffer).flatten({ background: '#ffffff' }).jpeg({ quality: 90 }).toBuffer();
  console.log('\n--- upload (flattened JPEG) ---');
  const uploadedJpeg = await createDesignFromUpload({
    storeId: store.id,
    data: jpegBuffer,
    contentType: 'image/jpeg',
    filename: 'skull-smoke.jpg',
  });
  console.log(JSON.stringify(uploadedJpeg, null, 2));

  console.log('\n--- clean (remove_bg) ---');
  const cleaned = await cleanDesign(uploadedJpeg.designId, ['remove_bg']);
  console.log(JSON.stringify(cleaned, null, 2));

  // 3. One from-scratch generation call, guided by a style capsule.
  const capsule = listStyleCapsules()[0]!;
  console.log(`\n--- generate (capsule: ${capsule.name}) ---`);
  const generated = await generateDesign({
    storeId: store.id,
    brief: 'a snarling wolf head mascot, chest print',
    capsuleId: capsule.id,
  });
  console.log(JSON.stringify(generated, null, 2));

  console.log('\n--- summary ---');
  console.log(`upload:    ${uploaded.designId} readiness=${uploaded.readiness} dpi=${uploaded.dpiAtPrint}`);
  console.log(`analyze:   ${analyzed.designId} readiness=${analyzed.readiness}`);
  console.log(`clean:     ${cleaned.designId} readiness=${cleaned.readiness} printUrl=${cleaned.printUrl}`);
  for (const g of generated) {
    console.log(`generate:  ${g.designId} readiness=${g.readiness} url=${g.originalUrl}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
