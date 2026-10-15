'use client';

import { useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { inviteStaffAction } from '@/app/(chat)/admin/team/actions';
import type { PermissionMap } from '@/lib/auth/permissions';
import { AccessGrid, PresetPicker } from '@/components/admin/team/AccessGrid';
import { CopyLink } from '@/components/admin/team/CopyLink';

/** The owner invites someone: their email, an optional job title, and their
 * access (from a preset, then adjusted area by area). The link is shown once
 * after sending, in case the email doesn't arrive. */
export function InviteForm() {
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; acceptUrl: string; emailSent: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await inviteStaffAction({ email, title, permissions: permissions as Record<string, string> });
        if (result.error || !result.acceptUrl) {
          setError(result.error ?? 'That did not go through. Please try again.');
          return;
        }
        setSent({ email: email.trim().toLowerCase(), acceptUrl: result.acceptUrl, emailSent: result.emailSent === true });
      } catch {
        setError('That did not go through. Please try again.');
      }
    });
  }

  if (sent) {
    return (
      <div className="tm-section">
        <div role="status" className="tm-notice" data-tone="strong">
          <p className="font-medium">{sent.emailSent ? `Invite sent to ${sent.email}.` : `The invite for ${sent.email} is ready, but the email didn't go out.`}</p>
          <p className="tm-dim">
            {sent.emailSent
              ? 'They sign in with that address and accept. The link works once, for 7 days. You can also send it yourself:'
              : 'Send them this link yourself. It works once, for 7 days, after they sign in with that address:'}
          </p>
          <CopyLink url={sent.acceptUrl} />
        </div>
        <div className="tm-actions">
          <button
            type="button"
            className="tm-btn"
            onClick={() => {
              setSent(null);
              setEmail('');
              setTitle('');
              setPermissions({});
            }}
          >
            Invite someone else
          </button>
          <Link href="/admin/team/invites" className="tm-btn">
            See invites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="tm-section" onSubmit={submit} noValidate>
      <div className="tm-fields">
        <label className="tm-field">
          <span className="tm-dim">Email</span>
          <input
            className="mf-field"
            type="email"
            name="email"
            autoComplete="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="tm-field">
          <span className="tm-dim">Job title (optional)</span>
          <input className="mf-field" type="text" name="title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </div>

      <section className="tm-section" aria-labelledby="invite-access-h">
        <h2 id="invite-access-h" className="tm-h">
          Access
        </h2>
        <PresetPicker value={permissions} onPick={setPermissions} disabled={pending} />
        <AccessGrid idPrefix="invite" value={permissions} onChange={setPermissions} disabled={pending} />
      </section>

      {error ? (
        <p role="alert" className="tm-notice" data-tone="strong">
          {error}
        </p>
      ) : null}

      <div className="tm-actions">
        <button type="submit" className="tm-btn tm-btn-primary" disabled={pending}>
          {pending ? 'Sending' : 'Send invite'}
        </button>
        <Link href="/admin/team" className="tm-btn tm-btn-quiet">
          Cancel
        </Link>
      </div>
    </form>
  );
}
