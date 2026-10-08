import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/agent/rate-limit';
import { sanitizeForSpeech, ttsStream } from '@/lib/services/voice';
import type { TtsRequest } from '@/lib/agent/protocol';

export const runtime = 'nodejs';

const MAX_CHARS = 1200;

export async function POST(req: NextRequest): Promise<Response> {
  const { user } = await requireUser();

  const rate = checkRateLimit(`voice-tts:${user.id}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'retry-after': Math.ceil(rate.retryAfterMs / 1000).toString() } },
    );
  }

  let body: TtsRequest;
  try {
    body = (await req.json()) as TtsRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (typeof body.text !== 'string' || body.text.trim().length === 0) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (body.text.length > MAX_CHARS) {
    return NextResponse.json({ error: `text too long (max ${MAX_CHARS} chars)` }, { status: 413 });
  }

  const spoken = sanitizeForSpeech(body.text);
  try {
    const stream = await ttsStream(spoken);
    return new Response(stream, {
      headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Speech synthesis failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
