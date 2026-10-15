// The house Pantone library (WP7): codes pre-press picked in MagnaMix for a
// colour, remembered so the next close colour is named automatically. Never
// Pantone's colour table, and admin only: clients see plain colour names
// (lib/print/colour-names.ts). Documentation/Dev/Print-Prep-Plan.md section 5.
import { and, desc, eq, ilike } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { can, PermissionError, type Actor } from '@/lib/auth/permissions';
import type { Hex, Lab } from '@/lib/print/types';
import { deltaE2000, hexToLab, labToLinear, linearToHex } from '@/lib/print/engine/colour';
import { printDeps, requestScreenFilesRefresh, type StoredManifest } from '@/lib/print/pipeline';
import { printMockOn } from '@/lib/print/mock-mode';

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface PantoneSuggestion {
  code: string;
  /** ΔE2000 between the asked colour and the remembered one */
  deltaE: number;
}

export interface PantoneLibraryRowView {
  id: string;
  code: string;
  lab: Lab;
  hex: string;
  source: 'assigned' | 'measured';
  substrate: string | null;
  createdAt: string;
}

/** A remembered colour, as the matcher needs it. */
export interface LibraryColour {
  code: string;
  lab: Lab;
}

// ---------------------------------------------------------------------------
// Colour maths. The engine owns it (lib/print/engine/colour.ts: sRGB to CIE Lab
// D50, CIEDE2000); the library uses the same functions so a code is suggested
// by the same distance the engine matched the ink with. The path import skips
// the engine's index, which pulls in sharp.
export { deltaE2000, hexToLab };

/** Lab back to the nearest sRGB hex (clamped), for swatches in the admin. */
export function labToHex(lab: Lab): Hex {
  const [r, g, b] = labToLinear(lab);
  return linearToHex(r, g, b);
}

// ---------------------------------------------------------------------------
// Suggestions

export const DEFAULT_SUGGEST_DELTA_E = 3;

/** The closest remembered colour within `maxDeltaE`, or null. Pure: the
 * pipeline loads the library once per job and asks for every ink. */
export function suggestFromLibrary(entries: readonly LibraryColour[], lab: Lab, maxDeltaE: number = DEFAULT_SUGGEST_DELTA_E): PantoneSuggestion | null {
  let best: PantoneSuggestion | null = null;
  for (const entry of entries) {
    const deltaE = deltaE2000(lab, entry.lab);
    if (deltaE <= maxDeltaE && (!best || deltaE < best.deltaE)) best = { code: entry.code, deltaE };
  }
  return best ? { code: best.code, deltaE: Math.round(best.deltaE * 100) / 100 } : null;
}

/** The colours pre-press picked codes for (not the measured prints, which
 * describe a printed result rather than the colour a code was picked for). */
export async function loadAssignedLibrary(): Promise<LibraryColour[]> {
  const rows = await db
    .select({ code: schema.pantoneLibrary.code, l: schema.pantoneLibrary.labL, a: schema.pantoneLibrary.labA, b: schema.pantoneLibrary.labB })
    .from(schema.pantoneLibrary)
    .where(eq(schema.pantoneLibrary.source, 'assigned'));
  return rows.map((r) => ({ code: r.code, lab: { L: r.l, a: r.a, b: r.b } }));
}

/** Closest remembered code within `maxDeltaE` (default 3), or null. */
export async function suggestPantone(lab: Lab, maxDeltaE?: number): Promise<PantoneSuggestion | null> {
  if (printMockOn()) return null;
  return suggestFromLibrary(await loadAssignedLibrary(), lab, maxDeltaE);
}

// ---------------------------------------------------------------------------
// Assigning

function deny(actor: Actor, level: 'view' | 'work'): string | null {
  return can(actor, 'prepress', level) ? null : new PermissionError('prepress', level).message;
}

/** Library entries closer than this to the same code are the same memory. */
const SAME_COLOUR_DELTA_E = 0.5;

/** Pre-press enters the code for one ink of a pack; remembered for next time. */
export async function assignPantone(actor: Actor, input: { packId: string; plateIndex: number; code: string }): Promise<ServiceResult<null>> {
  const denied = deny(actor, 'work');
  if (denied) return { ok: false, error: denied };
  if (printMockOn()) return { ok: true, value: null };

  const code = normalisePantoneCode(input.code);
  if (!code) return { ok: false, error: 'Enter a Pantone code, for example 186 C.' };
  if (code.length > 40) return { ok: false, error: 'That code is too long. Enter it the way MagnaMix shows it, for example 186 C.' };

  const [pack] = await db.select().from(schema.productionPacks).where(eq(schema.productionPacks.id, input.packId)).limit(1);
  if (!pack) return { ok: false, error: 'Pack not found.' };
  if (pack.technique !== 'screen') return { ok: false, error: 'Only screen prints have Pantone inks.' };
  const manifest = pack.manifest as StoredManifest | null;
  const ink = manifest?.inks.find((i) => i.index === input.plateIndex);
  if (!manifest || !ink) return { ok: false, error: 'That film is not in this pack.' };
  if (ink.role !== 'ink') return { ok: false, error: 'The white films have no Pantone code. Only colour inks do.' };

  const lab = manifest.pipeline?.inkLabs?.[String(ink.index)] ?? hexToLab(ink.hex);

  // Remember it, unless the library already has this code for this colour.
  const known = await db
    .select({ l: schema.pantoneLibrary.labL, a: schema.pantoneLibrary.labA, b: schema.pantoneLibrary.labB })
    .from(schema.pantoneLibrary)
    .where(and(eq(schema.pantoneLibrary.code, code), eq(schema.pantoneLibrary.source, 'assigned')));
  const alreadyKnown = known.some((k) => deltaE2000(lab, { L: k.l, a: k.a, b: k.b }) < SAME_COLOUR_DELTA_E);
  if (!alreadyKnown) {
    await db.insert(schema.pantoneLibrary).values({ code, labL: lab.L, labA: lab.a, labB: lab.b, source: 'assigned', createdBy: actor.userId });
  }

  const inks = manifest.inks.map((i) => (i.index === ink.index ? { ...i, pantone: code } : i));
  await db
    .update(schema.productionPacks)
    .set({ manifest: { ...manifest, inks }, updatedAt: new Date() })
    .where(eq(schema.productionPacks.id, pack.id));

  // The files carry the code in their layer names, so they are rebuilt in the
  // worker. Best effort: approving the pack tries again if this one is missed.
  const deps = printDeps();
  await deps
    .recordActivity(actor, { area: 'prepress', action: 'pantone.assign', itemType: 'production_pack', itemId: pack.id, detail: { plateIndex: ink.index, code } })
    .catch(() => undefined);
  await requestScreenFilesRefresh(pack.id, actor.userId, deps).catch((err) => {
    console.error('[pantone] could not queue the file refresh:', err instanceof Error ? err.message : err);
  });

  return { ok: true, value: null };
}

export async function listPantoneLibrary(actor: Actor, opts?: { search?: string; limit?: number }): Promise<PantoneLibraryRowView[]> {
  if (!can(actor, 'prepress', 'view')) throw new PermissionError('prepress', 'view');
  if (printMockOn()) return [];

  const search = opts?.search?.trim();
  const limit = Math.min(Math.max(Math.round(opts?.limit ?? 200), 1), 500);
  const rows = await db
    .select()
    .from(schema.pantoneLibrary)
    .where(search ? ilike(schema.pantoneLibrary.code, `%${search.replace(/[%_\\]/g, '\\$&')}%`) : undefined)
    .orderBy(desc(schema.pantoneLibrary.createdAt), schema.pantoneLibrary.code)
    .limit(limit);

  return rows.map((r) => {
    const lab = { L: r.labL, a: r.labA, b: r.labB };
    return {
      id: r.id,
      code: r.code,
      lab,
      hex: labToHex(lab),
      source: r.source === 'measured' ? 'measured' : 'assigned',
      substrate: r.substrate,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

/** 'PANTONE 186 C' style: trims, uppercases the prefix, rejects empty input. */
export function normalisePantoneCode(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  const withoutPrefix = trimmed.replace(/^pantone\s*/i, '');
  if (!withoutPrefix) return null;
  return `PANTONE ${withoutPrefix.toUpperCase()}`;
}
