import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import type { AgentRequest } from '@/lib/agent/protocol';
import type { ChatPick } from '@/lib/agent/pick';
import { catalogPick, pickSchema } from '@/lib/agent/pick-server';
import { createAgentSseStream, SSE_HEADERS } from '@/lib/agent/sse';
import { startAgentTurn, type BaseAgentContext } from '@/lib/agent/loop';
import { checkRateLimit } from '@/lib/agent/rate-limit';
import { getConversation, getOrCreateConversation } from '@/lib/services/conversations';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Suspended staff never get past requireUser; the actor carries an
  // employee's access as of this request, for the tools they're offered.
  const { user, store, role, actor } = await requireUser();

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

  // A catalogue pick must have the shape in lib/agent/pick-server.ts (400 otherwise). Its codes and colours
  // are then checked against the catalogue; a pick with nothing valid left goes as plain text.
  let pick: ChatPick | undefined;
  if (body.pick !== undefined && body.pick !== null) {
    const parsed = pickSchema.safeParse(body.pick);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_pick' }, { status: 400 });
    pick = catalogPick(parsed.data);
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
    permissions: actor.permissions ?? null,
    suspended: actor.suspended ?? false,
  };

  const stream = createAgentSseStream((emit, signal) =>
    startAgentTurn({ base, userText: body.text, attachments: body.attachments, retry: body.retry === true, pick, emit, signal }),
  );

  return new Response(stream, { headers: SSE_HEADERS });
}
