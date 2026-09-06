'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentEvent, ChecklistStep } from '@/lib/agent/protocol';
import type { Card, Chip, ToolUi } from '@/lib/ui-cards/schemas';
import {
  fetchAgentHistory,
  loadStoredConversationId,
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

export function useConversation() {
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [project, setProject] = useState<ToolUi['project'] | null>(null);
  const [greeting, setGreeting] = useState<Greeting>(DEFAULT_GREETING);
  const [quickActions, setQuickActions] = useState<Chip[]>([]);
  const [checklist, setChecklist] = useState<ChecklistStep[] | null>(null);
  const [projectPill, setProjectPill] = useState<ProjectPill | null>(null);
  const [workingLabel, setWorkingLabel] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [confirmResolutions, setConfirmResolutions] = useState<Record<string, 'approved' | 'rejected'>>({});

  const currentMessageId = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const storedId = loadStoredConversationId();
      const history = await fetchAgentHistory(storedId);
      if (cancelled) return;
      if (history) {
        setConversationId(history.conversationId);
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
      }
      setLoadingHistory(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
          currentMessageId.current = event.messageId;
          setMessages((prev) => [
            ...prev,
            { id: event.messageId, role: 'assistant', text: '', cards: [], streaming: true },
          ]);
          break;
        }
        case 'text_delta': {
          const id = currentMessageId.current;
          if (!id) break;
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
          break;
        }
        case 'confirm_required': {
          const id = currentMessageId.current;
          setWorkingLabel(null);
          setSending(false);
          if (id) appendCards(id, [event.card]);
          break;
        }
        case 'message_end': {
          const id = currentMessageId.current;
          if (id) updateMessage(id, (message) => ({ ...message, streaming: false }));
          setSending(false);
          setWorkingLabel(null);
          currentMessageId.current = null;
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
          break;
        }
        default:
          break;
      }
    },
    [appendCards, conversationId, updateMessage],
  );

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setMessages((prev) => [...prev, { id: makeId('user'), role: 'user', text: trimmed, cards: [] }]);
      setSending(true);
      sendAgentMessage({ conversationId: conversationId || undefined, text: trimmed }, { onEvent: handleEvent, signal: controller.signal });
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
    workingLabel,
    sending,
    loadingHistory,
    confirmResolutions,
    sendText,
    resolveConfirm,
  };
}
