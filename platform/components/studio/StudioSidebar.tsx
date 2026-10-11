'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AccountMenu } from '@/components/studio/AccountMenu';
import { CollectionGroup } from '@/components/studio/CollectionGroup';
import { InlineInput } from '@/components/studio/InlineInput';
import { SessionRow } from '@/components/studio/SessionRow';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';

const ADMIN_LINKS = [
  { label: 'Production', href: '/admin/production' },
  { label: 'Supplier', href: '/admin/supplier' },
];

export function activeSessionId(pathname: string): string | null {
  const match = /^\/studio\/s\/([^/?#]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Chat routes render their own header (TopBar) with the drawer button. */
export function isChatRoute(pathname: string): boolean {
  return pathname === '/studio' || pathname.startsWith('/studio/s/');
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

/** The Studio's left column: New session, Collections (each holding its
 * sessions), ungrouped Sessions, admin links and the account footer. Fixed at
 * 272px on desktop; an off-canvas drawer below 768px. */
export function StudioSidebar() {
  const pathname = usePathname();
  const { account, data, loading, loadError, refresh, createCollection, drawerOpen, setDrawerOpen, newSession } =
    useStudioSidebar();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const asideRef = useRef<HTMLElement>(null);
  const activeId = activeSessionId(pathname);
  const showCollections = account.role !== 'admin' && Boolean(account.shopName);

  // Drawer: focus moves in on open, Escape closes, focus returns on close.
  useEffect(() => {
    if (!drawerOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    asideRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) setDrawerOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
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
        aria-label="Studio"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-5 pb-4">
          <Link href="/studio" onClick={newSession} className="mf-label tracking-[0.12em]">
            MERCHFROM
          </Link>
          {/* wrapper carries md:hidden: .mf-icon-btn sets its own display */}
          <span className="md:hidden">
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
            className="mf-pill w-full justify-start gap-2.5"
            aria-current={pathname === '/studio' && !activeId ? 'page' : undefined}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2.5v11M2.5 8h11" />
            </svg>
            New session
          </Link>
        </div>

        <nav aria-label="Sessions" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-3 pb-4">
          {showCollections ? (
            <section aria-labelledby="studio-collections-label" className="flex flex-col gap-1.5">
              <div className="flex h-7 items-center justify-between pr-1">
                <SectionLabel id="studio-collections-label">Collections</SectionLabel>
                <button
                  type="button"
                  aria-label="New collection"
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
                  label="New collection name"
                  placeholder="Collection name"
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
                <p className="mf-dimmed px-2.5 text-[13px] leading-[18px]">Group sessions and products by drop.</p>
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
                {sessions.length === 0 ? 'Your sessions will appear here.' : 'Every session is in a collection.'}
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

        {account.role === 'admin' ? (
          <div className="mf-hairline-t flex shrink-0 gap-5 px-5 py-3">
            {ADMIN_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="mf-ulink">
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mf-hairline-t shrink-0 px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
          <AccountMenu />
        </div>
      </aside>
    </>
  );
}

/** Mobile header for Studio pages that are not chat (Settings, Billing):
 * just the drawer button and the wordmark. */
export function StudioPageBar() {
  const pathname = usePathname();
  if (isChatRoute(pathname)) return null;
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 px-3 md:hidden">
      <MenuButton />
      <span className="mf-label">Merch Studio</span>
    </div>
  );
}
