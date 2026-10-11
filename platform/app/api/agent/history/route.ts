import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import {
  getConversation,
  getOrCreateConversation,
  getProjectCard,
  latestConversationWithMessages,
  loadHistory,
  startFreshConversation,
} from '@/lib/services/conversations';
import type { Card, Chip, ToolUi } from '@/lib/ui-cards/schemas';
import type { HistoryResponse } from '@/lib/agent/protocol';
import { checklistFor, greetingFor, guidanceStateFor, loadGuidanceCounts, projectPillFor, quickActionsFor } from '@/lib/agent/guidance';

export const runtime = 'nodejs';

interface HistoryMessageOut {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards?: Card[];
}

type LooseBlock = { type?: string; text?: string };

function extractText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  return (blocks as LooseBlock[])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('\n')
    .trim();
}

function hasToolUse(blocks: unknown): boolean {
  return Array.isArray(blocks) && (blocks as LooseBlock[]).some((b) => b.type === 'tool_use');
}

export async function GET(req: NextRequest): Promise<NextResponse<HistoryResponse>> {
  const session = await requireUser();
  const { user } = session;
  const conversationId = req.nextUrl.searchParams.get('conversationId');
  // ?fresh=1: the Studio opens on its home screen, so start a blank session
  // and point back at the previous one instead of reopening it.
  const fresh = req.nextUrl.searchParams.get('fresh') === '1';

  const existing = !fresh && conversationId ? await getConversation(conversationId) : null;
  const owned = existing && existing.userId === user.id;
  const conversation = fresh
    ? await startFreshConversation(user.id, user.role)
    : owned
      ? existing!
      : await getOrCreateConversation(user.id, user.role);

  const [rows, projectCard] = await Promise.all([loadHistory(conversation.id, 40), getProjectCard(conversation.id)]);

  const messages: HistoryMessageOut[] = [];
  let pendingCards: Card[] = [];
  let latestChips: Chip[] = [];

  for (const row of rows) {
    const content = row.content as unknown as { blocks?: unknown; ui?: ToolUi | null } | null;

    if (row.role === 'tool') {
      if (content?.ui?.cards) pendingCards.push(...content.ui.cards);
      if (content?.ui?.next) latestChips = content.ui.next;
      continue;
    }

    if (row.role === 'user') {
      messages.push({ id: row.id, role: 'user', text: extractText(content?.blocks) });
      continue;
    }

    // Assistant turn: only surface ones that carry visible text (a pure
    // tool_use turn has nothing for the transcript to show) and attach any
    // cards accumulated from tool results since the previous shown turn.
    const text = extractText(content?.blocks);
    if (text || !hasToolUse(content?.blocks)) {
      messages.push({ id: row.id, role: 'assistant', text, cards: pendingCards.length ? pendingCards : undefined });
      pendingCards = [];
    }
  }

  const counts = await loadGuidanceCounts(session);
  const state = guidanceStateFor(session, counts);
  const [greeting, checklist, projectPill, previous] = await Promise.all([
    greetingFor(session, state, counts),
    checklistFor(session),
    projectPillFor(conversation.id),
    fresh ? latestConversationWithMessages(user.id, conversation.id) : Promise.resolve(null),
  ]);
  const previousPill = previous ? await projectPillFor(previous.id) : null;
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
    chips: latestChips,
    project: projectCard
      ? { kind: projectCard.kind, refId: projectCard.refId ?? undefined, state: (projectCard.state ?? {}) as Record<string, unknown> }
      : null,
    greeting,
    quickActions: quickActionsFor(state),
    checklist,
    projectPill,
    resume,
  });
}
