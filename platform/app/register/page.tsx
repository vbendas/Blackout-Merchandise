import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { RegisterMark } from '@/components/RegisterMark';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = { title: 'Register' };

export default async function RegisterPage() {
  const session = await requireUser();

  if (session.role === 'admin' || session.store) {
    redirect('/chat');
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
