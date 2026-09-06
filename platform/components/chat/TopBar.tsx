'use client';

import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { RegisterMark } from '@/components/chat/RegisterMark';
import { Modal } from '@/components/ui/Modal';
import { ProjectPanel } from '@/components/cards/project/ProjectPanel';
import type { ProjectPill } from '@/components/chat/useConversation';
import type { CardActionContext } from '@/components/cards/actions';
import type { ToolUi } from '@/lib/ui-cards/schemas';

export function TopBar({
  showUser = true,
  projectPill,
  project,
  ctx,
}: {
  showUser?: boolean;
  projectPill: ProjectPill | null;
  project: ToolUi['project'] | null;
  ctx: CardActionContext;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="mf-hairline-b flex h-14 shrink-0 items-center justify-between px-5 md:h-16 md:px-8">
      <div className="flex items-center gap-2.5">
        <RegisterMark className="size-5" />
        <span className="mf-label">MERCHFROM</span>
      </div>
      <div className="flex items-center gap-3">
        {projectPill ? (
          <button type="button" onClick={() => setOpen(true)} className="mf-pill h-9 gap-2.5">
            {projectPill.colourHex ? (
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: projectPill.colourHex }} aria-hidden />
            ) : null}
            <span>{projectPill.label}</span>
            <span className="mf-label mf-dimmed">{projectPill.status}</span>
          </button>
        ) : null}
        {showUser ? <UserButton /> : <span className="mf-label mf-dimmed">Dev</span>}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={projectPill?.label}>
        <ProjectPanel project={project} ctx={ctx} />
      </Modal>
    </header>
  );
}
