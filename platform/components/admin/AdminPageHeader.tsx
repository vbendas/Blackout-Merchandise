import type { ReactNode } from 'react';

/** The top bar of an admin page, matching the Studio's PageTopBar (64px, a
 * hairline under it, 32px sides, the title in 15px at the left, the page's
 * own controls at the right) without the Studio sidebar button. `lead` sits
 * before the title (a way back), `meta` after it (a count or run). */
export function AdminPageHeader({
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
    <header className="mf-hairline-b sticky top-0 z-20 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 bg-[var(--paper)] px-4 py-2 md:min-h-16 md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        {lead}
        <h1 className="min-w-0 truncate text-[15px] leading-[20px] font-medium tracking-[-0.01em]">{title}</h1>
        {meta ? <span className="mf-meta shrink-0 pl-2.5">{meta}</span> : null}
      </div>
      {children ? <div className="flex min-w-0 flex-wrap items-center gap-2.5">{children}</div> : null}
    </header>
  );
}
