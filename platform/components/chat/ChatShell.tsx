'use client';

import { Suspense, useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import type { CardActionContext } from '@/components/cards/actions';
import { useConversation } from '@/components/chat/useConversation';
import { useUpload } from '@/components/chat/useUpload';
import { TopBar } from '@/components/chat/TopBar';
import { Thread } from '@/components/chat/Thread';
import { Composer } from '@/components/chat/Composer';
import { VoiceOverlay } from '@/components/chat/VoiceOverlay';
import { EmptyGreeting, QuickActionsRow, ResumeLine } from '@/components/chat/EmptyState';
import { ChecklistRow } from '@/components/chat/ChecklistRow';
import { NoticeLine } from '@/components/studio/NoticeLine';
import { ThreadSkeleton } from '@/components/studio/ThreadSkeleton';
import { useOptionalStudioSidebar } from '@/components/studio/StudioSidebarProvider';

const SETTLE = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

/** One Studio session: header, thread (or the home screen) and composer.
 * Without `sessionId` it starts a fresh session on the home screen and, once
 * the first message is answered, moves the URL to /studio/s/<id> in place. */
export function ChatShell({ sessionId }: { sessionId?: string }) {
  const router = useRouter();
  const sidebar = useOptionalStudioSidebar();
  const refreshSidebar = sidebar?.refresh;
  // A fresh session keeps /studio until its first reply starts.
  const urlSettled = useRef(Boolean(sessionId));

  const onMessageStart = useCallback(
    (id: string) => {
      if (urlSettled.current || !id) return;
      urlSettled.current = true;
      // Native history API: syncs with usePathname without a navigation, so
      // this shell (and its stream) stays mounted.
      window.history.replaceState(null, '', `/studio/s/${encodeURIComponent(id)}`);
      void refreshSidebar?.();
    },
    [refreshSidebar],
  );
  // Titles are set server-side from the first user message; pick them up.
  const onTurnEnd = useCallback(() => void refreshSidebar?.(), [refreshSidebar]);

  const {
    conversationId,
    messages,
    chips,
    project,
    greeting,
    quickActions,
    checklist,
    projectPill,
    resume,
    workingLabel,
    sending,
    loadingHistory,
    historyError,
    retryHistory,
    confirmResolutions,
    onAssistantDone,
    sendText,
    resolveConfirm,
  } = useConversation({ initialConversationId: sessionId, onMessageStart, onTurnEnd });

  // /studio/s/<id> with an id that is not the user's: the history endpoint
  // falls back to another conversation, so make the URL match what is shown.
  useEffect(() => {
    if (sessionId && conversationId && conversationId !== sessionId) {
      window.history.replaceState(null, '', `/studio/s/${encodeURIComponent(conversationId)}`);
    }
  }, [sessionId, conversationId]);

  const openSession = useCallback((id: string) => router.push(`/studio/s/${encodeURIComponent(id)}`), [router]);

  const upload = useUpload();
  const [isDragging, setIsDragging] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const dragDepth = useRef(0);

  const onDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }, []);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('Files')) event.preventDefault();
  }, []);

  const onDragLeave = useCallback(() => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer.files?.length) return;
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      upload.upload(event.dataTransfer.files);
    },
    [upload],
  );

  const ctx: CardActionContext = {
    onPrompt: sendText,
    onConfirm: resolveConfirm,
    onUploadClick: upload.openPicker,
  };
  const isEmpty = messages.length === 0;
  const title = (conversationId && sidebar?.titleFor(conversationId)) || 'New session';

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <TopBar title={title} showMenu={Boolean(sidebar)} projectPill={projectPill} project={project} ctx={ctx} />
      <Suspense fallback={null}>
        <NoticeLine />
      </Suspense>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loadingHistory ? (
          <ThreadSkeleton variant={sessionId ? 'thread' : 'home'} />
        ) : (
          <div
            className={
              isEmpty
                ? 'flex min-h-0 flex-1 flex-col items-center justify-center gap-7 overflow-hidden pb-6 md:px-10 md:pb-[60px]'
                : 'flex min-h-0 flex-1 flex-col items-center'
            }
          >
            {historyError && isEmpty ? (
              <p role="alert" className="flex w-full items-baseline gap-3 px-6 text-[15px] md:justify-center md:px-0">
                <span className="mf-dimmed">
                  {sessionId ? 'This session could not be opened.' : 'The Studio could not load just now.'}
                </span>
                <button type="button" onClick={() => void retryHistory()} className="mf-ulink">
                  Retry
                </button>
              </p>
            ) : null}
            <AnimatePresence mode="popLayout">
              {isEmpty && !historyError ? (
                <motion.div
                  key="empty-intro"
                  layout
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex w-full min-w-0 flex-col items-center gap-7"
                >
                  <EmptyGreeting greeting={greeting} />
                  <QuickActionsRow actions={quickActions} onSend={sendText} onUploadClick={upload.openPicker} />
                </motion.div>
              ) : null}
            </AnimatePresence>
            {!isEmpty ? (
              <Thread
                messages={messages}
                chips={chips}
                ctx={ctx}
                confirmResolutions={confirmResolutions}
                workingLabel={workingLabel}
                onSend={sendText}
              />
            ) : null}
            <motion.div
              layout
              transition={SETTLE}
              className={
                isEmpty
                  ? 'flex w-full shrink-0 justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-0 md:pb-0'
                  : 'flex w-full shrink-0 justify-center px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] md:px-10 md:pb-8'
              }
            >
              <Composer
                onSend={sendText}
                disabled={sending}
                dropdownPosition={isEmpty ? 'below' : 'above'}
                upload={upload}
                isDragging={isDragging}
                onOpenVoice={() => setVoiceOpen(true)}
              />
            </motion.div>
            {isEmpty && resume ? <ResumeLine resume={resume} onOpen={openSession} /> : null}
            {isEmpty && checklist ? <ChecklistRow steps={checklist} onPrompt={sendText} /> : null}
          </div>
        )}
      </div>
      <VoiceOverlay
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        sendText={sendText}
        onAssistantDone={onAssistantDone}
      />
    </div>
  );
}
