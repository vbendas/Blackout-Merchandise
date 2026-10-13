'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AgentErrorCode,
  AgentEvent,
  AgentRequest,
  ChecklistStep,
  ConfirmConflict,
  ConfirmOutcome,
  HistoryMessage,
  HistoryResponse,
} from '@/lib/agent/protocol';
import type { Card, Chip, ProductProjectState, ToolUi } from '@/lib/ui-cards/schemas';
import type { BulkOrderProjectState } from '@/components/cards/project/types';
import { runLabel } from '@/lib/format/runs';
import { humanStatus } from '@/lib/format/status';
import {
  failureMessage,
  fetchAgentHistory,
  fetchEarlierHistory,
  isOffline,
  sendAgentConfirm,
  sendAgentMessage,
  storeConversationId,
  type StreamEnd,
} from '@/lib/agent/client';

/** A reply that didn't come through. */
export interface FailedReply {
  /** what the artist reads, in plain words */
  message: string;
  code?: AgentErrorCode;
  /** what Try again sends; absent when there is nothing to send again */
  retry?: { text: string; attachments?: AgentRequest['attachments'] };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards: Card[];
  streaming?: boolean;
  /** waiting for the reply's next words: the thread shows a Thinking line */
  thinking?: boolean;
  /** the artist stopped this reply; what it had said stays */
  stopped?: boolean;
  failed?: FailedReply;
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

/** Where a confirm card stands in this session: a decision on its way, what
 * became of it, or why a decision didn't go through (the buttons show again).
 * Cards loaded from history carry their own `outcome`. */
export interface ConfirmState {
  phase?: 'approving' | 'declining' | ConfirmOutcome;
  error?: string;
}

/** How a send went, for the composer. `sent`: the Studio took the message.
 * `offline`: nothing was sent and the composer keeps its draft. `failed`: the
 * thread shows what went wrong. `busy`: a reply is still coming. */
export type SendOutcome = 'sent' | 'offline' | 'failed' | 'busy';

export interface SendOptions {
  /** sent from the composer: offline, it keeps its draft rather than the
   * thread showing a failed message */
  fromComposer?: boolean;
  /** Try again on this failed reply: it is replaced, and the message above it sent again */
  retryOf?: string;
}

/** "Show earlier messages": more of the session is stored than the thread shows. */
export interface EarlierMessages {
  hasMore: boolean;
  loading: boolean;
  /** the last load didn't come through */
  failed: boolean;
  load: () => Promise<void>;
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

/** One reply in flight: a message sent, or a decision on a confirm card. It
 * ends exactly once (closing event, error, dropped stream, Stop or another
 * session opening), and ending it is what unlocks the composer. */
interface Turn {
  controller: AbortController;
  /** the assistant bubble it writes into; a confirm turn makes one once the server replies */
  bubbleId: string | null;
  /** the artist's bubble this send added */
  userBubbleId: string | null;
  /** the server took the request */
  opened: boolean;
  /** the server started the reply (message_start) */
  started: boolean;
  done: boolean;
  /** the reply's text so far, for the voice loop */
  text: string;
  /** tools running now, by call id, with their progress line */
  running: Map<string, string>;
  /** what Try again sends (message turns only) */
  request?: { text: string; attachments?: AgentRequest['attachments'] };
  fromComposer: boolean;
  confirm?: { toolCallId: string; approve: boolean };
  /** answers the send's promise; only the first call counts */
  settle: (outcome: SendOutcome) => void;
}

function fromHistory(message: HistoryMessage): ChatMessage {
  return { id: message.id, role: message.role, text: message.text, cards: message.cards ?? [], attachments: message.attachments };
}

function conflictOutcome(body: unknown): ConfirmOutcome | null {
  const outcome = (body as Partial<ConfirmConflict> | null | undefined)?.outcome;
  return outcome === 'approved' || outcome === 'declined' || outcome === 'done' || outcome === 'failed' ? outcome : null;
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
  const [confirmResolutions, setConfirmResolutions] = useState<Record<string, ConfirmState>>({});
  const [lastAssistantText, setLastAssistantText] = useState('');
  const [earlierCursor, setEarlierCursor] = useState<string | null>(null);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [earlierFailed, setEarlierFailed] = useState(false);

  // The reply in flight. A ref, not state, so a second send in the same tick
  // (a double tap on a chip) already sees it.
  const turnRef = useRef<Turn | null>(null);
  const confirmRef = useRef<Record<string, ConfirmState>>({});
  const earlierRef = useRef<{ cursor: string | null; loading: boolean }>({ cursor: null, loading: false });
  // Bumped whenever a session loads, so a late page from the one before is dropped.
  const sessionEpoch = useRef(0);
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
   * error, a confirm_required pause or Stop) — used by the voice conversation
   * loop to know when to speak the reply. Returns an unsubscribe function. */
  const onAssistantDone = useCallback((callback: (text: string) => void) => {
    assistantDoneListeners.current.add(callback);
    return () => {
      assistantDoneListeners.current.delete(callback);
    };
  }, []);

  const writeConfirm = useCallback((toolCallId: string, state: ConfirmState | null) => {
    const next = { ...confirmRef.current };
    if (state) next[toolCallId] = state;
    else delete next[toolCallId];
    confirmRef.current = next;
    setConfirmResolutions(next);
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

  /** Ends a turn, once: the composer unlocks and listeners (voice, sidebar)
   * hear the reply is over. `patch` marks the bubble (stopped, failed). */
  const finishTurn = useCallback(
    (turn: Turn, patch?: Partial<ChatMessage>) => {
      if (turn.done) return;
      turn.done = true;
      if (turn.bubbleId) updateMessage(turn.bubbleId, (message) => ({ ...message, streaming: false, thinking: false, ...patch }));
      if (turnRef.current === turn) {
        turnRef.current = null;
        setSending(false);
        setWorkingLabel(null);
      }
      turn.settle(turn.opened ? 'sent' : 'failed');
      notifyAssistantDone(turn.text);
    },
    [notifyAssistantDone, updateMessage],
  );

  /** A reply that didn't come through, with what went wrong in plain words. */
  const failTurn = useCallback(
    (turn: Turn, message: string, code?: AgentErrorCode) => {
      if (turn.done) return;
      if (turn.confirm && !turn.started) {
        // The decision never got going: the buttons come back with the reason
        // under them. A step decided elsewhere shows its result instead (from
        // the 409, see afterStream).
        if (code !== 'not_pending') writeConfirm(turn.confirm.toolCallId, { error: message });
        finishTurn(turn);
        return;
      }
      if (code === 'offline' && turn.fromComposer && !turn.opened) {
        // Nothing was sent: the composer keeps the draft and says so.
        const gone = new Set([turn.bubbleId, turn.userBubbleId]);
        setMessages((prev) => prev.filter((m) => !gone.has(m.id)));
        turn.bubbleId = null;
        turn.settle('offline');
        finishTurn(turn);
        return;
      }
      const failed: FailedReply = { message, code, retry: turn.request };
      if (!turn.bubbleId) {
        const id = makeId('assistant');
        turn.bubbleId = id;
        setMessages((prev) => [...prev, { id, role: 'assistant', text: '', cards: [] }]);
      }
      finishTurn(turn, { failed });
    },
    [finishTurn, writeConfirm],
  );

  /** Stop: the reply ends where it is and keeps what it said. A decision the
   * server had not started on yet goes back to waiting. */
  const stopTurn = useCallback(
    (turn: Turn) => {
      if (turn.done) return;
      turn.controller.abort();
      if (turn.confirm && !turn.started) {
        writeConfirm(turn.confirm.toolCallId, null);
        finishTurn(turn);
        return;
      }
      finishTurn(turn, { stopped: true });
    },
    [finishTurn, writeConfirm],
  );

  const handleTurnEvent = useCallback(
    (turn: Turn, event: AgentEvent) => {
      if (turn.done) return;
      switch (event.type) {
        case 'message_start': {
          turn.started = true;
          if (event.conversationId && event.conversationId !== conversationIdRef.current) {
            setConversationId(event.conversationId);
            storeConversationId(event.conversationId);
          }
          if (event.conversationId) conversationIdRef.current = event.conversationId;
          callbacksRef.current.onMessageStart?.(conversationIdRef.current);
          if (turn.confirm) {
            // Only now, with the server on it, does the card read as decided.
            writeConfirm(turn.confirm.toolCallId, { phase: turn.confirm.approve ? 'approved' : 'declined' });
            const id = makeId('assistant');
            turn.bubbleId = id;
            setMessages((prev) => [...prev, { id, role: 'assistant', text: '', cards: [], streaming: true, thinking: true }]);
          }
          break;
        }
        case 'text_delta': {
          turn.text += event.text;
          if (turn.bubbleId) updateMessage(turn.bubbleId, (message) => ({ ...message, text: message.text + event.text, thinking: false }));
          break;
        }
        case 'tool_start': {
          turn.running.set(event.toolCallId, event.label);
          setWorkingLabel(event.label);
          if (turn.bubbleId) updateMessage(turn.bubbleId, (message) => (message.thinking ? { ...message, thinking: false } : message));
          break;
        }
        case 'tool_end': {
          turn.running.delete(event.toolCallId);
          const stillRunning = [...turn.running.values()];
          setWorkingLabel(stillRunning.length > 0 ? stillRunning[stillRunning.length - 1] : null);
          const ui = event.ui;
          if (turn.bubbleId) {
            if (ui?.cards) appendCards(turn.bubbleId, ui.cards);
            // With every tool done, the model picks up again.
            if (stillRunning.length === 0) updateMessage(turn.bubbleId, (message) => ({ ...message, thinking: true }));
          }
          if (ui?.next) setChips(ui.next);
          if (ui?.project) setProject(ui.project);
          if (confirmRef.current[event.toolCallId]?.phase === 'approved') {
            writeConfirm(event.toolCallId, { phase: event.ok ? 'done' : 'failed' });
          }
          break;
        }
        case 'cards': {
          if (turn.bubbleId) appendCards(turn.bubbleId, event.cards);
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
            const itemLabel = lines[0]?.label;
            const run = typeof st.runNumber === 'number' ? runLabel(st.runNumber) : 'Run';
            setProjectPill({
              label: itemLabel ? `${run} · ${qty} × ${itemLabel}` : run,
              status: st.status ? humanStatus(st.status) : '',
            });
          } else if (event.project === null) {
            setProjectPill(null);
          }
          break;
        }
        case 'confirm_required': {
          if (turn.bubbleId) appendCards(turn.bubbleId, [event.card]);
          // The reply pauses here for the artist's decision.
          finishTurn(turn);
          break;
        }
        case 'message_end': {
          finishTurn(turn);
          break;
        }
        case 'error': {
          failTurn(turn, event.message, event.code);
          break;
        }
        default:
          break;
      }
    },
    [appendCards, failTurn, finishTurn, updateMessage, writeConfirm],
  );

  /** After the request settles. Every way it can end was reported as an event
   * already; this is the backstop, so nothing can leave the composer locked. */
  const afterStream = useCallback(
    (turn: Turn, end: StreamEnd) => {
      if (turn.confirm && end.status === 'failed' && end.code === 'not_pending') {
        const outcome = conflictOutcome(end.body);
        writeConfirm(turn.confirm.toolCallId, outcome ? { phase: outcome } : { error: failureMessage('not_pending') });
      }
      if (turn.done) return;
      if (end.status === 'aborted') {
        stopTurn(turn);
        return;
      }
      const code = end.status === 'failed' ? end.code : 'dropped';
      failTurn(turn, failureMessage(code), code);
    },
    [failTurn, stopTurn, writeConfirm],
  );

  /** Lets go of a reply still coming in when another session opens here: the
   * server finishes it, its events just no longer reach this thread. */
  const releaseTurn = useCallback(() => {
    const turn = turnRef.current;
    if (!turn) return;
    turn.done = true;
    turnRef.current = null;
    setSending(false);
    setWorkingLabel(null);
    turn.settle('sent');
    notifyAssistantDone('');
  }, [notifyAssistantDone]);

  const applyHistory = useCallback(
    (history: HistoryResponse) => {
      sessionEpoch.current += 1;
      setConversationId(history.conversationId);
      conversationIdRef.current = history.conversationId;
      storeConversationId(history.conversationId);
      setMessages(history.messages.map(fromHistory));
      setChips(history.chips);
      setProject(history.project);
      setGreeting(history.greeting);
      setQuickActions(history.quickActions);
      setChecklist(history.checklist);
      setProjectPill(history.projectPill);
      setResume(history.resume ?? null);
      confirmRef.current = {};
      setConfirmResolutions({});
      const cursor = history.earlierCursor ?? null;
      earlierRef.current = { cursor, loading: false };
      setEarlierCursor(cursor);
      setLoadingEarlier(false);
      setEarlierFailed(false);
    },
    [],
  );

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
      releaseTurn();
      setLoadingHistory(true);
      const history = await fetchAgentHistory('conversationId' in target ? target.conversationId : '', {
        fresh: 'fresh' in target,
      });
      if (history) applyHistory(history);
      setHistoryError(!history);
      setLoadingHistory(false);
    },
    [applyHistory, releaseTurn],
  );

  const startNewSession = useCallback(() => loadSession({ fresh: true }), [loadSession]);
  const openConversation = useCallback((id: string) => loadSession({ conversationId: id }), [loadSession]);
  /** after a failed load: try the same session (or a fresh home) again */
  const retryHistory = useCallback(
    () => loadSession(initialConversationId ? { conversationId: initialConversationId } : { fresh: true }),
    [initialConversationId, loadSession],
  );

  /** "Show earlier messages": the page before the oldest one shown. */
  const loadEarlier = useCallback(async () => {
    const { cursor, loading } = earlierRef.current;
    const conversation = conversationIdRef.current;
    if (!cursor || loading || !conversation) return;
    const epoch = sessionEpoch.current;
    earlierRef.current = { cursor, loading: true };
    setLoadingEarlier(true);
    setEarlierFailed(false);
    const page = await fetchEarlierHistory(conversation, cursor);
    if (epoch !== sessionEpoch.current) return;
    earlierRef.current = { cursor: page ? page.earlierCursor : cursor, loading: false };
    setLoadingEarlier(false);
    if (!page) {
      setEarlierFailed(true);
      return;
    }
    setEarlierCursor(page.earlierCursor);
    setMessages((prev) => {
      const shown = new Set(prev.map((message) => message.id));
      return [...page.messages.filter((message) => !shown.has(message.id)).map(fromHistory), ...prev];
    });
  }, []);

  const earlier = useMemo<EarlierMessages>(
    () => ({ hasMore: earlierCursor !== null, loading: loadingEarlier, failed: earlierFailed, load: loadEarlier }),
    [earlierCursor, loadingEarlier, earlierFailed, loadEarlier],
  );

  /** Sends a message. Resolves once the Studio has taken it (or it could not
   * go), not when the reply ends; see SendOutcome. While a reply is coming in
   * nothing is sent, whichever chip or card asks. */
  const sendText = useCallback(
    (text: string, attachments?: AgentRequest['attachments'], options: SendOptions = {}): Promise<SendOutcome> => {
      const trimmed = text.trim();
      if (!trimmed && (!attachments || attachments.length === 0)) return Promise.resolve('failed');
      if (turnRef.current) return Promise.resolve('busy');
      // Known to be offline: the composer keeps its draft, nothing changes here.
      if (options.fromComposer && isOffline()) return Promise.resolve('offline');

      let resolveSend: (outcome: SendOutcome) => void = () => undefined;
      const sent = new Promise<SendOutcome>((resolve) => {
        resolveSend = resolve;
      });
      let settled = false;
      const userBubbleId = options.retryOf ? null : makeId('user');
      const turn: Turn = {
        controller: new AbortController(),
        bubbleId: makeId('assistant'),
        userBubbleId,
        opened: false,
        started: false,
        done: false,
        text: '',
        running: new Map(),
        request: { text: trimmed, attachments },
        fromComposer: Boolean(options.fromComposer),
        settle: (outcome) => {
          if (settled) return;
          settled = true;
          resolveSend(outcome);
        },
      };
      const bubbleId = turn.bubbleId as string;
      setMessages((prev) => [
        // Try again replaces the failed reply; the artist's message above it stays.
        ...(options.retryOf ? prev.filter((message) => message.id !== options.retryOf) : prev),
        ...(userBubbleId ? [{ id: userBubbleId, role: 'user' as const, text: trimmed, cards: [], attachments }] : []),
        { id: bubbleId, role: 'assistant', text: '', cards: [], streaming: true, thinking: true },
      ]);
      turnRef.current = turn;
      setSending(true);
      setWorkingLabel(null);
      void sendAgentMessage(
        { conversationId: conversationIdRef.current || undefined, text: trimmed, attachments, retry: options.retryOf ? true : undefined },
        {
          onEvent: (event) => handleTurnEvent(turn, event),
          onOpen: () => {
            turn.opened = true;
            turn.settle('sent');
          },
          signal: turn.controller.signal,
        },
      ).then(
        (end) => afterStream(turn, end),
        () => afterStream(turn, { status: 'failed', code: 'dropped' }),
      );
      return sent;
    },
    [afterStream, handleTurnEvent],
  );

  /** Approve or cancel a confirm card. The clicked button shows it is on its
   * way; the card reads as decided only once the server starts on it, and
   * goes back to its buttons (with the reason) if it can't. */
  const resolveConfirm = useCallback(
    (toolCallId: string, approve: boolean) => {
      const conversation = conversationIdRef.current;
      if (!conversation || turnRef.current) return;
      if (confirmRef.current[toolCallId]?.phase) return;
      writeConfirm(toolCallId, { phase: approve ? 'approving' : 'declining' });
      const turn: Turn = {
        controller: new AbortController(),
        bubbleId: null,
        userBubbleId: null,
        opened: false,
        started: false,
        done: false,
        text: '',
        running: new Map(),
        fromComposer: false,
        confirm: { toolCallId, approve },
        settle: () => undefined,
      };
      turnRef.current = turn;
      setSending(true);
      setWorkingLabel(null);
      void sendAgentConfirm(
        { conversationId: conversation, toolCallId, approve },
        {
          onEvent: (event) => handleTurnEvent(turn, event),
          onOpen: () => {
            turn.opened = true;
          },
          signal: turn.controller.signal,
        },
      ).then(
        (end) => afterStream(turn, end),
        () => afterStream(turn, { status: 'failed', code: 'dropped' }),
      );
    },
    [afterStream, handleTurnEvent, writeConfirm],
  );

  /** Stop the reply being written. */
  const stop = useCallback(() => {
    const turn = turnRef.current;
    if (turn) stopTurn(turn);
  }, [stopTurn]);

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
    stop,
    earlier,
  };
}
