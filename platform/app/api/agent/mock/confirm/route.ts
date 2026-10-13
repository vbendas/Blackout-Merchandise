import type { AgentEvent, ConfirmRequest } from '@/lib/agent/protocol';
import type { Card } from '@/lib/ui-cards/schemas';
import { sseResponse, streamText, wait } from '../_sse';
import { getConversation, newId, type ConversationState } from '../_store';
import { catalogueChips, noticeCard, storeCard } from '../_fixtures';

function onboardingDone() {
  return [
    { key: 'profile', label: 'Add your name and photo', done: true },
    { key: 'store', label: 'Name your shop', done: true },
    { key: 'blank', label: 'Pick your first blank', done: true },
    { key: 'stripe', label: 'Set up payouts', done: true },
  ];
}

async function* runConfirm(
  conversation: ConversationState,
  messageId: string,
  toolCallId: string,
  toolName: string,
  approve: boolean,
): AsyncGenerator<AgentEvent> {
  yield { type: 'message_start', messageId, conversationId: conversation.id };

  const text = approve ? 'Publishing your shop now.' : 'No problem — I’ve cancelled that.';
  yield* streamText(text);
  await wait(280);

  const card: Card = approve ? storeCard(true, true) : noticeCard('warning', 'Publish cancelled. Your shop stays as a draft.');
  conversation.chips = catalogueChips;
  const project = approve ? { kind: 'onboarding' as const, state: { items: onboardingDone() } } : conversation.project;
  conversation.project = project;

  yield {
    type: 'tool_end',
    toolCallId,
    name: toolName,
    ok: true,
    ui: { cards: [card], next: conversation.chips, project: project ?? undefined },
  };

  conversation.messages.push({ id: messageId, role: 'assistant', text, cards: [card] });
  yield { type: 'message_end', messageId, stopReason: 'end_turn' };
}

export async function POST(request: Request): Promise<Response> {
  let body: ConfirmRequest;
  try {
    body = (await request.json()) as ConfirmRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const conversation = getConversation(body.conversationId);
  if (!conversation) {
    return new Response(JSON.stringify({ error: 'Unknown conversation' }), { status: 404 });
  }

  const toolName = conversation.pendingConfirms.get(body.toolCallId) ?? 'publish_store';
  conversation.pendingConfirms.delete(body.toolCallId);

  const messageId = newId('assistant');
  return sseResponse(runConfirm(conversation, messageId, body.toolCallId, toolName, body.approve));
}
