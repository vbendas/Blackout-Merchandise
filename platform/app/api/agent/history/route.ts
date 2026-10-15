import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import {
  getConversation,
  getOrCreateConversation,
  getProjectCard,
  latestConversationWithMessages,
  loadHistoryPage,
  startFreshConversation,
} from '@/lib/services/conversations';
import { confirmOutcomeOf, findByIdempotencyKeys } from '@/lib/services/tools-audit';
import type { HistoryMessage, HistoryPage, HistoryResponse } from '@/lib/agent/protocol';
import { openOnArtist, transcriptOf } from '@/lib/agent/history';
import { checklistFor, greetingFor, guidanceStateFor, loadGuidanceCounts, projectPillFor, quickActionsFor } from '@/lib/agent/guidance';
import { withFreshApproval } from '@/lib/tools/print';

export const runtime = 'nodejs';

/** Messages per page. A page opens on a message from the artist, so it can
 * show a few less. */
const PAGE_SIZE = 40;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Confirm cards come back with what became of their step, from the stored
 * call: buttons only while it still waits for the artist. */
async function withConfirmOutcomes(messages: HistoryMessage[]): Promise<HistoryMessage[]> {
  const toolCallIds = messages.flatMap((message) =>
    (message.cards ?? []).flatMap((card) => (card.kind === 'confirm' ? [card.toolCallId] : [])),
  );
  if (toolCallIds.length === 0) return messages;
  const invocations = await findByIdempotencyKeys(toolCallIds);
  const outcomes = new Map(invocations.map((invocation) => [invocation.idempotencyKey, confirmOutcomeOf(invocation)]));
  return messages.map((message) =>
    message.cards
      ? {
          ...message,
          cards: message.cards.map((card) => {
            if (card.kind !== 'confirm') return card;
            const outcome = outcomes.get(card.toolCallId);
            return outcome ? { ...card, outcome } : card;
          }),
        }
      : message,
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireUser();
  const { user } = session;
  const conversationId = req.nextUrl.searchParams.get('conversationId');
  const validId = conversationId && UUID.test(conversationId) ? conversationId : null;

  // ?before=<message id>: the page of messages before that one.
  const before = req.nextUrl.searchParams.get('before');
  if (before !== null) {
    if (!validId || !UUID.test(before)) return NextResponse.json({ error: 'invalid_cursor' }, { status: 400 });
    const conversation = await getConversation(validId);
    if (!conversation || conversation.userId !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const page = openOnArtist(await loadHistoryPage(conversation.id, { limit: PAGE_SIZE, beforeId: before }));
    const { messages } = transcriptOf(page.rows);
    return NextResponse.json({
      conversationId: conversation.id,
      messages: await withConfirmOutcomes(messages),
      earlierCursor: page.earlierCursor,
    } satisfies HistoryPage);
  }

  // ?fresh=1: the Studio opens on its home screen, so start a blank session
  // and point back at the previous one instead of reopening it.
  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  const existing = !fresh && validId ? await getConversation(validId) : null;
  const owned = existing && existing.userId === user.id;
  const conversation = fresh
    ? await startFreshConversation(user.id, user.role)
    : owned
      ? existing!
      : await getOrCreateConversation(user.id, user.role);

  const [stored, projectCard] = await Promise.all([
    loadHistoryPage(conversation.id, { limit: PAGE_SIZE }),
    getProjectCard(conversation.id),
  ]);
  const page = openOnArtist(stored);
  const transcript = transcriptOf(page.rows);
  const messages = await withConfirmOutcomes(transcript.messages);

  const counts = await loadGuidanceCounts(session);
  const state = guidanceStateFor(session, counts);
  const [greeting, checklist, projectPill, previous] = await Promise.all([
    greetingFor(session, state, counts),
    checklistFor(session),
    projectPillFor(conversation.id),
    fresh ? latestConversationWithMessages(user.id, conversation.id) : Promise.resolve(null),
  ]);
  const previousPill = previous ? await projectPillFor(previous.id) : null;
  // A product's panel says where its artwork stands: read again, as it may have been approved on its own page since.
  const projectState = projectCard
    ? await withFreshApproval(session.store?.id ?? null, conversation.id, {
        kind: projectCard.kind,
        refId: projectCard.refId ?? null,
        state: (projectCard.state ?? {}) as Record<string, unknown>,
      }).catch(() => (projectCard.state ?? {}) as Record<string, unknown>)
    : null;
  const resume = previous
    ? {
        conversationId: previous.id,
        label: previousPill?.label ?? previous.title ?? 'Last conversation',
        status: previousPill?.status,
      }
    : null;

  return NextResponse.json({
    conversationId: conversation.id,
    messages,
    earlierCursor: page.earlierCursor,
    chips: transcript.chips,
    project: projectCard && projectState ? { kind: projectCard.kind, refId: projectCard.refId ?? undefined, state: projectState } : null,
    greeting,
    quickActions: quickActionsFor(state, session.actor),
    checklist,
    projectPill,
    resume,
  } satisfies HistoryResponse);
}
