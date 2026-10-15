'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { draftSupplierOrderAction } from '@/app/(chat)/admin/actions';

/** Drafts one supplier order from every queued order. Shown only to people
 * with Production, Work; the action checks that again itself. */
export function DraftFromQueuedButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      {error ? (
        <span role="alert" className="text-[13px]">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        className="mf-pill mf-pill-sm mf-pill-primary min-h-11"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const result = await draftSupplierOrderAction();
              if (result.error) setError(result.error);
              else router.refresh();
            } catch {
              setError('That did not go through. Please try again.');
            }
          });
        }}
      >
        {pending ? 'Drafting' : 'Draft from queued'}
      </button>
    </div>
  );
}
