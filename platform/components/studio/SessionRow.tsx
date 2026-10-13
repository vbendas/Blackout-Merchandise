'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { StudioCollection, StudioSession } from '@/lib/studio/types';
import { RowMenu, type MenuEntry } from '@/components/studio/RowMenu';
import { InlineInput } from '@/components/studio/InlineInput';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';

type Mode = 'idle' | 'rename' | 'new-collection' | 'delete';

/** One session in the sidebar: a link to /studio/s/<id>, with a "..." menu
 * for Rename, Move to drop and Delete. F2 on the focused link renames.
 * Delete asks first, right under the row. */
export function SessionRow({
  session,
  active,
  collections,
  indent = false,
}: {
  session: StudioSession;
  active: boolean;
  /** null: no store (admins), so no Move to drop */
  collections: StudioCollection[] | null;
  indent?: boolean;
}) {
  const {
    renameSession,
    moveSession,
    createCollection,
    deleteSession,
    deleteFailure,
    clearDeleteFailure,
    setDrawerOpen,
  } = useStudioSidebar();
  const [mode, setMode] = useState<Mode>('idle');
  const [error, setError] = useState<string | null>(null);
  const itemRef = useRef<HTMLLIElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  // A failed delete brings the row back as a fresh mount, so its notice comes from the provider.
  const shownError = error ?? (deleteFailure?.sessionId === session.id ? deleteFailure.message : null);

  // The safe answer gets the focus when the question appears.
  useEffect(() => {
    if (mode === 'delete') keepRef.current?.focus();
  }, [mode]);

  async function saveTitle(value: string) {
    setMode('idle');
    const title = value.trim();
    if (!title || title === session.title) return;
    const result = await renameSession(session.id, title.slice(0, 80));
    setError(result.ok ? null : result.error);
  }

  async function move(collectionId: string | null) {
    if (collectionId === session.collectionId) return;
    const result = await moveSession(session.id, collectionId);
    setError(result.ok ? null : result.error);
  }

  async function createAndMove(value: string) {
    setMode('idle');
    const name = value.trim();
    if (!name) return;
    const created = await createCollection(name.slice(0, 60));
    if (!created.ok) {
      setError(created.error);
      return;
    }
    await move(created.value.id);
  }

  function keep() {
    setMode('idle');
    // The row's menu button is where the question came from.
    queueMicrotask(() => itemRef.current?.querySelector<HTMLElement>('.mf-side-more')?.focus());
  }

  function remove() {
    // The row leaves the list now, so focus moves to a neighbouring session first.
    const neighbour = itemRef.current?.nextElementSibling ?? itemRef.current?.previousElementSibling;
    neighbour?.querySelector<HTMLElement>('a')?.focus();
    void deleteSession(session.id);
  }

  const items: MenuEntry[] = [{ label: 'Rename', onSelect: () => setMode('rename') }];
  if (collections) {
    items.push({
      label: 'Move to drop',
      submenu: [
        ...collections.map((c) => ({
          label: c.name,
          checked: session.collectionId === c.id,
          onSelect: () => void move(c.id),
        })),
        { label: 'No drop', checked: session.collectionId === null, onSelect: () => void move(null) },
        'separator' as const,
        { label: 'New drop...', onSelect: () => setMode('new-collection') },
      ],
    });
  }
  items.push('separator', { label: 'Delete', onSelect: () => setMode('delete') });

  if (mode === 'rename' || mode === 'new-collection') {
    return (
      <li className={indent ? 'pl-3' : undefined}>
        <InlineInput
          label={mode === 'rename' ? 'Session name' : 'New drop name'}
          initialValue={mode === 'rename' ? session.title : ''}
          placeholder={mode === 'rename' ? undefined : 'Drop name'}
          maxLength={mode === 'rename' ? 80 : 60}
          onSubmit={mode === 'rename' ? saveTitle : createAndMove}
          onCancel={() => setMode('idle')}
        />
      </li>
    );
  }

  return (
    <li ref={itemRef} className={indent ? 'pl-3' : undefined}>
      <div className="mf-side-row" data-active={active}>
        <Link
          href={`/studio/s/${session.id}`}
          className="mf-side-link"
          aria-current={active ? 'page' : undefined}
          title={session.title}
          onClick={() => setDrawerOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'F2') {
              event.preventDefault();
              setMode('rename');
            }
          }}
        >
          <span className="min-w-0 truncate">{session.title}</span>
        </Link>
        <RowMenu
          label={`Options for ${session.title}`}
          items={items}
          triggerClassName="mf-side-more"
          onOpenChange={(open) => {
            if (open) clearDeleteFailure(session.id);
          }}
        />
      </div>
      {mode === 'delete' ? (
        <div
          role="group"
          aria-label={`Delete ${session.title}`}
          className="mf-confirm"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            keep();
          }}
        >
          <p>Delete this session? This can&rsquo;t be undone.</p>
          <div className="mf-confirm-actions">
            <button type="button" ref={keepRef} onClick={keep} className="mf-ulink">
              Keep
            </button>
            <button type="button" onClick={remove} className="mf-ulink">
              Delete
            </button>
          </div>
        </div>
      ) : null}
      {shownError ? (
        <p role="alert" className="px-2.5 pt-1 pb-2 text-[12px] leading-[16px] text-[color:var(--danger)]">
          {shownError}
        </p>
      ) : null}
    </li>
  );
}
