'use client';

import { useClerk } from '@clerk/nextjs';

/** Only rendered when Clerk is available (never in dev bypass). */
export function ManageAccountButton() {
  const clerk = useClerk();
  return (
    <button type="button" className="mf-pill" onClick={() => clerk.openUserProfile()}>
      Manage account
    </button>
  );
}
