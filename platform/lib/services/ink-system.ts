// The shop's ink system profile (WP7): one active ink_systems row, editable by
// staff with Manage access to Pre-press. Falls back to DEFAULT_INK_SYSTEM.
//
// An edit adds a new row and retires the old one instead of changing it in
// place: print jobs pin the row they ran with (PrintJobInput.inkSystemId), so
// "the same inputs give the same bytes" stays true after the profile changes.
// That includes the dot-gain calibration (Phase 2, lib/print/calibration): a
// measurement saves as a new row like any other edit, so packs made before it
// keep the curve they were made with, and new packs and re-runs use the new one.
import { and, desc, eq, lt, ne, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { can, PermissionError, type Actor } from '@/lib/auth/permissions';
import type { InkSystemProfile } from '@/lib/print/types';
import { DEFAULT_INK_SYSTEM } from '@/lib/print/defaults';
import { dotGainProblem, dotGainProfileSchema, buildDotGainProfile, summariseDotGain, type DotGainInput } from '@/lib/print/calibration/profile';
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
    dotGain: dotGainProfileSchema.optional(),
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

/** Adds `profile` as the active row, retires the older ones and logs it. Callers have checked access and the profile. */
async function saveProfile(actor: Actor, profile: InkSystemProfile, entry: { action: string; detail: unknown }): Promise<ServiceResult<ActiveInkSystem>> {
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
    .recordActivity(actor, { area: 'prepress', action: entry.action, itemType: 'ink_system', itemId: row.id, detail: entry.detail })
    .catch(() => undefined);

  return { ok: true, value: toActive(row) };
}

export async function updateInkSystem(actor: Actor, profile: InkSystemProfile): Promise<ServiceResult<ActiveInkSystem>> {
  if (!can(actor, 'prepress', 'manage')) return { ok: false, error: new PermissionError('prepress', 'manage').message };

  const problem = inkProfileProblem(profile);
  if (problem) return { ok: false, error: problem };

  return saveProfile(actor, profile, { action: 'ink_system.update', detail: { name: profile.name } });
}

/**
 * Saves a dot-gain measurement into the ink system profile (Manage access to
 * Pre-press): a new active row that is the current profile plus the
 * measurement, as an edit is. The measurement is checked in words
 * (lib/print/calibration/profile.ts), and the engine's dotGainFor() reads it from
 * the profile of every job prepared from now on. A job already prepared keeps
 * the row it ran with.
 */
export async function saveDotGain(actor: Actor, input: DotGainInput): Promise<ServiceResult<ActiveInkSystem>> {
  if (!can(actor, 'prepress', 'manage')) return { ok: false, error: new PermissionError('prepress', 'manage').message };

  // The readings become a measurement here: the two fixed ends dropped, the points in order, repeats averaged.
  const dotGain = buildDotGainProfile(input);
  const measurementProblem = dotGainProblem(dotGain);
  if (measurementProblem) return { ok: false, error: measurementProblem };

  const active = await getActiveInkSystem();
  const next: InkSystemProfile = { ...active.profile, dotGain };
  const problem = inkProfileProblem(next);
  if (problem) return { ok: false, error: problem };

  const summary = summariseDotGain(dotGain);
  return saveProfile(actor, next, {
    action: 'ink_system.dot_gain',
    detail: {
      method: dotGain.method,
      lpi: dotGain.lpi,
      angleDeg: dotGain.angleDeg,
      mesh: dotGain.mesh,
      readings: dotGain.points.length,
      measuredAt: dotGain.measuredAt,
      ...(summary ? { printedAt50: Math.round(summary.printedAt50 * 1000) / 1000 } : {}),
    },
  });
}

/** Takes the calibration out of the profile: films are made with linear coverage again (Manage access to Pre-press). Nothing is saved when there is none. */
export async function resetDotGain(actor: Actor): Promise<ServiceResult<ActiveInkSystem>> {
  if (!can(actor, 'prepress', 'manage')) return { ok: false, error: new PermissionError('prepress', 'manage').message };

  const active = await getActiveInkSystem();
  if (!active.profile.dotGain) return { ok: true, value: active };
  const { dotGain: previous, ...rest } = active.profile;
  return saveProfile(actor, rest, { action: 'ink_system.dot_gain_reset', detail: { method: previous.method, measuredAt: previous.measuredAt } });
}
