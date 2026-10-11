/**
 * Platform seed script.
 *
 * Seeds the blank catalog (blanks, colours, sizes, size guides, print
 * services, base costs) and shipping zones from the plain-TS data modules
 * in `platform/lib/catalog/*` (moved here from the retired website-v3).
 * Image URLs are kept as the site-relative paths those modules use
 * (e.g. '/packshots/PFM0_STTU169_C002.png'), served from
 * `platform/public/packshots`.
 *
 * Idempotent: every insert upserts on its natural key, so re-running this
 * script is always safe.
 *
 * Run with: `npm run seed` (from `platform/`).
 */

import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql as rawSql } from 'drizzle-orm';
import * as schema from '../../src/db/schema';

import { PRODUCTS } from '../lib/catalog/products';
import { PRODUCT_DETAILS, printTechniquesFor } from '../lib/catalog/product-details';
import {
    BASE_COLOUR,
    BASE_SWATCH,
    COLOUR_ORDER,
    COLOUR_SWATCHES,
    VARIANTS,
    VARIANT_BACKS,
    variantSrc,
    variantBackSrc,
    isLightColour,
} from '../lib/catalog/variants';
import { colourName } from '../lib/catalog/colour-names';
import { SIZE_GUIDES } from '../lib/catalog/size-guides';
import { typeFor, fitFor } from '../lib/catalog/catalog-filters';
import { PRODUCT_VIDEOS } from '../lib/catalog/product-videos';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined (expected in platform/.env.local)');
}

const sqlConnection = neon(process.env.DATABASE_URL);
const db = drizzle(sqlConnection, { schema });

// This repo has two installed copies of drizzle-orm — the root uses 0.45.1
// (bun), `platform/` uses ^0.45.2 (npm) — so `schema`'s PgTable/PgColumn
// objects (built with the root's drizzle-orm classes) don't structurally
// match what this file's own `drizzle()` builder (built with platform's
// classes) expects, even though both produce identical SQL at runtime.
// `S` is a deliberately loose alias so table references aren't blocked by
// that cross-package type identity mismatch; every row's *shape* is still
// checked against the real inline types declared below (e.g. the explicit
// `{ blankCode: string; colourCode: string; ... }[]` array types).
const S = schema as unknown as Record<string, any>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

// Print technique (catalog wording) -> the print_services this platform
// actually offers. 'Heat transfer' has no matching print service in the
// seeded catalog (only screen print / DTG / embroidery), so it is dropped —
// noted in the handoff report, not an omission by accident.
const TECHNIQUE_TO_SERVICES: Record<string, string[]> = {
    'Screen print': ['screen_1c', 'screen_2c', 'screen_3c'],
    'DTG': ['dtg'],
    'Embroidery': ['embroidery'],
};

function printServiceCodesFor(code: string): string[] {
    const services = new Set<string>();
    for (const technique of printTechniquesFor(code)) {
        for (const service of TECHNIQUE_TO_SERVICES[technique] ?? []) services.add(service);
    }
    return [...services];
}

// Placeholder garment cost by canonical type (cents). Victor will replace
// these with the real cost sheet.
const GARMENT_COST_CENTS_BY_TYPE: Record<string, number> = {
    'T-shirts': 650,
    'Sweats & Hoodies': 1900,
    'Jackets': 3900,
    'Polos': 1400,
    'Shirts': 2400,
    'Bottoms': 1800,
    'Bags & Accessories': 700,
    'Kids & Baby': 600,
};

// Placeholder print cost by print service (cents).
const PRINT_COST_CENTS_BY_SERVICE: Record<string, number> = {
    screen_1c: 350,
    screen_2c: 520,
    screen_3c: 690,
    dtg: 600,
    embroidery: 850,
};

// Quantity breaks: qty_from -> print-cost reduction. Garment cost is flat.
const QTY_BREAKS: { qtyFrom: number; printCostReduction: number }[] = [
    { qtyFrom: 1, printCostReduction: 0 },
    { qtyFrom: 25, printCostReduction: 0.08 },
    { qtyFrom: 50, printCostReduction: 0.15 },
    { qtyFrom: 100, printCostReduction: 0.22 },
];

// EU member states minus Spain and Portugal, which get their own zones.
const EU_MINUS_ES_PT = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'RO', 'SK', 'SI', 'SE',
];

async function countRows(table: any): Promise<number> {
    const result = await db.select({ count: rawSql<number>`count(*)::int` }).from(table);
    return result[0].count;
}

// ─── Seeders ────────────────────────────────────────────────────────────────

async function seedColours(): Promise<void> {
    const rows = [
        {
            code: BASE_COLOUR,
            name: colourName(BASE_COLOUR),
            hex: BASE_SWATCH,
            isLight: isLightColour(BASE_COLOUR),
            displayOrder: 0,
        },
        ...COLOUR_ORDER.map((code, i) => ({
            code,
            name: colourName(code),
            hex: COLOUR_SWATCHES[code] ?? null,
            isLight: isLightColour(code),
            displayOrder: i + 1,
        })),
    ];

    for (const batch of chunk(rows, 200)) {
        await db.insert(S.colours).values(batch).onConflictDoUpdate({
            target: S.colours.code,
            set: {
                name: rawSql`excluded.name`,
                hex: rawSql`excluded.hex`,
                isLight: rawSql`excluded.is_light`,
                displayOrder: rawSql`excluded.display_order`,
            },
        });
    }
}

async function seedBlanks(): Promise<void> {
    const rows = PRODUCTS.map((p, i) => {
        const details = PRODUCT_DETAILS[p.code];
        return {
            code: p.code,
            name: p.name, // catalog name, e.g. 'T-shirt'
            supplierName: details?.name ?? null, // supplier's commercial name, e.g. 'Creator 2.0'
            description: details?.description ?? null,
            type: typeFor(p.code),
            fit: fitFor(p.code),
            composition: details?.composition ?? null,
            weightGsm: details?.weightGsm ?? null,
            certifications: details?.certifications ?? [],
            details: p.details ?? [],
            frontImageUrl: p.src,
            backImageUrl: p.back ?? null,
            videoUrl: PRODUCT_VIDEOS[p.code] ?? null,
            isActive: true,
            displayOrder: i,
        };
    });

    for (const batch of chunk(rows, 100)) {
        await db.insert(S.blanks).values(batch).onConflictDoUpdate({
            target: S.blanks.code,
            set: {
                name: rawSql`excluded.name`,
                supplierName: rawSql`excluded.supplier_name`,
                description: rawSql`excluded.description`,
                type: rawSql`excluded.type`,
                fit: rawSql`excluded.fit`,
                composition: rawSql`excluded.composition`,
                weightGsm: rawSql`excluded.weight_gsm`,
                certifications: rawSql`excluded.certifications`,
                details: rawSql`excluded.details`,
                frontImageUrl: rawSql`excluded.front_image_url`,
                backImageUrl: rawSql`excluded.back_image_url`,
                videoUrl: rawSql`excluded.video_url`,
                isActive: rawSql`excluded.is_active`,
                displayOrder: rawSql`excluded.display_order`,
            },
        });
    }
}

async function seedBlankColours(): Promise<void> {
    const rows: {
        blankCode: string;
        colourCode: string;
        frontImageUrl: string | null;
        backImageUrl: string | null;
    }[] = [];

    for (const p of PRODUCTS) {
        // Base colourway (C002) lives on the product itself.
        rows.push({
            blankCode: p.code,
            colourCode: BASE_COLOUR,
            frontImageUrl: p.src,
            backImageUrl: p.back ?? null,
        });

        for (const colour of VARIANTS[p.code] ?? []) {
            const hasBack = VARIANT_BACKS[p.code]?.includes(colour) ?? false;
            rows.push({
                blankCode: p.code,
                colourCode: colour,
                frontImageUrl: variantSrc(p.code, colour),
                backImageUrl: hasBack ? variantBackSrc(p.code, colour) : null,
            });
        }
    }

    for (const batch of chunk(rows, 300)) {
        await db.insert(S.blankColours).values(batch).onConflictDoUpdate({
            target: [S.blankColours.blankCode, S.blankColours.colourCode],
            set: {
                frontImageUrl: rawSql`excluded.front_image_url`,
                backImageUrl: rawSql`excluded.back_image_url`,
            },
        });
    }
}

async function seedBlankSizes(): Promise<void> {
    const rows: { blankCode: string; size: string; displayOrder: number }[] = [];

    for (const p of PRODUCTS) {
        const guide = SIZE_GUIDES[p.code];
        const sizes = guide?.rows.map((r) => r.size) ?? ['OS'];
        sizes.forEach((size, i) => rows.push({ blankCode: p.code, size, displayOrder: i }));
    }

    for (const batch of chunk(rows, 300)) {
        await db.insert(S.blankSizes).values(batch).onConflictDoUpdate({
            target: [S.blankSizes.blankCode, S.blankSizes.size],
            set: { displayOrder: rawSql`excluded.display_order` },
        });
    }
}

async function seedSizeGuides(): Promise<void> {
    const rows = PRODUCTS.map((p) => {
        const guide = SIZE_GUIDES[p.code];
        return {
            blankCode: p.code,
            unit: guide?.unit ?? 'cm',
            columns: guide?.columns ?? [],
            rows: guide?.rows ?? [],
        };
    });

    for (const batch of chunk(rows, 100)) {
        await db.insert(S.sizeGuides).values(batch).onConflictDoUpdate({
            target: S.sizeGuides.blankCode,
            set: {
                unit: rawSql`excluded.unit`,
                columns: rawSql`excluded.columns`,
                rows: rawSql`excluded.rows`,
            },
        });
    }
}

async function seedPrintServices(): Promise<void> {
    const rows = [
        { code: 'screen_1c', name: 'Screen print (1 colour)', maxColours: 1 },
        { code: 'screen_2c', name: 'Screen print (2 colours)', maxColours: 2 },
        { code: 'screen_3c', name: 'Screen print (3 colours)', maxColours: 3 },
        { code: 'dtg', name: 'Direct-to-garment print', maxColours: null },
        { code: 'embroidery', name: 'Embroidery', maxColours: null },
    ].map((row) => ({
        ...row,
        positions: ['front', 'back', 'sleeve'],
        setupCents: 0,
        isActive: true,
    }));

    await db.insert(S.printServices).values(rows).onConflictDoUpdate({
        target: S.printServices.code,
        set: {
            name: rawSql`excluded.name`,
            maxColours: rawSql`excluded.max_colours`,
            positions: rawSql`excluded.positions`,
            setupCents: rawSql`excluded.setup_cents`,
            isActive: rawSql`excluded.is_active`,
        },
    });
}

async function seedBlankPrintServices(): Promise<void> {
    const rows: { blankCode: string; printServiceCode: string }[] = [];
    for (const p of PRODUCTS) {
        for (const serviceCode of printServiceCodesFor(p.code)) {
            rows.push({ blankCode: p.code, printServiceCode: serviceCode });
        }
    }

    for (const batch of chunk(rows, 300)) {
        await db.insert(S.blankPrintServices).values(batch).onConflictDoNothing({
            target: [S.blankPrintServices.blankCode, S.blankPrintServices.printServiceCode],
        });
    }
}

async function seedBaseCosts(): Promise<void> {
    const rows: {
        blankCode: string;
        printServiceCode: string;
        qtyFrom: number;
        garmentCostCents: number;
        printCostCents: number;
        marginCents: number;
        currency: string;
    }[] = [];

    for (const p of PRODUCTS) {
        const type = typeFor(p.code);
        const garmentCostCents = GARMENT_COST_CENTS_BY_TYPE[type];
        if (garmentCostCents === undefined) {
            throw new Error(`No placeholder garment cost for type '${type}' (blank ${p.code})`);
        }

        for (const serviceCode of printServiceCodesFor(p.code)) {
            const basePrintCost = PRINT_COST_CENTS_BY_SERVICE[serviceCode];
            for (const { qtyFrom, printCostReduction } of QTY_BREAKS) {
                const printCostCents = Math.round(basePrintCost * (1 - printCostReduction));
                const marginCents = Math.round(0.3 * (garmentCostCents + printCostCents));
                rows.push({
                    blankCode: p.code,
                    printServiceCode: serviceCode,
                    qtyFrom,
                    garmentCostCents,
                    printCostCents,
                    marginCents,
                    currency: 'EUR',
                });
            }
        }
    }

    for (const batch of chunk(rows, 300)) {
        await db.insert(S.baseCosts).values(batch).onConflictDoUpdate({
            target: [S.baseCosts.blankCode, S.baseCosts.printServiceCode, S.baseCosts.qtyFrom],
            set: {
                garmentCostCents: rawSql`excluded.garment_cost_cents`,
                printCostCents: rawSql`excluded.print_cost_cents`,
                marginCents: rawSql`excluded.margin_cents`,
                currency: rawSql`excluded.currency`,
            },
        });
    }
}

async function seedShippingZones(): Promise<void> {
    const zones = [
        { name: 'Spain', countries: ['ES'], flatCents: 450, freeOverCents: null as number | null },
        { name: 'Portugal', countries: ['PT'], flatCents: 590, freeOverCents: null as number | null },
        { name: 'EU', countries: EU_MINUS_ES_PT, flatCents: 890, freeOverCents: 8000 },
        { name: 'UK & Switzerland', countries: ['GB', 'CH'], flatCents: 1290, freeOverCents: null as number | null },
        { name: 'Rest of world', countries: [] as string[], flatCents: 1990, freeOverCents: null as number | null },
    ];

    // shipping_zones has no natural-key unique constraint in the schema, so
    // idempotency is done here by name: update if a zone with that name
    // exists, insert otherwise.
    for (const zone of zones) {
        const existing = await db
            .select({ id: S.shippingZones.id })
            .from(S.shippingZones)
            .where(rawSql`${S.shippingZones.name} = ${zone.name}`)
            .limit(1);

        if (existing.length > 0) {
            await db
                .update(S.shippingZones)
                .set({
                    countries: zone.countries,
                    flatCents: zone.flatCents,
                    freeOverCents: zone.freeOverCents,
                    isActive: true,
                })
                .where(rawSql`${S.shippingZones.id} = ${existing[0].id}`);
        } else {
            await db.insert(S.shippingZones).values({
                name: zone.name,
                countries: zone.countries,
                flatCents: zone.flatCents,
                freeOverCents: zone.freeOverCents,
                isActive: true,
            });
        }
    }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('Seeding platform catalog from lib/catalog...\n');

    await seedColours();
    console.log('colours seeded');

    await seedBlanks();
    console.log('blanks seeded');

    await seedBlankColours();
    console.log('blank_colours seeded');

    await seedBlankSizes();
    console.log('blank_sizes seeded');

    await seedSizeGuides();
    console.log('size_guides seeded');

    await seedPrintServices();
    console.log('print_services seeded');

    await seedBlankPrintServices();
    console.log('blank_print_services seeded');

    await seedBaseCosts();
    console.log('base_costs seeded');

    await seedShippingZones();
    console.log('shipping_zones seeded');

    console.log('\nRow counts:');
    const tables: [string, any][] = [
        ['colours', S.colours],
        ['blanks', S.blanks],
        ['blank_colours', S.blankColours],
        ['blank_sizes', S.blankSizes],
        ['size_guides', S.sizeGuides],
        ['print_services', S.printServices],
        ['blank_print_services', S.blankPrintServices],
        ['base_costs', S.baseCosts],
        ['shipping_zones', S.shippingZones],
    ];
    for (const [name, table] of tables) {
        console.log(`  ${name}: ${await countRows(table)}`);
    }
}

main()
    .then(() => {
        console.log('\nSeed complete.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    });
