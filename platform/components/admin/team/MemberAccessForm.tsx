'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { saveMemberAction } from '@/app/(chat)/admin/team/actions';
import { normalisePermissions, STAFF_AREAS, type PermissionMap } from '@/lib/auth/permissions';
import { AccessGrid, PresetPicker } from '@/components/admin/team/AccessGrid';

function sameAccess(a: PermissionMap, b: PermissionMap): boolean {
  const left = normalisePermissions(a);
  const right = normalisePermissions(b);
  return STAFF_AREAS.every((area) => (left[area] ?? 'none') === (right[area] ?? 'none'));
}

/** An employee's job title and access grid. Saved together; the change
 * counts from their next request. */
export function MemberAccessForm({ userId, initialPermissions, initialTitle }: { userId: string; initialPermissions: PermissionMap; initialTitle: string }) {
  const router = useRouter();
  const [permissions, setPermissions] = useState<PermissionMap>(initialPermissions);
  const [title, setTitle] = useState(initialTitle);
  const [saved, setSaved] = useState({ permissions: initialPermissions, title: initialTitle });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const changed = !sameAccess(permissions, saved.permissions) || title.trim() !== saved.title.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await saveMemberAction(userId, { permissions: permissions as Record<string, string>, title });
        if (result.error) {
          setError(result.error);
          return;
        }
        setSaved({ permissions, title });
        setNotice('Saved. It counts from their next click.');
        router.refresh();
      } catch {
        setError('That did not go through. Please try again.');
      }
    });
  }

  return (
    <form className="tm-section" onSubmit={submit}>
      <div className="tm-fields">
        <label className="tm-field">
          <span className="tm-dim">Job title</span>
          <input className="mf-field" type="text" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </div>
      <PresetPicker value={permissions} onPick={setPermissions} disabled={pending} />
      <AccessGrid idPrefix={`member-${userId}`} value={permissions} onChange={setPermissions} disabled={pending} />
      {error ? (
        <p role="alert" className="tm-notice" data-tone="strong">
          {error}
        </p>
      ) : null}
      <div className="tm-actions">
        <button type="submit" className="tm-btn tm-btn-primary" disabled={pending || !changed}>
          {pending ? 'Saving' : 'Save access'}
        </button>
        {notice && !changed ? (
          <span role="status" className="tm-dim">
            {notice}
          </span>
        ) : null}
      </div>
    </form>
  );
}
