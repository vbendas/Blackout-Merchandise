'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resendInviteAction, revokeInviteAction } from '@/app/(chat)/admin/team/actions';
import { CopyLink } from '@/components/admin/team/CopyLink';

/** Send again (a fresh link, 7 more days) and withdraw, for an invite that
 * hasn't been used. */
export function InviteActions({ inviteId, canWithdraw }: { inviteId: string; canWithdraw: boolean }) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="tm-actions justify-end">
        <button
          type="button"
          className="tm-btn"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                const result = await resendInviteAction(inviteId);
                if (result.error) setError(result.error);
                else {
                  setLink(result.acceptUrl ?? null);
                  router.refresh();
                }
              } catch {
                setError('That did not go through. Please try again.');
              }
            });
          }}
        >
          Send again
        </button>
        {canWithdraw ? (
          <button
            type="button"
            className="tm-btn"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  const result = await revokeInviteAction(inviteId);
                  if (result.error) setError(result.error);
                  else router.refresh();
                } catch {
                  setError('That did not go through. Please try again.');
                }
              });
            }}
          >
            Withdraw
          </button>
        ) : null}
      </div>
      {link ? <CopyLink url={link} /> : null}
      {error ? (
        <p role="alert" className="text-left">
          {error}
        </p>
      ) : null}
    </div>
  );
}
