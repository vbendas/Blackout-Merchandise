'use server';

import { revalidatePath } from 'next/cache';
import { getActiveInkSystem, updateInkSystem } from '@/lib/services/ink-system';
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
    // The form doesn't edit the dot-gain calibration: whatever is in force now stays, even if this page was loaded before a
    // measurement was saved on the calibration page (and so holds an older one, or none).
    const next = { ...checked.profile };
    delete next.dotGain;
    const current = (await getActiveInkSystem()).profile.dotGain;
    const result = await updateInkSystem(actor, current ? { ...next, dotGain: current } : next);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath('/admin/ink-system');
    return { ok: true, value: { updatedAt: result.value.updatedAt } };
  });
}
