export interface WaitlistStep {
  id: number;
  question: string;
  type: 'single_choice' | 'text' | 'email';
  options?: string[];
  key: string;
}

export const WAITLIST_STEPS: WaitlistStep[] = [
  {
    id: 1,
    question: "Do you currently sell merchandise?",
    type: 'single_choice',
    options: [
      'Yes, regularly',
      'Yes, but struggling with quality/costs',
      'No, but I want to start',
      'No, just exploring options'
    ],
    key: 'current_merch_status',
  },
  {
    id: 2,
    question: "What's your biggest challenge with merch right now?",
    type: 'text',
    key: 'biggest_challenge',
  },
  {
    id: 3,
    question: "Tell me about your audience. Where do they engage with you most?",
    type: 'text',
    key: 'audience_engagement',
  },
  {
    id: 4,
    question: "On a scale of 1-10, how important is premium quality to your brand?",
    type: 'single_choice',
    options: [
      '1-3 (Not important, just want cheap merch)',
      '4-6 (Somewhat important)',
      '7-8 (Important, fans deserve good stuff)',
      '9-10 (Critical, quality IS my brand)'
    ],
    key: 'quality_priority',
  },
  {
    id: 5,
    question: "If we could create the perfect merch experience for you, what would it look like?",
    type: 'text',
    key: 'dream_experience',
  },
];

export interface WaitlistState {
  currentStep: number;
  answers: Record<string, string>;
  isComplete: boolean;
}

export function getInitialWaitlistState(): WaitlistState {
  return {
    currentStep: 0,
    answers: {},
    isComplete: false,
  };
}

export function getNextWaitlistStep(state: WaitlistState, answer: string): WaitlistState {
  const currentStepData = WAITLIST_STEPS[state.currentStep];
  const newAnswers = {
    ...state.answers,
    [currentStepData.key]: answer,
  };

  const nextStep = state.currentStep + 1;
  const isComplete = nextStep >= WAITLIST_STEPS.length;

  return {
    currentStep: nextStep,
    answers: newAnswers,
    isComplete,
  };
}

export function getCurrentWaitlistQuestion(state: WaitlistState): WaitlistStep | null {
  if (state.isComplete || state.currentStep >= WAITLIST_STEPS.length) {
    return null;
  }
  return WAITLIST_STEPS[state.currentStep];
}

export function formatWaitlistProgress(state: WaitlistState): string {
  return `Question ${state.currentStep + 1} of ${WAITLIST_STEPS.length}`;
}

export async function submitWaitlistData(
  answers: Record<string, string>,
  userData?: { name?: string; email?: string }
): Promise<{ success: boolean; position?: number; error?: string }> {
  try {
    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...userData,
        ...answers,
        source: 'chat',
      }),
    });

    if (!response.ok) {
      throw new Error('Submission failed');
    }

    const data = await response.json();
    return {
      success: true,
      position: data.position,
    };
  } catch (error) {
    console.error('Waitlist submission error:', error);
    return {
      success: false,
      error: 'Failed to join waitlist. Please try again.',
    };
  }
}
