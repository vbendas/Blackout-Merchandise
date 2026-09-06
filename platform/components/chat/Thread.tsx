import { useStickToBottomContext } from 'use-stick-to-bottom';
import type { Chip } from '@/lib/ui-cards/schemas';
import type { ChatMessage } from '@/components/chat/useConversation';
import type { CardActionContext } from '@/components/cards/actions';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { WorkingRow } from '@/components/chat/WorkingRow';
import { ChipsRow } from '@/components/chat/ChipsRow';
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation';

// ConversationScrollButton (ai-elements) hardcodes an icon-only child, which
// can't be swapped for the mock's text pill — so this reads the same
// use-stick-to-bottom context directly instead.
function JumpToLatest() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;
  return (
    <button
      type="button"
      onClick={() => scrollToBottom()}
      className="mf-pill mf-fade-in absolute bottom-4 left-1/2 -translate-x-1/2"
    >
      Jump to latest
    </button>
  );
}

export function Thread({
  messages,
  chips,
  ctx,
  confirmResolutions,
  workingLabel,
  onSend,
}: {
  messages: ChatMessage[];
  chips: Chip[];
  ctx: CardActionContext;
  confirmResolutions: Record<string, 'approved' | 'rejected'>;
  workingLabel: string | null;
  onSend: (text: string) => void;
}) {
  return (
    <Conversation className="w-full min-h-0">
      <ConversationContent className="mx-auto flex w-full max-w-[720px] flex-col gap-7 px-5 py-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} ctx={ctx} confirmResolutions={confirmResolutions} />
        ))}
        {workingLabel ? <WorkingRow label={workingLabel} /> : null}
        {!workingLabel ? <ChipsRow chips={chips} onSend={onSend} /> : null}
      </ConversationContent>
      <JumpToLatest />
    </Conversation>
  );
}
