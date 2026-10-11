'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentEvent, AgentRequest, ChecklistStep, HistoryResponse } from '@/lib/agent/protocol';
import type { Card, Chip, ProductProjectState, ToolUi } from '@/lib/ui-cards/schemas';
import type { BulkOrderProjectState } from '@/components/cards/project/types';
import {
  fetchAgentHistory,
  sendAgentConfirm,
  sendAgentMessage,
  storeConversationId,
} from '@/lib/agent/client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards: Card[];
  streaming?: boolean;
  attachments?: AgentRequest['attachments'];
}

export interface Greeting {
  headline: string;
  line: string;
}

export interface ProjectPill {
  label: string;
  status: string;
  colourHex?: string;
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

const DEFAULT_GREETING: Greeting = { headline: 'What are we making?', line: '' };

export type ResumeTarget = NonNullable<HistoryResponse['resume']>;

export interface UseConversationOptions {
  /** open this conversation instead of a fresh home session (/studio/s/<id>);
   * an id that is not the user's falls back server-side */
  initialConversationId?: string;
  /** the server has started replying in this conversation */
  onMessageStart?: (conversationId: string) => void;
  /** a turn finished (message_end, error or a confirm pause) */
  onTurnEnd?: (conversationId: string) => void;
}

export function useConversation({ initialConversationId, onMessageStart, onTurnEnd }: UseConversationOptions = {}) {
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [project, setProject] = useState<ToolUi['project'] | null>(null);
  const [greeting, setGreeting] = useState<Greeting>(DEFAULT_GREETING);
  const [quickActions, setQuickActions] = useState<Chip[]>([]);
  const [checklist, setChecklist] = useState<ChecklistStep[] | null>(null);
  const [projectPill, setProjectPill] = useState<ProjectPill | null>(null);
  const [resume, setResume] = useState<ResumeTarget | null>(null);
  const [workingLabel, setWorkingLabel] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [confirmResolutions, setConfirmResolutions] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [lastAssistantText, setLastAssistantText] = useState('');

  const currentMessageId = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Mirrors the streaming assistant text outside React state so the voice
  // loop (useVoice) can read the finished turn's text the instant it ends,
  // without waiting on a render to land in `messages`.
  const currentTextRef = useRef('');
  const assistantDoneListeners = useRef<Set<(text: string) => void>>(new Set());
  // Latest callbacks and conversation id, read from the stream handler
  // without re-creating it on every render.
  const callbacksRef = useRef({ onMessageStart, onTurnEnd });
  const conversationIdRef = useRef('');
  useEffect(() => {
    callbacksRef.current = { onMessageStart, onTurnEnd };
  }, [onMessageStart, onTurnEnd]);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const notifyAssistantDone = useCallback((text: string) => {
    setLastAssistantText(text);
    callbacksRef.current.onTurnEnd?.(conversationIdRef.current);
    for (const listener of assistantDoneListeners.current) listener(text);
  }, []);

  /** Subscribes to the end of the next assistant turn (message_end, an
   * error, or a confirm_required pause) — used by the voice conversation
   * loop to know when to speak the reply. Returns an unsubscribe function. */
  const onAssistantDone = useCallback((callback: (text: string) => void) => {
    assistantDoneListeners.current.add(callback);
    return () => {
      assistantDoneListeners.current.delete(callback);
    };
  }, []);

  const applyHistory = useCallback((history: HistoryResponse) => {
    setConversationId(history.conversationId);
    conversationIdRef.current = history.conversationId;
    storeConversationId(history.conversationId);
    setMessages(
      history.messages.map((message) => ({
        id: message.id,
        role: message.role,
        text: message.text,
        cards: message.cards ?? [],
      })),
    );
    setChips(history.chips);
    setProject(history.project);
    setGreeting(history.greeting);
    setQuickActions(history.quickActions);
    setChecklist(history.checklist);
    setProjectPill(history.projectPill);
    setResume(history.resume ?? null);
    setConfirmResolutions({});
  }, []);

  // /studio opens on its home screen: a blank session, with the previous
  // conversation offered as `resume` rather than reopened. /studio/s/<id>
  // loads that conversation instead.
  useEffect(() => {
    let cancelled = false;
    fetchAgentHistory(initialConversationId ?? '', { fresh: !initialConversationId }).then((history) => {
      if (cancelled) return;
      if (history) applyHistory(history);
      setHistoryError(!history);
      setLoadingHistory(false);
    });
    return () => {
      cancelled = true;
    };
  }, [applyHistory, initialConversationId]);

  const loadSession = useCallback(
    async (target: { fresh: true } | { conversationId: string }) => {
      setLoadingHistory(true);
      const history = await fetchAgentHistory('conversationId' in target ? target.conversationId : '', {
        fresh: 'fresh' in target,
      });
      if (history) applyHistory(history);
      setHistoryError(!history);
      setLoadingHistory(false);
    },
    [applyHistory],
  );

  const startNewSession = useCallback(() => loadSession({ fresh: true }), [loadSession]);
  const openConversation = useCallback((id: string) => loadSession({ conversationId: id }), [loadSession]);
  /** after a failed load: try the same session (or a fresh home) again */
  const retryHistory = useCallback(
    () => loadSession(initialConversationId ? { conversationId: initialConversationId } : { fresh: true }),
    [initialConversationId, loadSession],
  );

  const updateMessage = useCallback((id: string, updater: (message: ChatMessage) => ChatMessage) => {
    setMessages((prev) => prev.map((message) => (message.id === id ? updater(message) : message)));
  }, []);

  const appendCards = useCallback(
    (id: string, cards: Card[]) => {
      if (cards.length === 0) return;
      // Cards carry stable ids: the same card can arrive on tool_end and
      // again on the cards event, and an updated card replaces its earlier
      // version in place instead of stacking.
      updateMessage(id, (message) => {
        const next = [...message.cards];
        for (const card of cards) {
          const at = next.findIndex((c) => c.id === card.id);
          if (at === -1) next.push(card);
          else next[at] = card;
        }
        return { ...message, cards: next };
      });
    },
    [updateMessage],
  );

  const handleEvent = useCallback(
    (event: AgentEvent) => {
      switch (event.type) {
        case 'message_start': {
          if (event.conversationId && event.conversationId !== conversationId) {
            setConversationId(event.conversationId);
            storeConversationId(event.conversationId);
          }
          conversationIdRef.current = event.conversationId || conversationId;
          callbacksRef.current.onMessageStart?.(conversationIdRef.current);
          currentMessageId.current = event.messageId;
          currentTextRef.current = '';
          setMessages((prev) => [
            ...prev,
            { id: event.messageId, role: 'assistant', text: '', cards: [], streaming: true },
          ]);
          break;
        }
        case 'text_delta': {
          const id = currentMessageId.current;
          if (!id) break;
          currentTextRef.current += event.text;
          updateMessage(id, (message) => ({ ...message, text: message.text + event.text }));
          break;
        }
        case 'tool_start': {
          setWorkingLabel(event.label);
          break;
        }
        case 'tool_end': {
          setWorkingLabel(null);
          const id = currentMessageId.current;
          const ui = event.ui;
          if (ui?.cards && id) appendCards(id, ui.cards);
          if (ui?.next) setChips(ui.next);
          if (ui?.project) setProject(ui.project);
          break;
        }
        case 'cards': {
          const id = currentMessageId.current;
          if (id) appendCards(id, event.cards);
          break;
        }
        case 'chips': {
          setChips(event.chips);
          break;
        }
        case 'project': {
          setProject(event.project);
          // Keep the top-bar pill in step with the live project state instead
          // of the snapshot loaded with the history.
          if (event.project?.kind === 'product') {
            const st = event.project.state as Partial<ProductProjectState>;
            const colour = st.colours?.[0];
            setProjectPill({
              label: colour ? `${st.name ?? 'Product'} · ${colour.name}` : (st.name ?? 'Product'),
              status: st.status === 'live' ? 'Live' : st.proofStatus === 'approved' ? 'Approved' : st.status === 'proof_pending' ? 'Proof' : 'Draft',
              colourHex: colour?.hex,
            });
          } else if (event.project?.kind === 'bulk_order') {
            const st = event.project.state as Partial<BulkOrderProjectState>;
            const lines = st.lines ?? [];
            const qty = lines.reduce((sum, line) => sum + (line.qty ?? 0), 0);
            const itemLabel = lines[0]?.label ?? 'Bulk order';
            setProjectPill({
              label: `Bulk · ${qty} × ${itemLabel}`,
              status: st.status ? st.status.replace(/_/g, ' ').replace(/^./, (ch) => ch.toUpperCase()) : '',
            });
          } else if (event.project === null) {
            setProjectPill(null);
          }
          break;
        }
        case 'confirm_required': {
          const id = currentMessageId.current;
          setWorkingLabel(null);
          setSending(false);
          if (id) appendCards(id, [event.card]);
          // The turn pauses here rather than reaching message_end — the
          // voice loop still needs to be unblocked, even with no text to say.
          notifyAssistantDone(currentTextRef.current);
          break;
        }
        case 'message_end': {
          const id = currentMessageId.current;
          if (id) updateMessage(id, (message) => ({ ...message, streaming: false }));
          setSending(false);
          setWorkingLabel(null);
          currentMessageId.current = null;
          notifyAssistantDone(currentTextRef.current);
          break;
        }
        case 'error': {
          setSending(false);
          setWorkingLabel(null);
          const noticeCard: Card = {
            id: makeId('notice'),
            kind: 'notice',
            tone: 'error',
            text: event.message,
          };
          const id = currentMessageId.current;
          if (id) {
            appendCards(id, [noticeCard]);
          } else {
            const newId = makeId('assistant');
            setMessages((prev) => [...prev, { id: newId, role: 'assistant', text: '', cards: [noticeCard] }]);
          }
          // Nothing to speak, but the voice loop is waiting for this turn.
          notifyAssistantDone('');
          break;
        }
        default:
          break;
      }
    },
    [appendCards, conversationId, notifyAssistantDone, updateMessage],
  );

  const sendText = useCallback(
    (text: string, attachments?: AgentRequest['attachments']) => {
      const trimmed = text.trim();
      if ((!trimmed && (!attachments || attachments.length === 0)) || sending) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setMessages((prev) => [...prev, { id: makeId('user'), role: 'user', text: trimmed, cards: [], attachments }]);
      setSending(true);
      sendAgentMessage(
        { conversationId: conversationId || undefined, text: trimmed, attachments },
        { onEvent: handleEvent, signal: controller.signal },
      );
    },
    [conversationId, handleEvent, sending],
  );

  const resolveConfirm = useCallback(
    (toolCallId: string, approve: boolean) => {
      if (!conversationId) return;
      setConfirmResolutions((prev) => ({ ...prev, [toolCallId]: approve ? 'approved' : 'rejected' }));
      setSending(true);
      const controller = new AbortController();
      abortRef.current = controller;
      sendAgentConfirm({ conversationId, toolCallId, approve }, { onEvent: handleEvent, signal: controller.signal });
    },
    [conversationId, handleEvent],
  );

  return {
    conversationId,
    messages,
    chips,
    project,
    greeting,
    quickActions,
    checklist,
    projectPill,
    resume,
    startNewSession,
    openConversation,
    workingLabel,
    sending,
    loadingHistory,
    historyError,
    retryHistory,
    confirmResolutions,
    lastAssistantText,
    onAssistantDone,
    sendText,
    resolveConfirm,
  };
}
