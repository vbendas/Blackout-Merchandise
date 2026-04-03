import { type NextRequest, NextResponse } from 'next/server';
import { miniMaxM2HerProvider } from '@/lib/ai/minimax-m2her';
import { miniMaxSpeechProvider } from '@/lib/ai/minimax-speech';
import type { AgentId } from '@/types/chat';

interface VoiceRequestBody {
  agent: AgentId;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type || 'audio/webm',
    });

    // Step 1: Transcribe audio
    const transcription = await miniMaxSpeechProvider.transcribeAudio(audioBlob);

    if (!transcription) {
      return NextResponse.json({
        transcription: '',
        response: "I didn't catch that. Could you try speaking again?",
        audioData: null,
      });
    }

    // Step 2: Get AI response using M2-her
    const formattedHistory = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const aiResponse = await miniMaxM2HerProvider.chat({
      messages: [...formattedHistory, { role: 'user', content: transcription }],
      agent,
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Step 3: Generate audio response
    const audioArrayBuffer = await miniMaxSpeechProvider.generateSpeech(aiResponse.content, agent);

    let audioData: string | null = null;
    if (audioArrayBuffer) {
      const buffer = Buffer.from(audioArrayBuffer);
      audioData = `data:audio/mp3;base64,${buffer.toString('base64')}`;
    }

    return NextResponse.json({
      transcription,
      response: aiResponse.content,
      audioData,
    });
  } catch (error) {
    console.error('[Voice API] Error:', error);
    return NextResponse.json({ error: 'Failed to process voice request' }, { status: 500 });
  }
}
