# Merch From - Complete Implementation Plan

## Executive Summary
- **Timeline**: Single day execution (aggressive)
- **Approach**: Solo developer + AI agents (Kimi k2.5 + MiniMax M2.5) via OpenCode CLI
- **Strategy**: Maximum parallelization with clear integration points
- **Goal**: Production-ready MVP for crowdfunding campaign

---

## Phase Overview

| Phase | Name | Duration | Parallel Sessions | Status |
|-------|------|----------|-------------------|--------|
| A | Infrastructure & Cleanup | 2-3 hours | 2 | Ready |
| B | Waitlist Interview System | 6-8 hours | 3 | Ready |
| C | App Audio Input | 4-5 hours | 2 | Ready |
| D | Catalog System | 5-6 hours | 2 | Ready |
| E | Backend Core | 6-8 hours | 3 | Ready |

**Total Estimated Time**: 23-30 hours of AI work (parallelizable to ~10-12 hours wall clock)

---

## Critical Pre-Requisites (USER ACTION REQUIRED)

### Before Starting Any Sessions:

1. **API Keys Setup** (5 minutes)
   ```bash
   # Add to /app/.env.local
   OPENROUTER_API_KEY=your_key_here
   MINIMAX_API_KEY=your_key_here
   
   # Add to /mainpage/.env.local
   DATABASE_URL=your_neon_connection_string
   OPENROUTER_API_KEY=your_key_here
   MINIMAX_API_KEY=your_key_here
   RESEND_API_KEY=your_key_here
   ```

2. **Verify Neon Databases** (2 minutes)
   - Mainpage DB: Should have waitlist table
   - App DB: Full schema already exists
   - Test connections work

3. **Install Bun Globally** (1 minute)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   bun --version  # Should show 1.2.x
   ```

---

## PHASE A: Infrastructure & Cleanup (2-3 hours)

### Objective
Migrate to Bun, clean legacy code, establish dual-database architecture

### Parallelization Group: A
**Dependencies**: None (can start immediately)
**Sessions**: 2 parallel

---

### Task A.1: Bun Migration (Main Session)
**Priority**: P0 - BLOCKER
**Estimated Time**: 45 minutes
**Assignee**: Main OpenCode Session

#### Subtasks:
1. **Migrate /app to Bun** (15 min)
   - Remove package-lock.json
   - Create bun.lockb
   - Update package.json scripts if needed

2. **Migrate /mainpage to Bun** (15 min)
   - Remove package-lock.json
   - Create bun.lockb
   - Verify all dependencies compatible

3. **Create root workspace config** (10 min)
   - Add package.json at root with workspaces
   - Configure shared scripts

4. **Verify both builds** (5 min)
   - Run bun run build in both directories
   - Fix any TypeScript errors

#### Files to Modify:
- `/app/package.json` - Update engine requirements
- `/mainpage/package.json` - Update engine requirements
- `/package.json` (root) - Add workspace config
- `/bun.lockb` (generated)

#### OpenCode Command:
```bash
opencode --session="phase-a-bun-migration" \
  --task="Migrate both /app and /mainpage from npm to Bun. Remove package-lock.json files, create bun.lockb, update package.json engine fields, add root workspace configuration. Verify both projects build successfully with 'bun run build'. Fix any TypeScript or dependency issues." \
  --context="We need both projects on Bun for consistency. Mainpage currently uses npm, app may already use Bun. Check and migrate both."
```

#### Acceptance Criteria:
- [ ] Both projects have bun.lockb files
- [ ] No package-lock.json files exist
- [ ] `bun run build` succeeds in /app
- [ ] `bun run build` succeeds in /mainpage
- [ ] No TypeScript errors

---

### Task A.2: Legacy Code Cleanup (Subagent Session)
**Priority**: P1
**Estimated Time**: 30 minutes
**Assignee**: Subagent Session (can run parallel to A.1)

#### Subtasks:
1. **Archive front-end/landing-page-hero** (10 min)
   - Move to /Documentation/07-Archive/
   - Update any references

2. **Remove /app/convex** (5 min)
   - Delete entire folder
   - Already marked as legacy

3. **Clean up Documentation duplicates** (10 min)
   - Check for redundant PRDs
   - Move to archive if confirmed duplicate

4. **Verify no broken imports** (5 min)
   - Run type check in both projects

#### Files to Modify:
- `/front-end/` → Move to `/Documentation/07-Archive/front-end-legacy/`
- `/app/convex/` → Delete

#### OpenCode Command:
```bash
opencode --session="phase-a-cleanup" \
  --task="Clean up legacy code: 1) Move /front-end/landing-page-hero to /Documentation/07-Archive/, 2) Delete /app/convex/ folder completely, 3) Check for any other legacy/dead code, 4) Verify no broken imports remain by running type checks." \
  --context="This is cleanup to reduce confusion. Convex is legacy (we use Drizzle now), front-end folder appears abandoned. Be thorough but careful not to delete active code."
```

#### Acceptance Criteria:
- [ ] /front-end/ no longer exists at root
- [ ] /app/convex/ no longer exists
- [ ] No TypeScript errors from deletions
- [ ] Archive folder created with proper structure

---

### Task A.3: Dual Database Architecture Documentation (Subagent Session)
**Priority**: P1
**Estimated Time**: 30 minutes
**Assignee**: Subagent Session (read-only research)

#### Subtasks:
1. **Analyze current DB schemas** (10 min)
   - Compare /mainpage/src/db/schema.ts
   - Compare /src/db/schema.ts
   - Document differences

2. **Create architecture document** (15 min)
   - Document why two databases
   - Connection string strategy
   - Data flow between them

3. **Verify connection setup** (5 min)
   - Check drizzle.config.ts files
   - Document any issues

#### Files to Create:
- `/Documentation/05-Shared/Database-Architecture.md`

#### OpenCode Command:
```bash
opencode --session="phase-a-db-docs" \
  --task="Create comprehensive database architecture documentation: 1) Compare /mainpage/src/db/schema.ts vs /src/db/schema.ts, 2) Document the dual-database strategy (mainpage = lightweight waitlist DB, app = full production DB), 3) Explain connection patterns and data flow, 4) Document why this separation makes sense for our architecture. Save to /Documentation/05-Shared/Database-Architecture.md" \
  --context="We have two databases by design: mainpage serves landing/waitlist (fast, edge-cached), app serves artist dashboard (full CRUD). Document this architecture clearly for future developers."
```

#### Acceptance Criteria:
- [ ] Document created explaining dual-DB strategy
- [ ] Schema comparison included
- [ ] Connection patterns documented
- [ ] Data flow diagrams (text-based) included

---

### Task A.4: Database Connection Verification (User + AI)
**Priority**: P0 - BLOCKER
**Estimated Time**: 20 minutes
**Assignee**: You + OpenCode validation

#### Steps:
1. **Verify mainpage DB connection** (5 min)
   ```bash
   cd mainpage
   bunx drizzle-kit studio  # Should open Drizzle Studio
   # Verify waitlist table exists
   ```

2. **Verify app DB connection** (5 min)
   ```bash
   cd app
   bunx drizzle-kit studio  # Should open Drizzle Studio
   # Verify all tables exist
   ```

3. **Run test queries** (10 min)
   - Insert test record to mainpage waitlist
   - Verify app schema is complete

#### User Actions:
- Test database connections manually
- Verify .env.local files have correct DATABASE_URL
- Report any connection failures

---

## PHASE B: Waitlist Interview System (6-8 hours)

### Objective
Create 5-step waitlist flow with AI interview (text + voice) - CRITICAL for crowdfunding

### Parallelization Group: B
**Dependencies**: Phase A complete
**Sessions**: 3 parallel (can start as soon as A.1 complete)

---

### Task B.1: Waitlist UI Foundation (Session 1)
**Priority**: P0 - BLOCKER
**Estimated Time**: 3 hours
**Assignee**: OpenCode Session "waitlist-ui"

#### Subtasks:

##### B.1.1: Page Shell & Layout (45 min)
**Files**:
- `/mainpage/src/app/waitlist/page.tsx` - Main page
- `/mainpage/src/app/waitlist/layout.tsx` - Layout wrapper
- `/mainpage/src/components/waitlist/WaitlistLayout.tsx` - Custom layout

**Implementation**:
```typescript
// /mainpage/src/app/waitlist/page.tsx
'use client';

import { WaitlistLayout } from '@/components/waitlist/WaitlistLayout';
import { StepIndicator } from '@/components/waitlist/StepIndicator';
import { Step1Welcome } from '@/components/waitlist/Step1Welcome';
import { Step2BasicInfo } from '@/components/waitlist/Step2BasicInfo';
import { Step3SocialProof } from '@/components/waitlist/Step3SocialProof';
import { Step4Interview } from '@/components/waitlist/Step4Interview';
import { Step5Success } from '@/components/waitlist/Step5Success';
import { useWaitlistForm } from '@/hooks/useWaitlistForm';

export default function WaitlistPage() {
  const { currentStep, formData, updateFormData, goToStep } = useWaitlistForm();
  
  return (
    <WaitlistLayout>
      <StepIndicator currentStep={currentStep} totalSteps={5} />
      
      {currentStep === 1 && (
        <Step1Welcome onStart={() => goToStep(2)} />
      )}
      
      {currentStep === 2 && (
        <Step2BasicInfo 
          data={formData}
          onUpdate={updateFormData}
          onNext={() => goToStep(3)}
          onBack={() => goToStep(1)}
        />
      )}
      
      {currentStep === 3 && (
        <Step3SocialProof
          data={formData}
          onUpdate={updateFormData}
          onNext={() => goToStep(4)}
          onBack={() => goToStep(2)}
        />
      )}
      
      {currentStep === 4 && (
        <Step4Interview
          data={formData}
          onUpdate={updateFormData}
          onNext={() => goToStep(5)}
          onBack={() => goToStep(3)}
        />
      )}
      
      {currentStep === 5 && (
        <Step5Success data={formData} />
      )}
    </WaitlistLayout>
  );
}
```

**Requirements**:
- Dark mode only (zinc-950 background)
- Mobile-first responsive
- Leopoldo avatar visible throughout
- Framer Motion for step transitions

##### B.1.2: Step Indicator Component (30 min)
**File**: `/mainpage/src/components/waitlist/StepIndicator.tsx`

**Props Interface**:
```typescript
interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}
```

**Design**:
- Progress bar at top
- Step numbers with circles
- Current step highlighted (Recording Red #E11D48)
- Completed steps show checkmark

##### B.1.3: Step 1 - Welcome (30 min)
**File**: `/mainpage/src/components/waitlist/Step1Welcome.tsx`

**Content**:
- Leopoldo greeting (avatar)
- Headline: "Ready to elevate your merch?"
- Subtext: "Join artists who refuse to compromise on quality"
- CTA Button: "Start Application" (gold sheen gradient)
- Trust badges: "Zero upfront cost", "Premium quality", "AI-powered"

**Animation**:
- Fade in from bottom
- Staggered text reveal
- Button pulse on idle

##### B.1.4: Step 2 - Basic Info (45 min)
**File**: `/mainpage/src/components/waitlist/Step2BasicInfo.tsx`

**Form Fields**:
1. Full Name (text input)
2. Email Address (email input with validation)
3. Artist/Band Name (optional text input)

**Validation** (Zod schema):
```typescript
// /mainpage/src/lib/validation/waitlist.ts
import { z } from 'zod';

export const basicInfoSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  artistName: z.string().optional(),
});

export type BasicInfoData = z.infer<typeof basicInfoSchema>;
```

**Features**:
- Real-time validation
- Error messages below fields
- Back button (to Step 1)
- Next button (disabled until valid)

##### B.1.5: Step 3 - Social Proof (45 min)
**File**: `/mainpage/src/components/waitlist/Step3SocialProof.tsx`

**Form Fields**:
1. Instagram URL (optional)
2. TikTok URL (optional)
3. Follower Range (select)
   - Options: "1k-5k", "5k-10k", "10k-50k", "50k-100k", "100k+"

**Validation**:
```typescript
export const socialProofSchema = z.object({
  instagramUrl: z.string().url().optional().or(z.literal('')),
  tiktokUrl: z.string().url().optional().or(z.literal('')),
  followerRange: z.enum(['1k-5k', '5k-10k', '10k-50k', '50k-100k', '100k+']).optional(),
});
```

**UI Notes**:
- Helper text: "We review every application to ensure quality"
- Skip option if no social media
- Validate URLs are actually Instagram/TikTok

#### OpenCode Command:
```bash
opencode --session="waitlist-ui" \
  --task="Create complete waitlist UI for Steps 1-3: 
  1) /mainpage/src/app/waitlist/page.tsx with 5-step flow using useWaitlistForm hook,
  2) /mainpage/src/components/waitlist/WaitlistLayout.tsx with Leopoldo avatar and dark theme,
  3) /mainpage/src/components/waitlist/StepIndicator.tsx showing progress through 5 steps,
  4) /mainpage/src/components/waitlist/Step1Welcome.tsx with compelling copy and CTA,
  5) /mainpage/src/components/waitlist/Step2BasicInfo.tsx with name/email/artist name form + Zod validation,
  6) /mainpage/src/components/waitlist/Step3SocialProof.tsx with social links and follower range,
  7) /mainpage/src/lib/validation/waitlist.ts with Zod schemas,
  8) /mainpage/src/hooks/useWaitlistForm.ts for state management.
  Use Framer Motion for transitions, dark mode (zinc-950), Recording Red (#E11D48) for accents, gold sheen for CTAs." \
  --context="This is the critical crowdfunding conversion flow. Must be pixel-perfect and mobile-responsive."
```

#### Acceptance Criteria:
- [ ] All 5 steps render correctly
- [ ] Step indicator shows progress
- [ ] Form validation works (shows errors)
- [ ] Navigation (next/back) works
- [ ] Mobile responsive
- [ ] Dark mode only
- [ ] Leopoldo avatar visible
- [ ] Framer Motion transitions smooth

---

### Task B.2: AI Interview Text Mode (Session 2)
**Priority**: P0 - BLOCKER
**Estimated Time**: 3 hours
**Assignee**: OpenCode Session "interview-text"
**Depends On**: B.1.1 (page shell) for integration

#### Subtasks:

##### B.2.1: Interview Configuration (30 min)
**File**: `/mainpage/src/lib/waitlist/interview-questions.ts`

```typescript
export interface InterviewQuestion {
  id: string;
  question: string;
  type: 'open' | 'single_choice' | 'follow_up';
  options?: string[];
  context?: string;
}

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: 'current_merch',
    question: "Do you currently sell merchandise?",
    type: 'single_choice',
    options: ['Yes, regularly', 'Yes, but struggling', 'No, but I want to', 'No, just exploring'],
  },
  {
    id: 'biggest_challenge',
    question: "What's your biggest challenge with merch right now?",
    type: 'open',
    context: 'Listen for: quality issues, upfront costs, design struggles, logistics'
  },
  {
    id: 'audience_size',
    question: "Tell me about your audience. Where do they engage with you most?",
    type: 'open',
  },
  {
    id: 'quality_priority',
    question: "On a scale of 1-10, how important is premium quality to your brand?",
    type: 'single_choice',
    options: ['1-3 (Not important)', '4-6 (Somewhat)', '7-8 (Important)', '9-10 (Critical)'],
  },
  {
    id: 'vision',
    question: "If we could create the perfect merch experience for you, what would it look like?",
    type: 'open',
    context: 'Dream big - we want to understand your vision'
  },
];

export interface InterviewResponse {
  questionId: string;
  question: string;
  response: string;
  timestamp: number;
}
```

##### B.2.2: Step 4 Interview Component (90 min)
**File**: `/mainpage/src/components/waitlist/Step4Interview.tsx`

**Features**:
- Toggle between Text and Voice modes
- Chat interface (bubbles)
- Leopoldo avatar reacts to conversation state
- Real-time typing indicator
- Progress indicator (Question X of 5)

**State Management**:
```typescript
interface InterviewState {
  mode: 'text' | 'voice';
  currentQuestionIndex: number;
  responses: InterviewResponse[];
  isLoading: boolean;
  error: string | null;
}
```

**UI Structure**:
```
┌─────────────────────────────────────┐
│  Mode Toggle: [Text | Voice]        │
├─────────────────────────────────────┤
│                                     │
│  [Leopoldo Avatar]                  │
│  "Hello! I'm Leopoldo..."          │
│                                     │
│  [Chat bubbles scrollable]          │
│                                     │
├─────────────────────────────────────┤
│  [Text input | Mic button]         │
│  Question 2 of 5                    │
└─────────────────────────────────────┘
```

##### B.2.3: AI Interview API Route (60 min)
**File**: `/mainpage/src/app/api/waitlist/interview/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterProvider } from '@/lib/ai/openrouter';
import { interviewQuestions } from '@/lib/waitlist/interview-questions';

const provider = new OpenRouterProvider(process.env.OPENROUTER_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { questionId, previousResponses, userResponse } = await req.json();
    
    const question = interviewQuestions.find(q => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Build context from previous responses
    const context = previousResponses.map((r: any) => 
      `Q: ${r.question}\nA: ${r.response}`
    ).join('\n\n');

    const prompt = `You are Leopoldo, the onboarding agent for Merch From - an AI-powered premium merchandise platform for artists.

Context from previous conversation:
${context}

Current question: ${question.question}
User's response: ${userResponse}

Respond naturally as Leopoldo would. Acknowledge their answer, maybe ask a brief follow-up if relevant, then move to the next question or conclude if this is the last one.

Leopoldo's personality: Warm but professional, slightly Brazilian accent in text ("Ola!" occasionally), passionate about quality merch, protective of artists. Keep responses under 100 words.`;

    const aiResponse = await provider.chat({
      model: 'minimax/m2.5',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });

    return NextResponse.json({
      response: aiResponse.choices[0].message.content,
      nextQuestionId: getNextQuestionId(questionId),
      isComplete: isLastQuestion(questionId),
    });
  } catch (error) {
    console.error('Interview API error:', error);
    return NextResponse.json(
      { error: 'Failed to process interview' },
      { status: 500 }
    );
  }
}
```

##### B.2.4: Database Integration (30 min)
**File**: `/mainpage/src/db/waitlist.ts`

Add functions:
```typescript
export async function saveInterviewResponses(
  email: string,
  responses: InterviewResponse[]
): Promise<void> {
  await db.update(waitlist)
    .set({ 
      interviewResponses: responses,
      status: 'interview_complete'
    })
    .where(eq(waitlist.email, email));
}

export async function calculateWaitlistPosition(): Promise<number> {
  const result = await db.select({ count: count() }).from(waitlist);
  return (result[0]?.count || 0) + 1;
}
```

#### OpenCode Command:
```bash
opencode --session="interview-text" \
  --task="Create AI Interview Text Mode system: 
  1) /mainpage/src/lib/waitlist/interview-questions.ts with 5 questions configuration,
  2) /mainpage/src/components/waitlist/Step4Interview.tsx with chat UI, text/voice toggle, Leopoldo avatar reactions,
  3) /mainpage/src/app/api/waitlist/interview/route.ts with OpenRouter + MiniMax M2.5 integration,
  4) Update /mainpage/src/db/waitlist.ts to save interview responses and calculate position,
  5) /mainpage/src/lib/ai/openrouter.ts provider class if doesn't exist.
  
  The AI should use MiniMax M2.5 via OpenRouter API. Leopoldo should have warm, slightly Brazilian personality. Interview should feel conversational, not like a form. Include error handling and loading states." \
  --context="This is THE critical differentiator for crowdfunding. The AI interview must feel magical - like talking to a real person who understands merch. Text mode is primary, voice is secondary but should have toggle."
```

#### Acceptance Criteria:
- [ ] 5-question interview flows naturally
- [ ] AI responses feel personalized (references previous answers)
- [ ] Text/voice toggle works
- [ ] Responses save to database
- [ ] Error handling graceful (fallback messages)
- [ ] Leopoldo avatar shows appropriate expressions
- [ ] Loading states during AI calls

---

### Task B.3: Voice Interview Integration (Session 3)
**Priority**: P1
**Estimated Time**: 4 hours
**Assignee**: OpenCode Session "interview-voice"
**Depends On**: B.2 (for integration)

#### Subtasks:

##### B.3.1: MiniMax Speech 2.6 Integration (90 min)
**File**: `/mainpage/src/lib/ai/minimax-speech.ts`

```typescript
export class MiniMaxSpeechClient {
  private apiKey: string;
  private baseUrl = 'https://api.minimaxi.chat/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Real-time voice-to-voice
  async createVoiceStream(): Promise<WebSocket> {
    const ws = new WebSocket(
      `${this.baseUrl}/speech/stream?api_key=${this.apiKey}`
    );
    
    return new Promise((resolve, reject) => {
      ws.onopen = () => resolve(ws);
      ws.onerror = reject;
    });
  }

  // STT: Speech to Text
  async speechToText(audioBase64: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/speech/recognize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioBase64,
        model: 'speech-02-6',
        language: 'auto',
      }),
    });

    const data = await response.json();
    return data.text;
  }

  // TTS: Text to Speech
  async textToSpeech(text: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/speech/synthesize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model: 'speech-02-6',
        voice: 'leopoldo', // Custom voice if available
        speed: 1.0,
      }),
    });

    const data = await response.json();
    return data.audio; // base64
  }
}
```

##### B.3.2: Voice Interview API Route (90 min)
**File**: `/mainpage/src/app/api/waitlist/voice-interview/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { MiniMaxSpeechClient } from '@/lib/ai/minimax-speech';
import { OpenRouterProvider } from '@/lib/ai/openrouter';

const speechClient = new MiniMaxSpeechClient(process.env.MINIMAX_API_KEY!);
const aiProvider = new OpenRouterProvider(process.env.OPENROUTER_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { audio, questionId, previousResponses } = await req.json();

    // Step 1: Speech to Text
    const userText = await speechClient.speechToText(audio);

    // Step 2: Get AI response (same logic as text interview)
    const aiText = await getAIResponse(questionId, previousResponses, userText);

    // Step 3: Text to Speech
    const aiAudio = await speechClient.textToSpeech(aiText);

    return NextResponse.json({
      userText,
      aiText,
      aiAudio,
      nextQuestionId: getNextQuestionId(questionId),
      isComplete: isLastQuestion(questionId),
    });
  } catch (error) {
    console.error('Voice interview error:', error);
    return NextResponse.json(
      { error: 'Voice processing failed', fallbackToText: true },
      { status: 500 }
    );
  }
}
```

##### B.3.3: Audio Recording Hook (60 min)
**File**: `/mainpage/src/hooks/useAudioRecording.ts`

```typescript
export function useAudioRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const getBase64Audio = useCallback(async (): Promise<string> => {
    if (!audioBlob) return '';
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(audioBlob);
    });
  }, [audioBlob]);

  return {
    isRecording,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    getBase64Audio,
  };
}
```

##### B.3.4: Voice Mode UI Components (60 min)
**Files**:
- `/mainpage/src/components/waitlist/VoiceModeToggle.tsx`
- `/mainpage/src/components/waitlist/AudioWaveform.tsx`
- `/mainpage/src/components/waitlist/RecordingButton.tsx`

**VoiceModeToggle**:
```typescript
interface VoiceModeToggleProps {
  mode: 'text' | 'voice';
  onChange: (mode: 'text' | 'voice') => void;
}

// Toggle switch between text and voice icons
// Visual indicator of current mode
```

**AudioWaveform**:
- Animated waveform visualization during recording/playback
- Use canvas or CSS animations
- Show amplitude changes

**RecordingButton**:
- Large circular button with mic icon
- Pulsing animation when recording
- Red background (Recording Red)
- Press and hold or tap to toggle

#### OpenCode Command:
```bash
opencode --session="interview-voice" \
  --task="Create Voice Interview Mode using MiniMax Speech 2.6: 
  1) /mainpage/src/lib/ai/minimax-speech.ts with STT and TTS methods,
  2) /mainpage/src/app/api/waitlist/voice-interview/route.ts with full pipeline: audio→STT→LLM→TTS→audio,
  3) /mainpage/src/hooks/useAudioRecording.ts for browser audio capture,
  4) /mainpage/src/components/waitlist/VoiceModeToggle.tsx,
  5) /mainpage/src/components/waitlist/AudioWaveform.tsx for visualization,
  6) /mainpage/src/components/waitlist/RecordingButton.tsx with pulsing animation.
  
  Must support real-time voice conversation flow. Fallback to text if voice fails. Use Web Audio API for recording. MiniMax Speech 2.6 for STT/TTS." \
  --context="Voice mode is the 'wow factor' for crowdfunding. Must feel like talking to a real person. Latency should be under 3 seconds. Fallback gracefully to text mode if API fails."
```

#### Acceptance Criteria:
- [ ] Voice toggle switches between text and voice modes
- [ ] Recording button captures audio
- [ ] Full pipeline works: Record → STT → AI → TTS → Play
- [ ] Audio waveform visualizes recording
- [ ] Fallback to text if voice fails
- [ ] Latency under 3 seconds end-to-end

---

### Task B.4: Step 5 Success & Integration (Session 1 after B.1 complete)
**Priority**: P0
**Estimated Time**: 1.5 hours
**Assignee**: Same session as B.1

#### Subtasks:

##### B.4.1: Step 5 Success Component (45 min)
**File**: `/mainpage/src/components/waitlist/Step5Success.tsx`

**Content**:
- Celebration animation (confetti or similar)
- "You're on the list!" headline
- Waitlist position number (e.g., "#2,847")
- Estimated wait time
- Share buttons (Twitter, Instagram)
- "What happens next" explanation
- CTA: "Check your email for confirmation"

**Features**:
- Save final data to database
- Send confirmation email via Resend
- Generate shareable link with referral code

##### B.4.2: Email Confirmation (30 min)
**File**: `/mainpage/src/app/api/waitlist/confirm/route.ts`

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email, name, position } = await req.json();

  await resend.emails.send({
    from: 'Leopoldo@merchfrom.com',
    to: email,
    subject: 'Welcome to the Merch From waitlist! 🎉',
    html: generateConfirmationEmail({ name, position }),
  });

  return NextResponse.json({ success: true });
}
```

##### B.4.3: Integration Testing (15 min)
- Test complete flow end-to-end
- Verify all steps transition correctly
- Check database persistence
- Verify email sends

#### OpenCode Command:
```bash
opencode --session="waitlist-ui" \
  --task="Complete waitlist flow with Step 5 and integration:
  1) /mainpage/src/components/waitlist/Step5Success.tsx with celebration animation, position number, share buttons,
  2) /mainpage/src/app/api/waitlist/confirm/route.ts to send confirmation email via Resend,
  3) Update waitlist page to integrate with interview components from other sessions,
  4) Create email template for confirmation,
  5) Add share functionality with referral tracking,
  6) Full integration testing - ensure all 5 steps flow seamlessly.
  
  Use Framer Motion for celebration effects. Position should be calculated from database. Email should be warm and personal from Leopoldo." \
  --context="Final step of waitlist flow. Must feel rewarding and create FOMO with position number. Email confirmation is critical for deliverability."
```

#### Acceptance Criteria:
- [ ] Step 5 shows waitlist position
- [ ] Celebration animation plays
- [ ] Share buttons work
- [ ] Confirmation email sends via Resend
- [ ] Database updated with final status
- [ ] Referral tracking works

---

## PHASE C: App Audio Input System (4-5 hours)

### Objective
Add voice conversation capability to main app chat interface

### Parallelization Group: C
**Dependencies**: Phase A complete (can start after A.1)
**Sessions**: 2 parallel

---

### Task C.1: Audio Conversation UI (Session 1)
**Priority**: P1
**Estimated Time**: 3 hours
**Assignee**: OpenCode Session "app-audio-ui"

#### Subtasks:

##### C.1.1: Audio Lightbox Component (90 min)
**File**: `/app/src/components/AudioConversationLightbox.tsx`

**Features**:
- Full-screen overlay (via Portal)
- Large Leopoldo avatar (animated)
- Audio waveform visualization
- Current transcription text
- Close button (return to chat)

**Props Interface**:
```typescript
interface AudioConversationLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  agent: 'Leopoldo' | 'Francisca' | 'Antônia';
  onTranscription: (text: string) => void;
}
```

##### C.1.2: MiniMax Orb Visualization (60 min)
**File**: `/app/src/components/ui/MiniMaxOrb.tsx`

**Design**:
- 3D animated orb
- Pulsing glow effect
- Color changes based on state:
  - Listening: Blue glow
  - Processing: Yellow/orange pulse
  - Speaking: Green glow

**Implementation**:
- Use CSS animations + Framer Motion
- Or Three.js if performance allows

##### C.1.3: Audio Input Integration (30 min)
**File**: `/app/src/components/chat/ChatInput.tsx` (update)

**Changes**:
- Add mic button next to send button
- Click opens AudioConversationLightbox
- Pass current agent context

#### OpenCode Command:
```bash
opencode --session="app-audio-ui" \
  --task="Create App Audio Conversation UI:
  1) /app/src/components/AudioConversationLightbox.tsx - Full-screen voice conversation overlay with:
     - Large animated Leopoldo/Francisca/Antônia avatar
     - Real-time audio waveform visualization
     - Current transcription display
     - Close to return to chat
     - Portal-based for proper layering
  2) /app/src/components/ui/MiniMaxOrb.tsx - 3D animated orb that:
     - Pulses with glow effect
     - Changes color by state (listening=blue, processing=orange, speaking=green)
     - Uses Framer Motion for smooth animations
  3) Update /app/src/components/chat/ChatInput.tsx to add mic button that opens lightbox
  
  Dark theme (zinc-950), Recording Red accents, smooth animations essential."
```

#### Acceptance Criteria:
- [ ] Lightbox opens full screen
- [ ] Orb pulses with state changes
- [ ] Waveform visualizes audio
- [ ] Closes properly returning to chat
- [ ] Works with all 3 agents

---

### Task C.2: Voice Pipeline Integration (Session 2)
**Priority**: P1
**Estimated Time**: 3 hours
**Assignee**: OpenCode Session "app-audio-pipeline"

#### Subtasks:

##### C.2.1: App Voice API Route (90 min)
**File**: `/app/src/app/api/chat/voice/route.ts`

**Pipeline**:
```
User Audio → MiniMax STT → M2-her LLM → MiniMax TTS → Audio Response
```

**Implementation**:
```typescript
export async function POST(req: NextRequest) {
  const { audio, agent, conversationId } = await req.json();
  
  // 1. STT
  const userText = await minimaxSpeech.speechToText(audio);
  
  // 2. Get conversation context
  const context = await getConversationContext(conversationId);
  
  // 3. LLM with agent personality
  const aiText = await getAgentResponse(agent, userText, context);
  
  // 4. TTS
  const aiAudio = await minimaxSpeech.textToSpeech(aiText);
  
  // 5. Save to conversation
  await saveMessage(conversationId, userText, aiText);
  
  return NextResponse.json({ aiText, aiAudio });
}
```

##### C.2.2: Chat Context Integration (60 min)
**File**: `/app/src/lib/ChatContext.tsx` (update)

**Add**:
- Voice mode state
- Audio message handling
- Toggle between text/voice

##### C.2.3: WebSocket for Real-time (Optional) (30 min)
**File**: `/app/src/hooks/useVoiceChat.ts`

For lower latency, consider WebSocket instead of HTTP POST for voice streaming.

#### OpenCode Command:
```bash
opencode --session="app-audio-pipeline" \
  --task="Create App Voice Pipeline:
  1) /app/src/app/api/chat/voice/route.ts with full MiniMax pipeline:
     - Receive audio blob
     - STT with MiniMax Speech 2.6
     - LLM with M2-her (agent-specific personality)
     - TTS with MiniMax Speech 2.6
     - Return audio + text
     - Save to conversation history
  2) Update /app/src/lib/ChatContext.tsx to:
     - Add voice mode toggle
     - Handle audio messages
     - Manage voice conversation state
  3) /app/src/hooks/useVoiceChat.ts for voice-specific logic
  
  Must support all 3 agents with different personalities. Latency under 3 seconds."
```

#### Acceptance Criteria:
- [ ] Voice API route works end-to-end
- [ ] Conversation context maintained
- [ ] Agent personality preserved
- [ ] Messages saved to chat history
- [ ] Latency acceptable (< 3s)

---

## PHASE D: Catalog System (5-6 hours)

### Objective
Full product catalog browser with filters and detail views

### Parallelization Group: D
**Dependencies**: Phase A complete
**Sessions**: 2 parallel

---

### Task D.1: Catalog UI Components (Session 1)
**Priority**: P1
**Estimated Time**: 4 hours
**Assignee**: OpenCode Session "catalog-ui"

#### Subtasks:

##### D.1.1: Catalog Lightbox Shell (60 min)
**File**: `/app/src/components/catalog/CatalogLightbox.tsx`

**Features**:
- Slide up from bottom animation
- Full-screen on mobile, centered on desktop
- Backdrop blur
- Close on escape or backdrop click

##### D.1.2: Category Filters (45 min)
**File**: `/app/src/components/catalog/CategoryFilters.tsx`

**Categories**:
- Apparel: T-Shirts, Hoodies, Sweaters, Tank Tops
- Accessories: Stickers, Posters, Tote Bags
- Drinkware: Mugs, Water Bottles

**UI**: Horizontal scrollable chips, multi-select

##### D.1.3: Product Grid & Slider (90 min)
**Files**:
- `/app/src/components/catalog/ProductGrid.tsx`
- `/app/src/components/catalog/ProductSlider.tsx`
- `/app/src/components/catalog/ViewToggle.tsx`

**Grid**: CSS Grid, 2 columns mobile, 3-4 desktop
**Slider**: Horizontal scroll, snap to cards
**Toggle**: Icon buttons to switch views

##### D.1.4: Product Card Component (60 min)
**File**: `/app/src/components/catalog/CatalogProductCard.tsx`

**Props**:
```typescript
interface CatalogProductCardProps {
  product: ProductBlank;
  onSelect: () => void;
  view: 'grid' | 'slider';
}
```

**Display**:
- Image (Cloudinary)
- Name
- Category badge
- Sustainability badges (eco icons)
- Price range

##### D.1.5: Search & Sort (45 min)
**File**: `/app/src/components/catalog/SearchBar.tsx`

**Features**:
- Real-time search by name
- Sort by: Featured, Price Low-High, Price High-Low

#### OpenCode Command:
```bash
opencode --session="catalog-ui" \
  --task="Create Catalog UI System:
  1) /app/src/components/catalog/CatalogLightbox.tsx - Full-screen lightbox with slide-up animation
  2) /app/src/components/catalog/CategoryFilters.tsx - Horizontal scrollable category chips (Apparel, Accessories, Drinkware)
  3) /app/src/components/catalog/ProductGrid.tsx - Responsive grid layout (2 cols mobile, 4 cols desktop)
  4) /app/src/components/catalog/ProductSlider.tsx - Horizontal scrollable slider
  5) /app/src/components/catalog/ViewToggle.tsx - Grid/Slider toggle buttons
  6) /app/src/components/catalog/CatalogProductCard.tsx - Product display card with image, name, badges, price
  7) /app/src/components/catalog/SearchBar.tsx - Search input with sort dropdown
  
  Dark theme, smooth animations, mobile-first. Use existing Cloudinary integration for images."
```

#### Acceptance Criteria:
- [ ] Lightbox opens with animation
- [ ] Filters work and update grid
- [ ] Grid/Slider toggle works
- [ ] Product cards display correctly
- [ ] Search filters in real-time
- [ ] Mobile responsive

---

### Task D.2: Product Detail & Data (Session 2)
**Priority**: P1
**Estimated Time**: 3 hours
**Assignee**: OpenCode Session "catalog-data"

#### Subtasks:

##### D.2.1: Product Detail Lightbox (90 min)
**File**: `/app/src/components/catalog/ProductDetailLightbox.tsx`

**Features**:
- Image gallery (thumbnails + main)
- Product specs (material, weight, fit)
- Size selector
- Color selector
- Sustainability badges
- "Use This Blank" CTA
- Related products

##### D.2.2: Size & Color Selectors (45 min)
**Files**:
- `/app/src/components/catalog/SizeSelector.tsx`
- `/app/src/components/catalog/ColorSelector.tsx`

**Size Selector**:
- Size buttons (XS, S, M, L, XL, XXL)
- Show unavailable sizes disabled

**Color Selector**:
- Color swatches
- Show name on hover
- Selected state ring

##### D.2.3: Product Data Types & Seed (45 min)
**Files**:
- `/app/src/types/product.ts` (if not exists)
- `/src/db/seed/productBlanks.ts`

**Seed Data**: 20-30 realistic products across categories

##### D.2.4: Catalog API Route (30 min)
**File**: `/app/src/app/api/catalog/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort');
  
  const products = await getProductBlanks({ category, search, sort });
  
  return NextResponse.json({ products });
}
```

#### OpenCode Command:
```bash
opencode --session="catalog-data" \
  --task="Create Product Detail & Data System:
  1) /app/src/components/catalog/ProductDetailLightbox.tsx - Full product detail with:
     - Image gallery with thumbnails
     - Product specs (material, weight, fit guide)
     - Size selector component
     - Color selector component
     - Sustainability badges
     - Use This Blank CTA
     - Related products carousel
  2) /app/src/components/catalog/SizeSelector.tsx - Interactive size buttons
  3) /app/src/components/catalog/ColorSelector.tsx - Color swatches with names
  4) /src/db/seed/productBlanks.ts - Seed data for 20-30 products across all categories
  5) /app/src/app/api/catalog/route.ts - GET endpoint with filtering by category, search, sort
  6) Update /src/db/productBlanks.ts with query functions
  
  Include realistic product data (Stanley Stella, Gildan, etc.). Make selectors highly interactive."
```

#### Acceptance Criteria:
- [ ] Product detail shows all specs
- [ ] Size/color selection works
- [ ] Gallery navigation works
- [ ] API returns filtered results
- [ ] Seed data populates database
- [ ] Mobile responsive detail view

---

## PHASE E: Backend Core (6-8 hours)

### Objective
Production-ready backend with auth, CRUD, webhooks, email

### Parallelization Group: E
**Dependencies**: Phase A complete
**Sessions**: 3 parallel (can start after A.1)

---

### Task E.1: Database Operations (Session 1)
**Priority**: P0
**Estimated Time**: 3 hours
**Assignee**: OpenCode Session "backend-db"

#### Subtasks:

##### E.1.1: User CRUD Operations (60 min)
**File**: `/src/db/users.ts`

**Functions**:
```typescript
export async function createUser(data: InsertUser): Promise<User>
export async function getUserById(id: string): Promise<User | undefined>
export async function getUserByClerkId(clerkId: string): Promise<User | undefined>
export async function updateUser(id: string, data: Partial<InsertUser>): Promise<User>
export async function deleteUser(id: string): Promise<void>
```

##### E.1.2: Store CRUD Operations (45 min)
**File**: `/src/db/stores.ts`

**Functions**:
```typescript
export async function createStore(data: InsertStore): Promise<Store>
export async function getStoreBySlug(slug: string): Promise<Store | undefined>
export async function getStoresByArtist(artistId: string): Promise<Store[]>
export async function updateStore(id: string, data: Partial<InsertStore>): Promise<Store>
```

##### E.1.3: Product CRUD Operations (45 min)
**File**: `/src/db/products.ts`

**Functions**:
```typescript
export async function createProduct(data: InsertProduct): Promise<Product>
export async function getProductsByStore(storeId: string): Promise<Product[]>
export async function updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product>
export async function deleteProduct(id: string): Promise<void>
```

##### E.1.4: Order CRUD Operations (60 min)
**File**: `/src/db/orders.ts`

**Functions**:
```typescript
export async function createOrder(data: InsertOrder): Promise<Order>
export async function getOrdersByStore(storeId: string): Promise<Order[]>
export async function getOrdersByCustomer(customerId: string): Promise<Order[]>
export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order>
```

#### OpenCode Command:
```bash
opencode --session="backend-db" \
  --task="Create complete database CRUD operations:
  1) /src/db/users.ts - createUser, getUserById, getUserByClerkId, updateUser, deleteUser
  2) /src/db/stores.ts - createStore, getStoreBySlug, getStoresByArtist, updateStore
  3) /src/db/products.ts - createProduct, getProductsByStore, updateProduct, deleteProduct
  4) /src/db/orders.ts - createOrder, getOrdersByStore, getOrdersByCustomer, updateOrderStatus
  5) /src/db/orderItems.ts - createOrderItem, getOrderItemsByOrder
  
  All functions must be type-safe using Drizzle ORM. Include proper error handling. Use existing schema from /src/db/schema.ts."
```

#### Acceptance Criteria:
- [ ] All CRUD functions implemented
- [ ] Type-safe with Drizzle
- [ ] Error handling included
- [ ] Unit tests (optional but recommended)

---

### Task E.2: API Routes & Webhooks (Session 2)
**Priority**: P0
**Estimated Time**: 3 hours
**Assignee**: OpenCode Session "backend-api"

#### Subtasks:

##### E.2.1: REST API Routes (90 min)
**Files**:
- `/app/src/app/api/users/route.ts`
- `/app/src/app/api/stores/route.ts`
- `/app/src/app/api/products/route.ts`
- `/app/src/app/api/orders/route.ts`

**Pattern**:
```typescript
// GET /api/products?storeId=xxx
// POST /api/products (create)
// PATCH /api/products/:id (update)
// DELETE /api/products/:id (delete)
```

##### E.2.2: Clerk Webhook Handler (60 min)
**File**: `/app/src/app/api/webhooks/clerk/route.ts`

**Events**:
- `user.created` → Create user in DB
- `user.updated` → Update user
- `user.deleted` → Soft delete user

```typescript
export async function POST(req: NextRequest) {
  const payload = await req.json();
  const event = payload.type;
  
  switch (event) {
    case 'user.created':
      await createUserFromClerk(payload.data);
      break;
    case 'user.updated':
      await updateUserFromClerk(payload.data);
      break;
  }
  
  return NextResponse.json({ success: true });
}
```

##### E.2.3: Rate Limiting Middleware (30 min)
**File**: `/app/src/middleware.ts` (update)

Add rate limiting using Upstash Redis:
```typescript
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});
```

#### OpenCode Command:
```bash
opencode --session="backend-api" \
  --task="Create API routes and webhooks:
  1) /app/src/app/api/users/route.ts - GET, POST, PATCH
  2) /app/src/app/api/stores/route.ts - GET, POST, PATCH
  3) /app/src/app/api/products/route.ts - GET, POST, PATCH, DELETE
  4) /app/src/app/api/orders/route.ts - GET, POST, PATCH
  5) /app/src/app/api/webhooks/clerk/route.ts - Handle user.created, user.updated, user.deleted
  6) Update /app/src/middleware.ts to add rate limiting with Upstash Redis
  
  All routes must validate authentication via Clerk. Webhook must verify signature. Rate limit: 10 requests per 10 seconds."
```

#### Acceptance Criteria:
- [ ] All API routes work
- [ ] Clerk webhooks sync users
- [ ] Rate limiting active
- [ ] Auth required for all routes
- [ ] Error responses standardized

---

### Task E.3: Email & MerchStation TUI (Session 3)
**Priority**: P1
**Estimated Time**: 3 hours
**Assignee**: OpenCode Session "backend-services"

#### Subtasks:

##### E.3.1: Email Service Integration (60 min)
**File**: `/src/lib/email/resend.ts`

**Templates**:
- Order confirmation
- Artist notification (new order)
- Welcome email
- Password reset

```typescript
export async function sendOrderConfirmation(order: Order, user: User) {
  await resend.emails.send({
    from: 'Merch From <orders@merchfrom.com>',
    to: user.email,
    subject: `Order #${order.id} confirmed`,
    html: orderConfirmationTemplate(order),
  });
}
```

##### E.3.2: MerchStation TUI Setup (120 min)
**Directory**: `/tui/`

**Create terminal-based admin dashboard**:
```
MerchStation/
├── src/
│   ├── app.tsx - Main TUI app
│   ├── components/
│   │   ├── Dashboard.tsx - Overview stats
│   │   ├── OrderPipeline.tsx - Production queue
│   │   ├── UserManagement.tsx - Ban/roles
│   │   └── LeopoldoAI.tsx - AI assistant
│   └── api/
│       └── client.ts - API client for /app endpoints
├── package.json
└── tsconfig.json
```

**Framework**: Ink (React for terminals)

**Features**:
- Real-time order tracking
- User management (ban, change roles)
- Production pipeline view
- Chat with Leopoldo AI
- Keyboard navigation

#### OpenCode Command:
```bash
opencode --session="backend-services" \
  --task="Create Email Service and MerchStation TUI:
  1) /src/lib/email/resend.ts with:
     - sendOrderConfirmation
     - sendArtistNotification
     - sendWelcomeEmail
     - sendPasswordReset
  2) /tui/ directory with complete Terminal UI:
     - /tui/src/app.tsx - Main Ink app
     - /tui/src/components/Dashboard.tsx - Stats overview
     - /tui/src/components/OrderPipeline.tsx - Production queue
     - /tui/src/components/UserManagement.tsx - Admin controls
     - /tui/src/components/LeopoldoAI.tsx - AI chat interface
     - /tui/package.json with ink, react, typescript dependencies
  
  Use Ink framework for terminal UI. Connect to app API routes for data. Make it keyboard-navigable."
```

#### Acceptance Criteria:
- [ ] Resend integration works
- [ ] Email templates look professional
- [ ] TUI starts successfully
- [ ] Can view orders in pipeline
- [ ] Can manage users
- [ ] Leopoldo AI responds in terminal

---

## USER ACTION CHECKLIST

### Pre-Start (Before Any Sessions):
- [ ] Add API keys to .env.local files
- [ ] Verify Neon databases are accessible
- [ ] Install Bun globally
- [ ] Open 3-4 terminal windows for parallel sessions
- [ ] Have Kimi k2.5 ready for planning questions

### During Execution:
- [ ] Monitor session outputs for errors
- [ ] Review code before major integrations
- [ ] Test database connections after A.1
- [ ] Verify MiniMax API keys work
- [ ] Test email sending with Resend

### After Each Phase:
- [ ] Run `bun run build` to verify no errors
- [ ] Run `bun run lint` to check code quality
- [ ] Test critical paths manually
- [ ] Commit progress (if using git)

### Final Verification:
- [ ] Complete waitlist flow end-to-end
- [ ] Place test order through entire system
- [ ] Verify AI interview quality
- [ ] Test voice mode (if implemented)
- [ ] Check mobile responsiveness
- [ ] Verify emails send correctly

---

## PARALLEL SESSION EXECUTION ORDER

### Wave 1 (Start Immediately):
```bash
# Terminal 1 - Critical Path
opencode --session="phase-a-bun-migration" --task="Migrate to Bun"

# Terminal 2 - Parallel cleanup
opencode --session="phase-a-cleanup" --task="Clean legacy code"

# Terminal 3 - Documentation
opencode --session="phase-a-db-docs" --task="Document DB architecture"
```

### Wave 2 (After A.1 completes):
```bash
# Terminal 1 - Waitlist UI (Steps 1-3, 5)
opencode --session="waitlist-ui" --task="Create waitlist UI Steps 1-3, 5"

# Terminal 2 - AI Interview Text
opencode --session="interview-text" --task="Create AI interview text mode"

# Terminal 3 - AI Interview Voice
opencode --session="interview-voice" --task="Create AI interview voice mode"

# Terminal 4 - App Audio UI (parallel)
opencode --session="app-audio-ui" --task="Create app audio UI"
```

### Wave 3 (After B.1 completes):
```bash
# Terminal 1 - App Audio Pipeline
opencode --session="app-audio-pipeline" --task="Create voice pipeline"

# Terminal 2 - Catalog UI
opencode --session="catalog-ui" --task="Create catalog UI"

# Terminal 3 - Catalog Data
opencode --session="catalog-data" --task="Create catalog data layer"

# Terminal 4 - Backend DB (can start earlier)
opencode --session="backend-db" --task="Create DB operations"
```

### Wave 4 (Final):
```bash
# Terminal 1 - Backend API
opencode --session="backend-api" --task="Create API routes"

# Terminal 2 - Backend Services
opencode --session="backend-services" --task="Create email and TUI"

# Terminal 3 - Integration Testing
opencode --session="integration" --task="Test and integrate all components"
```

---

## SUCCESS METRICS

### Phase A:
- [ ] Both projects build with Bun
- [ ] No legacy code remains
- [ ] DB architecture documented

### Phase B:
- [ ] 5-step waitlist flow complete
- [ ] AI interview feels natural
- [ ] Voice mode works (or graceful fallback)
- [ ] Confirmation email sends

### Phase C:
- [ ] Audio lightbox works
- [ ] Voice chat in app functional
- [ ] Latency under 3 seconds

### Phase D:
- [ ] Catalog browsable
- [ ] Product details viewable
- [ ] Filters work

### Phase E:
- [ ] All CRUD operations work
- [ ] Clerk webhooks sync users
- [ ] Rate limiting active
- [ ] Emails send
- [ ] MerchStation TUI functional

---

## RISK MITIGATION

| Risk | Mitigation |
|------|------------|
| Bun migration breaks deps | Keep backup of package-lock.json, test thoroughly |
| MiniMax API rate limits | Implement caching, queue requests |
| Database connection issues | Test connections before Wave 2 |
| Voice mode too complex | Fallback to text-only, defer voice to Phase 5 |
| Scope too large for one day | Prioritize B.1, B.2 (waitlist is critical), defer C and D if needed |
| AI interview quality poor | Add human review flag, simple responses |

---

## POST-EXECUTION CHECKLIST

After all sessions complete:

1. **Build Verification**:
   ```bash
   cd app && bun run build
   cd ../mainpage && bun run build
   ```

2. **Type Checking**:
   ```bash
   cd app && bun run typecheck
   cd ../mainpage && bun run typecheck
   ```

3. **Linting**:
   ```bash
   cd app && bun run lint
   cd ../mainpage && bun run lint
   ```

4. **Manual Testing**:
   - Complete waitlist flow
   - Test AI interview quality
   - Place test order
   - Check emails
   - Test mobile view

5. **Documentation**:
   - Update AGENTS.md with progress
   - Document any API changes
   - Note any deferred items

---

## EMERGENCY SCOPE REDUCTION

If running out of time, cut in this order:

1. **Phase C** (App Audio) - Can launch without voice
2. **Phase D** (Catalog) - Can use simple product list
3. **Phase E.3** (MerchStation TUI) - Can use web dashboard
4. **Phase B.3** (Voice Interview) - Keep text-only interview

**Must Keep**:
- Phase A (Infrastructure)
- Phase B.1, B.2 (Waitlist UI + Text Interview)
- Phase E.1, E.2 (Backend DB + API)
- Phase E.3 Email (critical for confirmations)

---

## NEXT STEPS FOR YOU

1. **Start Wave 1 sessions now** (3 parallel)
2. **Add API keys** while sessions run
3. **Monitor outputs** and catch errors early
4. **Start Wave 2** as soon as A.1 completes
5. **Prioritize Waitlist** (Phase B) above all else
6. **Test frequently** - don't wait until end

---

**Ready to execute? Start with Wave 1 commands above.**

**Questions before we begin?**
