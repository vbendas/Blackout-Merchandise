import { type NextRequest, NextResponse } from 'next/server';

/**
 * Speech-to-Text API Endpoint
 * Receives audio data and transcribes using Deepgram
 * Used in workspace chat and waitlist interview flows
 */

export async function POST(request: NextRequest) {
  try {
    const { audio, mimeType } = await request.json();

    if (!audio) {
      return NextResponse.json({ success: false, error: 'No audio data provided' }, { status: 400 });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');

    // Call Deepgram API
    const deepgramUrl = 'https://api.deepgram.com/v1/listen?model=nova-2&language=en-US';

    const response = await fetch(deepgramUrl, {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': mimeType || 'audio/webm',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Deepgram error:', error);
      return NextResponse.json({ success: false, error: 'Transcription failed' }, { status: 500 });
    }

    const result = await response.json();

    // Extract transcript from Deepgram response
    // Format: { results: { channels: [{ alternatives: [{ transcript: "..." }] }] } }
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    if (!transcript) {
      return NextResponse.json({ success: true, transcript: '' }, { status: 200 });
    }

    return NextResponse.json(
      {
        success: true,
        transcript: transcript.trim(),
        confidence: result.results?.channels?.[0]?.alternatives?.[0]?.confidence,
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
