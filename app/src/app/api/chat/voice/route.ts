import { requireChatAuth } from '@/lib/auth/chat-auth';
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
  const userId = await requireChatAuth();
  if (userId instanceof NextResponse) return userId;

  try {
    const body = await req.json();
    const { audio, agent }: { audio: string; agent: keyof typeof agentMap } = body;

    if (!audio || !agent) {
      return NextResponse.json({ error: 'Missing audio or agent' }, { status: 400 });
    }

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
