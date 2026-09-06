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
  role,
  projectPill,
  project,
  ctx,
}: {
  showUser?: boolean;
  /** admin session role — shows the Production/Supplier links next to the pill */
  role?: 'artist' | 'admin';
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
        {role === 'admin' ? (
          <nav className="mf-dimmed hidden items-center gap-3 text-[11px] uppercase tracking-wide sm:flex">
            <a href="/admin/production" className="mf-tint-hover rounded px-1 py-1 hover:opacity-100">
              Production
            </a>
            <a href="/admin/supplier" className="mf-tint-hover rounded px-1 py-1 hover:opacity-100">
              Supplier
            </a>
          </nav>
        ) : null}
        {projectPill ? (
          // The bulk_order pill's label ('Bulk · 40 × Cruiser 2.0') runs
          // longer than a product pill's, so this caps and truncates instead
          // of letting the nowrap pill push the header into horizontal
          // scroll on narrow viewports.
          <button type="button" onClick={() => setOpen(true)} className="mf-pill h-9 max-w-[54vw] gap-2 overflow-hidden sm:max-w-xs sm:gap-2.5">
            {projectPill.colourHex ? (
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: projectPill.colourHex }} aria-hidden />
            ) : null}
            <span className="min-w-0 flex-[2] truncate">{projectPill.label}</span>
            <span className="mf-label mf-dimmed min-w-0 flex-1 truncate text-right">{projectPill.status}</span>
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
