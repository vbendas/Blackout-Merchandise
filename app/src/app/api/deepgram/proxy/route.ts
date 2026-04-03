import { createClient } from '@deepgram/sdk';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { audio, options } = await request.json();

    if (!audio) {
      return NextResponse.json({ error: 'Audio data is required' }, { status: 400 });
    }

    // Initialize Deepgram with server-side API key
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(audio, 'base64');

    // Transcribe the audio using Deepgram's REST API
    const response = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
      model: 'nova-2',
      smart_format: true,
      mimeType: options?.mimetype || 'audio/webm',
      ...(options || {}),
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return NextResponse.json({
      success: true,
      transcript: response.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '',
      words: response.result?.results?.channels?.[0]?.alternatives?.[0]?.words || [],
    });
  } catch (error) {
    console.error('Deepgram proxy error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
