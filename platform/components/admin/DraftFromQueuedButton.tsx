'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { draftSupplierOrderAction } from '@/app/(chat)/admin/actions';

export function DraftFromQueuedButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span className="text-[12px]" style={{ color: 'var(--danger)' }}>
          {error}
        </span>
      ) : null}
      <button
        type="button"
        className="mf-pill mf-pill-sm mf-pill-primary"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              await draftSupplierOrderAction();
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Nothing queued to draft.');
            }
          });
        }}
      >
        {pending ? '…' : 'Draft from queued'}
      </button>
    </div>
  );
}
