'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { SendOptions, SendOutcome } from '@/components/chat/useConversation';
import type { PendingPrompt } from '@/components/studio/StudioSidebarProvider';

interface UseAskedPromptOptions {
  /** the route's session id; none for a fresh session on the home screen */
  sessionId?: string;
  /** this session's history has loaded: only then can a message go into it */
  ready: boolean;
  /** a reply is coming in */
  sending: boolean;
  sendText: (text: string, attachments?: undefined, options?: SendOptions) => Promise<SendOutcome>;
  /** StudioSidebarProvider's: what an in-app button asked this session to send, once */
  takePendingPrompt?: (sessionId?: string) => PendingPrompt | null;
  /** a catalogue pick went out with the message, so it can leave the pick */
  onPickSent?: () => void;
}

/** A message an in-app button asked this session to send (askStudio: the
 * artist's own click, from Settings, the Shop block or the catalogue) goes out
 * once the session has loaded: a fresh one on the home screen, or the session
 * the button named. A reply still coming in does not drop it: it waits for
 * that reply to end. */
export function useAskedPrompt({ sessionId, ready, sending, sendText, takePendingPrompt, onPickSent }: UseAskedPromptOptions) {
  const waiting = useRef<PendingPrompt | null>(null);

  const sendAsked = useCallback(
    (asked: PendingPrompt) => {
      void sendText(asked.text, undefined, asked.pick ? { pick: asked.pick } : undefined).then((outcome) => {
        if (outcome === 'busy') waiting.current = asked;
        else if (outcome === 'sent' && asked.pick) onPickSent?.();
      });
    },
    [sendText, onPickSent],
  );

  useEffect(() => {
    if (!ready || !takePendingPrompt) return;
    const asked = takePendingPrompt(sessionId);
    if (asked) sendAsked(asked);
  }, [ready, takePendingPrompt, sessionId, sendAsked]);

  useEffect(() => {
    if (sending || waiting.current === null) return;
    const asked = waiting.current;
    waiting.current = null;
    sendAsked(asked);
  }, [sending, sendAsked]);
}
