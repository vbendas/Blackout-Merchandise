import { NextRequest, NextResponse } from 'next/server';
import { MiniMaxSpeechClient } from '@/lib/ai/minimax-speech';
import { OpenRouterProvider } from '@/lib/ai/openrouter';
import { determineAgent } from '@/lib/chat/agentRouter';
import type { LegacyAgent, AgentId } from '@/types/chat';

const speechClient = new MiniMaxSpeechClient(process.env.MINIMAX_API_KEY!);
const aiProvider = new OpenRouterProvider(process.env.OPENROUTER_API_KEY!);

const AGENT_SYSTEM_PROMPTS: Record<LegacyAgent, string> = {
  Leopoldo: `You are Leopoldo, the Store Manager for Merch From. Warm, slightly Brazilian accent, passionate about helping artists succeed. Keep responses conversational and under 80 words.`,
  
  Francisca: `You are Francisca, the Art Director for Merch From. Creative, passionate about design, helps artists create amazing products. Keep responses conversational and under 80 words.`,
  
  Antônia: `You are Antônia, the Operations Lead for Merch From. Helpful, efficient, handles orders and support. Keep responses conversational and under 80 words.`,
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio') as File | null;
    const message = formData.get('message') as string | null;
    const agent = formData.get('agent') as AgentId | null;
    const workflow = formData.get('workflow') as string | null;
    const history = formData.get('history') as string | null;

    if (!audio && !message) {
      return NextResponse.json(
        { error: 'Missing audio or message' },
        { status: 400 }
      );
    }

    const currentAgent: AgentId = agent || 'antonia';
    const currentWorkflow = workflow || 'general';
    let userText = message || '';
    let audioUrl: string | null = null;

    if (audio) {
      try {
        const arrayBuffer = await audio.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        userText = await speechClient.speechToText(base64);
      } catch (sttError) {
        console.error('STT error:', sttError);
        return NextResponse.json({
          error: 'Failed to transcribe audio',
          fallbackToText: true,
        }, { status: 200 });
      }
    }

    let conversationContext = '';
    if (history) {
      try {
        const parsedHistory = JSON.parse(history);
        conversationContext = parsedHistory
          .slice(-5)
          .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n');
      } catch {
        // Ignore history parse errors
      }
    }

    const agentDecision = determineAgent({
      _message: userText,
      currentAgent,
      context: { message: userText },
    });

    const finalAgent = agentDecision.agent;

    // Convert AgentId to LegacyAgent for prompt lookup
    const agentToLegacy: Record<AgentId, LegacyAgent> = {
      leopoldo: 'Leopoldo',
      francisca: 'Francisca',
      antonia: 'Antônia',
    };
    const legacyAgent = agentToLegacy[finalAgent] || 'Antônia';

    let prompt = userText;
    if (conversationContext) {
      prompt = `Previous conversation:\n${conversationContext}\n\nUser: ${userText}`;
    }

    const aiResponse = await aiProvider.chat({
      model: 'minimax/m2.5',
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPTS[legacyAgent] },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    const aiText = aiResponse.choices[0].message.content;

    try {
      audioUrl = await speechClient.textToSpeech(aiText, {
        voice: 'leopoldo_male',
        speed: 1.0,
      });
    } catch (ttsError) {
      console.error('TTS error:', ttsError);
    }

    return NextResponse.json({
      response: aiText,
      transcription: userText,
      audioUrl: audioUrl ? `data:audio/mp3;base64,${audioUrl}` : null,
      agent: finalAgent,
      agentChanged: finalAgent !== currentAgent,
    });

  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json({
      error: 'Voice processing failed',
      response: 'Desculpe, houve um erro. Tente novamente.',
    }, { status: 200 });
  }
}
