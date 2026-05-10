import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterProvider } from '@/lib/ai/openrouter';
import { 
  getNextQuestionId, 
  isLastQuestion,
  getQuestionById,
  InterviewResponse 
} from '@/lib/waitlist/interview-questions';

const provider = new OpenRouterProvider(process.env.OPENROUTER_API_KEY!);

const LEOPOLDO_SYSTEM_PROMPT = `You are Leopoldo, the onboarding agent for Merch From - a premium merchandise platform for artists.

Your personality:
- Warm and welcoming, like a friend who happens to be an expert
- Slightly Brazilian accent in text (use "Ola!" occasionally, warm expressions)
- Passionate about quality merch and protecting artists from bad deals
- Professional but not corporate - you care deeply about artists
- Use emojis sparingly but warmly (😊 👍 ✨)
- Keep responses under 100 words
- Always acknowledge their answer before moving forward
- If they share something exciting, celebrate with them
- If they share a challenge, show empathy

Your goal:
- Make them feel heard and understood
- Build excitement about Merch From
- Ask one question at a time
- Don't be repetitive with "That's great!" - vary your responses
- End with warmth and anticipation for the next question

Current context: You're conducting a 5-question interview to understand their merch needs.`;

export async function POST(req: NextRequest) {
  try {
    const { 
      questionId, 
      previousResponses, 
      userResponse,
      isFollowUp 
    }: {
      questionId: string;
      previousResponses: InterviewResponse[];
      userResponse: string;
      isFollowUp?: boolean;
    } = await req.json();

    const question = getQuestionById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const conversationContext = previousResponses
      .map(r => `Q: ${r.question}\nA: ${r.response}`)
      .join('\n\n');

    let prompt = '';
    
    if (previousResponses.length === 0 && !isFollowUp) {
      prompt = `This is the first question of the interview. Greet them warmly as Leopoldo, introduce yourself briefly, and ask this question naturally:

Question: ${question.question}`;
    } else {
      prompt = `Previous conversation:
${conversationContext}

Current question: ${question.question}
User's response: ${userResponse}

${isFollowUp ? 'This is a follow-up. Ask a natural follow-up question based on their response, or acknowledge and move to wrap up if this feels complete.' : 'Acknowledge their answer warmly, and ask the next question naturally.'}

${isLastQuestion(questionId) && !isFollowUp ? 'This is the last question. After acknowledging their answer, wrap up the interview with enthusiasm about Merch From and thank them for their time.' : ''}`;
    }

    const aiResponse = await provider.chat({
      model: 'minimax/m2.5',
      messages: [
        { role: 'system', content: LEOPOLDO_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    const aiMessage = aiResponse.choices[0].message.content;

    const isComplete = isLastQuestion(questionId) && !isFollowUp;
    const nextQuestionId = isComplete ? null : getNextQuestionId(questionId);

    const shouldFollowUp = question.type === 'open' && 
                          !isFollowUp && 
                          userResponse.length > 20 &&
                          previousResponses.length < 5;

    return NextResponse.json({
      response: aiMessage,
      nextQuestionId: shouldFollowUp ? questionId : nextQuestionId,
      isComplete: isComplete && !shouldFollowUp,
      isFollowUp: shouldFollowUp,
    });

  } catch (error) {
    console.error('Interview API error:', error);
    
    return NextResponse.json({
      response: "Ola! I'm having a little trouble connecting right now. But no worries - let's continue! What else would you like to share about your merch journey?",
      nextQuestionId: null,
      isComplete: false,
      isError: true,
    }, { status: 200 });
  }
}
