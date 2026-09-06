'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { CardActionContext } from '@/components/cards/actions';
import { useConversation } from '@/components/chat/useConversation';
import { TopBar } from '@/components/chat/TopBar';
import { Thread } from '@/components/chat/Thread';
import { Composer } from '@/components/chat/Composer';
import { EmptyGreeting, QuickActionsRow } from '@/components/chat/EmptyState';
import { ChecklistRow } from '@/components/chat/ChecklistRow';
import { Spinner } from '@/components/ui/spinner';

const SETTLE = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

export function ChatShell({ showUser = true }: { showUser?: boolean }) {
  const {
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
  } = useConversation();

  const ctx: CardActionContext = {
    onPrompt: sendText,
    onConfirm: resolveConfirm,
  };
  const isEmpty = messages.length === 0;

  return (
    <div className="mf-app flex h-dvh flex-col">
      <TopBar showUser={showUser} projectPill={projectPill} project={project} ctx={ctx} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loadingHistory ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div
            className={
              isEmpty
                ? 'flex min-h-0 flex-1 flex-col items-center justify-center gap-7 overflow-hidden pb-6 md:px-10 md:pb-[60px]'
                : 'flex min-h-0 flex-1 flex-col items-center'
            }
          >
            <AnimatePresence mode="popLayout">
              {isEmpty ? (
                <motion.div
                  key="empty-intro"
                  layout
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex w-full min-w-0 flex-col items-center gap-7"
                >
                  <EmptyGreeting greeting={greeting} />
                  <QuickActionsRow actions={quickActions} onSend={sendText} />
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
                  ? 'flex w-full shrink-0 justify-center px-4 pb-5 md:px-0 md:pb-0'
                  : 'flex w-full shrink-0 justify-center px-5 pb-7 md:px-10 md:pb-8'
              }
            >
              <Composer onSend={sendText} disabled={sending} dropdownPosition={isEmpty ? 'below' : 'above'} />
            </motion.div>
            {isEmpty && checklist ? <ChecklistRow steps={checklist} onPrompt={sendText} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}
