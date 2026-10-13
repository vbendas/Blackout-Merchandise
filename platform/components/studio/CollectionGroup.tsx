'use client';

import { useEffect, useRef, useState } from 'react';
import type { StudioCollection, StudioSession } from '@/lib/studio/types';
import { RowMenu } from '@/components/studio/RowMenu';
import { InlineInput } from '@/components/studio/InlineInput';
import { SessionRow } from '@/components/studio/SessionRow';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';

/** A project in the sidebar: an expandable row listing its sessions, with a
 * "..." menu for Rename and Delete. Delete asks first, right under the row. */
export function CollectionGroup({
  collection,
  sessions,
  collections,
  activeId,
}: {
  collection: StudioCollection;
  sessions: StudioSession[];
  collections: StudioCollection[];
  activeId: string | null;
}) {
  const { renameCollection, deleteCollection } = useStudioSidebar();
  const holdsActive = sessions.some((s) => s.id === activeId);
  const [expanded, setExpanded] = useState(holdsActive);
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemRef = useRef<HTMLLIElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const listId = `collection-${collection.id}`;
  const open = expanded;

  // Opening a session in this project unfolds it once; after that the
  // project can still be folded up while its session stays open.
  const [wasHoldingActive, setWasHoldingActive] = useState(holdsActive);
  if (holdsActive !== wasHoldingActive) {
    setWasHoldingActive(holdsActive);
    if (holdsActive) setExpanded(true);
  }

  // The safe answer gets the focus when the question appears.
  useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  function keep() {
    setConfirming(false);
    // The row's menu button is where the question came from.
    queueMicrotask(() => itemRef.current?.querySelector<HTMLElement>('.mf-side-more')?.focus());
  }

  async function save(value: string) {
    setRenaming(false);
    const name = value.trim();
    if (!name || name === collection.name) return;
    const result = await renameCollection(collection.id, name.slice(0, 60));
    setError(result.ok ? null : result.error);
  }

  async function remove() {
    setDeleting(true);
    const result = await deleteCollection(collection.id);
    setDeleting(false);
    setError(result.ok ? null : result.error);
    if (result.ok) {
      // The row is gone with the project; park focus on the list's New project button.
      document.getElementById('studio-new-project')?.focus();
    } else {
      keep();
    }
  }

  return (
    <li ref={itemRef}>
      {renaming ? (
        <InlineInput
          label="Project name"
          initialValue={collection.name}
          maxLength={60}
          onSubmit={save}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <div className="mf-side-row">
          <button
            type="button"
            className="mf-side-link"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setExpanded(!open)}
            onKeyDown={(event) => {
              if (event.key === 'F2') {
                event.preventDefault();
                setRenaming(true);
              }
            }}
          >
            <svg
              viewBox="0 0 10 10"
              width="10"
              height="10"
              aria-hidden
              className="shrink-0 opacity-60 transition-transform duration-200"
              style={{ transform: open ? 'rotate(90deg)' : undefined }}
            >
              <path d="M3 1.5 6.5 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span className="min-w-0 flex-1 truncate">{collection.name}</span>
            <span aria-hidden className="mf-dimmed shrink-0 text-[12px] tabular-nums">
              {sessions.length}
            </span>
            <span className="sr-only">
              , {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
            </span>
          </button>
          <RowMenu
            label={`Options for ${collection.name}`}
            triggerClassName="mf-side-more"
            items={[
              { label: 'Rename', onSelect: () => setRenaming(true) },
              { label: 'Delete', onSelect: () => setConfirming(true) },
            ]}
          />
        </div>
      )}
      {confirming ? (
        <div
          role="group"
          aria-label={`Delete ${collection.name}`}
          className="mf-confirm"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            keep();
          }}
        >
          <p>Delete this project? Its sessions stay.</p>
          <div className="mf-confirm-actions">
            <button type="button" ref={keepRef} onClick={keep} disabled={deleting} className="mf-ulink disabled:opacity-40">
              Keep
            </button>
            <button type="button" onClick={() => void remove()} disabled={deleting} className="mf-ulink disabled:opacity-40">
              Delete
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="px-2.5 pt-1 pb-2 text-[12px] leading-[16px] text-[color:var(--danger)]">
          {error}
        </p>
      ) : null}
      {open ? (
        <ul id={listId} aria-label={collection.name} className="flex flex-col gap-px">
          {sessions.length === 0 ? (
            <li className="mf-dimmed py-2 pr-2.5 pl-[34px] text-[13px]">No sessions yet</li>
          ) : (
            sessions.map((s) => (
              <SessionRow key={s.id} session={s} active={s.id === activeId} collections={collections} indent />
            ))
          )}
        </ul>
      ) : null}
    </li>
  );
}
