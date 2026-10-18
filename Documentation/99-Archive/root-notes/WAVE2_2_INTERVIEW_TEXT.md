# Wave 2 Task 2: AI Interview Text Mode

## Objective
Create the AI-powered interview text mode for Step 4 of the waitlist flow. This is the critical "wow factor" for crowdfunding.

## Context
The AI interview should feel like a conversation with Leopoldo - warm, slightly Brazilian in tone, and genuinely interested in the artist's needs.

## Design System
- **Chat UI**: WhatsApp-style bubbles
- **Leopoldo Avatar**: Shows expressions based on conversation state
- **Input**: Text field with send button
- **Loading**: Typing indicator when AI is thinking

## Files to Create

### 1. /mainpage/src/lib/waitlist/interview-questions.ts
Configuration for the 5 interview questions.

```typescript
export type QuestionType = 'open' | 'single_choice' | 'follow_up';

export interface InterviewQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  context?: string;
  followUp?: string;
}

export interface InterviewResponse {
  questionId: string;
  question: string;
  response: string;
  timestamp: number;
}

// The 5 interview questions
export const interviewQuestions: InterviewQuestion[] = [
  {
    id: 'current_merch',
    question: "Do you currently sell merchandise?",
    type: 'single_choice',
    options: [
      'Yes, regularly',
      'Yes, but struggling with quality/costs',
      'No, but I want to start',
      'No, just exploring options'
    ],
  },
  {
    id: 'biggest_challenge',
    question: "What's your biggest challenge with merch right now?",
    type: 'open',
    context: 'Listen for: quality issues, upfront costs, design struggles, logistics, MOQs',
  },
  {
    id: 'audience_engagement',
    question: "Tell me about your audience. Where do they engage with you most?",
    type: 'open',
    context: 'Understand their fanbase: social platforms, live shows, streaming, etc.',
  },
  {
    id: 'quality_priority',
    question: "On a scale of 1-10, how important is premium quality to your brand?",
    type: 'single_choice',
    options: [
      '1-3 (Not important, just want cheap merch)',
      '4-6 (Somewhat important)',
      '7-8 (Important, fans deserve good stuff)',
      '9-10 (Critical, quality IS my brand)'
    ],
  },
  {
    id: 'dream_experience',
    question: "If we could create the perfect merch experience for you, what would it look like?",
    type: 'open',
    context: 'Dream big - we want to understand their vision',
  },
];

// Helper function to get next question
export function getNextQuestionId(currentId: string): string | null {
  const currentIndex = interviewQuestions.findIndex(q => q.id === currentId);
  if (currentIndex === -1 || currentIndex === interviewQuestions.length - 1) {
    return null;
  }
  return interviewQuestions[currentIndex + 1].id;
}

// Helper function to check if this is the last question
export function isLastQuestion(questionId: string): boolean {
  return questionId === interviewQuestions[interviewQuestions.length - 1].id;
}

// Helper function to get question by ID
export function getQuestionById(id: string): InterviewQuestion | undefined {
  return interviewQuestions.find(q => q.id === id);
}
```

### 2. /mainpage/src/lib/ai/openrouter.ts
OpenRouter provider for MiniMax M2-her.

```typescript
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatResponse {
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterProvider {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://merchfrom.com',
        'X-Title': 'Merch From Waitlist',
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 150,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    return response.json();
  }
}
```

### 3. /mainpage/src/app/api/waitlist/interview/route.ts
API route for AI interview responses.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterProvider } from '@/lib/ai/openrouter';
import { 
  interviewQuestions, 
  getNextQuestionId, 
  isLastQuestion,
  getQuestionById,
  InterviewResponse 
} from '@/lib/waitlist/interview-questions';

const provider = new OpenRouterProvider(process.env.OPENROUTER_API_KEY!);

const LEOPOLDO_SYSTEM_PROMPT = `You are Leopoldo, the onboarding agent for Merch From - an AI-powered premium merchandise platform for artists.

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

    // Build conversation context
    const conversationContext = previousResponses
      .map(r => `Q: ${r.question}\nA: ${r.response}`)
      .join('\n\n');

    // Construct the prompt
    let prompt = '';
    
    if (previousResponses.length === 0 && !isFollowUp) {
      // First interaction - special greeting
      prompt = `This is the first question of the interview. Greet them warmly as Leopoldo, introduce yourself briefly, and ask this question naturally:

Question: ${question.question}`;
    } else {
      // Continue conversation
      prompt = `Previous conversation:
${conversationContext}

Current question: ${question.question}
User's response: ${userResponse}

${isFollowUp ? 'This is a follow-up. Ask a natural follow-up question based on their response, or acknowledge and move to wrap up if this feels complete.' : 'Acknowledge their answer warmly, and ask the next question naturally.'}

${isLastQuestion(questionId) && !isFollowUp ? 'This is the last question. After acknowledging their answer, wrap up the interview with enthusiasm about Merch From and thank them for their time.' : ''}`;
    }

    // Call OpenRouter with MiniMax M2-her
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

    // Determine next action
    const isComplete = isLastQuestion(questionId) && !isFollowUp;
    const nextQuestionId = isComplete ? null : getNextQuestionId(questionId);

    // Check if we should do a follow-up (for open-ended questions)
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
    
    // Fallback response
    return NextResponse.json({
      response: "Ola! I'm having a little trouble connecting right now. But no worries - let's continue! What else would you like to share about your merch journey?",
      nextQuestionId: null,
      isComplete: false,
      isError: true,
    }, { status: 200 }); // Return 200 with error flag for graceful handling
  }
}
```

### 4. /mainpage/src/components/waitlist/Step4Interview.tsx
Main interview component with chat UI.

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from '@heroui/react';
import { 
  interviewQuestions, 
  getQuestionById,
  InterviewResponse,
  InterviewQuestion 
} from '@/lib/waitlist/interview-questions';

interface Step4InterviewProps {
  data: {
    fullName: string;
    email: string;
  };
  onUpdate: (data: { interviewResponses: InterviewResponse[] }) => void;
  onNext: () => void;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function Step4Interview({ data, onUpdate, onNext, onBack }: Step4InterviewProps) {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(interviewQuestions[0].id);
  const [interviewResponses, setInterviewResponses] = useState<InterviewResponse[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [leopoldoExpression, setLeopoldoExpression] = useState('neutral');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      handleInitialGreeting();
    }
  }, []);

  const handleInitialGreeting = async () => {
    setIsLoading(true);
    setLeopoldoExpression('speaking');
    
    try {
      const response = await fetch('/api/waitlist/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: interviewQuestions[0].id,
          previousResponses: [],
          userResponse: '',
        }),
      });

      const data = await response.json();
      
      addMessage('assistant', data.response);
      setLeopoldoExpression('neutral');
    } catch (error) {
      // Fallback greeting
      addMessage('assistant', `Ola ${data.fullName.split(' ')[0]}! I'm Leopoldo. I'm excited to learn about your merch goals. Let's start: ${interviewQuestions[0].question}`);
      setLeopoldoExpression('neutral');
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    addMessage('user', userMessage);
    
    setIsLoading(true);
    setLeopoldoExpression('thinking');

    try {
      // Save this response
      const question = getQuestionById(currentQuestionId)!;
      const newResponse: InterviewResponse = {
        questionId: currentQuestionId,
        question: question.question,
        response: userMessage,
        timestamp: Date.now(),
      };

      const updatedResponses = [...interviewResponses, newResponse];
      setInterviewResponses(updatedResponses);

      // Get AI response
      const response = await fetch('/api/waitlist/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestionId,
          previousResponses: updatedResponses,
          userResponse: userMessage,
        }),
      });

      const responseData = await response.json();
      
      // Add AI response
      addMessage('assistant', responseData.response);
      
      // Update expression based on response
      if (responseData.isComplete) {
        setLeopoldoExpression('happy');
        setIsComplete(true);
        
        // Save to parent and trigger completion
        onUpdate({ interviewResponses: updatedResponses });
        setTimeout(onNext, 2000);
      } else {
        setLeopoldoExpression('neutral');
        if (responseData.nextQuestionId) {
          setCurrentQuestionId(responseData.nextQuestionId);
        }
      }

    } catch (error) {
      console.error('Interview error:', error);
      addMessage('assistant', "I'm sorry, I'm having trouble connecting. Let's try again - what would you like to share?");
      setLeopoldoExpression('confused');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get Leopoldo avatar based on expression
  const getLeopoldoAvatar = () => {
    const expressions: Record<string, string> = {
      neutral: 'neutral',
      speaking: 'speaking_a',
      thinking: 'thinking',
      happy: 'happy',
      confused: 'confused',
    };
    
    return `https://res.cloudinary.com/drhfgth7c/image/upload/v1738189941/merch-from/avatars/leopoldo/${expressions[leopoldoExpression]}_attr1_subject.png`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-[600px]"
    >
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Quick Interview</h2>
        
        {/* Mode toggle */}
        <div className="flex bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setMode('text')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              mode === 'text' 
                ? 'bg-zinc-700 text-white' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Text
          </button>
          <button
            onClick={() => setMode('voice')}
            className={`px-3 py-1 rounded-md text-sm transition-colors ${
              mode === 'voice'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Voice
          </button>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <Avatar
                  src={getLeopoldoAvatar()}
                  className="w-8 h-8 mr-2 flex-shrink-0"
                />
              )}
              
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-rose-600 text-white rounded-br-md'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <Avatar
              src={getLeopoldoAvatar()}
              className="w-8 h-8 mr-2"
            />
            <div className="bg-zinc-800 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex space-x-1">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="w-2 h-2 bg-zinc-500 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                  className="w-2 h-2 bg-zinc-500 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
                  className="w-2 h-2 bg-zinc-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Question progress */}
      <div className="text-center text-xs text-zinc-500 mb-3">
        Question {interviewResponses.length + 1} of {interviewQuestions.length}
      </div>

      {/* Input area */}
      <div className="space-y-3">
        {mode === 'text' ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response..."
              disabled={isLoading || isComplete}
              className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading || isComplete}
              className="px-4 py-3 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-zinc-400 text-sm mb-2">Voice mode - tap to speak</p>
            <button className="w-16 h-16 bg-rose-600 rounded-full flex items-center justify-center mx-auto hover:bg-rose-700 transition-colors">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            Back
          </button>
          {isComplete && (
            <button
              onClick={onNext}
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              Complete
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

### 5. /mainpage/src/db/waitlist.ts (Update)
Add these functions to the existing file.

```typescript
// Add these imports if not present
import { eq, count } from 'drizzle-orm';
import { InterviewResponse } from '@/lib/waitlist/interview-questions';

// ... existing imports and code ...

export async function saveInterviewResponses(
  email: string,
  responses: InterviewResponse[]
): Promise<void> {
  await db
    .update(waitlist)
    .set({
      interviewResponses: responses,
      status: 'interview_complete',
    })
    .where(eq(waitlist.email, email));
}

export async function calculateWaitlistPosition(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(waitlist);
  
  return (result[0]?.count || 0) + 1;
}

export async function getWaitlistCount(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(waitlist);
  
  return result[0]?.count || 0;
}
```

### 6. /mainpage/src/app/api/waitlist/position/route.ts
API route to get waitlist position.

```typescript
import { NextResponse } from 'next/server';
import { getWaitlistCount } from '@/db/waitlist';

export async function GET() {
  try {
    const count = await getWaitlistCount();
    
    // Position is count + 1 (for the next person)
    return NextResponse.json({
      position: count + 1,
      total: count,
    });
  } catch (error) {
    console.error('Error getting waitlist position:', error);
    return NextResponse.json(
      { error: 'Failed to get position' },
      { status: 500 }
    );
  }
}
```

## Dependencies

Already installed in Wave 1:
- framer-motion
- @hookform/resolvers
- react-hook-form
- zod

## Testing

1. Navigate to `/waitlist` and go to Step 4
2. Test the conversation flow with Leopoldo
3. Verify AI responses are warm and personalized
4. Check that all 5 questions flow naturally
5. Test error handling (disconnect network briefly)
6. Verify interview responses save to database

## Key Features

- **Leopoldo's Personality**: Warm, slightly Brazilian, passionate about quality
- **Context Awareness**: AI references previous answers
- **Expression Changes**: Avatar shows different expressions based on state
- **Graceful Errors**: Fallback messages if API fails
- **Progress Tracking**: Shows question X of 5
- **Mode Toggle**: Text/Voice (voice placeholder for Task 3)

## Completion Criteria

- [ ] All files created
- [ ] AI interview feels conversational and warm
- [ ] 5 questions flow naturally
- [ ] Responses save to database
- [ ] Leopoldo avatar expressions change appropriately
- [ ] Error handling works gracefully
- [ ] Integration with Step 5 success screen works
