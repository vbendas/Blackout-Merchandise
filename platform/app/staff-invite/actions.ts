'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { acceptStaffInvite } from '@/lib/services/team';

export interface AcceptInviteState {
  error?: string;
}

/** Accepts the invite behind the form's token for the signed-in person, then
 * opens the admin. Everything is checked again in acceptStaffInvite: the
 * address, the link (used, withdrawn, expired), and the account (owner, shop). */
export async function acceptInviteAction(_previous: AcceptInviteState, form: FormData): Promise<AcceptInviteState> {
  const session = await requireUser();
  const token = form.get('token');
  const result = await acceptStaffInvite({ id: session.user.id, email: session.user.email }, typeof token === 'string' ? token : '');
  if (!result.ok) return { error: result.error };
  redirect('/admin');
}
