'use server';

import { refresh } from 'next/cache';
import { requireRegistered } from '@/lib/auth';
import { approveDesign, getApprovalView, revokeApproval } from '@/lib/services/print-prep';
import { checkApprovable, cleanId, readableError } from '@/components/studio/approve/approve-logic';

// The server action behind the approval page's "Approve artwork". Like every
// action it is a public POST endpoint, so it signs the caller in again, takes
// the shop from the session (never from the page), loads the approval view
// itself and approves only the version the artist was looking at, once the
// proofs are ready. The answer is shaped for the page: a sentence, not a thrown
// error (the framework hides those in production).

export type ApproveResult = { ok: true } | { ok: false; error: string };

const NOT_RECORDED = 'We could not record your approval just now. Please try again in a moment.';

export async function approveArtworkAction(designId: string, versionId: string): Promise<ApproveResult> {
  const design = cleanId(designId);
  const version = cleanId(versionId);
  if (!design || !version) return { ok: false, error: 'We could not tell which artwork to approve. Reload the page and try again.' };

  // Outside the try: a signed-out caller is redirected, which must not be swallowed.
  const { user, store } = await requireRegistered();
  if (!store) return { ok: false, error: 'This account has no shop to approve artwork for.' };

  try {
    const view = await getApprovalView({ storeId: store.id, designId: design });
    const check = checkApprovable(view, version);
    if (!check.ok) return check;
    if (!check.already) {
      const result = await approveDesign({ storeId: store.id, userId: user.id, designId: design, versionId: version });
      if (!result.ok) return { ok: false, error: readableError(result.error) };
    }
  } catch (error) {
    console.error('approve artwork failed', error);
    return { ok: false, error: NOT_RECORDED };
  }

  // The page's own view (status, approval time) is read again with this response.
  refresh();
  return { ok: true };
}

const NOT_UNDONE = 'We could not undo your approval just now. Please try again in a moment.';

/** The "Undo" in the approved box: withdraws the artist's approval of the
 * design's current version while no order waits on the files and pre-press
 * hasn't checked them (revokeApproval checks both, and the owner, again). */
export async function undoApprovalAction(designId: string): Promise<ApproveResult> {
  const design = cleanId(designId);
  if (!design) return { ok: false, error: 'We could not tell which artwork this is. Reload the page and try again.' };

  // Outside the try: a signed-out caller is redirected, which must not be swallowed.
  const session = await requireRegistered();
  try {
    const result = await revokeApproval(session, design);
    if (!result.ok) return { ok: false, error: readableError(result.error) };
  } catch (error) {
    console.error('undo approval failed', error);
    return { ok: false, error: NOT_UNDONE };
  }

  refresh();
  return { ok: true };
}
