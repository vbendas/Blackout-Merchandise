import type { AgentName, Expression } from '@/types/expressions';

/**
 * Expression name to Cloudinary public_id number mapping
 * Matches the naming convention in /Assets/ folder
 */
export const EXPRESSION_MAP: Record<Expression, string> = {
  neutral: '1_-_neutral',
  speaking_a: '2_-_speaking_a',
  speaking_b: '3_-_speaking_b',
  happy: '4_-_happy',
  excited: '5_-_excited',
  thinking: '6_-_thinking',
  confused: '7_-_confused',
  shocked: '8_-_shocked',
  sad: '9_-_sad',
  angry_annoyed: '10_-_angry:annoyed',
  wink: '11_-_wink',
  love: '12_-_love',
  sleepy: '13_-_sleepy',
  mischievous: '14_-_mischevious',
  proud: '15_-_proud',
  mouth_closed: '16_-_mouth_closed',
  mouth_o_shape: '17_-_mouth_o_shape',
  mouth_wide_open: '18_-_mouth_wide_open',
  mouth_teeth_showing: '19_-_mouth_teeth_showing',
  blep: '20_-_blep',
};

/**
 * Per-character overrides for expressions with typos in Cloudinary filenames
 */
export const CHARACTER_OVERRIDES: Record<AgentName, Partial<Record<Expression, string>>> = {
  Leopoldo: {
    mouth_o_shape: '17_-_mount_o_shape', // typo in original filename
  },
  Francisca: {},
  Antônia: {
    mouth_wide_open: '18_-_mount_wide_open', // typo in original filename
  },
};

/**
 * Cloudinary folder paths for each agent
 */
export const AGENT_FOLDERS: Record<AgentName, string> = {
  Leopoldo: 'blackout-merchandise/avatars/leopoldo',
  Francisca: 'blackout-merchandise/avatars/francisca',
  Antônia: 'blackout-merchandise/avatars/antonia',
};

/**
 * All available expressions
 */
export const ALL_EXPRESSIONS: Expression[] = Object.keys(EXPRESSION_MAP) as Expression[];

/**
 * Expressions to use for idle animation
 */
export const IDLE_EXPRESSIONS: Expression[] = ['neutral', 'thinking', 'mouth_closed', 'sleepy'];

/**
 * Expressions to use for speaking animation
 */
export const SPEAKING_EXPRESSIONS: Expression[] = ['speaking_a', 'speaking_b'];

/**
 * Sentiment keyword mappings
 */
export const SENTIMENT_KEYWORDS: Record<Expression, string[]> = {
  happy: ['great', 'awesome', 'perfect', 'excellent', 'wonderful', 'amazing'],
  excited: ['love', 'excited', 'fantastic', 'brilliant', 'incredible'],
  thinking: ['let me think', 'considering', 'thinking', 'reviewing'],
  confused: ['confused', 'not sure', 'what', 'how', 'why'],
  shocked: ['wow', 'surprised', 'shocked', 'unbelievable'],
  sad: ['sad', 'unfortunately', 'sorry', 'disappointed'],
  angry_annoyed: ['angry', 'frustrated', 'annoyed', 'upset'],
  wink: ['joke', 'funny', 'haha', 'lol'],
  love: ['thank', 'appreciate', 'love', 'thanks'],
  proud: ['done', 'completed', 'finished', 'success'],
  // Neutral and others have empty arrays (no specific keywords)
  neutral: [],
  speaking_a: [],
  speaking_b: [],
  mouth_closed: [],
  mouth_o_shape: [],
  mouth_wide_open: [],
  mouth_teeth_showing: [],
  blep: [],
  sleepy: [],
  mischievous: [],
};
