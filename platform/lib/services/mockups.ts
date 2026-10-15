// Mockup rendering: composite a design onto a blank packshot.
//
// Pipeline per colourway:
//  1. Resolve the packshot image (front or back, per the print position) from
//     blank_colours, falling back to the blank's generic image. Its bytes come
//     through lib/services/packshots.ts (storage or CDN in production, public/
//     in development), never from a readFile of public/ here, which would drag
//     the 313 MB folder into the function bundle.
//  2. Look up the calibrated print-area box for the blank's type + position
//     (lib/mockups/placements.ts) and convert the requested widthCm to px.
//  3. Fetch and resize the design, decide multiply-vs-over blending from
//     design luminance vs garment colour, and composite it onto the packshot.
//  4. Lay a faint greyscale copy of the same packshot region back over the
//     print (soft-light) so garment folds and shading read through the ink.
//  5. Downsize to 1200px webp and hand it to storage.
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db, schema } from '@/lib/db';
import { readPublicAsset } from '@/lib/services/packshots';
import { putFile } from '@/lib/services/storage';
import {
  UnknownPositionError,
  defaultPlacementFor,
  getDefaultPosition,
  keepOnPhoto,
  pocketLineFraction,
  printOffsetPx,
  pxPerCm,
  resolvePrintArea,
  type PrintArea,
} from '@/lib/mockups/placements';

export interface MockupPlacement {
  /** 'front_chest' | 'front_full' | 'front_left_chest' | 'back' | 'centre' | 'front_leg' */
  position: string;
  /** print width in cm on the garment */
  widthCm: number;
  /** vertical offset from the default anchor, cm (positive = down) */
  offsetYcm?: number;
}

export interface RenderedMockup {
  colourCode: string;
  url: string;
  /** set when the requested render degraded gracefully (e.g. no packshot to composite onto) */
  note?: string;
}

/** A position the garment has no calibrated box for (a sleeve, say). It is
 * refused, never moved to the chest: `error` is plain words for the artist and
 * `positions` are the ones the garment does take. */
export interface MockupRefusal {
  ok: false;
  error: string;
  positions: string[];
}

export type MockupResult<T> = { ok: true; value: T } | MockupRefusal;

function plainRefusal(err: UnknownPositionError): MockupRefusal {
  return { ok: false, error: err.message, positions: [...err.available] };
}

/** A packshot URL is always a site-relative '/packshots/...' path; where its
 * bytes live is packshots.ts's business. */
const readPackshot = readPublicAsset;

/** Designs live behind real https URLs once uploaded; accept a local /public path too for testing. */
async function fetchDesignBuffer(designUrl: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(designUrl)) {
    const res = await fetch(designUrl);
    if (!res.ok) throw new Error(`Failed to fetch design (${res.status}): ${designUrl}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readPackshot(designUrl);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return [255, 255, 255];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function relativeLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Alpha-weighted mean luminance of the design's ink, ignoring transparent background. */
async function designLuminance(buffer: Buffer): Promise<number> {
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let weighted = 0;
  let weightSum = 0;
  for (let i = 0; i < width * height; i++) {
    const idx = i * channels;
    const a = data[idx + 3];
    if (a < 10) continue;
    weighted += relativeLuminance(data[idx], data[idx + 1], data[idx + 2]) * a;
    weightSum += a;
  }
  return weightSum > 0 ? weighted / weightSum : 0.5;
}

/**
 * Scale an image's existing alpha by `opacity` (0-1), keeping its colours.
 * Classic sharp trick: composite a solid tile at that alpha with 'dest-in',
 * which multiplies destination alpha by the tile's alpha per pixel.
 */
async function applyOpacity(buffer: Buffer, opacity: number): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  return sharp(buffer)
    .ensureAlpha()
    .composite([
      {
        input: {
          create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: opacity } },
        },
        blend: 'dest-in',
      },
    ])
    .toBuffer();
}

/** `refused` carries UnknownPositionError itself, so the throwing exports below
 * can hand callers the class they already catch. */
type CoreResult = { ok: true; url: string; note?: string } | { ok: false; refused: UnknownPositionError };

async function renderMockupCore(input: {
  designUrl: string;
  blankCode: string;
  colourCode: string;
  placement: MockupPlacement;
}): Promise<CoreResult> {
  const { designUrl, blankCode, colourCode, placement } = input;

  const [blankRow] = await db.select().from(schema.blanks).where(eq(schema.blanks.code, blankCode)).limit(1);
  if (!blankRow) throw new Error(`Unknown blank code: ${blankCode}`);

  const [blankColourRow] = await db
    .select({
      frontImageUrl: schema.blankColours.frontImageUrl,
      backImageUrl: schema.blankColours.backImageUrl,
      hex: schema.colours.hex,
    })
    .from(schema.blankColours)
    .innerJoin(schema.colours, eq(schema.blankColours.colourCode, schema.colours.code))
    .where(and(eq(schema.blankColours.blankCode, blankCode), eq(schema.blankColours.colourCode, colourCode)))
    .limit(1);

  let resolved: ReturnType<typeof resolvePrintArea>;
  try {
    resolved = resolvePrintArea(blankRow.type, placement.position);
  } catch (err) {
    // The garment does not take this position. Answer in words rather than
    // let the throw crash the caller, and render nothing: no stand-in spot.
    if (err instanceof UnknownPositionError) return { ok: false, refused: err };
    throw err;
  }
  const area: PrintArea | undefined = resolved?.area;
  const position = resolved?.position ?? getDefaultPosition(blankRow.type);

  const wantsBack = area?.image === 'back';
  const packshotUrl = wantsBack
    ? blankColourRow?.backImageUrl ?? blankRow.backImageUrl ?? blankColourRow?.frontImageUrl ?? blankRow.frontImageUrl
    : blankColourRow?.frontImageUrl ?? blankRow.frontImageUrl;

  if (!packshotUrl) {
    throw new Error(`No packshot image available for ${blankCode}/${colourCode}`);
  }

  if (!area) {
    const note = `No calibrated print area for ${blankRow.type}/${placement.position}; returning the plain packshot uncomposited.`;
    console.warn('[mockups]', note);
    return { ok: true, url: packshotUrl, note };
  }

  const packshotBuffer = await readPackshot(packshotUrl);
  const packshotMeta = await sharp(packshotBuffer).metadata();
  const imgW = packshotMeta.width;
  const imgH = packshotMeta.height;
  if (!imgW || !imgH) throw new Error(`Could not read packshot dimensions: ${packshotUrl}`);

  const scale = pxPerCm(area, imgW);
  const rawDesignBuffer = await fetchDesignBuffer(designUrl);

  // Real uploads often carry generous transparent padding around the actual
  // ink (whatever canvas they were exported on); trim to the alpha bounding
  // box so widthCm always maps to the print's real visible size, and so the
  // fold-mask and pocket-fit math below reason about the true artwork shape.
  let trimmedDesignBuffer: Buffer;
  try {
    trimmedDesignBuffer = await sharp(rawDesignBuffer).trim({ threshold: 10 }).toBuffer();
  } catch {
    trimmedDesignBuffer = rawDesignBuffer;
  }
  const trimmedMeta = await sharp(trimmedDesignBuffer).metadata();
  const naturalWidth = trimmedMeta.width ?? 1;
  const naturalHeight = trimmedMeta.height ?? 1;
  const naturalAspect = naturalHeight / naturalWidth;

  let targetWidthPx = Math.max(1, Math.round(placement.widthCm * scale));

  // anchor computed before any pocket-driven shrink, so we know how much
  // vertical room is actually available above the kangaroo pocket. The offset
  // is converted as the proof's print box converts it (printOffsetPx), so a
  // print a product moved sits at the same height in the mockup and the proof.
  const anchorTop = Math.round(area.y * imgH + printOffsetPx(area, imgW, placement.offsetYcm));
  const pocketLine = pocketLineFraction(blankRow.type, area);
  const pocketLineY = pocketLine === undefined ? null : Math.round(pocketLine * imgH);

  if (pocketLineY !== null) {
    // never let the pocket constraint collapse the print to nothing
    const availableHeight = Math.max(20, pocketLineY - anchorTop);
    const naturalHeightAtTarget = targetWidthPx * naturalAspect;
    if (naturalHeightAtTarget > availableHeight) {
      targetWidthPx = Math.max(1, Math.floor(availableHeight / naturalAspect));
    }
  }

  const { data: resizedDesignData, info: designMeta } = await sharp(trimmedDesignBuffer)
    .resize({ width: targetWidthPx })
    .toBuffer({ resolveWithObject: true });

  const designLum = await designLuminance(trimmedDesignBuffer);
  const [gr, gg, gb] = hexToRgb(blankColourRow?.hex ?? '#ffffff');
  const garmentLum = relativeLuminance(gr, gg, gb);
  // dark ink on a light garment reads best sunk into the fabric (multiply);
  // everything else (light ink, or any ink on a dark garment) sits on top at
  // near-full opacity so it doesn't wash out or invert against the base colour
  const useMultiply = designLum < 0.5 && garmentLum > 0.5;
  // same-luminance combos (e.g. near-black ink on a near-black garment) leave
  // almost no visible edge at 92% 'over' — push those to full opacity instead
  const lowContrast = !useMultiply && Math.abs(designLum - garmentLum) < 0.15;
  const inkOpacity = lowContrast ? 1 : 0.92;
  const designBuffer = useMultiply ? resizedDesignData : await applyOpacity(resizedDesignData, inkOpacity);

  // safety net for rounding: the pre-resize shrink above should already fit,
  // but if it doesn't, pull the print up rather than let it sit on the pocket
  const clearOfPocket = pocketLineY !== null && anchorTop + designMeta.height > pocketLineY ? pocketLineY - designMeta.height : anchorTop;

  // keep the composite fully on-canvas regardless of how offsetYcm/widthCm were set
  const { left, top } = keepOnPhoto(
    { left: Math.round(area.x * imgW + (area.w * imgW - designMeta.width) / 2), top: clearOfPocket },
    { width: designMeta.width, height: designMeta.height },
    { width: imgW, height: imgH },
  );

  const composedWithDesign = await sharp(packshotBuffer)
    .composite([{ input: designBuffer, left, top, blend: useMultiply ? 'multiply' : 'over' }])
    .toBuffer();

  // Fabric feel: fade the packshot's own (greyscale) folds back in over the
  // print. Masked to the design's own alpha (via 'dest-in') first, so a
  // transparent-background design's empty margin is left completely
  // untouched instead of tinting a visible rectangle around the artwork.
  const foldWidth = Math.min(designMeta.width, imgW - left);
  const foldHeight = Math.min(designMeta.height, imgH - top);
  let finalBuffer = composedWithDesign;
  if (foldWidth > 0 && foldHeight > 0) {
    const designAlphaMask =
      foldWidth === designMeta.width && foldHeight === designMeta.height
        ? resizedDesignData
        : await sharp(resizedDesignData).extract({ left: 0, top: 0, width: foldWidth, height: foldHeight }).toBuffer();

    const foldCrop = await sharp(packshotBuffer)
      .extract({ left, top, width: foldWidth, height: foldHeight })
      .greyscale()
      .ensureAlpha()
      .toBuffer();
    const maskedFold = await sharp(foldCrop).composite([{ input: designAlphaMask, blend: 'dest-in' }]).toBuffer();
    const foldLayerFaded = await applyOpacity(maskedFold, 0.18);
    finalBuffer = await sharp(composedWithDesign)
      .composite([{ input: foldLayerFaded, left, top, blend: 'soft-light' }])
      .toBuffer();
  }

  const outputBuffer = await sharp(finalBuffer).resize({ width: 1200 }).webp({ quality: 85 }).toBuffer();

  const stored = await putFile({
    data: outputBuffer,
    contentType: 'image/webp',
    filename: `${colourCode}-${position}.webp`,
    folder: `mockups/${blankCode}`,
  });

  return { ok: true, url: stored.url };
}

interface DesignOnBlankInput {
  designUrl: string;
  blankCode: string;
  colourCode: string;
  placement: MockupPlacement;
}

/** The non-throwing form: a position the garment cannot take comes back as
 * { ok: false, error, positions } in plain words. Anything else that goes wrong
 * (no such blank, no packshot, an unreadable design) still throws. */
export async function tryRenderDesignOnBlank(input: DesignOnBlankInput): Promise<MockupResult<{ url: string; note?: string }>> {
  const core = await renderMockupCore(input);
  if (!core.ok) return plainRefusal(core.refused);
  return { ok: true, value: core.note ? { url: core.url, note: core.note } : { url: core.url } };
}

/** Throws UnknownPositionError for a position the garment cannot take (the tool
 * layer catches it by class); tryRenderDesignOnBlank returns it instead. */
export async function renderDesignOnBlank(input: DesignOnBlankInput): Promise<string> {
  const core = await renderMockupCore(input);
  if (!core.ok) throw core.refused;
  return core.url;
}

/** Design image to print with: the cleaned/upscaled print file if there is one, else the original upload. */
export async function getDesignImageUrl(designId: string): Promise<string | null> {
  const [design] = await db
    .select({ printUrl: schema.designs.printUrl, originalUrl: schema.designs.originalUrl })
    .from(schema.designs)
    .where(eq(schema.designs.id, designId))
    .limit(1);
  if (!design) return null;
  return design.printUrl ?? design.originalUrl ?? null;
}

/** The product's saved placement. What it did not save is the garment's own
 * usual spot, not a bare 'front_chest', which trousers and bags (and anything
 * else without a chest box) would now refuse. */
async function placementOf(product: typeof schema.products.$inferSelect): Promise<MockupPlacement> {
  const saved = (product.placement ?? {}) as Partial<MockupPlacement>;
  const position = typeof saved.position === 'string' && saved.position.trim() ? saved.position : undefined;
  const widthCm = typeof saved.widthCm === 'number' && saved.widthCm > 0 ? saved.widthCm : undefined;
  if (position && widthCm) return { position, widthCm, offsetYcm: saved.offsetYcm };

  const [blank] = await db.select({ type: schema.blanks.type }).from(schema.blanks).where(eq(schema.blanks.code, product.blankCode)).limit(1);
  const usual = defaultPlacementFor(blank?.type ?? '');
  return { position: position ?? usual.position, widthCm: widthCm ?? (position ? 28 : usual.widthCm), offsetYcm: saved.offsetYcm };
}

type ProductRender = { ok: true; results: RenderedMockup[] } | { ok: false; refused: UnknownPositionError };

async function renderProduct(productId: string, force: boolean): Promise<ProductRender> {
  const [product] = await db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1);
  if (!product) throw new Error(`Unknown product id: ${productId}`);
  if (!product.designId) throw new Error(`Product ${productId} has no design attached`);

  const designUrl = await getDesignImageUrl(product.designId);
  if (!designUrl) throw new Error(`Design ${product.designId} has no renderable image`);

  const placement = await placementOf(product);

  const productColourRows = await db
    .select({ colourCode: schema.productColours.colourCode, mockupUrl: schema.productColours.mockupUrl })
    .from(schema.productColours)
    .where(eq(schema.productColours.productId, productId));

  const results: RenderedMockup[] = [];
  for (const row of productColourRows) {
    if (row.mockupUrl && !force) {
      results.push({ colourCode: row.colourCode, url: row.mockupUrl });
      continue;
    }
    const core = await renderMockupCore({
      designUrl,
      blankCode: product.blankCode,
      colourCode: row.colourCode,
      placement,
    });
    // The position is the product's, so every colour would be refused alike:
    // stop at the first and leave the colours' mockup URLs as they were.
    if (!core.ok) return { ok: false, refused: core.refused };
    const { url, note } = core;
    await db
      .update(schema.productColours)
      .set({ mockupUrl: url })
      .where(and(eq(schema.productColours.productId, productId), eq(schema.productColours.colourCode, row.colourCode)));
    results.push(note ? { colourCode: row.colourCode, url, note } : { colourCode: row.colourCode, url });
  }
  return { ok: true, results };
}

/** The non-throwing form: a saved placement the garment cannot take comes back
 * as { ok: false, error, positions } in plain words, with nothing rendered or
 * saved. Other failures (no such product, no design) still throw. */
export async function tryRenderProductMockups(productId: string, force = false): Promise<MockupResult<RenderedMockup[]>> {
  const rendered = await renderProduct(productId, force);
  return rendered.ok ? { ok: true, value: rendered.results } : plainRefusal(rendered.refused);
}

/** Throws UnknownPositionError for a placement the garment cannot take (the
 * mockup tool catches it by class); tryRenderProductMockups returns it instead. */
export async function renderProductMockups(productId: string, force = false): Promise<RenderedMockup[]> {
  const rendered = await renderProduct(productId, force);
  if (!rendered.ok) throw rendered.refused;
  return rendered.results;
}
