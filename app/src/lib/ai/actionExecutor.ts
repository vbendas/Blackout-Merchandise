/**
 * Smart Action Executor
 * Executes quick actions with chat integration
 * Minimizes LLM calls while maintaining conversational flow
 */

import type { PrintArea } from '@/lib/StudioContext';
import {
  type ActionContext,
  buildAssistantResponse,
  buildUserMessage,
  getQuickActionResponse,
  shouldUseLLM,
} from './quickActionResponses';

export interface ExecutorContext {
  activePrintArea: PrintArea;
  selectedDesign?: {
    id: string;
    name: string;
  } | null;
  availablePrintAreas: PrintArea[];
  currentPrice?: number | null;
  productName?: string;
  designCount?: number;
}

export interface MessageHandlers {
  addUserMessage: (content: string, source?: 'typed' | 'quick-action') => void;
  addAssistantMessage: (content: string, expression?: string, source?: string) => void;
  setExpression: (expression: string) => void;
}

/**
 * Execute a quick action with full chat integration
 * This is the main entry point for all quick action executions
 */
export async function executeQuickAction(
  actionId: string,
  actionHandler: () => void | Promise<void>,
  context: ExecutorContext,
  handlers: MessageHandlers,
  options?: {
    skipUserMessage?: boolean;
    delayExecution?: number;
  }
): Promise<void> {
  const response = getQuickActionResponse(actionId);

  if (!response) {
    // No pre-configured response, just execute the action
    await actionHandler();
    return;
  }

  // Build action context
  const actionContext: ActionContext = {
    activePrintArea: context.activePrintArea,
    selectedDesign: context.selectedDesign,
    availablePrintAreas: context.availablePrintAreas,
    currentPrice: context.currentPrice,
    productName: context.productName,
    designCount: context.designCount,
  };

  // 1. Add user message to chat (unless skipped)
  if (!options?.skipUserMessage) {
    const userMessage = buildUserMessage(response.userMessage, actionContext);
    handlers.addUserMessage(userMessage, 'quick-action');
  }

  // 2. Execute the action immediately
  if (options?.delayExecution) {
    await new Promise((resolve) => setTimeout(resolve, options.delayExecution));
  }
  await actionHandler();

  // 3. Determine response method
  const useLLM = shouldUseLLM(actionId, actionContext);

  if (useLLM) {
    // TODO: Call LLM for context-aware response
    // For now, use pre-configured response
    const assistantResponse = buildAssistantResponse(response.assistantResponse, actionContext);
    handlers.addAssistantMessage(assistantResponse, response.expression || 'neutral', 'Francisca');

    // Add follow-up if exists
    if (response.followUpQuestion) {
      setTimeout(() => {
        const followUp =
          typeof response.followUpQuestion === 'function'
            ? response.followUpQuestion(actionContext)
            : response.followUpQuestion;
        handlers.addAssistantMessage(followUp!, response.expression || 'neutral', 'Francisca');
      }, response.followUpDelay || 600);
    }
  } else {
    // Use pre-configured response
    const assistantResponse = buildAssistantResponse(response.assistantResponse, actionContext);
    handlers.addAssistantMessage(assistantResponse, response.expression || 'neutral', 'Francisca');

    // Set avatar expression
    if (response.expression) {
      handlers.setExpression(response.expression);
    }

    // Add follow-up question if configured
    if (response.followUpQuestion) {
      setTimeout(() => {
        const followUp =
          typeof response.followUpQuestion === 'function'
            ? response.followUpQuestion(actionContext)
            : response.followUpQuestion;
        handlers.addAssistantMessage(followUp!, response.expression || 'neutral', 'Francisca');
      }, response.followUpDelay || 600);
    }
  }
}

/**
 * Batch execute multiple related actions
 * Useful for transformation sequences
 */
export async function executeActionSequence(
  actions: Array<{
    id: string;
    handler: () => void | Promise<void>;
  }>,
  context: ExecutorContext,
  handlers: MessageHandlers
): Promise<void> {
  for (const action of actions) {
    await executeQuickAction(action.id, action.handler, context, handlers);
    // Small delay between sequential actions
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * Execute transformation with chat feedback
 * Specialized for transformation actions
 */
export async function executeTransformation(
  transformationType: string,
  transformationHandler: () => void,
  context: ExecutorContext,
  handlers: MessageHandlers
): Promise<void> {
  await executeQuickAction(transformationType, transformationHandler, context, handlers);
}

/**
 * Check if an action has a pre-configured response
 */
export function hasQuickActionResponse(actionId: string): boolean {
  return !!getQuickActionResponse(actionId);
}

/**
 * Get estimated user message for an action
 * Useful for previewing what will be sent to chat
 */
export function getEstimatedUserMessage(actionId: string, context: ExecutorContext): string | null {
  const response = getQuickActionResponse(actionId);
  if (!response) return null;

  const actionContext: ActionContext = {
    activePrintArea: context.activePrintArea,
    selectedDesign: context.selectedDesign,
    availablePrintAreas: context.availablePrintAreas,
    currentPrice: context.currentPrice,
    productName: context.productName,
    designCount: context.designCount,
  };

  return buildUserMessage(response.userMessage, actionContext);
}
