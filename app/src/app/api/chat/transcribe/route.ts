import { type NextRequest, NextResponse } from 'next/server';
import { voxtralSpeechProvider } from '@/lib/ai/voxtral-speech';
import { withCors } from '@/lib/cors';

/**
 * Demo mode: Auth is bypassed for chat API routes during crowdfunding sprint.
 * When real Clerk keys are configured, re-enable auth by uncommenting the imports and checks below.
 * See: middleware.ts — /api/chat(.*) is excluded from protected routes.
 */

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

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
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp3',
      'audio/aac',
      'audio/flac',
      'audio/x-m4a',
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
