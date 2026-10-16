'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffAction } from '@/lib/auth';
import { setScreenPriceTable } from '@/lib/services/pricing-admin';

// Saving the screen-print price table takes Catalogue and pricing "Manage" access
// (Plan section 9: Manage adds prices). The access check comes first, before the
// table is looked at; then the service checks every number again, since a browser can
// send anything, and records the change in the staff activity log. A refused
// permission throws (the page only offers the button to someone who has it); a
// number that is wrong comes back as `error`, with the box to look at in `field`.

export type SaveScreenPricesResult = { ok: true; updatedAt: string } | { ok: false; error: string; field?: string };

export async function saveScreenPriceTableAction(table: unknown): Promise<SaveScreenPricesResult> {
  const { actor } = await requireStaffAction('catalogue', 'manage');
  const result = await setScreenPriceTable(actor, table);
  if (!result.ok) return { ok: false, error: result.error, field: result.field };
  revalidatePath('/admin/pricing');
  return { ok: true, updatedAt: result.value.updatedAt ?? new Date().toISOString() };
}
