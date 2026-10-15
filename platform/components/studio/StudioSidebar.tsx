'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { AccountMenu } from '@/components/studio/AccountMenu';
import { CollectionGroup } from '@/components/studio/CollectionGroup';
import { InlineInput } from '@/components/studio/InlineInput';
import { SessionRow } from '@/components/studio/SessionRow';
import { ShopBlock } from '@/components/studio/ShopBlock';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';
import './studio.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

export function activeSessionId(pathname: string): string | null {
  const match = /^\/studio\/s\/([^/?#]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

export function MenuButton({ className }: { className?: string }) {
  const { drawerOpen, setDrawerOpen } = useStudioSidebar();
  // The wrapper carries md:hidden: .mf-icon-btn sets its own display.
  return (
    <span className={`shrink-0 md:hidden ${className ?? ''}`}>
      <button
        type="button"
        aria-label="Open sessions"
        aria-controls="studio-sidebar"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
        className="mf-icon-btn mf-icon-btn-ghost size-10"
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 6h14M3 10h14M3 14h14" />
        </svg>
      </button>
    </span>
  );
}

function SectionLabel({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 id={id} className="mf-label mf-dimmed px-2.5 text-[11px]">
      {children}
    </h2>
  );
}

function SkeletonRows() {
  return (
    <div aria-hidden className="flex flex-col gap-2 px-2.5 py-1.5">
      <div className="mf-skel h-3.5 w-[78%]" />
      <div className="mf-skel h-3.5 w-[62%]" />
      <div className="mf-skel h-3.5 w-[70%]" />
    </div>
  );
}

/** The Studio's left column: New session, the Shop block, Drops (each
 * holding its sessions), ungrouped Sessions, the admin pages this person may
 * open and the account footer. Fixed at 272px on desktop; an off-canvas
 * drawer below 768px. */
export function StudioSidebar() {
  const pathname = usePathname();
  const { account, data, loading, loadError, refresh, createCollection, drawerOpen, setDrawerOpen, newSession } =
    useStudioSidebar();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const asideRef = useRef<HTMLElement>(null);
  const activeId = activeSessionId(pathname);
  // Drops belong to a shop: the owner and staff have none.
  const showCollections = account.role === 'artist' && Boolean(account.shopName);

  // Drawer (phones): focus moves in on open and stays inside while it is open,
  // the page behind goes inert (no focus, no taps, hidden from screen
  // readers), Escape closes, and focus returns to the opener on close. Past
  // the phone width the sidebar is a fixed column again, so the drawer closes.
  useEffect(() => {
    if (!drawerOpen) return;
    const aside = asideRef.current;
    const shell = aside?.parentElement;
    if (!aside || !shell) return;
    const drawer: HTMLElement = aside;

    const opener = document.activeElement as HTMLElement | null;
    const inerted: HTMLElement[] = [];
    for (const child of Array.from(shell.children)) {
      if (child === aside || child.classList.contains('mf-scrim') || !(child instanceof HTMLElement)) continue;
      child.inert = true;
      inerted.push(child);
    }
    drawer.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        setDrawerOpen(false);
        return;
      }
      // A row menu open over the drawer (portalled to <body>) handles its own Tab.
      if (event.key !== 'Tab' || !drawer.contains(document.activeElement)) return;
      const items = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    const phone = window.matchMedia('(max-width: 767px)');
    function onWidthChange() {
      if (!phone.matches) setDrawerOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    phone.addEventListener('change', onWidthChange);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      phone.removeEventListener('change', onWidthChange);
      for (const element of inerted) element.inert = false;
      if (opener?.isConnected) opener.focus();
    };
  }, [drawerOpen, setDrawerOpen]);

  async function create(name: string) {
    setCreating(false);
    const result = await createCollection(name.trim().slice(0, 60));
    setCreateError(result.ok ? null : result.error);
  }

  const collections = data?.collections ?? [];
  const sessions = data?.sessions ?? [];
  const knownCollections = new Set(collections.map((c) => c.id));
  const ungrouped = showCollections
    ? sessions.filter((s) => !s.collectionId || !knownCollections.has(s.collectionId))
    : sessions;

  return (
    <>
      {drawerOpen ? <div className="mf-scrim md:hidden" aria-hidden onClick={() => setDrawerOpen(false)} /> : null}
      <aside
        id="studio-sidebar"
        ref={asideRef}
        className="mf-sidebar"
        data-open={drawerOpen}
        role={drawerOpen ? 'dialog' : undefined}
        aria-modal={drawerOpen ? true : undefined}
        aria-label="Studio"
      >
        {/* the logo sits centred; on phones the close button keeps to the right edge */}
        <div className="relative flex shrink-0 items-center justify-center px-4 pt-5 pb-4">
          <Link href="/studio" onClick={newSession} className="block">
            <Logo height={88} priority />
          </Link>
          {/* wrapper carries md:hidden: .mf-icon-btn sets its own display */}
          <span className="absolute right-4 md:hidden">
            <button
              type="button"
              aria-label="Close sessions"
              onClick={() => setDrawerOpen(false)}
              className="mf-icon-btn mf-icon-btn-ghost size-9"
            >
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 5l10 10M15 5 5 15" />
              </svg>
            </button>
          </span>
        </div>
        <div className="shrink-0 px-3 pb-4">
          <Link
            href="/studio"
            onClick={newSession}
            className="mf-pill w-full"
            aria-current={pathname === '/studio' && !activeId ? 'page' : undefined}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2.5v11M2.5 8h11" />
            </svg>
            New session
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-3 pb-4">
          <ShopBlock />
          <nav aria-label="Sessions" className="flex flex-col gap-6">
            {showCollections ? (
              <section aria-labelledby="studio-collections-label" className="flex flex-col gap-1.5">
                <div className="flex h-7 items-center justify-between pr-1">
                  <SectionLabel id="studio-collections-label">Drops</SectionLabel>
                  <button
                    type="button"
                    id="studio-new-drop"
                    aria-label="New drop"
                    onClick={() => {
                      setCreateError(null);
                      setCreating(true);
                    }}
                    className="mf-icon-btn mf-icon-btn-ghost size-7"
                  >
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 2.5v11M2.5 8h11" />
                    </svg>
                  </button>
                </div>
                {creating ? (
                  <InlineInput
                    label="New drop name"
                    placeholder="Drop name"
                    maxLength={60}
                    onSubmit={create}
                    onCancel={() => setCreating(false)}
                  />
                ) : null}
                {createError ? (
                  <p role="alert" className="px-2.5 text-[12px] leading-[16px] text-[color:var(--danger)]">
                    {createError}
                  </p>
                ) : null}
                {loading ? (
                  <SkeletonRows />
                ) : loadError && !data ? null : collections.length === 0 && !creating ? (
                  <p className="mf-dimmed px-2.5 text-[13px] leading-[18px]">Group sessions by drop.</p>
                ) : (
                  <ul aria-labelledby="studio-collections-label" className="flex flex-col gap-px">
                    {collections.map((c) => (
                      <CollectionGroup
                        key={c.id}
                        collection={c}
                        sessions={sessions.filter((s) => s.collectionId === c.id)}
                        collections={collections}
                        activeId={activeId}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            <section aria-labelledby="studio-sessions-label" className="flex flex-col gap-1.5">
              <div className="flex h-7 items-center">
                <SectionLabel id="studio-sessions-label">Sessions</SectionLabel>
              </div>
              {loading ? (
                <SkeletonRows />
              ) : loadError && !data ? (
                <p className="px-2.5 text-[13px] leading-[18px]">
                  <span className="mf-dimmed">Couldn&rsquo;t load your sessions. </span>
                  <button type="button" onClick={() => void refresh()} className="mf-ulink text-[11px]">
                    Retry
                  </button>
                </p>
              ) : ungrouped.length === 0 ? (
                <p className="mf-dimmed px-2.5 text-[13px] leading-[18px]">
                  {sessions.length === 0 ? 'Your sessions will appear here.' : 'Every session is in a drop.'}
                </p>
              ) : (
                <ul aria-labelledby="studio-sessions-label" className="flex flex-col gap-px">
                  {ungrouped.map((s) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      active={s.id === activeId}
                      collections={showCollections ? collections : null}
                    />
                  ))}
                </ul>
              )}
            </section>
          </nav>
        </div>

        {account.adminLinks.length > 0 ? (
          <nav aria-label="Admin" className="mf-hairline-t flex shrink-0 flex-wrap gap-x-5 gap-y-1 px-5 py-3">
            {account.adminLinks.map((link) => (
              <Link key={link.href} href={link.href} className="mf-ulink">
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="mf-hairline-t shrink-0 px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
          <AccountMenu />
        </div>
      </aside>
    </>
  );
}
