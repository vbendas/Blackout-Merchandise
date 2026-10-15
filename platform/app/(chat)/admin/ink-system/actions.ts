'use server';

import { revalidatePath } from 'next/cache';
import { updateInkSystem } from '@/lib/services/ink-system';
import { runPrepressAction } from '@/components/admin/prepress/action-runner';
import { checkInkSystemProfile } from '@/components/admin/ink-system/profile-form';
import type { Checked } from '@/components/admin/prepress/rules';

// Saving the ink system profile takes Pre-press "Manage" access (Plan section 9:
// Manage adds the engine defaults and the ink system profile). The access check
// comes first; then the profile the browser sent is checked field by field, since
// a browser can send anything. Packs built from now on use the saved profile. The
// service records the change in the staff activity log itself.

export async function saveInkSystemAction(profile: unknown): Promise<Checked<{ updatedAt: string | null }>> {
  return runPrepressAction('manage', async (actor) => {
    const checked = checkInkSystemProfile(profile);
    if (!checked.ok) return { ok: false, error: checked.error };
    const result = await updateInkSystem(actor, checked.profile);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath('/admin/ink-system');
    return { ok: true, value: { updatedAt: result.value.updatedAt } };
  });
}
