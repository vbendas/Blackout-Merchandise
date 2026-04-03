import type { AgentName, Expression } from '@/types/expressions';
import { SENTIMENT_KEYWORDS } from './constants';

/**
 * Agent personality weights - preferred expressions for each agent
 */
const AGENT_EXPRESSION_WEIGHTS: Record<AgentName, Record<Expression, number>> = {
  Leopoldo: {
    neutral: 0.5,
    happy: 0.2,
    proud: 0.3,
    thinking: 0.4,
    excited: 0.1,
    confused: 0.2,
    shocked: 0.1,
    sad: 0.0,
    angry_annoyed: 0.0,
    wink: 0.15,
    love: 0.0,
    sleepy: 0.0,
    mischievous: 0.05,
    mouth_closed: 0.1,
    mouth_o_shape: 0.05,
    mouth_wide_open: 0.0,
    mouth_teeth_showing: 0.1,
    blep: 0.0,
    speaking_a: 0.0,
    speaking_b: 0.0,
  },
  Francisca: {
    neutral: 0.4,
    happy: 0.3,
    proud: 0.2,
    excited: 0.4,
    thinking: 0.3,
    confused: 0.15,
    shocked: 0.15,
    sad: 0.05,
    angry_annoyed: 0.0,
    wink: 0.2,
    love: 0.3,
    sleepy: 0.05,
    mischievous: 0.15,
    mouth_closed: 0.1,
    mouth_o_shape: 0.1,
    mouth_wide_open: 0.1,
    mouth_teeth_showing: 0.15,
    blep: 0.1,
    speaking_a: 0.0,
    speaking_b: 0.0,
  },
  Antônia: {
    neutral: 0.5,
    happy: 0.35,
    proud: 0.15,
    thinking: 0.35,
    excited: 0.2,
    confused: 0.2,
    shocked: 0.1,
    sad: 0.1,
    angry_annoyed: 0.05,
    wink: 0.1,
    love: 0.1,
    sleepy: 0.0,
    mischievous: 0.05,
    mouth_closed: 0.15,
    mouth_o_shape: 0.05,
    mouth_wide_open: 0.05,
    mouth_teeth_showing: 0.1,
    blep: 0.0,
    speaking_a: 0.0,
    speaking_b: 0.0,
  },
};

/**
 * Topic-based expression mapping
 */
const TOPIC_EXPRESSIONS: Record<string, Expression> = {
  design: 'excited',
  product: 'proud',
  catalog: 'excited',
  browse: 'happy',
  create: 'excited',
  help: 'thinking',
  issue: 'confused',
  problem: 'thinking',
  error: 'confused',
  great: 'happy',
  perfect: 'love',
  awesome: 'happy',
  beautiful: 'love',
  amazing: 'excited',
  order: 'happy',
  confirm: 'proud',
  ready: 'excited',
  complete: 'proud',
  thanks: 'love',
  thank: 'love',
  appreciate: 'love',
  sorry: 'sad',
  apologize: 'sad',
  wrong: 'confused',
  mistake: 'confused',
  oops: 'blep',
  funny: 'mischievous',
  fun: 'mischievous',
  joke: 'mischievous',
  laugh: 'mischievous',
};

/**
 * Analyze text for sentiment keywords and return appropriate expression
 * @param text - Text to analyze
 * @returns Expression based on detected sentiment
 */
export function detectSentiment(text: string): Expression | null {
  const lowerText = text.toLowerCase();

  // Check topic-based expressions first (more specific)
  for (const [topic, expression] of Object.entries(TOPIC_EXPRESSIONS)) {
    if (lowerText.includes(topic)) {
      return expression;
    }
  }

  // Check sentiment keywords
  for (const [expression, keywords] of Object.entries(SENTIMENT_KEYWORDS)) {
    if (keywords.length === 0) continue;

    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return expression as Expression;
      }
    }
  }

  return null;
}

/**
 * Get expression based on quick prompt category
 * @param promptText - The quick prompt text
 * @returns Expression suggestion
 */
export function getExpressionForPrompt(promptText: string): Expression {
  const lowerText = promptText.toLowerCase();

  if (lowerText.includes('catalog') || lowerText.includes('browse') || lowerText.includes('products')) {
    return 'excited';
  }

  if (lowerText.includes('quote') || lowerText.includes('bulk') || lowerText.includes('order')) {
    return 'thinking';
  }

  if (lowerText.includes('eshop') || lowerText.includes('store') || lowerText.includes('setup')) {
    return 'happy';
  }

  if (lowerText.includes('review') || lowerText.includes('design')) {
    return 'thinking';
  }

  return 'neutral';
}

/**
 * Get conversation stage based on message count
 * @param messageCount - Number of messages in conversation
 * @returns Stage: 'greeting', 'discussion', or 'conclusion'
 */
export function getConversationStage(messageCount: number): 'greeting' | 'discussion' | 'conclusion' {
  if (messageCount <= 2) return 'greeting';
  if (messageCount >= 6) return 'conclusion';
  return 'discussion';
}

/**
 * Get an expression different from the previous one
 * @param previousExpression - The expression used in the last message
 * @param candidateExpression - The primary suggested expression
 * @param agent - The agent name
 * @returns Expression that differs from the previous one when possible
 */
export function getUniqueExpression(
  previousExpression: Expression,
  candidateExpression: Expression,
  agent: AgentName
): Expression {
  // If candidate differs from previous, use it
  if (candidateExpression !== previousExpression) {
    return candidateExpression;
  }

  // Otherwise, pick a different expression weighted by agent personality
  const weights = AGENT_EXPRESSION_WEIGHTS[agent];
  const expressionList = (Object.keys(weights) as Expression[])
    .filter((expr) => expr !== previousExpression && weights[expr] > 0)
    .sort((a, b) => weights[b] - weights[a]);

  // Pick from top 3 weighted expressions to maintain personality
  return expressionList[0] || 'neutral';
}

/**
 * Get expression based on message content, conversation stage, and agent
 * @param content - Message content
 * @param messages - All messages in conversation
 * @param agent - Agent name
 * @returns Expression suggestion
 */
export function getExpressionForMessage(content: string, messages: any[], agent: AgentName): Expression {
  // 1. Check conversation stage
  const stage = getConversationStage(messages.length);

  // 2. Analyze content sentiment and topic
  const sentiment = detectSentiment(content);

  // 3. Get candidate expression based on stage
  let candidateExpression: Expression;

  if (stage === 'greeting') {
    candidateExpression = 'happy';
  } else if (stage === 'conclusion') {
    candidateExpression = 'proud';
  } else {
    candidateExpression = sentiment || 'neutral';
  }

  // 4. Avoid repeating the same expression
  const previousAssistantMessage = messages.findLast((msg) => msg.role === 'assistant' && msg.agent === agent);
  const previousExpression = previousAssistantMessage?.expression || null;

  if (previousExpression) {
    return getUniqueExpression(previousExpression, candidateExpression, agent);
  }

  return candidateExpression;
}
