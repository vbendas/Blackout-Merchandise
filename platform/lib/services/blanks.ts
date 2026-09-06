import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export interface ListBlanksInput {
  type?: string;
  fit?: string;
  colour?: string;
  q?: string;
  limit?: number;
}

export interface BlankListItem {
  code: string;
  /** supplier name when known (e.g. 'Cruiser 2.0'), else the generic catalog name */
  name: string;
  genericName: string;
  type: string;
  fit: string | null;
  imageUrl: string | null;
  fromPriceCents: number | null;
}

/** Cheapest qty_from=1 total across every print service offered for a blank. */
async function minPricesByBlank(blankCodes: string[]): Promise<Map<string, number>> {
  if (blankCodes.length === 0) return new Map();
  const rows = await db
    .select({ blankCode: schema.baseCosts.blankCode, totalCents: schema.baseCosts.totalCents })
    .from(schema.baseCosts)
    .where(and(inArray(schema.baseCosts.blankCode, blankCodes), eq(schema.baseCosts.qtyFrom, 1)));
  const prices = new Map<string, number>();
  for (const row of rows) {
    if (row.totalCents == null) continue;
    const current = prices.get(row.blankCode);
    if (current === undefined || row.totalCents < current) prices.set(row.blankCode, row.totalCents);
  }
  return prices;
}

export async function listTypes(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ type: schema.blanks.type })
    .from(schema.blanks)
    .where(eq(schema.blanks.isActive, true))
    .orderBy(asc(schema.blanks.type));
  return rows.map((r) => r.type);
}

export async function listBlanks(input: ListBlanksInput): Promise<{ items: BlankListItem[]; total: number }> {
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 24);
  const conditions = [eq(schema.blanks.isActive, true)];

  if (input.type) conditions.push(eq(schema.blanks.type, input.type));
  if (input.fit) conditions.push(eq(schema.blanks.fit, input.fit));
  if (input.q) {
    const pattern = `%${input.q}%`;
    const searchCondition = or(
      ilike(schema.blanks.name, pattern),
      ilike(schema.blanks.supplierName, pattern),
      ilike(schema.blanks.description, pattern),
      ilike(schema.blanks.code, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  if (input.colour) {
    const colourRows = await db
      .select({ blankCode: schema.blankColours.blankCode })
      .from(schema.blankColours)
      .where(eq(schema.blankColours.colourCode, input.colour));
    const codes = colourRows.map((r) => r.blankCode);
    if (codes.length === 0) return { items: [], total: 0 };
    conditions.push(inArray(schema.blanks.code, codes));
  }

  const rows = await db
    .select({
      code: schema.blanks.code,
      name: schema.blanks.name,
      supplierName: schema.blanks.supplierName,
      type: schema.blanks.type,
      fit: schema.blanks.fit,
      frontImageUrl: schema.blanks.frontImageUrl,
    })
    .from(schema.blanks)
    .where(and(...conditions))
    .orderBy(asc(schema.blanks.displayOrder), asc(schema.blanks.name))
    .limit(limit);

  const prices = await minPricesByBlank(rows.map((r) => r.code));

  return {
    items: rows.map((r) => ({
      code: r.code,
      name: r.supplierName ?? r.name,
      genericName: r.name,
      type: r.type,
      fit: r.fit,
      imageUrl: r.frontImageUrl,
      fromPriceCents: prices.get(r.code) ?? null,
    })),
    total: rows.length,
  };
}

export interface BlankDetail {
  code: string;
  name: string;
  supplierName: string | null;
  description: string | null;
  type: string;
  fit: string | null;
  composition: string | null;
  weightGsm: number | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  videoUrl: string | null;
  colours: { code: string; name: string; hex: string }[];
  sizes: string[];
  printServices: string[];
  sizeGuide: { unit: string | null; columns: string[]; rows: unknown[] } | null;
  fromPriceCents: number | null;
}

export async function getBlank(code: string): Promise<BlankDetail | null> {
  const blankRows = await db.select().from(schema.blanks).where(eq(schema.blanks.code, code)).limit(1);
  const blank = blankRows[0];
  if (!blank) return null;

  const [colourRows, sizeRows, sizeGuideRows, printServiceRows, baseCostRows] = await Promise.all([
    db
      .select({ code: schema.colours.code, name: schema.colours.name, hex: schema.colours.hex })
      .from(schema.blankColours)
      .innerJoin(schema.colours, eq(schema.blankColours.colourCode, schema.colours.code))
      .where(eq(schema.blankColours.blankCode, code))
      .orderBy(asc(schema.colours.displayOrder)),
    db
      .select({ size: schema.blankSizes.size })
      .from(schema.blankSizes)
      .where(eq(schema.blankSizes.blankCode, code))
      .orderBy(asc(schema.blankSizes.displayOrder)),
    db.select().from(schema.sizeGuides).where(eq(schema.sizeGuides.blankCode, code)).limit(1),
    db
      .select({ name: schema.printServices.name })
      .from(schema.blankPrintServices)
      .innerJoin(schema.printServices, eq(schema.blankPrintServices.printServiceCode, schema.printServices.code))
      .where(eq(schema.blankPrintServices.blankCode, code)),
    db
      .select({ totalCents: schema.baseCosts.totalCents })
      .from(schema.baseCosts)
      .where(and(eq(schema.baseCosts.blankCode, code), eq(schema.baseCosts.qtyFrom, 1))),
  ]);

  const prices = baseCostRows.map((r) => r.totalCents).filter((v): v is number => v != null);
  const guide = sizeGuideRows[0];

  return {
    code: blank.code,
    name: blank.name,
    supplierName: blank.supplierName,
    description: blank.description,
    type: blank.type,
    fit: blank.fit,
    composition: blank.composition,
    weightGsm: blank.weightGsm,
    frontImageUrl: blank.frontImageUrl,
    backImageUrl: blank.backImageUrl,
    videoUrl: blank.videoUrl,
    colours: colourRows.map((c) => ({ code: c.code, name: c.name, hex: c.hex ?? '#000000' })),
    sizes: sizeRows.map((s) => s.size),
    printServices: printServiceRows.map((p) => p.name),
    sizeGuide: guide
      ? { unit: guide.unit, columns: (guide.columns as string[]) ?? [], rows: (guide.rows as unknown[]) ?? [] }
      : null,
    fromPriceCents: prices.length > 0 ? Math.min(...prices) : null,
  };
}
