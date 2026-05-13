import { NextRequest, NextResponse } from 'next/server';
import { voxtralSpeechProvider } from '@/lib/ai/voxtral-speech';
import { elevenLabsTTSProvider } from '@/lib/ai/elevenlabs-tts';
import { mistralClient } from '@/lib/ai/mistral-client';
import { AGENT_CONFIGS } from '@/types/chat';
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
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type || 'audio/webm',
    });

    // Step 1: Transcribe audio
    const transcription = await voxtralSpeechProvider.transcribeAudio(audioBlob);

    if (!transcription) {
      return NextResponse.json({
        transcription: '',
        response: "I didn't catch that. Could you try speaking again?",
        audioData: null,
      });
    }

    // Step 2: Get AI response using Mistral WITH agent persona
    const agentConfig = AGENT_CONFIGS[agent];
    const systemPrompt = `${agentConfig.persona}\n\nYou are ${agentConfig.name}, ${agentConfig.role} at MerchFrom. Stay in character. Be concise (2-3 sentences max).\n\nCRITICAL: ALWAYS respond in the SAME LANGUAGE the user is speaking.`;

    const formattedHistory = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const aiResponse = await mistralClient.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: transcription },
      ],
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Step 3: Generate audio response
    const audioData = await elevenLabsTTSProvider.generateSpeech(aiResponse.content, agent);

    return NextResponse.json({
      transcription,
      response: aiResponse.content,
      audioData,
    });
  } catch (error) {
    console.error('[Voice API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice request' },
      { status: 500 }
    );
  }
}
