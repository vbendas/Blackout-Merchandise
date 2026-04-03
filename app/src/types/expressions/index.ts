/**
 * Avatar Expression Types
 * Defines all available expressions for the Cat-Suite avatars
 */

export type AgentName = 'Leopoldo' | 'Francisca' | 'Antônia';

export type Expression =
  | 'neutral'
  | 'speaking_a'
  | 'speaking_b'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'confused'
  | 'shocked'
  | 'sad'
  | 'angry_annoyed'
  | 'wink'
  | 'love'
  | 'sleepy'
  | 'mischievous'
  | 'proud'
  | 'mouth_closed'
  | 'mouth_o_shape'
  | 'mouth_wide_open'
  | 'mouth_teeth_showing'
  | 'blep';

export interface ExpressionContextType {
  currentExpression: Expression;
  agentName: AgentName;
  isAnimating: boolean;
  setExpression: (expression: Expression) => void;
  startSpeaking: () => void;
  stopSpeaking: () => void;
  resetToNeutral: () => void;
}
