'use client';

import { useClerk } from '@clerk/nextjs';

function ClerkSignOut({ label }: { label: string }) {
  const { signOut } = useClerk();
  return (
    <button type="button" className="mf-ulink inline-flex min-h-11 items-center" onClick={() => void signOut({ redirectUrl: '/' })}>
      {label}
    </button>
  );
}

/** Sign out, so the person can sign in with another address. Nothing under
 * the dev auth bypass, which has no Clerk. */
export function SignOut({ enabled, label = 'Sign out' }: { enabled: boolean; label?: string }) {
  return enabled ? <ClerkSignOut label={label} /> : null;
}
