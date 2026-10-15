// The frame every pre-press server action runs in: the gate in lib/auth.ts
// (signed in, not paused, and `can()` at the level this action needs), then the
// work. Server actions are reachable by a direct POST, not only from the page's
// buttons, so each one checks for itself (the service behind it checks again).
// Failures come back as a result for the page to word: a message thrown from a
// server action is replaced by a generic one in production builds, so the page
// would never see it.
import { unstable_rethrow } from 'next/navigation';
import { requireStaffAction } from '@/lib/auth';
import { PermissionError, type Actor, type Level } from '@/lib/auth/permissions';
import type { Checked } from './rules';

export async function runPrepressAction<T>(level: Level, work: (actor: Actor) => Promise<Checked<T>>): Promise<Checked<T>> {
  try {
    const { actor } = await requireStaffAction('prepress', level);
    return await work(actor);
  } catch (err) {
    // a sign-in redirect or a not-found is Next's to handle, not ours to word
    unstable_rethrow(err);
    if (err instanceof PermissionError) return { ok: false, error: err.message };
    console.error('[prepress action]', err instanceof Error ? err.message : err);
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
}
