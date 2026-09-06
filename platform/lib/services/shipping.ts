import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

// Flat shipping-zone lookup used by both the cart's rate preview and
// checkout.ts's authoritative calculation. A zone with an empty `countries`
// array is the "rest of world" catch-all — exactly one such zone should be
// active at a time (see scripts/seed.ts).

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  flatCents: number;
  freeOverCents: number | null;
}

function toZone(row: typeof schema.shippingZones.$inferSelect): ShippingZone {
  return {
    id: row.id,
    name: row.name,
    countries: Array.isArray(row.countries) ? (row.countries as string[]) : [],
    flatCents: row.flatCents,
    freeOverCents: row.freeOverCents,
  };
}

/** Zone for an ISO-2 destination country: exact match first, else the "rest
 * of world" zone (empty countries[]). Null only if no zone is seeded/active
 * at all — a store's checkout should not be reachable in that state. */
export async function zoneForCountry(iso2: string): Promise<ShippingZone | null> {
  const country = iso2.trim().toUpperCase();
  const rows = await db.select().from(schema.shippingZones).where(eq(schema.shippingZones.isActive, true));
  const zones = rows.map(toZone);

  const exact = zones.find((z) => z.countries.includes(country));
  if (exact) return exact;
  return zones.find((z) => z.countries.length === 0) ?? null;
}

/** Flat shipping cost for a zone given the order subtotal, honouring free-over-X. */
export function shippingCentsFor(zone: ShippingZone, subtotalCents: number): number {
  if (zone.freeOverCents != null && subtotalCents >= zone.freeOverCents) return 0;
  return zone.flatCents;
}

/** Broad EU + UK + CH allowlist for Stripe's shipping_address_collection when
 * the chosen zone is "rest of world" (empty countries[] means "anywhere
 * else", which Checkout can't express directly as an allowed-countries
 * list) — see buildCheckout in checkout.ts. */
export const REST_OF_WORLD_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'GB', 'CH', 'NO', 'IS', 'LI',
];
