'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ProjectPanel } from '@/components/cards/project/ProjectPanel';
import { MenuButton } from '@/components/studio/StudioSidebar';
import type { ProjectPill } from '@/components/chat/useConversation';
import type { CardActionContext } from '@/components/cards/actions';
import type { ToolUi } from '@/lib/ui-cards/schemas';
import type { StudioHomeData } from '@/lib/services/studio-home';
import { humanStatus } from '@/lib/format/status';

/** Content header of a Studio session: on phones the drawer button, then
 * the session title, and on the right the active project pill. On the home
 * screen (a new session) the right side shows the live run instead. */
export function TopBar({
  title,
  showMenu = true,
  projectPill,
  project,
  liveRun = null,
  ctx,
}: {
  title: string;
  /** the drawer button needs the Studio shell around it */
  showMenu?: boolean;
  projectPill: ProjectPill | null;
  project: ToolUi['project'] | null;
  /** the run to point at, only passed on the home screen; a click asks the Studio about it */
  liveRun?: StudioHomeData['liveRun'];
  ctx: CardActionContext;
}) {
  const [open, setOpen] = useState(false);
  const status = humanStatus(projectPill?.status);

  return (
    <header className="mf-hairline-b flex h-14 shrink-0 items-center justify-between gap-3 pr-4 pl-2 md:h-16 md:px-8">
      <div className="flex min-w-0 items-center gap-1">
        {showMenu ? <MenuButton /> : null}
        <p className="min-w-0 truncate pl-1 text-[15px] leading-[20px] font-medium tracking-[-0.01em] md:pl-0">
          {title}
        </p>
      </div>
      {projectPill ? (
        // The bulk_order pill's label ('Run 3 · 40 × Heavy hoodie') runs
        // longer than a product pill's, so this caps and truncates instead
        // of letting the nowrap pill push the header into horizontal
        // scroll on narrow viewports.
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mf-pill max-w-[44vw] shrink-0 gap-2 overflow-hidden sm:max-w-md sm:gap-2.5"
        >
          {projectPill.colourHex ? (
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: projectPill.colourHex }} aria-hidden />
          ) : null}
          <span className="min-w-0 truncate">{projectPill.label}</span>
          {status ? <span className="mf-dimmed hidden shrink-0 sm:inline">{status}</span> : null}
        </button>
      ) : liveRun ? (
        // Stage words, not piece counts: 'On the press · Run 3'. The dot
        // pulses only while the run is on the press.
        <button
          type="button"
          onClick={() => ctx.onPrompt(`Open ${liveRun.label}`)}
          className="mf-pill max-w-[56vw] shrink-0 gap-2 overflow-hidden sm:max-w-md sm:gap-2.5"
        >
          {liveRun.stage === 'production' ? <i className="mf-dot mf-dot-pulse" aria-hidden /> : null}
          <span className="min-w-0 truncate">
            {liveRun.state}
            <span className="mf-dimmed hidden sm:inline"> · {liveRun.label}</span>
            <span className="sr-only sm:hidden">, {liveRun.label}</span>
          </span>
        </button>
      ) : null}
      <Modal open={open} onClose={() => setOpen(false)} title={projectPill?.label}>
        <ProjectPanel project={project} ctx={ctx} />
      </Modal>
    </header>
  );
}
