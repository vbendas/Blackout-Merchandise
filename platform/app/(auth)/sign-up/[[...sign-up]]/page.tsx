import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { DEV_BYPASS } from '@/lib/auth';
import { findInvite, type WaitlistSignup } from '@/lib/services/waitlist';
import { ClerkSignUpDoor } from '@/components/auth/ClerkDoors';
import { PreviewDoor } from '@/components/auth/PreviewDoor';
import { firstParam, prefillEmail } from '@/components/auth/door-links';

export const metadata: Metadata = {
  title: { absolute: 'Blackout Merchandise' },
  robots: { index: false, follow: false },
};

// Set by proxy.ts from ?invite= on /sign-up and /register.
const INVITE_COOKIE = 'mf-invite';

function doorFor(email: string): string {
  return email ? `/sign-in?email=${encodeURIComponent(email)}` : '/sign-in';
}

/** The invitation behind a token, when it still opens the door: approved, or
 * already used to register (that artist signs in instead). */
async function openInvite(token: string): Promise<WaitlistSignup | null> {
  try {
    const invite = await findInvite(token);
    return invite && (invite.status === 'approved' || invite.status === 'registered') ? invite : null;
  } catch {
    return null;
  }
}

/** Membership is by application, so there is no open sign-up. An approved
 * applicant's email links here with ?invite=<token> (lib/emails/
 * waitlist-approved.ts): with a valid invitation this is the door again, as
 * Clerk's email-code sign-up, and the key leads on to /register, which reads
 * the invitation from its cookie. Without one, the visitor is sent to the
 * door's sign-in. Under the local dev bypass any token shows the door in
 * preview mode (registration lets everyone through there anyway). */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string | string[]; email?: string | string[] }>;
}) {
  const params = await searchParams;
  const email = prefillEmail(params.email);
  // On the first visit the cookie is only being set on this response, so the
  // query wins; later visits carry the cookie.
  const token = firstParam(params.invite)?.trim() || (await cookies()).get(INVITE_COOKIE)?.value || '';

  if (!token) redirect(doorFor(email));

  if (DEV_BYPASS) {
    return <PreviewDoor variant="sign-up" initialEmail={email} next="/register" redirectUrl={null} />;
  }

  const { userId } = await auth();
  if (userId) redirect('/register');

  const invite = await openInvite(token);
  if (!invite) redirect(doorFor(email));
  if (invite.status === 'registered') redirect(doorFor(invite.email));

  return <ClerkSignUpDoor initialEmail={email || invite.email} />;
}
