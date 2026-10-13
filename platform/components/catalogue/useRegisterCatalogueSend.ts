'use client';

import { useEffect, useRef } from 'react';
import type { SendOutcome } from '@/components/chat/useConversation';
import { useOptionalCatalogue } from './CatalogueProvider';

/** Lets the catalogue ("Use this blank", "Quote a run") send into this
 * session while it is mounted; ChatShell calls it with its sendText. A reply
 * still coming in does not drop the message: it is sent when that reply ends.
 * Does nothing outside the Studio. */
export function useRegisterCatalogueSend(sendText: (text: string) => Promise<SendOutcome>, sending: boolean) {
  const registerSend = useOptionalCatalogue()?.registerSend;
  const sendRef = useRef(sendText);
  const waiting = useRef<string | null>(null);

  useEffect(() => {
    sendRef.current = sendText;
  }, [sendText]);

  useEffect(() => {
    if (!registerSend) return;
    registerSend((text) => {
      void sendRef.current(text).then((outcome) => {
        if (outcome === 'busy') waiting.current = text;
      });
    });
    return () => registerSend(null);
  }, [registerSend]);

  useEffect(() => {
    if (sending || waiting.current === null) return;
    const text = waiting.current;
    waiting.current = null;
    void sendRef.current(text);
  }, [sending]);
}
