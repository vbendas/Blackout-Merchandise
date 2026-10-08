import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/agent/rate-limit';
import { transcribe } from '@/lib/services/voice';
import type { TranscribeResponse } from '@/lib/agent/protocol';

export const runtime = 'nodejs';

// MediaRecorder mime strings usually carry a codecs= suffix (e.g.
// 'audio/webm;codecs=opus') — match on the base type only.
const ALLOWED_BASE_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4']);
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest): Promise<NextResponse<TranscribeResponse | { error: string }>> {
  const { user } = await requireUser();

  const rate = checkRateLimit(`voice-stt:${user.id}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'retry-after': Math.ceil(rate.retryAfterMs / 1000).toString() } },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
  }

  const file = formData.get('audio');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'audio is required' }, { status: 400 });
  }
  const baseType = file.type.split(';')[0]?.trim().toLowerCase();
  if (!ALLOWED_BASE_TYPES.has(baseType)) {
    return NextResponse.json({ error: `unsupported content type: ${file.type}` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file too large (max 10MB)' }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const result = await transcribe(bytes, file.type || 'audio/webm');
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
