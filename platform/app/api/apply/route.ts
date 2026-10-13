import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/agent/rate-limit';
import { createApplication, type CreateApplicationInput } from '@/lib/services/waitlist';

// Public, unauthenticated (PUBLIC_ROUTES in proxy.ts): the static website's
// Apply form posts JSON here, often from a different origin, so every reply
// carries CORS headers for the website (NEXT_PUBLIC_SITE_URL; plus the local
// site on port 3000 in development). Replies never say whether an email is
// already known: a repeat application, or a bot that filled the hidden
// `website` field, gets the same { ok: true } as a new one. Errors are
// { error } with one plain sentence the form shows as it is.

const MAX_BODY_CHARS = 16_384;
const MAX_NAME = 80;
const MAX_TEXT = 200;
const MAX_EMAIL = 254;
// The same check the website runs before it sends.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UNREADABLE = "The form didn't come through, so send it again.";

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
}

function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/** NEXT_PUBLIC_SITE_URL may list more than one origin, comma-separated
 * (e.g. the bare domain and www). */
function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  for (const value of (process.env.NEXT_PUBLIC_SITE_URL ?? '').split(',')) {
    const origin = value.trim() ? originOf(value.trim()) : null;
    if (origin) origins.add(origin);
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }
  return origins;
}

/** No credentials: the form sends none, and nothing here reads a session. */
function corsHeaders(req: NextRequest): Headers {
  const headers = new Headers({ Vary: 'Origin' });
  const origin = req.headers.get('origin');
  if (origin && allowedOrigins().has(origin)) headers.set('Access-Control-Allow-Origin', origin);
  return headers;
}

function reply(req: NextRequest, status: number, body: { ok: true } | { error: string }, retryAfterSeconds?: number) {
  const headers = corsHeaders(req);
  if (retryAfterSeconds) headers.set('Retry-After', String(retryAfterSeconds));
  return NextResponse.json(body, { status, headers });
}

/** One line of plain text: control characters and runs of whitespace,
 * newlines included, become single spaces, so nothing typed into the form
 * adds lines to the notes it is stored in. */
function oneLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\s]+/g, ' ').trim();
}

/** '' when absent, null when present but not text. */
function textField(value: unknown): string | null {
  if (value === undefined || value === null) return '';
  return typeof value === 'string' ? oneLine(value) : null;
}

type ReadResult = { error: string } | { dropped: true } | { application: CreateApplicationInput };

async function readApplication(req: NextRequest): Promise<ReadResult> {
  if (!/^application\/json\b/i.test(req.headers.get('content-type') ?? '')) return { error: UNREADABLE };
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_CHARS) return { error: UNREADABLE };

  let body: unknown;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return { error: UNREADABLE };
    body = JSON.parse(raw);
  } catch {
    return { error: UNREADABLE };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: UNREADABLE };
  const fields = body as Record<string, unknown>;

  // The hidden honeypot field: people never see it, bots fill it in. Dropped
  // before anything else is checked, so a bot learns nothing from the reply.
  if (fields.website !== undefined && fields.website !== null && String(fields.website).trim() !== '') {
    return { dropped: true };
  }

  const name = textField(fields.name);
  const about = textField(fields.about);
  const runFor = textField(fields.runFor);
  const email = textField(fields.email);
  if (name === null || about === null || runFor === null || email === null) return { error: UNREADABLE };

  if (!name) return { error: 'Add your name or your project.' };
  if (name.length > MAX_NAME) return { error: `Keep the name to ${MAX_NAME} characters.` };
  if (about.length > MAX_TEXT) return { error: `Keep what you do to ${MAX_TEXT} characters.` };
  if (runFor.length > MAX_TEXT) return { error: `Keep what the run is for to ${MAX_TEXT} characters.` };
  if (!email) return { error: 'Add an email so we can reply.' };
  if (email.length > MAX_EMAIL || !EMAIL_SHAPE.test(email)) return { error: "That email doesn't look right." };

  return { application: { name, about, runFor, email } };
}

export function OPTIONS(req: NextRequest) {
  const headers = corsHeaders(req);
  if (headers.has('Access-Control-Allow-Origin')) {
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '600');
  }
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(req: NextRequest) {
  // First, before the body is read or the database is touched.
  const rate = checkRateLimit(`apply:${clientIp(req)}`);
  if (!rate.allowed) {
    return reply(req, 429, { error: 'Too many tries. Wait a minute and send again.' }, Math.ceil(rate.retryAfterMs / 1000));
  }

  const result = await readApplication(req);
  if ('error' in result) return reply(req, 400, { error: result.error });
  if ('dropped' in result) return reply(req, 200, { ok: true });

  try {
    await createApplication(result.application);
  } catch (err) {
    console.error('[apply] could not store an application', err);
    return reply(req, 500, { error: 'Something went wrong on our side, so try again in a minute.' });
  }
  return reply(req, 200, { ok: true });
}
