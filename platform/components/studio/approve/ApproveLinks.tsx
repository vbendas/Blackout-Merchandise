'use client';

import type { MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';
import { chatHref, cleanId } from './approve-logic';

/** The session to go back to. The page passes the one it read from ?from=;
 * the error and not-found screens have no props, so they leave it out and it
 * is read from the address here. */
function useSession(sessionId: string | null | undefined): string | null {
  const params = useSearchParams();
  return sessionId !== undefined ? sessionId : cleanId(params.get('from'));
}

/** The top bar's way back: the chevron before the title. It goes to the
 * session the artist came from (?from=), or a fresh one. */
export function BackLink({ sessionId }: { sessionId?: string | null }) {
  const session = useSession(sessionId);
  return (
    <Link href={chatHref(session)} className="ap-back" aria-label="Back to the conversation">
      <ChevronLeft className="mf-icon" aria-hidden />
    </Link>
  );
}

/** A link back to the chat that also hands it a message (the artist's own
 * click, so it sends: see askStudio). It is a real link: opened in a new tab
 * or window it simply goes to the chat. */
export function AskLink({ prompt, sessionId, className, children }: { prompt: string; sessionId: string | null; className?: string; children: ReactNode }) {
  const { askStudio } = useStudioSidebar();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    askStudio(prompt, sessionId ?? undefined);
  }

  return (
    <Link href={chatHref(sessionId)} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

/** Plain "back to the chat", for the places that have nothing to ask. */
export function ChatLink({ sessionId, className, children }: { sessionId?: string | null; className?: string; children: ReactNode }) {
  const session = useSession(sessionId);
  return (
    <Link href={chatHref(session)} className={className}>
      {children}
    </Link>
  );
}
