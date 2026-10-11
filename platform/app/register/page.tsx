import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { checkRegistrationEligibility } from '@/lib/services/registration';
import { RegisterMark } from '@/components/RegisterMark';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = { title: 'Register' };

const PUBLIC_WAITLIST_URL = 'https://merchfrom.com/waitlist';

export default async function RegisterPage() {
  const session = await requireUser();

  if (session.role === 'admin' || session.store) {
    redirect('/studio');
  }

  // Platform-Plan §7: registration is invite-only. See
  // lib/services/registration.ts#checkRegistrationEligibility for the rules.
  const inviteToken = (await cookies()).get('mf-invite')?.value ?? null;
  const eligibility = await checkRegistrationEligibility({
    email: session.user.email,
    inviteToken,
    role: session.role,
  });

  if (!eligibility.eligible) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <RegisterMark className="h-6 w-6 text-signal" />
        <h1 className="font-display text-2xl">You&apos;re not on the list yet</h1>
        <p className="mf-dim max-w-sm text-sm">
          MerchFrom is invite-only while we&apos;re in early access. Join the waitlist and we&apos;ll email you when
          it&apos;s your turn.
        </p>
        <a href={PUBLIC_WAITLIST_URL} className="label mf-dim underline">
          Join the waitlist
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-3">
        <RegisterMark className="h-6 w-6 text-signal" />
        <span className="label mf-dim">MERCHFROM</span>
      </div>
      <h1 className="font-display text-2xl">Register</h1>
      <RegisterForm defaultDisplayName={session.user.displayName ?? ''} />
    </div>
  );
}
