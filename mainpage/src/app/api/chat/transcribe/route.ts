import { type NextRequest, NextResponse } from 'next/server';
import { voxtralSpeechProvider } from '@/lib/ai/voxtral-speech';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
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
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 413 }
      );
    }

    if (!ALLOWED_TYPES.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${audioFile.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 415 }
      );
    }
    // ──────────────────────────────────────────────────────────────────────────

    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type || 'audio/webm',
    });

    // Transcribe audio only (no AI response, no TTS)
    const transcription = await voxtralSpeechProvider.transcribeAudio(audioBlob);

    if (!transcription) {
      return NextResponse.json({
        transcription: '',
        error: "I didn't catch that. Could you try speaking again?",
      });
    }

    return NextResponse.json({
      transcription,
    });
  } catch (error) {
    console.error('[Transcribe API] Error:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
