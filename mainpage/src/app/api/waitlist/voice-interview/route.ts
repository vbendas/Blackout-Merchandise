import { NextRequest, NextResponse } from 'next/server';
import { voxtralSpeechProvider } from '@/lib/ai/voxtral-speech';
import { elevenLabsTTSProvider } from '@/lib/ai/elevenlabs-tts';
import { mistralClient } from '@/lib/ai/mistral-client';
import {
  interviewQuestions,
  getNextQuestionId,
  isLastQuestion,
  getQuestionById,
  InterviewResponse
} from '@/lib/waitlist/interview-questions';

const LEOPOLDO_SYSTEM_PROMPT = `You are Leopoldo, the onboarding agent for Merch From - a premium merchandise platform for artists.

Your personality:
- Warm and welcoming, like a friend who happens to be an expert
- Slightly Brazilian accent in text (use "Ola!" occasionally, warm expressions)
- Passionate about quality merch and protecting artists from bad deals
- Professional but not corporate - you care deeply about artists
- Keep responses under 80 words for voice
- Always acknowledge their answer before moving forward
- Be conversational and natural in voice responses

Your goal in voice mode:
- Guide them through all 5 questions naturally
- Make them feel heard and excited
- Don't be repetitive - vary your responses
- End with warmth and anticipation for the next question`;

function base64ToBlob(base64: string, type = 'audio/webm'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}

export async function POST(req: NextRequest) {
  try {
    const {
      mode, // 'initial' | 'continue'
      fullName,
      audio,
      questionId,
      previousResponses,
      _userText, // reserved for future use
    }: {
      mode: 'initial' | 'continue';
      fullName?: string;
      audio?: string;
      questionId?: string;
      previousResponses?: InterviewResponse[];
      userText?: string;
      _userText?: string;
    } = await req.json();

    // INITIAL MODE: First greeting + question 1
    if (mode === 'initial') {
      const firstQuestion = interviewQuestions[0];
      const firstName = fullName?.split(' ')[0] || 'there';

      const greetingPrompt = `This is the start of a voice conversation. Greet ${firstName} warmly as Leopoldo, introduce yourself briefly (1-2 sentences max), and ask this first question naturally:

First Question: ${firstQuestion.question}

Keep it conversational - this is voice, so short and natural!`;

      const aiResponse = await mistralClient.chat({
        messages: [
          { role: 'system', content: LEOPOLDO_SYSTEM_PROMPT },
          { role: 'user', content: greetingPrompt }
        ],
        temperature: 0.8,
        maxTokens: 150,
      });

      const aiText = aiResponse.content;

      // Convert to speech
      let aiAudio: string | null = null;
      try {
        aiAudio = await elevenLabsTTSProvider.generateSpeech(aiText, 'leopoldo');
      } catch (ttsError) {
        console.error('TTS error on initial:', ttsError);
      }

      return NextResponse.json({
        aiText,
        aiAudio,
        nextQuestionId: firstQuestion.id,
        questionText: firstQuestion.question,
        isComplete: false,
        isInitial: true,
      });
    }

    // CONTINUE MODE: Process user response and move to next question
    if (mode === 'continue') {
      if (!audio || !questionId || !previousResponses) {
        return NextResponse.json(
          { error: 'Missing required fields for continue mode' },
          { status: 400 }
        );
      }

      // Step 1: Speech to Text
      let transcribedText: string;
      try {
        const audioBlob = base64ToBlob(audio);
        const result = await voxtralSpeechProvider.transcribeAudio(audioBlob);
        if (!result) {
          throw new Error('Transcription failed');
        }
        transcribedText = result;
      } catch (sttError) {
        console.error('STT error:', sttError);
        return NextResponse.json({
          error: 'Failed to transcribe audio',
          fallbackToText: true,
        }, { status: 200 });
      }

      // Step 2: Get current question
      const currentQuestion = getQuestionById(questionId);
      if (!currentQuestion) {
        return NextResponse.json(
          { error: 'Question not found' },
          { status: 404 }
        );
      }

      // Step 3: Build conversation context
      const conversationContext = previousResponses
        .map((r: InterviewResponse) => `Q: ${r.question}\nA: ${r.response}`)
        .join('\n\n');

      const prompt = `Voice conversation so far:
${conversationContext}

Current question: ${currentQuestion.question}
User just said: "${transcribedText}"

${isLastQuestion(questionId) 
  ? 'This is the LAST question. Acknowledge their answer warmly, thank them for their time, and wrap up the interview enthusiastically about Merch From!' 
  : 'Acknowledge their answer warmly, and ask the next question naturally. Keep it conversational and under 60 words.'
}`;

      // Step 4: Get AI response
      const aiResponse = await mistralClient.chat({
        messages: [
          { role: 'system', content: LEOPOLDO_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        maxTokens: 150,
      });

      const aiText = aiResponse.content;

      // Step 5: Convert to speech
      let aiAudio: string | null = null;
      try {
        aiAudio = await elevenLabsTTSProvider.generateSpeech(aiText, 'leopoldo');
      } catch (ttsError) {
        console.error('TTS error:', ttsError);
      }

      const isComplete = isLastQuestion(questionId);
      const nextQuestionId = isComplete ? null : getNextQuestionId(questionId);
      const nextQuestionText = nextQuestionId ? getQuestionById(nextQuestionId)?.question : null;

      return NextResponse.json({
        userText: transcribedText,
        aiText,
        aiAudio,
        nextQuestionId,
        questionText: nextQuestionText,
        isComplete,
        isInitial: false,
      });
    }

    return NextResponse.json(
      { error: 'Invalid mode' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Voice interview error:', error);
    return NextResponse.json({
      error: 'Voice processing failed',
      fallbackToText: true,
      message: 'Having trouble with voice mode. Let\'s switch to text!',
    }, { status: 200 });
  }
}
