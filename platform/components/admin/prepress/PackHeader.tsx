'use client';

import { useId, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PackAuditStatus, PackBuildStatus } from '@/lib/services/prepress';
import type { PrintTechnique } from '@/lib/print/types';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { approvePackAction, sendBackAction } from '@/app/(chat)/admin/prepress/actions';
import { formatBytes } from './format';
import { checkSendBackNote, SEND_BACK_NOTE_MAX, UPLOAD_ERRORS } from './rules';
import { sendCorrectedPsd } from './upload-client';
import { saveUploadNotice } from './upload-notice';

export interface PackHeaderPack {
  packId: string;
  title: string;
  /** 'RUN 2 · 120 + 40 PIECES' */
  meta: string;
  technique: PrintTechnique;
  auditStatus: PackAuditStatus;
  buildStatus: PackBuildStatus;
  downloadUrl: string | null;
  /** the pack's PSD: a second download on a DTG/DTF pack, whose main one is the PNGs */
  psdUrl: string | null;
  /** the design's job sheet: one for every garment that uses the design, not one per pack */
  jobSheetUrl: string | null;
  backHref: string;
}

type Notice =
  | { tone: 'error'; text: string }
  | { tone: 'progress'; filename: string; percent: number | null };

/** The pack's top bar and what its buttons say back. Download needs only View
 * access. Upload, Send back and Approve need Work: without it, or once a newer
 * pack has replaced this one, they are not drawn at all (the services refuse them
 * too). A corrected PSD goes straight to storage on a signed URL
 * (upload-client.ts), not through a server action or a route: it is hundreds of MB. */
export function PackHeader({ pack, canWork, replaced = false, maxUploadBytes }: { pack: PackHeaderPack; canWork: boolean; replaced?: boolean; maxUploadBytes: number }) {
  const router = useRouter();
  const panelId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const sendBackButton = useRef<HTMLButtonElement>(null);
  const noteField = useRef<HTMLTextAreaElement>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Which button the pending state belongs to, for its label.
  const [acting, setActing] = useState<'approve' | 'send_back' | null>(null);

  const uploading = notice?.tone === 'progress';
  const approved = pack.auditStatus === 'approved';
  const sentBack = pack.auditStatus === 'sent_back';
  const ready = pack.buildStatus === 'ready';
  const busy = pending || uploading;

  function approve() {
    setNotice(null);
    setActing('approve');
    startTransition(async () => {
      const result = await approvePackAction(pack.packId);
      if (!result.ok) setNotice({ tone: 'error', text: result.error });
    });
  }

  function togglePanel() {
    setNoteError(null);
    setPanelOpen((open) => !open);
  }

  function closePanel() {
    setPanelOpen(false);
    sendBackButton.current?.focus();
  }

  function sendBack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = checkSendBackNote(note);
    if (!checked.ok) {
      setNoteError(checked.error);
      noteField.current?.focus();
      return;
    }
    setNoteError(null);
    setActing('send_back');
    startTransition(async () => {
      const result = await sendBackAction(pack.packId, checked.value);
      if (result.ok) {
        setNote('');
        setPanelOpen(false);
      } else {
        setNoteError(result.error);
      }
    });
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again (after fixing it) still fires a change.
    event.target.value = '';
    if (!file) return;

    if (!/\.(psd|psb)$/i.test(file.name)) {
      setNotice({ tone: 'error', text: UPLOAD_ERRORS.not_a_psd });
      return;
    }
    if (file.size > maxUploadBytes) {
      setNotice({ tone: 'error', text: `That file is ${formatBytes(file.size)}. This server takes up to ${formatBytes(maxUploadBytes)}.` });
      return;
    }

    setNotice({ tone: 'progress', filename: file.name, percent: 0 });
    let last = 0;
    const result = await sendCorrectedPsd(pack.packId, file, ({ loaded, total }) => {
      const percent = Math.min(100, Math.floor((loaded / total) * 100));
      // Once the last byte is in storage the service still has to rebuild the pack: no number to show.
      if (percent === last) return;
      last = percent;
      setNotice({ tone: 'progress', filename: file.name, percent: percent >= 100 ? null : percent });
    });

    if (!result.ok) {
      setNotice({ tone: 'error', text: result.message });
      return;
    }
    // The correction is a new pack: the notice goes with it.
    const { newPackId, needsReapproval, changes } = result.outcome;
    saveUploadNotice({ packId: newPackId, filename: file.name, needsReapproval, changes });
    setNotice(null);
    if (newPackId === pack.packId) router.refresh();
    else router.push(`/admin/prepress/${newPackId}`);
  }

  const downloadLabel = pack.technique === 'screen' ? 'Download PSD' : 'Download PNGs';

  return (
    <>
      <AdminPageHeader
        title={pack.title}
        meta={pack.meta}
        lead={
          <Link href={pack.backHref} aria-label="Back to Pre-press" className="pp-back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
        }
      >
        {pack.downloadUrl ? (
          <a className="pp-btn" href={pack.downloadUrl} download>
            {downloadLabel}
          </a>
        ) : (
          <button type="button" className="pp-btn" disabled title="The file isn’t ready yet">
            {downloadLabel}
          </button>
        )}
        {pack.technique === 'dtg_dtf' && pack.psdUrl ? (
          <a className="pp-btn" href={pack.psdUrl} download>
            Download PSD
          </a>
        ) : null}
        {pack.jobSheetUrl ? (
          <a className="pp-btn" href={pack.jobSheetUrl} download>
            Job sheet
          </a>
        ) : null}
        {canWork ? (
          <>
            {/* A corrected PSD is for a built screen pack: DTG/DTF files are run again instead. */}
            {pack.technique === 'screen' && ready ? (
              <>
                <input ref={fileInput} type="file" accept=".psd,.psb" hidden onChange={onFile} />
                <button type="button" className="pp-btn" disabled={busy} onClick={() => fileInput.current?.click()}>
                  Upload corrected PSD
                </button>
              </>
            ) : null}
            <button
              ref={sendBackButton}
              type="button"
              className="pp-btn"
              aria-expanded={panelOpen}
              aria-controls={panelId}
              disabled={busy || sentBack}
              onClick={togglePanel}
            >
              {sentBack ? 'Sent back' : 'Send back to artist'}
            </button>
            <button type="button" className="pp-btn pp-btn-primary" disabled={busy || approved || sentBack || !ready} onClick={approve}>
              {approved ? 'Approved' : pending && acting === 'approve' ? 'Approving…' : 'Approve pack'}
            </button>
          </>
        ) : (
          <span className="mf-meta">{replaced ? 'Replaced' : 'View only'}</span>
        )}
      </AdminPageHeader>

      {notice || panelOpen ? (
        <div className="pp-notices">
          {notice?.tone === 'progress' ? (
            <div className="pp-status">
              {/* The visible percent changes every few hundred ms; the spoken one only at quarters. */}
              <span aria-hidden="true">
                {notice.percent === null ? `Rebuilding the films and proof from ${notice.filename}…` : `Uploading ${notice.filename}: ${notice.percent}%`}
              </span>
              <span className="sr-only" role="status">
                {notice.percent === null ? 'Rebuilding the pack from the upload.' : `Uploading, ${Math.floor(notice.percent / 25) * 25} percent.`}
              </span>
              <progress className="pp-progress" max={100} value={notice.percent ?? undefined} aria-label="Upload progress" />
            </div>
          ) : null}
          {notice?.tone === 'error' ? (
            <div className="pp-status" role="alert" data-tone="error">
              <span>{notice.text}</span>
              <button type="button" className="pp-btn pp-btn-sm" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </div>
          ) : null}
          {panelOpen ? (
            <form id={panelId} className="pp-panel" onSubmit={sendBack} noValidate>
              <div className="pp-fieldwrap">
                <label className="pp-dim" htmlFor={`${panelId}-note`}>
                  Note to the artist
                </label>
                <textarea
                  id={`${panelId}-note`}
                  ref={noteField}
                  className="pp-field"
                  value={note}
                  maxLength={SEND_BACK_NOTE_MAX}
                  autoFocus
                  placeholder="What should they fix? They see this note with the pack."
                  aria-invalid={noteError ? true : undefined}
                  aria-describedby={noteError ? `${panelId}-error` : undefined}
                  onChange={(event) => setNote(event.target.value)}
                />
                {noteError ? (
                  <span id={`${panelId}-error`} role="alert" className="pp-error">
                    {noteError}
                  </span>
                ) : null}
              </div>
              <div className="pp-actions">
                <button type="submit" className="pp-btn pp-btn-strong" disabled={pending}>
                  {pending && acting === 'send_back' ? 'Sending…' : 'Send back'}
                </button>
                <button type="button" className="pp-btn" onClick={closePanel}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
