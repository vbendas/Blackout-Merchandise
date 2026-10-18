'use server';

import { requireRegistered } from '@/lib/auth';
import { setPressBoardOptIn } from '@/lib/services/stores';

// The server action behind Settings > Shop's "Show my shop's name on the Blackout Merchandise press board". Like every action it is a
// public POST endpoint, so it signs the caller in again and takes the shop from the session, never from the page. The
// answer is a sentence the switch shows beside itself, not a thrown error.

export type PressBoardResult = { ok: true } | { ok: false; error: string };

const NOT_SAVED = 'That did not save. Please try again.';

export async function setPressBoardAction(show: boolean): Promise<PressBoardResult> {
  if (typeof show !== 'boolean') return { ok: false, error: NOT_SAVED };
  // Outside the try: a signed-out caller is redirected, which must not be swallowed.
  const { store } = await requireRegistered();
  if (!store) return { ok: false, error: 'This account has no shop.' };
  try {
    if (!(await setPressBoardOptIn(store.id, show))) return { ok: false, error: 'This account has no shop.' };
  } catch (error) {
    console.error('press board opt-in failed', error);
    return { ok: false, error: NOT_SAVED };
  }
  return { ok: true };
}
