'use client';

import { useActionState } from 'react';
import { acceptInviteAction, type AcceptInviteState } from './actions';

/** The one button that joins the team: a form post, not the page load, so a
 * link checker opening the email can't accept on someone's behalf. */
export function AcceptInvite({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AcceptInviteState, FormData>(acceptInviteAction, {});

  return (
    <form action={action} className="flex flex-col items-center gap-4">
      <input type="hidden" name="token" value={token} />
      <button type="submit" className="mf-pill mf-pill-primary min-h-11" disabled={pending}>
        {pending ? 'Joining' : 'Accept and open the admin'}
      </button>
      {state.error ? (
        <p role="alert" className="max-w-sm text-sm">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
