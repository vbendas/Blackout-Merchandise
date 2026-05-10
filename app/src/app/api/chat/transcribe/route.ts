import { type NextRequest, NextResponse } from 'next/server';
import { requireChatAuth } from '@/lib/auth/chat-auth';
import { requireChatAccess } from '@/lib/auth/require-chat-access';
import { voxtralSpeechProvider } from '@/lib/ai/voxtral-speech';
import { withCors } from '@/lib/cors';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  const authResult = await requireChatAuth();
  if (authResult instanceof NextResponse) return withCors(authResult, origin);

  const rateLimitResult = await requireChatAccess(authResult, 'voice');
  if (rateLimitResult instanceof NextResponse) return withCors(rateLimitResult, origin);

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

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

    // Transcribe audio only (no AI response, no TTS)
    const transcription = await voxtralSpeechProvider.transcribeAudio(audioBlob);

    if (!transcription) {
      return withCors(NextResponse.json({
        transcription: '',
        error: "I didn't catch that. Could you try speaking again?",
      }), origin);
    }

    return withCors(NextResponse.json({
      transcription,
    }), origin);
  } catch (error) {
    console.error('[Transcribe API] Error:', error);
    return withCors(NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 }), origin);
  }
}
