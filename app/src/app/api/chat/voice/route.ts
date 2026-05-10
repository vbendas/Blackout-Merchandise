import { requireChatAuth } from '@/lib/auth/chat-auth';
import { requireChatAccess } from '@/lib/auth/require-chat-access';
import { type NextRequest, NextResponse } from 'next/server';
import { MiniMaxSpeechProvider } from '@/lib/ai/minimax-speech';
import { miniMaxProvider } from '@/lib/ai/provider';

const speechClient = new MiniMaxSpeechProvider();

const agentMap = {
  Leopoldo: 'leopoldo',
  Francisca: 'francisca',
  Antônia: 'antonia',
} as const;

export async function POST(req: NextRequest) {
  const authResult = await requireChatAuth();
  if (authResult instanceof NextResponse) return authResult;

  const rateLimitResult = await requireChatAccess(authResult, 'voice');
  if (rateLimitResult instanceof NextResponse) return rateLimitResult;

  try {
    const body = await req.json();
    const { audio, agent }: { audio: string; agent: keyof typeof agentMap } = body;

    if (!audio || !agent) {
      return NextResponse.json({ error: 'Missing audio or agent' }, { status: 400 });
    }

    // ─── Audio Validation ────────────────────────────────────────────────────
    const MAX_AUDIO_LENGTH = 10 * 60; // 10 minutes max (in seconds of base64 ~8MB)
    const ALLOWED_AGENTS = ['Leopoldo', 'Francisca', 'Antônia'] as const;

    if (!ALLOWED_AGENTS.includes(agent)) {
      return NextResponse.json(
        { error: `Invalid agent: ${agent}. Must be one of: ${ALLOWED_AGENTS.join(', ')}` },
        { status: 400 }
      );
    }

    // Rough size check: base64 is ~4/3 of binary size, so 10MB base64 ≈ 7.5MB binary
    const estimatedBinarySize = (audio.length * 3) / 4;
    const MAX_BINARY_SIZE = 10 * 1024 * 1024; // 10MB

    if (estimatedBinarySize > MAX_BINARY_SIZE) {
      return NextResponse.json(
        { error: `Audio too large. Maximum size is ${MAX_BINARY_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Convert base64 to Blob
    const audioBuffer = Buffer.from(audio, 'base64');
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

    const userText = await speechClient.transcribeAudio(audioBlob);

    if (!userText) {
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    const agentKey = agentMap[agent];
    const aiResponse = await miniMaxProvider.chat({
      messages: [{ role: 'user', content: userText }],
      agent: agentKey,
      temperature: 0.8,
      maxTokens: 200,
    });

    const aiText = aiResponse.content;

    const aiAudioBuffer = await speechClient.generateSpeech(aiText, agentKey);
    let aiAudio: string | null = null;
    if (aiAudioBuffer) {
      aiAudio = Buffer.from(aiAudioBuffer).toString('base64');
    }

    return NextResponse.json({
      userText,
      aiText,
      aiAudio,
    });
  } catch (error) {
    console.error('Voice chat error:', error);
    return NextResponse.json({ error: 'Voice processing failed' }, { status: 500 });
  }
}
