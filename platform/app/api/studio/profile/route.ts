import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { setPrefs } from '@/lib/services/discord';
import { LOCALE_CODES } from '@/components/studio/settings/locales';

export const runtime = 'nodejs';

const bodySchema = z
  .object({
    displayName: z.string().trim().min(1).max(60).optional(),
    locale: z.enum(LOCALE_CODES).optional(),
    // Notification preferences ride along so the settings page has one endpoint.
    discordDm: z.boolean().optional(),
    email: z.boolean().optional(),
  })
  .strict();

export async function PATCH(req: NextRequest) {
  const { user } = await requireUser();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'That request could not be read.' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Check the name (1 to 60 characters) and language, then try again.' }, { status: 400 });
  }
  const { displayName, locale, discordDm, email } = parsed.data;
  if (displayName === undefined && locale === undefined && discordDm === undefined && email === undefined) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  if (displayName !== undefined || locale !== undefined) {
    await db
      .update(schema.users)
      .set({
        ...(displayName !== undefined ? { displayName } : {}),
        ...(locale !== undefined ? { locale } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));
  }
  if (discordDm !== undefined || email !== undefined) {
    await setPrefs(user.id, { discordDm, email });
  }
  return NextResponse.json({ ok: true });
}
