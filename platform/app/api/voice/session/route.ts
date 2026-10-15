import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSignedUrl, mintVoiceCallerToken } from '@/lib/services/voice';
import type { VoiceSessionResponse } from '@/lib/agent/protocol';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse<VoiceSessionResponse>> {
  const session = await requireUser();
  // Without the bridge secret no caller token can be signed, and the live
  // agent's bridge could not tell who is talking: use the fallback engine.
  if (!process.env.VOICE_BRIDGE_SECRET) return NextResponse.json({ mode: 'fallback' });

  try {
    const signed = await getSignedUrl();
    if (!signed) return NextResponse.json({ mode: 'fallback' });
    return NextResponse.json({
      mode: 'conversational',
      signedUrl: signed.signedUrl,
      agentId: signed.agentId,
      // tells /api/voice/llm who is talking (see its header, point 3)
      callerToken: mintVoiceCallerToken(session.user.id),
    });
  } catch {
    // Agent id is set but ElevenLabs rejected it (deleted agent, bad id,
    // API hiccup) — fall back rather than break the mic button.
    return NextResponse.json({ mode: 'fallback' });
  }
}
