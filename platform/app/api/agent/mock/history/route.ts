import { getOrCreateConversation } from '../_store';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversationId');
  const fresh = url.searchParams.get('fresh') === '1';
  const conversation = getOrCreateConversation(fresh ? null : conversationId);

  return Response.json({
    conversationId: conversation.id,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text,
      cards: message.cards,
    })),
    chips: conversation.chips,
    project: conversation.project,
  });
}
