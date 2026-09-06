import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

const MAX_FACTS = 50;

interface StoreMemory {
  facts: string[];
}

function parseMemory(value: unknown): StoreMemory {
  if (value && typeof value === 'object' && Array.isArray((value as StoreMemory).facts)) {
    return { facts: (value as StoreMemory).facts.filter((f): f is string => typeof f === 'string') };
  }
  return { facts: [] };
}

/** Appends a fact to `artist_stores.memory`, capping the list so it never grows unbounded. */
export async function rememberFact(storeId: string, fact: string): Promise<string[]> {
  const rows = await db
    .select({ memory: schema.artistStores.memory })
    .from(schema.artistStores)
    .where(eq(schema.artistStores.id, storeId))
    .limit(1);
  if (!rows[0]) throw new Error(`Store ${storeId} not found`);

  const memory = parseMemory(rows[0].memory);
  const facts = [...memory.facts, fact.trim()].filter(Boolean).slice(-MAX_FACTS);

  await db
    .update(schema.artistStores)
    .set({ memory: { facts }, updatedAt: new Date() })
    .where(eq(schema.artistStores.id, storeId));

  return facts;
}

export async function listFacts(storeId: string): Promise<string[]> {
  const rows = await db
    .select({ memory: schema.artistStores.memory })
    .from(schema.artistStores)
    .where(eq(schema.artistStores.id, storeId))
    .limit(1);
  return parseMemory(rows[0]?.memory).facts;
}
