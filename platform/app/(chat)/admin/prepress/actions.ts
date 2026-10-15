'use server';

import { revalidatePath } from 'next/cache';
import { approvePack, rerunPack, sendBackToArtist, unapprovePack } from '@/lib/services/prepress';
import { assignPantone } from '@/lib/services/pantone-library';
import { runPrepressAction } from '@/components/admin/prepress/action-runner';
import { checkPantoneCode, checkRerunSettings, checkSendBackNote, isPackId, type Checked } from '@/components/admin/prepress/rules';

// The auditor's actions on a pack, behind the buttons of /admin/prepress/[packId].
// Each one takes Pre-press "Work" access (checked first, before anything the
// browser sent is looked at), checks what the browser sent, and calls the owning
// service. The services record the action in the staff activity log themselves
// (Plan section 9), so these don't log again. The corrected-PSD upload is a route
// instead (app/api/prepress/[packId]/upload), because a server action stops at 1 MB.

const NOT_A_PACK: Checked<never> = { ok: false, error: 'This pack doesn’t exist.' };

function refresh(packId: string): void {
  revalidatePath('/admin/prepress');
  revalidatePath(`/admin/prepress/${packId}`);
}

export async function approvePackAction(packId: string): Promise<Checked<null>> {
  return runPrepressAction('work', async (actor) => {
    if (!isPackId(packId)) return NOT_A_PACK;
    const result = await approvePack(actor, packId);
    if (!result.ok) return { ok: false, error: result.error };
    refresh(packId);
    return { ok: true, value: null };
  });
}

/** The Undo on the approved banner: takes pre-press's approval back while no
 * order has started production from the pack (unapprovePack refuses after). */
export async function unapprovePackAction(packId: string): Promise<Checked<null>> {
  return runPrepressAction('work', async (actor) => {
    if (!isPackId(packId)) return NOT_A_PACK;
    const result = await unapprovePack(actor, packId);
    if (!result.ok) return { ok: false, error: result.error };
    refresh(packId);
    return { ok: true, value: null };
  });
}

export async function sendBackAction(packId: string, note: string): Promise<Checked<null>> {
  return runPrepressAction('work', async (actor) => {
    if (!isPackId(packId)) return NOT_A_PACK;
    const checked = checkSendBackNote(note);
    if (!checked.ok) return checked;
    const result = await sendBackToArtist(actor, packId, checked.value);
    if (!result.ok) return { ok: false, error: result.error };
    refresh(packId);
    return { ok: true, value: null };
  });
}

export async function assignPantoneAction(packId: string, plateIndex: number, code: string): Promise<Checked<null>> {
  return runPrepressAction('work', async (actor) => {
    if (!isPackId(packId)) return NOT_A_PACK;
    if (!Number.isInteger(plateIndex) || plateIndex < 1 || plateIndex > 15) return { ok: false, error: 'That ink isn’t in this pack.' };
    const checked = checkPantoneCode(code);
    if (!checked.ok) return checked;
    const result = await assignPantone(actor, { packId, plateIndex, code: checked.value });
    if (!result.ok) return { ok: false, error: result.error };
    refresh(packId);
    return { ok: true, value: null };
  });
}

/** `settings` comes from a browser: only its known fields, each in range, go on. */
export async function rerunPackAction(packId: string, settings: unknown): Promise<Checked<{ jobId: string }>> {
  return runPrepressAction('work', async (actor) => {
    if (!isPackId(packId)) return NOT_A_PACK;
    const checked = checkRerunSettings(settings);
    if (!checked.ok) return checked;
    const result = await rerunPack(actor, packId, checked.value);
    if (!result.ok) return { ok: false, error: result.error };
    refresh(packId);
    return { ok: true, value: result.value };
  });
}
