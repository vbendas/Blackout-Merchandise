import { type NextRequest, NextResponse } from 'next/server';
import { requireChatAuth } from '@/lib/auth/chat-auth';
import { requireChatAccess } from '@/lib/auth/require-chat-access';
import { mistralClient } from '@/lib/ai/mistral-client';
import { voxtralSpeechProvider } from '@/lib/ai/voxtral-speech';
import { elevenLabsTTSProvider } from '@/lib/ai/elevenlabs-tts';
import { withCors } from '@/lib/cors';
import type { AgentId } from '@/types/chat';

interface VoiceRequestBody {
  agent: AgentId;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  const authResult = await requireChatAuth();
  if (authResult instanceof NextResponse) return withCors(authResult, origin);

  const rateLimitResult = await requireChatAccess(authResult, 'voice');
  if (rateLimitResult instanceof NextResponse) return withCors(rateLimitResult, origin);

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const agent = (formData.get('agent') as AgentId) || 'antonia';
    const historyStr = formData.get('history') as string | null;

    let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (historyStr) {
      try {
        history = JSON.parse(historyStr);
      } catch {
        history = [];
      }
    }

    if (!audioFile) {
      return withCors(NextResponse.json({ error: 'No audio file provided' }, { status: 400 }), origin);
    }

    // ─── File Validation ─────────────────────────────────────────────────────
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp3',
      'audio/aac',
      'audio/flac',
    ];

    if (audioFile.size > MAX_FILE_SIZE) {
      return withCors(NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      ), origin);
    }

    if (!ALLOWED_TYPES.includes(audioFile.type)) {
      return withCors(NextResponse.json(
        { error: `Invalid file type: ${audioFile.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 415 }
      ), origin);
    }
    // ──────────────────────────────────────────────────────────────────────────

    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type || 'audio/webm',
    });

    // Step 1: Transcribe audio
    const transcription = await voxtralSpeechProvider.transcribeAudio(audioBlob);

    if (!transcription) {
      return withCors(NextResponse.json({
        transcription: '',
        response: "I didn't catch that. Could you try speaking again?",
        audioData: null,
      }), origin);
    }

    // Step 2: Get AI response using Mistral
    const formattedHistory = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const aiResponse = await mistralClient.chat({
      messages: [...formattedHistory, { role: 'user', content: transcription }],
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Step 3: Generate audio response
    const audioData = await elevenLabsTTSProvider.generateSpeech(aiResponse.content, agent);

    return withCors(NextResponse.json({
      transcription,
      response: aiResponse.content,
      audioData,
    }), origin);
  } catch (error) {
    console.error('[Voice API] Error:', error);
    return withCors(NextResponse.json({ error: 'Failed to process voice request' }, { status: 500 }), origin);
  }
}
