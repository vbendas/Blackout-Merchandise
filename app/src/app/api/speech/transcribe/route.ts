import { type NextRequest, NextResponse } from 'next/server';
import { voxtralSpeechProvider } from '@/lib/ai/voxtral-speech';

/**
 * Speech-to-Text API Endpoint
 * Receives audio data (base64) and transcribes using Voxtral (Mistral).
 * Used in waitlist interview flow.
 */

export async function POST(request: NextRequest) {
  try {
    const { audio, mimeType } = await request.json();

    if (!audio) {
      return NextResponse.json({ success: false, error: 'No audio data provided' }, { status: 400 });
    }

    // Convert base64 to Blob for Voxtral
    const audioBuffer = Buffer.from(audio, 'base64');
    const audioBlob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' });

    const transcript = await voxtralSpeechProvider.transcribeAudio(audioBlob);

    if (!transcript) {
      return NextResponse.json({ success: true, transcript: '' }, { status: 200 });
    }

    return NextResponse.json(
      {
        success: true,
        transcript: transcript.trim(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Speech-to-text error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
