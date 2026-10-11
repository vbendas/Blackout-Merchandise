import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { DEV_BYPASS } from '@/lib/auth';

export default async function Home() {
  if (DEV_BYPASS) redirect('/studio');
  const { userId } = await auth();

  if (userId) redirect('/studio');
  redirect('/sign-in');
}
