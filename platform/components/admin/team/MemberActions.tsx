'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeMemberAction, setOwnerAction, setSuspendedAction, type TeamActionResult } from '@/app/(chat)/admin/team/actions';

/** Pause or resume, owner or staff, and remove. Changing who is an owner and
 * removing ask once more on the page itself (no modal): an owner has the team
 * and money areas. The last owner can't be made staff or removed; the service
 * refuses it too. */
export function MemberActions({
  userId,
  name,
  role,
  suspended,
  isLastOwner,
}: {
  userId: string;
  name: string;
  role: 'admin' | 'staff';
  suspended: boolean;
  isLastOwner: boolean;
}) {
  const router = useRouter();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmOwner, setConfirmOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<TeamActionResult>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) {
          setError(result.error);
          return;
        }
        after?.();
        router.refresh();
      } catch {
        setError('That did not go through. Please try again.');
      }
    });
  }

  return (
    <div className="tm-section">
      <div className="tm-actions">
        {role === 'staff' ? (
          <button type="button" className="tm-btn" disabled={pending} onClick={() => run(() => setSuspendedAction(userId, !suspended))}>
            {suspended ? 'Resume access' : 'Pause access'}
          </button>
        ) : null}
        {role === 'staff' && !suspended && !confirmOwner ? (
          <button type="button" className="tm-btn" disabled={pending} onClick={() => setConfirmOwner(true)}>
            Make owner
          </button>
        ) : null}
        {role === 'admin' && !isLastOwner && !confirmOwner ? (
          <button type="button" className="tm-btn" disabled={pending} onClick={() => setConfirmOwner(true)}>
            Make staff
          </button>
        ) : null}
        {!isLastOwner && !confirmRemove ? (
          <button type="button" className="tm-btn" disabled={pending} onClick={() => setConfirmRemove(true)}>
            Remove from team
          </button>
        ) : null}
      </div>
      {isLastOwner ? <p className="tm-dim">The only owner can&rsquo;t be made staff or removed. Make someone else an owner first.</p> : null}
      {confirmOwner ? (
        <div role="group" aria-label={role === 'staff' ? 'Confirm owner' : 'Confirm staff'} className="tm-notice" data-tone="strong">
          <p className="font-medium">{role === 'staff' ? `Make ${name} an owner?` : `Make ${name} staff?`}</p>
          <p className="tm-dim">
            {role === 'staff'
              ? 'Owners have every area, the team and money included, and can change anyone’s access.'
              : 'They keep only the areas you give them, and lose the team and money areas now. Their pending invites are withdrawn.'}
          </p>
          <div className="tm-actions">
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              disabled={pending}
              onClick={() => run(() => setOwnerAction(userId, role === 'staff'), () => setConfirmOwner(false))}
            >
              {role === 'staff' ? 'Make owner' : 'Make staff'}
            </button>
            <button type="button" className="tm-btn tm-btn-quiet" disabled={pending} onClick={() => setConfirmOwner(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {confirmRemove ? (
        <div role="group" aria-label="Confirm removal" className="tm-notice" data-tone="strong">
          <p className="font-medium">Remove {name} from the team?</p>
          <p className="tm-dim">Their access ends now and they are signed out. Their activity stays in the log.</p>
          <div className="tm-actions">
            <button
              type="button"
              className="tm-btn tm-btn-primary"
              disabled={pending}
              onClick={() => run(() => removeMemberAction(userId), () => router.push('/admin/team'))}
            >
              {pending ? 'Removing' : 'Remove'}
            </button>
            <button type="button" className="tm-btn tm-btn-quiet" disabled={pending} onClick={() => setConfirmRemove(false)}>
              Keep them
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="tm-notice" data-tone="strong">
          {error}
        </p>
      ) : null}
    </div>
  );
}
