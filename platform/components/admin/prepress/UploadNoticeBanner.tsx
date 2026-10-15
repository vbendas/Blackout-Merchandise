'use client';

import { clearUploadNotice, useUploadNotice } from './upload-notice';

/** The notice under the top bar after a corrected PSD went up and its new pack
 * opened: what was rebuilt, and whether the artist is asked to approve again. */
export function UploadNoticeBanner({ packId }: { packId: string }) {
  const notice = useUploadNotice(packId);
  if (!notice) return null;

  return (
    <div className="pp-banner pp-banner-row" role="status">
      <div className="pp-banner-body">
        <span className="pp-banner-title">Corrected PSD received: {notice.filename}</span>
        <span className="pp-banner-text">
          Films and proof were rebuilt from it and every check ran again; the design’s job sheet shows the new pack.{' '}
          {notice.needsReapproval
            ? 'The change alters the proof, so the artist is asked to approve again.'
            : 'The change doesn’t alter the proof, so the artist isn’t asked to approve again.'}{' '}
          The before and after are saved as a training pair.
        </span>
        {notice.changes.length > 0 ? (
          <ul>
            {notice.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <button type="button" className="pp-btn pp-btn-sm" onClick={clearUploadNotice}>
        Dismiss
      </button>
    </div>
  );
}
