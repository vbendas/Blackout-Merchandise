import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import type { ConfirmRequest } from '@/lib/agent/protocol';
import { createAgentSseStream, SSE_HEADERS } from '@/lib/agent/sse';
import { resumeAgentTurn, type BaseAgentContext } from '@/lib/agent/loop';
import { getConversation } from '@/lib/services/conversations';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { user, store, role } = await requireUser();

  let body: ConfirmRequest;
  try {
    body = (await req.json()) as ConfirmRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (!body.conversationId || !body.toolCallId || typeof body.approve !== 'boolean') {
    return NextResponse.json({ error: 'conversationId, toolCallId and approve are required' }, { status: 400 });
  }

  const conversation = await getConversation(body.conversationId);
  if (!conversation || conversation.userId !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const base: BaseAgentContext = {
    userId: user.id,
    clerkId: user.clerkId,
    role,
    storeId: store?.id ?? null,
    conversationId: conversation.id,
    locale: user.locale ?? 'en',
  };

  const stream = createAgentSseStream((emit) =>
    resumeAgentTurn({ base, toolCallId: body.toolCallId, approve: body.approve, emit }),
  );

  return new Response(stream, { headers: SSE_HEADERS });
}
