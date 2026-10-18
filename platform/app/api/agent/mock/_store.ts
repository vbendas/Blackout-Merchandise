import type { Card, Chip, ToolUi } from '@/lib/ui-cards/schemas';

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: Card[];
}

export interface ConversationState {
  id: string;
  turn: number;
  messages: StoredMessage[];
  chips: Chip[];
  project: ToolUi['project'] | null;
  pendingConfirms: Map<string, string>;
}

const conversations = new Map<string, ConversationState>();

const onboardingItems = [
  { key: 'profile', label: 'Add your name and photo', done: false, prompt: 'Set up my profile' },
  { key: 'store', label: 'Name your shop', done: false, prompt: 'Name my shop' },
  { key: 'blank', label: 'Pick your first blank', done: false, prompt: 'Show me blanks' },
  { key: 'stripe', label: 'Set up payouts', done: false, prompt: 'Set up payouts' },
];

export function createConversation(id: string): ConversationState {
  const state: ConversationState = {
    id,
    turn: 0,
    messages: [
      {
        id: 'm-welcome',
        role: 'assistant',
        text: 'Welcome to Blackout Merchandise. Let’s get your shop set up.',
        cards: [
          {
            id: 'card-onboarding-0',
            kind: 'onboarding_checklist',
            title: 'Get your shop live',
            items: onboardingItems,
          },
        ],
      },
    ],
    chips: [
      { label: 'Name my shop', prompt: 'Name my shop' },
      { label: 'Browse blanks', prompt: 'Show me blanks' },
      { label: 'Upload artwork', prompt: 'I want to upload my own artwork' },
    ],
    project: { kind: 'onboarding', state: { items: onboardingItems } },
    pendingConfirms: new Map(),
  };
  conversations.set(id, state);
  return state;
}

export function getConversation(id: string): ConversationState | undefined {
  return conversations.get(id);
}

export function getOrCreateConversation(id: string | null | undefined): ConversationState {
  const key = id && id.trim().length > 0 ? id : crypto.randomUUID();
  return conversations.get(key) ?? createConversation(key);
}

export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
