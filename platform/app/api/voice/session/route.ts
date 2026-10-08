import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSignedUrl } from '@/lib/services/voice';
import type { VoiceSessionResponse } from '@/lib/agent/protocol';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse<VoiceSessionResponse>> {
  await requireUser();

  try {
    const signed = await getSignedUrl();
    if (!signed) return NextResponse.json({ mode: 'fallback' });
    return NextResponse.json({ mode: 'conversational', signedUrl: signed.signedUrl, agentId: signed.agentId });
  } catch {
    // Agent id is set but ElevenLabs rejected it (deleted agent, bad id,
    // API hiccup) — fall back rather than break the mic button.
    return NextResponse.json({ mode: 'fallback' });
  }
}
