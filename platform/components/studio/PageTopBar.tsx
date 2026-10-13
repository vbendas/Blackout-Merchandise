import type { ReactNode } from 'react';
import { MenuButton } from '@/components/studio/StudioSidebar';

/** The top bar of a Studio page that is not a conversation (Catalogue,
 * Settings, Billing): the same bar as the chat page's (components/chat/
 * TopBar.tsx), 64px tall (56px on phones, with the button that opens the
 * sidebar), a hairline under it, 32px of padding at the sides, the title in
 * 15px at the left and the page's own controls at the right. It stays at the
 * top while the page scrolls under it.
 *
 * `lead` sits before the title (a way back), `meta` after it (a count), and
 * `children` fill the right side (a search field). */
export function PageTopBar({
  title,
  lead,
  meta,
  children,
}: {
  title: string;
  lead?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mf-hairline-b sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 bg-[var(--paper)] pr-4 pl-2 md:h-16 md:px-8">
      <div className="flex min-w-0 items-center gap-1">
        <MenuButton />
        {lead}
        <h1 className="min-w-0 truncate pl-1 text-[15px] leading-[20px] font-medium tracking-[-0.01em] md:pl-0">{title}</h1>
        {meta ? <span className="mf-meta shrink-0 pl-2.5">{meta}</span> : null}
      </div>
      {children ? <div className="flex min-w-0 shrink-0 items-center gap-3">{children}</div> : null}
    </header>
  );
}
