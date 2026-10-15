import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { designDisplayName, loadCurrentPacks } from '@/lib/print/pipeline';

// What the /dev page (local demo mode) links to: the demo's shop, its designs
// and their packs, looked up as they are now, so the page needs no ids typed
// in. Read-only. The page only asks while AUTH_DEV_BYPASS is on.

export interface DemoPackLink {
  packId: string;
  /** 'Screen print · Darks', 'DTG/DTF' */
  label: string;
  /** pre-press's word for it: idle, waiting, being fixed, approved, sent back */
  audit: string;
}

export interface DemoDesignLink {
  designId: string;
  name: string;
  /** the artist's approval of the newest version stands */
  approved: boolean;
  packs: DemoPackLink[];
}

export interface DemoLinks {
  shop: { name: string; slug: string } | null;
  designs: DemoDesignLink[];
}

const AUDIT_WORDS: Record<string, string> = {
  idle: 'not needed yet',
  waiting: 'waiting',
  being_fixed: 'being fixed',
  approved: 'approved',
  sent_back: 'sent back',
};

function packLabel(pack: { technique: string; screenSetKey: string | null }): string {
  if (pack.technique !== 'screen') return 'DTG/DTF';
  const set = pack.screenSetKey ? pack.screenSetKey.charAt(0).toUpperCase() + pack.screenSetKey.slice(1) : '';
  return set ? `Screen print · ${set}` : 'Screen print';
}

/** The demo's shop, designs and packs, or null when they can't be read (no demo database built). */
export async function loadDemoLinks(): Promise<DemoLinks | null> {
  try {
    const [store] = await db
      .select({ id: schema.artistStores.id, name: schema.artistStores.name, slug: schema.artistStores.slug })
      .from(schema.artistStores)
      .orderBy(asc(schema.artistStores.createdAt))
      .limit(1);
    if (!store) return { shop: null, designs: [] };

    const rows = await db.select({ id: schema.designs.id }).from(schema.designs).where(eq(schema.designs.storeId, store.id)).orderBy(asc(schema.designs.createdAt));
    const designs: DemoDesignLink[] = [];
    for (const { id } of rows) {
      const [version] = await db.select().from(schema.designVersions).where(eq(schema.designVersions.designId, id)).orderBy(desc(schema.designVersions.version)).limit(1);
      const [approval] = version
        ? await db
            .select({ id: schema.designApprovals.id })
            .from(schema.designApprovals)
            .where(and(eq(schema.designApprovals.designVersionId, version.id), isNull(schema.designApprovals.invalidatedAt)))
            .limit(1)
        : [];
      const packs = version ? await loadCurrentPacks(version.id) : [];
      designs.push({
        designId: id,
        name: await designDisplayName(id),
        approved: Boolean(approval),
        packs: packs.map((pack) => ({
          packId: pack.id,
          label: packLabel(pack),
          audit: AUDIT_WORDS[pack.auditStatus] ?? pack.auditStatus,
        })),
      });
    }
    return { shop: { name: store.name, slug: store.slug }, designs };
  } catch (err) {
    console.error('[dev] the demo links could not be read:', err instanceof Error ? err.message : err);
    return null;
  }
}
