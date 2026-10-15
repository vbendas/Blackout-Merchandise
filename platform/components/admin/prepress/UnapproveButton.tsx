'use client';

import { useState, useTransition } from 'react';
import { unapprovePackAction } from '@/app/(chat)/admin/prepress/actions';

/** The Undo on the approved banner: takes pre-press's approval back while no
 * order has started production from the pack. The service refuses after that,
 * and its sentence shows here. */
export function UnapproveButton({ packId }: { packId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function undo() {
    setError(null);
    startTransition(async () => {
      const result = await unapprovePackAction(packId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      <button type="button" className="pp-btn pp-btn-sm" disabled={pending} onClick={undo}>
        {pending ? 'Undoing…' : 'Undo'}
      </button>
      {error ? (
        <span role="alert" className="pp-error">
          {error}
        </span>
      ) : null}
    </>
  );
}
