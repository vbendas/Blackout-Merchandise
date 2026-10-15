import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DEV_BYPASS, getSession, isSuspended } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { SignOut } from '../SignOut';

export const metadata: Metadata = { title: 'Access paused', robots: { index: false, follow: false } };

/** Where a suspended employee is sent from everywhere (lib/auth.ts
 * requireUser). It reads the session without requiring it, so it can't loop;
 * anyone who isn't paused is sent on to the Studio. */
export default async function StaffPausedPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (!isSuspended(session)) redirect('/studio');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <Logo height={56} priority />
      <h1 className="font-display text-2xl">Your access is paused</h1>
      <p className="mf-dim max-w-sm text-sm">The owner has paused your account. You&rsquo;ll be able to work again once they resume it.</p>
      <SignOut enabled={!DEV_BYPASS} />
    </div>
  );
}
