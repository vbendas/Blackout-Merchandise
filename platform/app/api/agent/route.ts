import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import type { AgentRequest } from '@/lib/agent/protocol';
import { createAgentSseStream, SSE_HEADERS } from '@/lib/agent/sse';
import { startAgentTurn, type BaseAgentContext } from '@/lib/agent/loop';
import { checkRateLimit } from '@/lib/agent/rate-limit';
import { getConversation, getOrCreateConversation } from '@/lib/services/conversations';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { user, store, role } = await requireUser();

  const rate = checkRateLimit(user.id);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'retry-after': Math.ceil(rate.retryAfterMs / 1000).toString() } },
    );
  }

  let body: AgentRequest;
  try {
    body = (await req.json()) as AgentRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (typeof body.text !== 'string' || body.text.trim().length === 0) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const existing = body.conversationId ? await getConversation(body.conversationId) : null;
  const owned = existing && existing.userId === user.id;
  const conversation = owned ? existing! : await getOrCreateConversation(user.id, role);

  const base: BaseAgentContext = {
    userId: user.id,
    clerkId: user.clerkId,
    role,
    storeId: store?.id ?? null,
    conversationId: conversation.id,
    locale: user.locale ?? 'en',
  };

  const stream = createAgentSseStream((emit) =>
    startAgentTurn({ base, userText: body.text, attachments: body.attachments, emit }),
  );

  return new Response(stream, { headers: SSE_HEADERS });
}
