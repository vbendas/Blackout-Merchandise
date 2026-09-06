'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { isSlugAvailable, registerArtist } from '@/lib/services/registration';

export async function checkSlug(slug: string): Promise<boolean> {
  return isSlugAvailable(slug);
}

export interface RegistrationInput {
  displayName: string;
  storeName: string;
  slug: string;
  country: string;
  discordDm: boolean;
  acceptedTerms: boolean;
}

export interface RegistrationResult {
  error: string;
}

export async function submitRegistration(
  input: RegistrationInput,
): Promise<RegistrationResult | undefined> {
  const session = await requireUser();

  const displayName = input.displayName.trim();
  const storeName = input.storeName.trim();
  const slug = input.slug.trim().toLowerCase();
  const country = input.country.trim().toUpperCase();

  if (!displayName) return { error: 'Display name is required.' };
  if (!storeName) return { error: 'Shop name is required.' };
  if (!input.acceptedTerms) return { error: 'You must accept the Terms and Privacy Policy.' };
  if (!(await isSlugAvailable(slug))) return { error: 'That shop name is not available.' };

  await registerArtist({
    userId: session.user.id,
    displayName,
    storeName,
    slug,
    country,
    discordDm: input.discordDm,
    acceptedTerms: input.acceptedTerms,
  });

  redirect('/chat');
}
