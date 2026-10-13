'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { StudioCollection, StudioSession } from '@/lib/studio/types';
import { RowMenu, type MenuEntry } from '@/components/studio/RowMenu';
import { InlineInput } from '@/components/studio/InlineInput';
import { useStudioSidebar } from '@/components/studio/StudioSidebarProvider';

type Mode = 'idle' | 'rename' | 'new-collection';

/** One session in the sidebar: a link to /studio/s/<id>, with a "..." menu
 * for Rename and Move to collection. F2 on the focused link renames. */
export function SessionRow({
  session,
  active,
  collections,
  indent = false,
}: {
  session: StudioSession;
  active: boolean;
  /** null: no store (admins), so no Move to collection */
  collections: StudioCollection[] | null;
  indent?: boolean;
}) {
  const { renameSession, moveSession, createCollection, setDrawerOpen } = useStudioSidebar();
  const [mode, setMode] = useState<Mode>('idle');
  const [error, setError] = useState<string | null>(null);

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

  const items: MenuEntry[] = [{ label: 'Rename', onSelect: () => setMode('rename') }];
  if (collections) {
    items.push({
      label: 'Move to project',
      submenu: [
        ...collections.map((c) => ({
          label: c.name,
          checked: session.collectionId === c.id,
          onSelect: () => void move(c.id),
        })),
        { label: 'No collection', checked: session.collectionId === null, onSelect: () => void move(null) },
        'separator' as const,
        { label: 'New project...', onSelect: () => setMode('new-collection') },
      ],
    });
  }

  if (mode !== 'idle') {
    return (
      <li className={indent ? 'pl-3' : undefined}>
        <InlineInput
          label={mode === 'rename' ? 'Session name' : 'New project name'}
          initialValue={mode === 'rename' ? session.title : ''}
          placeholder={mode === 'rename' ? undefined : 'Project name'}
          maxLength={mode === 'rename' ? 80 : 60}
          onSubmit={mode === 'rename' ? saveTitle : createAndMove}
          onCancel={() => setMode('idle')}
        />
      </li>
    );
  }

  return (
    <li className={indent ? 'pl-3' : undefined}>
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
        <RowMenu label={`Options for ${session.title}`} items={items} triggerClassName="mf-side-more" />
      </div>
      {error ? (
        <p role="alert" className="px-2.5 pt-1 pb-2 text-[12px] leading-[16px] text-[color:var(--danger)]">
          {error}
        </p>
      ) : null}
    </li>
  );
}
