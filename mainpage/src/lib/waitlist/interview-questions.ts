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

export function getNextQuestionId(currentId: string): string | null {
  const currentIndex = interviewQuestions.findIndex(q => q.id === currentId);
  if (currentIndex === -1 || currentIndex === interviewQuestions.length - 1) {
    return null;
  }
  return interviewQuestions[currentIndex + 1].id;
}

export function isLastQuestion(questionId: string): boolean {
  return questionId === interviewQuestions[interviewQuestions.length - 1].id;
}

export function getQuestionById(id: string): InterviewQuestion | undefined {
  return interviewQuestions.find(q => q.id === id);
}
