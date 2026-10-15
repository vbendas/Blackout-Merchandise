import type { ReactNode } from 'react';
import Link from 'next/link';
import type { CheckResult } from '@/lib/print/types';
import type { PackAuditStatus, PackBuildStatus, PackDetailView, PackDtgFile, PackEngineView, PackTab } from '@/lib/services/prepress';
import { formatHistoryTime, queueHref } from './format';
import { PrintImage } from './PrintImage';
import { UploadNoticeBanner } from './UploadNoticeBanner';

// The parts of a pack page that only show things: no state, no actions. The
// interactive parts (header actions, films and inks, run again) are client
// components next to this file.

const CHECK_WORDS: Record<CheckResult['state'], string> = { passed: 'Passed', review: 'Review', failed: 'Failed' };

/** Checks in the order they ran. PASSED reads in grey, REVIEW in bold white,
 * FAILED in an inverted label: the state is always a word, never only a look. */
export function CheckList({ checks, headingId }: { checks: CheckResult[]; headingId: string }) {
  return (
    <section aria-labelledby={headingId} className="pp-col">
      <h2 id={headingId} className="mf-label">
        Checks
      </h2>
      {checks.length === 0 ? (
        <p className="pp-dim">No checks have run on this pack yet.</p>
      ) : (
        <ul className="pp-checks">
          {checks.map((check) => (
            <li key={check.id} className="pp-check" data-state={check.state}>
              <span className="pp-check-state">{CHECK_WORDS[check.state]}</span>
              <span>
                <span className="pp-check-title">{check.title}</span>
                <span className="pp-check-detail">{check.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** What the engine decided on its own, and why, so the auditor can overrule it. */
export function EngineChoices({ engine, headingId }: { engine: PackEngineView; headingId: string }) {
  return (
    <section aria-labelledby={headingId} className="pp-col">
      <h2 id={headingId} className="mf-label">
        What the engine chose
      </h2>
      <dl className="pp-dl pp-dl-wide">
        <dt className="pp-dim">Method</dt>
        <dd>
          {engine.method}. {engine.methodReason}
        </dd>
        <dt className="pp-dim">Screens</dt>
        <dd>{engine.screensWhy}</dd>
        <dt className="pp-dim">Underbase</dt>
        <dd>{engine.underbase}</dd>
        <dt className="pp-dim">Print order</dt>
        <dd>{engine.order}</dd>
        <dt className="pp-dim">Screen sets</dt>
        <dd>{engine.screenSets}</dd>
      </dl>
    </section>
  );
}

export function HistoryList({ history, now, headingId }: { history: PackDetailView['history']; now: Date; headingId: string }) {
  if (history.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="pp-section pp-section-tight">
      <h2 id={headingId} className="mf-label">
        History
      </h2>
      <ol className="pp-history">
        {history.map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            <time className="pp-time" dateTime={entry.at}>
              {formatHistoryTime(entry.at, now)}
            </time>
            {entry.text}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The DTG/DTF tab: one proof and one PNG per garment colour, a true-size look
 * at the dots in the fades, and the checks. */
export function DtgPack({ files, loupeUrl, checks }: { files: PackDtgFile[]; loupeUrl: string | null; checks: CheckResult[] }) {
  return (
    <>
      <section aria-labelledby="dtg-files-h" className="pp-section">
        <h2 id="dtg-files-h" className="mf-label">
          One file per garment colour
        </h2>
        {files.length === 0 ? (
          <p className="pp-dim">No files have been made for this pack yet.</p>
        ) : (
          <div className="pp-dtg">
            {files.map((file) => (
              <figure key={file.garmentCode}>
                <div className="pp-plate">
                  <PrintImage src={file.proofUrl} alt={`DTG proof on ${file.garmentName}`} />
                </div>
                <figcaption>
                  <span className="pp-name">{file.garmentName}</span>
                  <span className="pp-file">{file.fileName}</span>
                  <span className="pp-soft">{file.note}</span>
                  {file.downloadUrl ? (
                    <a className="pp-link" href={file.downloadUrl} download={file.fileName}>
                      Download PNG
                      <span className="sr-only"> for {file.garmentName}</span>
                    </a>
                  ) : (
                    <span className="pp-dim pp-link">The PNG isn’t ready yet</span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
      <div className="pp-split">
        {loupeUrl ? (
          <figure className="pp-loupe">
            <PrintImage src={loupeUrl} alt="True-size detail of the DTG file, showing the dots the fades are made of" />
            <figcaption className="pp-cap">True size · fades as dots</figcaption>
          </figure>
        ) : null}
        <CheckList checks={checks} headingId="dtg-checks-h" />
      </div>
    </>
  );
}

/** What to say above a pack when its state calls for it. The approved banner is
 * the one with a white border; the corrected-PSD notice is drawn by the browser
 * after an upload (it travels with the new pack). A replaced pack (a run again or
 * a corrected PSD finished after it) is a record: it points to the newer one. */
export function PackBanners({
  packId,
  auditStatus,
  buildStatus,
  canWork,
  replacedBy,
  replaced = false,
  undoApproval,
}: {
  packId: string;
  auditStatus: PackAuditStatus;
  buildStatus: PackBuildStatus;
  canWork: boolean;
  /** the tab that took over from this pack, when it can be told */
  replacedBy?: PackTab | null;
  replaced?: boolean;
  /** the approved banner's Undo, for someone with Work access (a client part, passed in so this file stays action-free) */
  undoApproval?: ReactNode;
}) {
  return (
    <div className="pp-banners">
      {replaced ? (
        <div className="pp-banner pp-banner-row" role="status" data-tone="strong">
          <div className="pp-banner-body">
            <span className="pp-banner-title">A newer pack replaced this one.</span>
            <span className="pp-banner-text">This page is a record of the old pack. Work on the newer one.</span>
          </div>
          <Link href={replacedBy ? `/admin/prepress/${replacedBy.packId}` : queueHref('being_fixed', '')} className="pp-btn pp-btn-sm">
            {replacedBy ? 'Open the newer pack' : 'Open the queue'}
          </Link>
        </div>
      ) : null}
      {buildStatus === 'building' ? (
        <div className="pp-banner" role="status">
          <span className="pp-banner-title">This pack is still being built.</span>
          <span className="pp-banner-text">The films, proofs and checks appear here as soon as it is ready. This page keeps checking.</span>
        </div>
      ) : null}
      {buildStatus === 'failed' ? (
        <div className="pp-banner" role="status" data-tone="strong">
          <span className="pp-banner-title">This pack couldn’t be built.</span>
          <span className="pp-banner-text">{canWork ? 'Run it again below.' : 'Someone with Work access can run it again.'}</span>
        </div>
      ) : null}
      {auditStatus === 'approved' ? (
        <div className="pp-banner pp-banner-row" role="status" data-tone="strong">
          <span className="pp-banner-title">Pack approved. Production can go ahead with these files.</span>
          {canWork ? undoApproval : null}
        </div>
      ) : null}
      {auditStatus === 'sent_back' ? (
        <div className="pp-banner" role="status">
          <span className="pp-banner-title">Sent back to the artist.</span>
          <span className="pp-banner-text">Production can’t use this pack until it is approved again.</span>
        </div>
      ) : null}
      <UploadNoticeBanner packId={packId} />
    </div>
  );
}
