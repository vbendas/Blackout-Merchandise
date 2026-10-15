// The shop's ink system profile (WP7): one active ink_systems row, editable by
// staff with Manage access to Pre-press. Falls back to DEFAULT_INK_SYSTEM.
//
// An edit adds a new row and retires the old one instead of changing it in
// place: print jobs pin the row they ran with (PrintJobInput.inkSystemId), so
// "the same inputs give the same bytes" stays true after the profile changes.
import { and, desc, eq, lt, ne, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { can, PermissionError, type Actor } from '@/lib/auth/permissions';
import type { InkSystemProfile } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import { printDeps } from '@/lib/print/pipeline';
import { printMockOn } from '@/lib/print/mock-mode';

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface ActiveInkSystem {
  /** null when no row exists yet and the code default is in use */
  id: string | null;
  profile: InkSystemProfile;
  updatedAt: string | null;
}

const text = (max: number) => z.string().trim().min(1).max(max);
const unit = z.number().min(0).max(1);
const meshCount = z.number().int().min(30).max(500);

const profileSchema = z
  .object({
    name: text(80),
    bases: z.object({ light: text(60), dark: text(60) }).strict(),
    opacity: z.record(z.string(), unit),
    underbase: z.object({ ink: text(60), flash: z.object({ seconds: z.number().min(0).max(120), celsius: z.number().min(0).max(400) }).strict() }).strict(),
    highlightWhite: z.object({ ink: text(60) }).strict(),
    mesh: z.object({ min: meshCount, max: meshCount, halftone: meshCount, solid: meshCount, underbase: meshCount }).strict(),
    cure: z.object({ minutesMin: z.number().min(0).max(30), minutesMax: z.number().min(0).max(30), celsius: z.number().min(0).max(400) }).strict(),
    pigmentMaxPct: z.number().min(0).max(100),
    offContactMm: z.tuple([z.number().min(0).max(20), z.number().min(0).max(20)]),
    squeegee: z.string().trim().max(120),
    pressHeads: z.number().int().min(1).max(15),
    measured: z.boolean(),
  })
  .strict();

/** Wrong values in plain words, or null when the profile can be saved. */
export function inkProfileProblem(profile: unknown): string | null {
  const parsed = profileSchema.safeParse(profile);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.length > 0 ? `${issue.path.join(' > ')}: ` : '';
    return `${where}${issue.message}`;
  }
  const p = parsed.data;
  if (p.mesh.min > p.mesh.max) return 'Mesh: the finest count must not be lower than the coarsest.';
  if (p.cure.minutesMin > p.cure.minutesMax) return 'Cure: the shortest time must not exceed the longest.';
  if (p.offContactMm[0] > p.offContactMm[1]) return 'Off-contact: the first value must not exceed the second.';
  // The engine looks every ink up by name when it draws proofs.
  for (const ink of new Set([p.bases.light, p.bases.dark, p.underbase.ink, p.highlightWhite.ink])) {
    if (p.opacity[ink] === undefined) return `Opacity: add a value for ${ink}.`;
  }
  return null;
}

/** A stored profile over the code default, so a row saved by an older version of the profile still loads. */
function withDefaults(stored: unknown): InkSystemProfile {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<InkSystemProfile>;
  const d = DEFAULT_INK_SYSTEM;
  return {
    ...d,
    ...s,
    bases: { ...d.bases, ...(s.bases ?? {}) },
    opacity: { ...d.opacity, ...(s.opacity ?? {}) },
    underbase: { ...d.underbase, ...(s.underbase ?? {}), flash: { ...d.underbase.flash, ...(s.underbase?.flash ?? {}) } },
    highlightWhite: { ...d.highlightWhite, ...(s.highlightWhite ?? {}) },
    mesh: { ...d.mesh, ...(s.mesh ?? {}) },
    cure: { ...d.cure, ...(s.cure ?? {}) },
    offContactMm: s.offContactMm ?? d.offContactMm,
  };
}

type InkSystemRow = typeof schema.inkSystems.$inferSelect;

function toActive(row: InkSystemRow): ActiveInkSystem {
  return { id: row.id, profile: withDefaults(row.profile), updatedAt: row.updatedAt.toISOString() };
}

export async function getActiveInkSystem(): Promise<ActiveInkSystem> {
  if (printMockOn()) return { id: null, profile: DEFAULT_INK_SYSTEM, updatedAt: null };
  const [row] = await db
    .select()
    .from(schema.inkSystems)
    .where(eq(schema.inkSystems.isActive, true))
    .orderBy(desc(schema.inkSystems.updatedAt), desc(schema.inkSystems.id))
    .limit(1);
  return row ? toActive(row) : { id: null, profile: DEFAULT_INK_SYSTEM, updatedAt: null };
}

/** The profile a job ran with, active or retired; null when the row is gone. */
export async function getInkSystemById(id: string): Promise<InkSystemProfile | null> {
  const [row] = await db.select().from(schema.inkSystems).where(eq(schema.inkSystems.id, id)).limit(1);
  return row ? withDefaults(row.profile) : null;
}

export async function updateInkSystem(actor: Actor, profile: InkSystemProfile): Promise<ServiceResult<ActiveInkSystem>> {
  if (!can(actor, 'prepress', 'manage')) return { ok: false, error: new PermissionError('prepress', 'manage').message };

  const problem = inkProfileProblem(profile);
  if (problem) return { ok: false, error: problem };

  if (printMockOn()) return { ok: true, value: { id: null, profile, updatedAt: null } };

  const [row] = await db
    .insert(schema.inkSystems)
    // Set here rather than by the database, so the comparison below sees exactly what was stored.
    .values({ name: profile.name.trim(), isActive: true, profile, updatedBy: actor.userId, updatedAt: new Date() })
    .returning();
  // Only rows older than this one step down (in the order getActiveInkSystem reads them): two saves at
  // once can then leave two active rows, of which the newer is read, but never none.
  await db
    .update(schema.inkSystems)
    .set({ isActive: false })
    .where(
      and(
        eq(schema.inkSystems.isActive, true),
        ne(schema.inkSystems.id, row.id),
        or(lt(schema.inkSystems.updatedAt, row.updatedAt), and(eq(schema.inkSystems.updatedAt, row.updatedAt), lt(schema.inkSystems.id, row.id))),
      ),
    );

  await printDeps()
    .recordActivity(actor, { area: 'prepress', action: 'ink_system.update', itemType: 'ink_system', itemId: row.id, detail: { name: profile.name } })
    .catch(() => undefined);

  return { ok: true, value: toActive(row) };
}
