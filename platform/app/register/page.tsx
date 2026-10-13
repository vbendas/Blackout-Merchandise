import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { checkRegistrationEligibility } from '@/lib/services/registration';
import { RegisterMark } from '@/components/RegisterMark';
import { siteHref } from '@/components/auth/door-links';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = { title: 'Register' };

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
        <h1 className="font-display text-2xl">Not on the list yet.</h1>
        <p className="mf-dim max-w-sm text-sm">
          Membership is by application. Apply, and we&apos;ll reply by email.
        </p>
        <a href={siteHref('/#apply')} className="label mf-dim underline">
          Apply
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
