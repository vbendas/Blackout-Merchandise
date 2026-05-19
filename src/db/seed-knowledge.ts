#!/usr/bin/env bun

import { db } from './index';
import { appSettings } from './schema';
import { sql } from 'drizzle-orm';

type SeedRow = {
    key: string;
    value: string;
    valueJson?: unknown;
    description?: string;
};

const FLAT_SETTINGS: SeedRow[] = [
    { key: 'shipping_eu_days', value: '7-14', description: 'EU shipping delivery estimate' },
    { key: 'shipping_uk_days', value: '10-18', description: 'UK shipping delivery estimate' },
    { key: 'shipping_intl_days', value: '14-21', description: 'International shipping delivery estimate' },
    { key: 'shipping_eu_cost', value: 'Free over €50, €4.90 otherwise', description: 'EU shipping cost policy' },
    { key: 'revenue_split', value: '50/50 (artist/platform)', description: 'Revenue split between artist and platform' },
    { key: 'return_policy_days', value: '30', description: 'Return window in days' },
    { key: 'return_policy', value: 'Free replacement for quality issues, full refund if we can\'t make it right', description: 'Return policy summary' },
    { key: 'facility_location', value: 'Castelo Branco, Portugal', description: 'Production facility location' },
    { key: 'production_capacity', value: 'On-demand print-on-demand, no minimums', description: 'Production capacity summary' },
    { key: 'production_lead_time', value: '5-7 business days', description: 'Production lead time' },
    { key: 'sustainability', value: 'Vegan, fair-trade, organic blanks as standard', description: 'Sustainability commitments' },
    { key: 'payment_methods', value: 'Visa, MC, Amex, Apple Pay, Google Pay, PayPal, USDC (Polygon)', description: 'Accepted payment methods' },
    { key: 'payment_gateway', value: 'NexaPay (primary), Stripe (backup)', description: 'Payment gateway providers' },

    // Stock control facts
    { key: 'stock_tracking', value: 'Per-variant inventory: quantityAvailable, quantityReserved, quantityOnOrder', description: 'How inventory is tracked per variant (color + size)' },
    { key: 'stock_on_order', value: 'quantityOnOrder tracks incoming stock from open supplier orders (POs). When a PO is received, quantityOnOrder decreases and quantityAvailable increases atomically.', description: 'How incoming inventory from purchase orders is tracked' },
    { key: 'po_number_format', value: 'PO-YYYY-NNNN (e.g., PO-2026-0001)', description: 'Purchase order number format — auto-generated sequentially per year' },
    { key: 'po_status_flow', value: 'draft → placed → confirmed → shipped → received (or cancelled at any point before received)', description: 'Supplier purchase order status workflow' },
    { key: 'order_types', value: 'individual (retail), bulk_quote (B2B quotes), wholesale (B2B bulk)', description: 'Customer order types' },
    { key: 'order_status_flow', value: 'pending → paid → processing → shipped → fulfilled (or cancelled)', description: 'Customer order status workflow' },
    { key: 'stock_reservation', value: 'When an order is placed, stock is atomically reserved: quantityAvailable decreases, quantityReserved increases. On fulfillment, quantityReserved decreases. If insufficient stock, the order fails.', description: 'How stock reservation prevents overselling' },
    { key: 'revenue_model', value: 'Zero risk for artists — no upfront costs. Artists only pay when products sell. 50/50 revenue split between artist and platform.', description: 'Business revenue model' },
];

const JSON_SETTINGS: SeedRow[] = [
    {
        key: 'product_catalog_summary',
        value: 'catalog',
        valueJson: [
            { sku: 'STTU258', name: 'Stanley/Stella Hypster', brand: 'Stanley/Stella', baseCostEur: 1299, material: '100% Organic Cotton', weightGsm: 180 },
        ],
        description: 'Summary of available product blanks',
    },
    {
        key: 'shipping_rates',
        value: 'rates',
        valueJson: {
            eu: { cost: 'Free over €50, €4.90 otherwise', carrier: 'CTT Correios', days: '7-14' },
            uk: { cost: '€9.90', carrier: 'Royal Mail', days: '10-18' },
            us: { cost: '€14.90', carrier: 'USPS', days: '14-21' },
            international: { cost: 'From €14.90', carrier: 'Varies by destination', days: '14-28' },
        },
        description: 'Shipping rates by region',
    },
    {
        key: 'pricing_rules',
        value: 'rules',
        valueJson: {
            markup_min: 2.0,
            markup_recommended: 2.5,
            bulk_discounts: [
                { minQty: 50, discount: '10%' },
                { minQty: 100, discount: '15%' },
            ],
        },
        description: 'Pricing rules and bulk discount tiers',
    },
];

const ALL_SETTINGS = [...FLAT_SETTINGS, ...JSON_SETTINGS];

async function seed() {
    console.log(`Seeding ${ALL_SETTINGS.length} settings...`);

    for (const row of ALL_SETTINGS) {
        await db.insert(appSettings)
            .values({
                key: row.key,
                value: row.value,
                valueJson: row.valueJson ?? null,
                description: row.description ?? null,
            })
            .onConflictDoUpdate({
                target: appSettings.key,
                set: {
                    value: row.value,
                    valueJson: row.valueJson ?? null,
                    description: row.description ?? null,
                    updatedAt: sql`NOW()`,
                },
            });
    }

    console.log('✅ Done');
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
