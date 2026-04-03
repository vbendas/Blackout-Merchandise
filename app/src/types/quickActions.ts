/**
 * Quick Action Types
 * Unified type system for quick actions across the app
 */

export interface QuickActionDef {
  id: string;
  label: string;
  handler?: () => void;
  isPrimary?: boolean;
  disabled?: boolean;
  confirmRequired?: boolean;
  confirmMessage?: string;
  confirmOptions?: {
    confirm: QuickActionDef;
    cancel: QuickActionDef;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'typed' | 'quick-action' | 'system';
  agent?: string;
  expression?: string;
  timestamp: Date;
  imageUrl?: string;
  imageType?: 'final' | 'reference';
}

export interface StudioMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'typed' | 'quick-action' | 'system';
  expression: string;
  timestamp: Date;
  imageUrl?: string;
  imageType?: 'final' | 'reference';
}
