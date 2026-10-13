'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { useStickToBottomContext } from 'use-stick-to-bottom';
import type { Chip } from '@/lib/ui-cards/schemas';
import type { AgentRequest } from '@/lib/agent/protocol';
import type { ChatMessage, ConfirmState, EarlierMessages, SendOptions } from '@/components/chat/useConversation';
import type { CardActionContext } from '@/components/cards/actions';
import { ConfirmStatesContext } from '@/components/cards/ConfirmCard';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { WorkingRow } from '@/components/chat/WorkingRow';
import { ChipsRow } from '@/components/chat/ChipsRow';
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation';

// ConversationScrollButton (ai-elements) hardcodes an icon-only child, which
// can't be swapped for the mock's text pill — so this reads the same
// use-stick-to-bottom context directly instead. Solid ground (.mf-pill-float)
// so photos scrolling underneath don't show through.
function JumpToLatest() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  const reduceMotion = useReducedMotion();
  if (isAtBottom) return null;
  return (
    <button
      type="button"
      onClick={() => scrollToBottom(reduceMotion ? 'instant' : 'smooth')}
      className="mf-pill-float mf-fade-in absolute bottom-4 left-1/2 -translate-x-1/2"
    >
      Jump to latest
    </button>
  );
}

/** Before a reply's first words (and while the model picks up again after its
 * tools): a quiet line with a small pulse, still under reduced motion. */
function ThinkingRow() {
  return (
    <div role="status" className="mf-fade-in mf-dimmed flex items-center gap-2.5 text-[13px]">
      <span aria-hidden="true" className="flex items-center gap-[3px]">
        <span className="mf-spinner-dot motion-reduce:animate-none" />
        <span className="mf-spinner-dot motion-reduce:animate-none" />
        <span className="mf-spinner-dot motion-reduce:animate-none" />
      </span>
      <span>Thinking</span>
    </div>
  );
}

/** "Show earlier messages" at the top of the thread. */
function EarlierButton({ earlier, onLoad }: { earlier: EarlierMessages; onLoad: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4">
      {earlier.failed ? <span className="mf-dimmed text-[13px]">Earlier messages didn&apos;t load.</span> : null}
      <button
        type="button"
        onClick={onLoad}
        disabled={earlier.loading}
        className="mf-ulink inline-flex min-h-11 items-center disabled:opacity-50"
      >
        {earlier.loading ? 'Loading' : earlier.failed ? 'Try again' : 'Show earlier messages'}
      </button>
    </div>
  );
}

type ThreadProps = {
  messages: ChatMessage[];
  chips: Chip[];
  ctx: CardActionContext;
  confirmResolutions: Record<string, ConfirmState>;
  workingLabel: string | null;
  onSend: (text: string, attachments?: AgentRequest['attachments'], options?: SendOptions) => unknown;
  /** older messages of the session (from useConversation); omit to hide the control */
  earlier?: EarlierMessages;
};

/** The thread's content, inside the scroll container. Loading earlier
 * messages keeps what was on screen where it was: the distance from the
 * bottom is noted before the load and restored once the older messages are
 * in (whatever else changed above them, the earlier control included). */
function ThreadBody({ messages, chips, ctx, confirmResolutions, workingLabel, onSend, earlier }: ThreadProps) {
  const { scrollRef } = useStickToBottomContext();
  const restore = useRef<{ fromBottom: number; firstId: string | undefined } | null>(null);
  const firstId = messages[0]?.id;
  const loadingEarlier = earlier?.loading ?? false;

  useLayoutEffect(() => {
    const pending = restore.current;
    const scroller = scrollRef.current;
    if (!pending || !scroller || pending.firstId === firstId) return;
    restore.current = null;
    scroller.scrollTop = scroller.scrollHeight - pending.fromBottom;
  }, [firstId, scrollRef]);

  // A load that brought nothing in leaves nothing to restore.
  useEffect(() => {
    if (!loadingEarlier && restore.current?.firstId === firstId) restore.current = null;
  }, [loadingEarlier, firstId]);

  const loadEarlier = () => {
    if (!earlier) return;
    const scroller = scrollRef.current;
    restore.current = scroller ? { fromBottom: scroller.scrollHeight - scroller.scrollTop, firstId } : null;
    void earlier.load();
  };

  const last = messages[messages.length - 1];
  // A reply is coming in, or a confirm decision is on its way: nothing else
  // can be sent until it lands, so the suggestion chips step aside.
  const replying =
    messages.some((message) => message.streaming) ||
    Object.values(confirmResolutions).some((state) => state.phase === 'approving' || state.phase === 'declining');
  const thinking = Boolean(last?.thinking) && !workingLabel;

  const retry = (message: ChatMessage) => {
    const again = message.failed?.retry;
    if (!again) return;
    void onSend(again.text, again.attachments, { retryOf: message.id });
  };

  return (
    <ConversationContent className="mx-auto flex w-full max-w-[720px] flex-col gap-7 px-5 py-6">
      {earlier?.hasMore ? <EarlierButton earlier={earlier} onLoad={loadEarlier} /> : null}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} ctx={ctx} onRetry={retry} />
      ))}
      {workingLabel ? <WorkingRow label={workingLabel} /> : thinking ? <ThinkingRow /> : null}
      {!replying ? <ChipsRow chips={chips} onSend={onSend} /> : null}
    </ConversationContent>
  );
}

export function Thread(props: ThreadProps) {
  return (
    <Conversation className="w-full min-h-0">
      <ConfirmStatesContext.Provider value={props.confirmResolutions}>
        <ThreadBody {...props} />
      </ConfirmStatesContext.Provider>
      <JumpToLatest />
    </Conversation>
  );
}
