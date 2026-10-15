import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DEV_BYPASS, STAFF_PAUSED_PATH, getSession, isSuspended } from '@/lib/auth';
import { describeAccess } from '@/lib/auth/permissions';
import { findInviteByToken, hasPendingInvite } from '@/lib/services/team';
import { Logo } from '@/components/Logo';
import { AcceptInvite } from './AcceptInvite';
import { SignOut } from './SignOut';

export const metadata: Metadata = { title: 'Join the team', robots: { index: false, follow: false } };

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <Logo height={56} priority />
      <h1 className="font-display text-2xl">{title}</h1>
      {children}
    </div>
  );
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

/** Where an invited employee lands from their email (?token=…). Signed out:
 * the door's sign-in first, with this link to come back to. Signed in with
 * the invited address: the access they're getting and one button to accept.
 * Anything else says what's wrong and what to do. */
export default async function StaffInvitePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = first((await searchParams).token).slice(0, 200);
  const invite = token ? await findInviteByToken(token) : null;
  const session = await getSession();

  if (!session) {
    const back = token ? `/staff-invite?token=${encodeURIComponent(token)}` : '/staff-invite';
    const email = invite?.status === 'pending' ? `&email=${encodeURIComponent(invite.email)}` : '';
    redirect(`/sign-in?redirect_url=${encodeURIComponent(back)}${email}`);
  }
  if (isSuspended(session)) redirect(STAFF_PAUSED_PATH);

  const onTeam = session.role === 'admin' || session.role === 'staff';
  const signOut = <SignOut enabled={!DEV_BYPASS} label="Sign out and use another address" />;

  if (!token) {
    if (onTeam) redirect('/admin');
    const waiting = session.user.email ? await hasPendingInvite(session.user.email) : false;
    return (
      <Frame title={waiting ? 'You have an invite' : 'Open your invite link'}>
        <p className="mf-dim max-w-sm text-sm">
          {waiting
            ? `There's an invite to the MerchFrom team for ${session.user.email}. Open the link in that email to accept it.`
            : 'This page opens from the link in your invite email.'}
        </p>
      </Frame>
    );
  }

  if (!invite) {
    return (
      <Frame title="This link doesn't work">
        <p className="mf-dim max-w-sm text-sm">It may have been replaced by a newer invite. Ask the owner to send it again.</p>
      </Frame>
    );
  }

  if (invite.status === 'accepted') {
    return (
      <Frame title="This invite was used">
        <p className="mf-dim max-w-sm text-sm">{onTeam ? "You're on the team." : 'Ask the owner for a new invite if you need one.'}</p>
        {onTeam ? (
          <Link href="/admin" className="mf-pill mf-pill-primary min-h-11">
            Open the admin
          </Link>
        ) : null}
      </Frame>
    );
  }

  if (invite.status !== 'pending') {
    return (
      <Frame title={invite.status === 'expired' ? 'This invite has expired' : 'This invite was withdrawn'}>
        <p className="mf-dim max-w-sm text-sm">Ask the owner to send you a new one.</p>
      </Frame>
    );
  }

  if ((session.user.email ?? '').trim().toLowerCase() !== invite.email) {
    return (
      <Frame title="Wrong address">
        <p className="mf-dim max-w-sm text-sm">
          This invite is for {invite.email}, and you&rsquo;re signed in as {session.user.email}. Sign in with {invite.email} to accept it.
        </p>
        {signOut}
      </Frame>
    );
  }

  if (session.role === 'admin') {
    return (
      <Frame title="You're an owner">
        <p className="mf-dim max-w-sm text-sm">Owners have every area already. There&rsquo;s nothing to accept.</p>
        <Link href="/admin" className="mf-pill mf-pill-primary min-h-11">
          Open the admin
        </Link>
      </Frame>
    );
  }

  if (session.store) {
    return (
      <Frame title="This account has a shop">
        <p className="mf-dim max-w-sm text-sm">Staff accounts are kept apart from artist shops. Ask the owner to invite another address.</p>
        {signOut}
      </Frame>
    );
  }

  const access = describeAccess(invite.permissions);
  return (
    <Frame title="Join the MerchFrom team">
      <p className="mf-dim max-w-sm text-sm">
        {invite.title ? `You're invited as ${invite.title}. ` : ''}Your access, which the owner can change later:
      </p>
      <ul className="flex w-full max-w-sm flex-col text-left text-sm">
        {access.map((line) => (
          <li key={line} className="flex justify-between gap-4 py-2.5 [border-top:var(--hairline)] last:[border-bottom:var(--hairline)]">
            <span>{line.split(': ')[0]}</span>
            <span className="mf-dim">{line.split(': ')[1]}</span>
          </li>
        ))}
      </ul>
      <AcceptInvite token={token} />
    </Frame>
  );
}
