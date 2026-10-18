import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { DEV_BYPASS } from '@/lib/auth';
import { ClerkSignInDoor } from '@/components/auth/ClerkDoors';
import { PreviewDoor } from '@/components/auth/PreviewDoor';
import { firstParam, prefillEmail } from '@/components/auth/door-links';

export const metadata: Metadata = {
  title: { absolute: 'Blackout Merchandise' },
  robots: { index: false, follow: false },
};

/** The door's sign-in. The website's door hands members over with ?email=,
 * which only fills the field: the key is sent when the visitor presses Enter,
 * so no link can make us send an email. Under the local dev bypass the door
 * runs in preview mode, with no Clerk behind it. */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[]; redirect_url?: string | string[] }>;
}) {
  const params = await searchParams;
  const email = prefillEmail(params.email);
  const redirectUrl = firstParam(params.redirect_url) ?? null;

  if (DEV_BYPASS) {
    return <PreviewDoor variant="sign-in" initialEmail={email} next="/studio" redirectUrl={redirectUrl} />;
  }

  const { userId } = await auth();
  if (userId) redirect('/studio');

  return <ClerkSignInDoor initialEmail={email} redirectUrl={redirectUrl} />;
}
