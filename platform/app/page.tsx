import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { DEV_BYPASS } from '@/lib/auth';
import { localDemoOn } from '@/lib/dev/local-demo';

export default async function Home() {
  // Local demo mode starts on the identity page (/dev); plain dev bypass goes straight to the Studio.
  if (DEV_BYPASS) redirect(localDemoOn() ? '/dev' : '/studio');
  const { userId } = await auth();

  if (userId) redirect('/studio');
  redirect('/sign-in');
}
