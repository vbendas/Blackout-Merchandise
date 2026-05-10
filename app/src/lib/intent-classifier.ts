/**
 * Intent Classification Module
 *
 * Uses Mistral Small 4 (via OpenRouter) to classify user messages into intent categories
 * and route them to the appropriate Cat-Suite agent.
 */

import type { AgentId } from '@/types/chat';
import { sanitizePromptInput } from '@/lib/sanitize/prompt-sanitize';

// ─── Intent Categories ───────────────────────────────────────────────────────

export type IntentCategory = 'onboarding' | 'design' | 'order_tracking' | 'general' | 'billing';

export interface IntentClassification {
  intent: IntentCategory;
  confidence: number; // 0.0 – 1.0
  agent: AgentId;
  reason: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  suggestedOptions?: string[];
}

export interface ClassifyOptions {
  message: string;
  currentAgent?: AgentId;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
    agent?: AgentId;
  }>;
  timeoutMs?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.7;
const CLASSIFY_TIMEOUT_MS = 1200;

const INTENT_TO_AGENT: Record<IntentCategory, AgentId | 'context'> = {
  onboarding: 'leopoldo',
  design: 'francisca',
  order_tracking: 'antonia',
  billing: 'leopoldo',
  general: 'context', // routed by current context / agent
};

const INTENT_DESCRIPTIONS: Record<IntentCategory, string> = {
  onboarding:
    'Account setup, getting started, platform walkthrough, waitlist, store creation, artist onboarding, signup, registration, first steps',
  design:
    'Artwork creation, product design, mockups, catalog browsing, print quality, visual identity, t-shirt design, graphics, creative direction',
  order_tracking:
    'Order status, shipping, delivery, tracking number, returns, refunds, production timeline, support tickets',
  billing:
    'Pricing, payment, invoices, payouts, subscriptions, profit margins, costs, fees, quotes, bulk orders',
  general:
    'Greetings, small talk, platform overview, unclear requests, multiple topics, asking what agents can do, vague questions',
};

const SYSTEM_PROMPT = `You are an intent classification system for MerchFrom, an AI-powered merchandise platform.

Classify the user's message into exactly ONE of these intent categories:
- onboarding: ${INTENT_DESCRIPTIONS.onboarding}
- design: ${INTENT_DESCRIPTIONS.design}
- order_tracking: ${INTENT_DESCRIPTIONS.order_tracking}
- billing: ${INTENT_DESCRIPTIONS.billing}
- general: ${INTENT_DESCRIPTIONS.general}

Rules:
1. If the message mentions multiple distinct intents, pick the most prominent one OR return "general" if equally mixed.
2. If the message is ambiguous or off-topic, return "general" with low confidence.
3. Confidence must be honest: 0.95 for very clear intent, 0.5 for ambiguous, 0.2 for completely unclear.
4. Provide a brief 1-sentence reason.

Respond with valid JSON only. No markdown, no explanations outside JSON.
Format:
{
  "intent": "onboarding" | "design" | "order_tracking" | "billing" | "general",
  "confidence": number,
  "reason": "string"
}`;

// ─── Keyword Fallback ────────────────────────────────────────────────────────

const KEYWORD_PATTERNS: Record<IntentCategory, RegExp[]> = {
  onboarding: [
    /\b(sign\s*up|register|onboard|get\s*started|begin|new\s*user|first\s*time|waitlist|join|account\s*setup|create\s*store|how\s+do\s+i\s+start)\b/i,
  ],
  design: [
    /\b(design|artwork|mockup|catalog|product|t-shirt|hoodie|print|graphic|visual|create\s+image|generate\s+design|art\s+direction)\b/i,
  ],
  order_tracking: [
    /\b(track|order\s*status|shipping|delivery|where\s+is\s+my|when\s+will|return|refund|support\s*ticket|problem\s+with\s+order)\b/i,
  ],
  billing: [
    /\b(pric\w*|cost|payment|invoice|payout|subscription|fee|quote|bulk\s*order|how\s+much|profit|margin|billing)\b/i,
  ],
  general: [
    /\b(hello|hi|hey|what\s+can\s+you\s+do|who\s+are\s+you|help|thanks|thank\s+you|ok|okay)\b/i,
  ],
};

function classifyByKeywords(
  message: string,
  currentAgent?: AgentId
): IntentClassification | null {
  const scores: Partial<Record<IntentCategory, number>> = {};

  for (const [intent, patterns] of Object.entries(KEYWORD_PATTERNS) as [IntentCategory, RegExp[]][]) {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (pattern.test(message)) matchCount++;
    }
    if (matchCount > 0) {
      scores[intent] = matchCount;
    }
  }

  const entries = Object.entries(scores) as [IntentCategory, number][];
  if (entries.length === 0) return null;

  // If multiple intents match, prefer the one with more keyword hits
  entries.sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = entries[0];
  const secondScore = entries[1]?.[1] ?? 0;

  // If close race, confidence is lower
  const confidence = topScore === secondScore ? 0.55 : Math.min(0.85, 0.5 + topScore * 0.15);

  return buildClassification(topIntent, confidence, 'keyword-fallback', currentAgent);
}

// ─── LLM Classification ──────────────────────────────────────────────────────

interface RawLLMResponse {
  intent?: string;
  confidence?: number;
  reason?: string;
}

async function classifyWithLLM(options: ClassifyOptions): Promise<IntentClassification> {
  // Lazy import to avoid circular dependency issues during build
  const { env } = require('@/lib/env');
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const historyContext = options.history
    ?.slice(-3)
    .map((m) => `${m.role === 'user' ? 'User' : m.agent ?? 'Agent'}: ${m.content}`)
    .join('\n') ?? '';

  // Sanitize user input to prevent prompt injection
  const safeMessage = sanitizePromptInput(options.message);

  const userPrompt = `CONVERSATION HISTORY:
${historyContext || '(No history)'}

CURRENT AGENT: ${options.currentAgent ?? 'none'}
USER MESSAGE: "${safeMessage}"`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? CLASSIFY_TIMEOUT_MS);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://merchfrom.com',
        'X-Title': 'Merch From Intent Classifier',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-small-2501',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content ?? '';
    return parseLLMResponse(content, options);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[IntentClassifier] LLM timeout, falling back to keywords');
    } else {
      console.error('[IntentClassifier] LLM error:', error);
    }

    // Fallback to keyword classification
    const fallback = classifyByKeywords(options.message, options.currentAgent);
    if (fallback) return fallback;

    // Ultimate fallback: general with low confidence
    return buildClassification('general', 0.3, 'llm-failed-no-keywords', options.currentAgent);
  }
}

function parseLLMResponse(content: string, options: ClassifyOptions): IntentClassification {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as RawLLMResponse;
    const rawIntent = parsed.intent ?? 'general';
    const rawConfidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;

    // Normalize confidence to 0–1 range (handle both 0–1 and 0–100 inputs)
    const normalizedConfidence = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;

    const intent = isValidIntent(rawIntent) ? rawIntent : 'general';
    const reason = parsed.reason ?? 'No reason provided';

    return buildClassification(intent, normalizedConfidence, reason, options.currentAgent);
  } catch (error) {
    console.error('[IntentClassifier] Parse error:', error, 'Content:', content);

    const fallback = classifyByKeywords(options.message, options.currentAgent);
    if (fallback) return fallback;

    return buildClassification('general', 0.25, 'parse-error', options.currentAgent);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidIntent(value: string): value is IntentCategory {
  return ['onboarding', 'design', 'order_tracking', 'general', 'billing'].includes(value);
}

function buildClassification(
  intent: IntentCategory,
  confidence: number,
  reason: string,
  currentAgent?: AgentId
): IntentClassification {
  const clampedConfidence = Math.max(0, Math.min(1, confidence));
  const needsClarification = clampedConfidence < CONFIDENCE_THRESHOLD;

  let agent: AgentId;
  const mapped = INTENT_TO_AGENT[intent];
  if (mapped === 'context') {
    agent = currentAgent ?? 'leopoldo';
  } else {
    agent = mapped;
  }

  let clarificationQuestion: string | undefined;
  let suggestedOptions: string[] | undefined;

  if (needsClarification) {
    clarificationQuestion =
      "I'm not quite sure what you need help with. Could you clarify?";
    suggestedOptions = [
      'Set up my store',
      'Design a product',
      'Track my order',
      'Pricing question',
    ];
  }

  return {
    intent,
    confidence: clampedConfidence,
    agent,
    reason,
    needsClarification,
    clarificationQuestion,
    suggestedOptions,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function classifyIntent(options: ClassifyOptions): Promise<IntentClassification> {
  // Try LLM first
  try {
    const result = await classifyWithLLM(options);
    logClassification(options.message, result);
    return result;
  } catch (error) {
    console.error('[IntentClassifier] Unexpected error:', error);

    // Fallback chain
    const fallback = classifyByKeywords(options.message, options.currentAgent);
    if (fallback) return fallback;

    return buildClassification('general', 0.2, 'classifier-error', options.currentAgent);
  }
}

export function classifyIntentSync(message: string, currentAgent?: AgentId): IntentClassification {
  const fallback = classifyByKeywords(message, currentAgent);
  if (fallback) {
    logClassification(message, fallback);
    return fallback;
  }

  const result = buildClassification('general', 0.3, 'no-keyword-match', currentAgent);
  logClassification(message, result);
  return result;
}

function logClassification(message: string, result: IntentClassification): void {
  console.log('[IntentClassifier]', {
    timestamp: new Date().toISOString(),
    messagePreview: message.slice(0, 60),
    intent: result.intent,
    agent: result.agent,
    confidence: result.confidence,
    needsClarification: result.needsClarification,
  });
}

// ─── Re-exports for convenience ──────────────────────────────────────────────

export { CONFIDENCE_THRESHOLD };
