'use server';

import { neon } from '@neondatabase/serverless';
import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;
const FIELD_MAX = 32;

// Must mirror the <select> options in app/waitlist/page.tsx.
const ROLE_OPTIONS = [
  'Band or musician',
  'Tattoo artist',
  'Illustrator',
  'Label or collective',
  'Brand or company',
  'Something else',
] as const;

interface WaitlistInput {
  email: string;
  product?: string;
  colour?: string;
  role?: string;
}

interface WaitlistResult {
  ok: boolean;
  error?: string;
}

export async function submitWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  const email = input.email.trim();
  const product = input.product?.trim().slice(0, FIELD_MAX) || undefined;
  const colour = input.colour?.trim().slice(0, FIELD_MAX) || undefined;
  const role = ROLE_OPTIONS.includes(input.role as (typeof ROLE_OPTIONS)[number])
    ? input.role
    : undefined;

  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'Enter a valid email.' };
  }

  try {
    if (process.env.DATABASE_URL) {
      const sql = neon(process.env.DATABASE_URL);
      await sql`
        CREATE TABLE IF NOT EXISTS waitlist_signups (
          id serial primary key,
          email text not null,
          product text,
          colour text,
          created_at timestamptz not null default now()
        )
      `;
      await sql`ALTER TABLE waitlist_signups ADD COLUMN IF NOT EXISTS role text`;
      await sql`
        INSERT INTO waitlist_signups (email, product, colour, role)
        VALUES (${email}, ${product ?? null}, ${colour ?? null}, ${role ?? null})
      `;
    } else {
      // Dev fallback — no DATABASE_URL configured. Append a JSON line to a
      // gitignored local file instead of hitting a real database.
      const dir = path.join(process.cwd(), 'var');
      await mkdir(dir, { recursive: true });
      const line = JSON.stringify({
        email,
        product: product ?? null,
        colour: colour ?? null,
        role: role ?? null,
        at: new Date().toISOString(),
      });
      await appendFile(path.join(dir, 'waitlist.jsonl'), line + '\n', 'utf8');
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Something went wrong — try again.' };
  }
}
