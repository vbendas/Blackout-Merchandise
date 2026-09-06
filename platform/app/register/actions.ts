'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { checkRegistrationEligibility, isSlugAvailable, registerArtist } from '@/lib/services/registration';
import { markRegistered, markRegisteredByEmail } from '@/lib/services/waitlist';

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

  const inviteToken = (await cookies()).get('mf-invite')?.value ?? null;

  // Defense in depth: the /register page already hides the form from anyone
  // ineligible, but this Server Action is reachable on its own too.
  const eligibility = await checkRegistrationEligibility({ email: session.user.email, inviteToken, role: session.role });
  if (!eligibility.eligible) return { error: "You're not on the waitlist yet." };

  await registerArtist({
    userId: session.user.id,
    displayName,
    storeName,
    slug,
    country,
    discordDm: input.discordDm,
    acceptedTerms: input.acceptedTerms,
  });

  // Platform-Plan §7: flip the waitlist row to 'registered' now that the
  // shop actually exists — via the invite token when present, else by email
  // match (path (b), which never carries a token).
  if (inviteToken) {
    await markRegistered(inviteToken, session.user.id);
  } else if (session.user.email) {
    await markRegisteredByEmail(session.user.email, session.user.id);
  }

  redirect('/chat');
}
