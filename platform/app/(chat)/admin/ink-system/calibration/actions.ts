'use server';

import { revalidatePath } from 'next/cache';
import { resetDotGain, saveDotGain } from '@/lib/services/ink-system';
import { runPrepressAction } from '@/components/admin/prepress/action-runner';
import { checkDotGainInput } from '@/components/admin/ink-system/calibration/calibration-form';
import type { Checked } from '@/components/admin/prepress/rules';

// Saving or resetting the dot-gain calibration takes Pre-press "Manage" access, as the ink system profile it is
// part of does (Plan section 9). The access check comes first; then the measurement the browser sent is checked
// for shape, and the service judges the values in words. Packs prepared from now on use the calibration; packs
// approved before keep the files they have. The service records the change in the staff activity log itself.

export async function saveDotGainAction(input: unknown): Promise<Checked<{ updatedAt: string | null }>> {
  return runPrepressAction('manage', async (actor) => {
    const checked = checkDotGainInput(input);
    if (!checked.ok) return { ok: false, error: checked.error };
    const result = await saveDotGain(actor, checked.value);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath('/admin/ink-system');
    revalidatePath('/admin/ink-system/calibration');
    return { ok: true, value: { updatedAt: result.value.updatedAt } };
  });
}

export async function resetDotGainAction(): Promise<Checked<{ updatedAt: string | null }>> {
  return runPrepressAction('manage', async (actor) => {
    const result = await resetDotGain(actor);
    if (!result.ok) return { ok: false, error: result.error };
    revalidatePath('/admin/ink-system');
    revalidatePath('/admin/ink-system/calibration');
    return { ok: true, value: { updatedAt: result.value.updatedAt } };
  });
}
