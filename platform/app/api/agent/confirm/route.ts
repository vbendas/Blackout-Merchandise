import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import type { ConfirmConflict, ConfirmRequest } from '@/lib/agent/protocol';
import { createAgentSseStream, SSE_HEADERS } from '@/lib/agent/sse';
import { resumeAgentTurn, type BaseAgentContext } from '@/lib/agent/loop';
import { getConversation } from '@/lib/services/conversations';
import { confirmOutcomeOf, findByIdempotencyKey } from '@/lib/services/tools-audit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Suspended staff never get past requireUser; the actor carries an
  // employee's access as of this request, for the tools they're offered.
  const { user, store, role, actor } = await requireUser();

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

  // A step decided already (another tab, a click before a reload) answers
  // with what became of it, so the card can show that instead of buttons.
  const invocation = await findByIdempotencyKey(body.toolCallId);
  if (!invocation || invocation.conversationId !== conversation.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const outcome = confirmOutcomeOf(invocation);
  if (outcome) {
    return NextResponse.json({ error: 'not_pending', outcome } satisfies ConfirmConflict, { status: 409 });
  }

  const base: BaseAgentContext = {
    userId: user.id,
    clerkId: user.clerkId,
    role,
    storeId: store?.id ?? null,
    conversationId: conversation.id,
    locale: user.locale ?? 'en',
    permissions: actor.permissions ?? null,
    suspended: actor.suspended ?? false,
  };

  const stream = createAgentSseStream((emit, signal) =>
    resumeAgentTurn({ base, toolCallId: body.toolCallId, approve: body.approve, emit, signal }),
  );

  return new Response(stream, { headers: SSE_HEADERS });
}
