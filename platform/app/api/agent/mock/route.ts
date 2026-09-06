import type { AgentEvent, AgentRequest } from '@/lib/agent/protocol';
import type { Card } from '@/lib/ui-cards/schemas';
import { sseResponse, streamText, wait } from './_sse';
import { getOrCreateConversation, newId, type ConversationState } from './_store';
import {
  blankCard,
  blankGridCard,
  bulkOrderState,
  catalogueChips,
  inboxCard,
  menuCard,
  noticeCard,
  productProjectState,
  storeCard,
} from './_fixtures';

const turnIntros = [
  'Let’s get your shop named and connected to Stripe so you can start selling.',
  'Here are a few blanks to start with.',
  'Here’s the Heavyweight Tee in detail.',
  'Here’s your inbox.',
  'Here’s everything I can help with.',
  'This publishes your shop live — fans will be able to buy right away.',
  'Here’s a quick bulk order draft, and a heads up on its status.',
];

async function* runTurn(conversation: ConversationState, messageId: string, turn: number): AsyncGenerator<AgentEvent> {
  yield { type: 'message_start', messageId, conversationId: conversation.id };

  const intro = turnIntros[turn];
  yield* streamText(intro);

  const cardsForMessage: Card[] = [];
  let stopReason = 'end_turn';

  if (turn === 0) {
    const toolCallId = newId('call');
    yield { type: 'tool_start', toolCallId, name: 'get_store_status', label: 'Checking your shop…' };
    await wait(360);
    const card = storeCard(false, false);
    cardsForMessage.push(card);
    conversation.chips = [
      { label: 'Name my shop', prompt: 'Name my shop', primary: true },
      { label: 'Set up Stripe', prompt: 'Set up Stripe' },
    ];
    conversation.project = { kind: 'onboarding', state: { items: onboardingItemsSnapshot() } };
    yield {
      type: 'tool_end',
      toolCallId,
      name: 'get_store_status',
      ok: true,
      ui: { cards: [card], next: conversation.chips, project: conversation.project },
    };
  } else if (turn === 1) {
    const toolCallId = newId('call');
    yield { type: 'tool_start', toolCallId, name: 'search_blanks', label: 'Searching blanks…' };
    await wait(420);
    const card = blankGridCard();
    cardsForMessage.push(card);
    conversation.chips = [{ label: 'Show me BL-104', prompt: 'Show me BL-104' }];
    yield { type: 'tool_end', toolCallId, name: 'search_blanks', ok: true, ui: { cards: [card], next: conversation.chips } };
  } else if (turn === 2) {
    const toolCallId = newId('call');
    yield { type: 'tool_start', toolCallId, name: 'get_blank', label: 'Loading blank…' };
    await wait(360);
    const card = blankCard();
    cardsForMessage.push(card);
    conversation.chips = [
      { label: 'Price it', prompt: 'Price it', primary: true },
      { label: 'Choose colours', prompt: 'Choose colours' },
    ];
    conversation.project = { kind: 'product', state: productProjectState() };
    yield {
      type: 'tool_end',
      toolCallId,
      name: 'get_blank',
      ok: true,
      ui: { cards: [card], next: conversation.chips, project: conversation.project },
    };
  } else if (turn === 3) {
    const card = inboxCard();
    cardsForMessage.push(card);
    conversation.chips = [
      { label: 'Reply to support', prompt: 'Reply to support' },
      { label: 'Mark all read', prompt: 'Mark all read' },
    ];
    yield { type: 'cards', cards: [card] };
    yield { type: 'chips', chips: conversation.chips };
  } else if (turn === 4) {
    const card = menuCard();
    cardsForMessage.push(card);
    conversation.chips = catalogueChips;
    yield { type: 'cards', cards: [card] };
    yield { type: 'chips', chips: conversation.chips };
  } else if (turn === 5) {
    const toolCallId = newId('call');
    yield { type: 'tool_start', toolCallId, name: 'publish_store', label: 'Preparing to publish…' };
    await wait(320);
    conversation.pendingConfirms.set(toolCallId, 'publish_store');
    const confirmCard: Card = {
      id: newId('card-confirm'),
      kind: 'confirm',
      toolCallId,
      toolName: 'publish_store',
      summary: 'Publish your shop and make it live for fans?',
      details: [
        { label: 'Shop', value: 'your-shop.merchfrom.com' },
        { label: 'Live products', value: '1' },
        { label: 'Stripe', value: 'Not connected yet' },
      ],
    };
    cardsForMessage.push(confirmCard);
    stopReason = 'confirm_required';
    yield { type: 'confirm_required', toolCallId, name: 'publish_store', card: confirmCard as Extract<Card, { kind: 'confirm' }> };
  } else {
    const toolCallId = newId('call');
    yield { type: 'tool_start', toolCallId, name: 'draft_bulk_order', label: 'Drafting bulk order…' };
    await wait(360);
    const card = noticeCard('info', 'Bulk order checkout is still in preview — totals may change before you confirm.');
    cardsForMessage.push(card);
    conversation.chips = [
      { label: 'Add another line', prompt: 'Add another line to my bulk order' },
      { label: 'Checkout', prompt: 'Checkout my bulk order' },
    ];
    conversation.project = { kind: 'bulk_order', state: bulkOrderState() };
    yield {
      type: 'tool_end',
      toolCallId,
      name: 'draft_bulk_order',
      ok: true,
      ui: { cards: [card], next: conversation.chips, project: conversation.project },
    };
  }

  conversation.messages.push({ id: messageId, role: 'assistant', text: intro, cards: cardsForMessage });
  yield { type: 'message_end', messageId, stopReason };
}

function onboardingItemsSnapshot() {
  return [
    { key: 'profile', label: 'Add your name and photo', done: false, prompt: 'Set up my profile' },
    { key: 'store', label: 'Name your shop', done: false, prompt: 'Name my shop' },
    { key: 'blank', label: 'Pick your first blank', done: false, prompt: 'Show me blanks' },
    { key: 'stripe', label: 'Connect Stripe payouts', done: false, prompt: 'Set up Stripe' },
  ];
}

export async function POST(request: Request): Promise<Response> {
  let body: AgentRequest;
  try {
    body = (await request.json()) as AgentRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const conversation = getOrCreateConversation(body.conversationId);
  conversation.messages.push({ id: newId('user'), role: 'user', text: body.text });

  const messageId = newId('assistant');
  const turn = conversation.turn % turnIntros.length;
  conversation.turn += 1;

  return sseResponse(runTurn(conversation, messageId, turn));
}
