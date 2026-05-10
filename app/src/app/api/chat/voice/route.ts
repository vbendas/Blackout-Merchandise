import { requireChatAuth } from '@/lib/auth/chat-auth';
import { requireChatAccess } from '@/lib/auth/require-chat-access';
import { type NextRequest, NextResponse } from 'next/server';
import { MiniMaxSpeechProvider } from '@/lib/ai/minimax-speech';
import { miniMaxProvider } from '@/lib/ai/provider';
import { sanitizePromptInput } from '@/lib/sanitize/prompt-sanitize';
import { withCors } from '@/lib/cors';

const speechClient = new MiniMaxSpeechProvider();

const agentMap = {
  Leopoldo: 'leopoldo',
  Francisca: 'francisca',
  Antônia: 'antonia',
} as const;

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  const authResult = await requireChatAuth();
  if (authResult instanceof NextResponse) return withCors(authResult, origin);

  const rateLimitResult = await requireChatAccess(authResult, 'voice');
  if (rateLimitResult instanceof NextResponse) return withCors(rateLimitResult, origin);

  try {
    const body = await req.json();
    const { audio, agent }: { audio: string; agent: keyof typeof agentMap } = body;

    if (!audio || !agent) {
      return withCors(NextResponse.json({ error: 'Missing audio or agent' }, { status: 400 }), origin);
    }

    // ─── Audio Validation ────────────────────────────────────────────────────
    const MAX_AUDIO_LENGTH = 10 * 60; // 10 minutes max (in seconds of base64 ~8MB)
    const ALLOWED_AGENTS = ['Leopoldo', 'Francisca', 'Antônia'] as const;

    if (!ALLOWED_AGENTS.includes(agent)) {
      return withCors(NextResponse.json(
        { error: `Invalid agent: ${agent}. Must be one of: ${ALLOWED_AGENTS.join(', ')}` },
        { status: 400 }
      ), origin);
    }

    // Rough size check: base64 is ~4/3 of binary size, so 10MB base64 ≈ 7.5MB binary
    const estimatedBinarySize = (audio.length * 3) / 4;
    const MAX_BINARY_SIZE = 10 * 1024 * 1024; // 10MB

    if (estimatedBinarySize > MAX_BINARY_SIZE) {
      return withCors(NextResponse.json(
        { error: `Audio too large. Maximum size is ${MAX_BINARY_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      ), origin);
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Convert base64 to Blob
    const audioBuffer = Buffer.from(audio, 'base64');
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

    const userText = await speechClient.transcribeAudio(audioBlob);

    if (!userText) {
      return withCors(NextResponse.json({ error: 'Transcription failed' }, { status: 500 }), origin);
    }

    const agentKey = agentMap[agent];
    const safeUserText = sanitizePromptInput(userText);
    const aiResponse = await miniMaxProvider.chat({
      messages: [{ role: 'user', content: safeUserText }],
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

    return withCors(NextResponse.json({
      userText,
      aiText,
      aiAudio,
    }), origin);
  } catch (error) {
    console.error('Voice chat error:', error);
    return withCors(NextResponse.json({ error: 'Voice processing failed' }, { status: 500 }), origin);
  }
}
