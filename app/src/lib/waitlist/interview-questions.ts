export interface InterviewQuestion {
  id: number;
  question: string;
  placeholder: string;
  required: boolean;
}

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: 1,
    question: "What's your artist name or brand?",
    placeholder: 'Enter your artist name...',
    required: true,
  },
  {
    id: 2,
    question: 'What kind of merchandise do you want to create?',
    placeholder: 'T-shirts, hoodies, accessories, etc...',
    required: true,
  },
  {
    id: 3,
    question: "What's your follower range on social media?",
    placeholder: 'e.g., 1k-5k, 5k-10k, 10k-50k, 50k-100k, 100k+',
    required: true,
  },
  {
    id: 4,
    question: "What's your biggest challenge with merchandise right now?",
    placeholder: 'Quality, cost, design, logistics, etc...',
    required: true,
  },
  {
    id: 5,
    question: 'Why do you want to join Blackout Merchandise?',
    placeholder: 'Tell us what excites you about our platform...',
    required: true,
  },
];
