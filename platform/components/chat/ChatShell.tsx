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
import { NeedsYou } from '@/components/studio/NeedsYou';
import { NoticeLine } from '@/components/studio/NoticeLine';
import { PromptParam } from '@/components/studio/PromptParam';
import { ThreadSkeleton } from '@/components/studio/ThreadSkeleton';
import { useOptionalStudioSidebar } from '@/components/studio/StudioSidebarProvider';
import { useMediaQuery } from '@/components/studio/useMediaQuery';
import '@/components/studio/studio.css';

const SETTLE = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };
// How long a fresh home waits for the shop's state before showing without it.
const HOME_WAIT_MS = 1500;

/** One Studio session: header, thread (or the home screen) and composer.
 * Without `sessionId` it starts a fresh session on the home screen and, once
 * the first message is answered, moves the URL to /studio/s/<id> in place. */
export function ChatShell({ sessionId }: { sessionId?: string }) {
  const router = useRouter();
  const sidebar = useOptionalStudioSidebar();
  const refreshSidebar = sidebar?.refresh;
  const refreshHome = sidebar?.refreshHome;
  const home = sidebar?.home ?? null;
  const isPhone = useMediaQuery('(max-width: 767px)');
  const hasSidebar = Boolean(sidebar);
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
  // Titles are set server-side from the first user message; pick them up. A
  // turn can also change what needs the artist (a proof sent, a run paid).
  const onTurnEnd = useCallback(() => {
    void refreshSidebar?.();
    void refreshHome?.();
  }, [refreshSidebar, refreshHome]);

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
    stop,
    earlier,
  } = useConversation({ initialConversationId: sessionId, onMessageStart, onTurnEnd });

  // A prompt from a link only fills the composer; one from an in-app button
  // (askStudio: the artist's own click) is sent once the fresh session is ready.
  const [promptDraft, setPromptDraftState] = useState<{ id: number; text: string } | null>(null);
  const setPromptDraft = useCallback((text: string) => setPromptDraftState({ id: Date.now(), text }), []);
  const takePendingPrompt = sidebar?.takePendingPrompt;
  const freshReady = !sessionId && !loadingHistory && !historyError;
  useEffect(() => {
    if (!freshReady || !takePendingPrompt) return;
    const prompt = takePendingPrompt();
    if (prompt) void sendText(prompt);
  }, [freshReady, takePendingPrompt, sendText]);

  // The home screen waits a moment for the shop's state, so Needs you is there
  // on the first paint instead of pushing the composer up when it arrives.
  const [homeWaitOver, setHomeWaitOver] = useState(false);
  useEffect(() => {
    if (!hasSidebar || home !== null) return;
    const timer = window.setTimeout(() => setHomeWaitOver(true), HOME_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [hasSidebar, home]);
  const waitingForHome = !sessionId && hasSidebar && home === null && !homeWaitOver && messages.length === 0;

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
  // Suggestions: always docked with the composer on phones; on larger screens
  // only once the home has loaded and nothing is waiting on the artist.
  const showChips = isEmpty && quickActions.length > 0 && (isPhone || (home !== null && home.needsYou.length === 0));

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <TopBar
        title={title}
        showMenu={Boolean(sidebar)}
        projectPill={projectPill}
        project={project}
        liveRun={isEmpty ? (home?.liveRun ?? null) : null}
        ctx={ctx}
      />
      <Suspense fallback={null}>
        <NoticeLine />
        {/* /studio?prompt=…: fills the composer of the fresh session; the artist sends it */}
        <PromptParam ready={!sessionId && !loadingHistory && !historyError} onPrompt={setPromptDraft} />
      </Suspense>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loadingHistory || waitingForHome ? (
          <ThreadSkeleton variant={sessionId ? 'thread' : 'home'} />
        ) : (
          // Home: one 720px column, centred in the free height and scrolling
          // from its top when the screen is short. On phones the dock (chips
          // and composer) moves last and sticks to the bottom. The dock is as
          // wide as the thread's composer row, so the composer only moves, never
          // stretches, when the first message sends it to the bottom.
          <div className={isEmpty ? 'mf-home' : 'flex min-h-0 flex-1 flex-col items-center'}>
            {historyError && isEmpty ? (
              <p role="alert" className="flex w-full max-w-[720px] items-baseline gap-3 text-[15px]">
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
                  className="w-full max-w-[720px] max-md:order-1"
                >
                  <EmptyGreeting greeting={greeting} home={home} />
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
                earlier={earlier}
              />
            ) : null}
            <div
              className={
                isEmpty
                  ? 'mf-dock w-full pt-9 max-md:order-5 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:mt-auto max-md:bg-[var(--paper)] max-md:pt-3 max-md:pb-[max(1.5rem,env(safe-area-inset-bottom))]'
                  : 'flex w-full shrink-0 justify-center px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] md:px-10 md:pb-8'
              }
            >
              {showChips ? (
                <QuickActionsRow actions={quickActions} onSend={sendText} onUploadClick={upload.openPicker} />
              ) : null}
              <motion.div layout transition={SETTLE} className="flex w-full justify-center">
                <Composer
                  onSend={sendText}
                  disabled={sending}
                  dropdownPosition={isEmpty && !isPhone ? 'below' : 'above'}
                  upload={upload}
                  isDragging={isDragging}
                  onOpenVoice={() => setVoiceOpen(true)}
                  onStop={stop}
                  streaming={sending}
                  draft={promptDraft}
                />
              </motion.div>
            </div>
            {isEmpty && resume ? (
              <ResumeLine resume={resume} onOpen={openSession} className="mt-[18px] max-md:order-2 max-md:mt-6" />
            ) : null}
            {isEmpty && home && home.needsYou.length > 0 ? (
              <NeedsYou items={home.needsYou} onPrompt={sendText} className="mt-12 max-md:order-3 max-md:mt-8" />
            ) : null}
            {isEmpty && checklist ? (
              <div className="mt-8 w-full max-w-[720px] max-md:order-4 [&>div]:justify-start [&>div]:px-0">
                <ChecklistRow steps={checklist} onPrompt={sendText} />
              </div>
            ) : null}
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
