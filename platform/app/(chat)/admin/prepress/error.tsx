'use client';

import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import '@/components/admin/prepress/prepress.css';

/** The queue or a pack failed to load (a service threw): say so plainly and offer another go. */
export default function PrepressError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <>
      <AdminPageHeader title="Pre-press" />
      <div className="pp-page">
        <div className="pp">
          <p className="pp-lede">This page couldn’t load. Try again; if it keeps failing, the code below helps whoever looks into it.</p>
          {error.digest ? <p className="pp-mono pp-dim">Code {error.digest}</p> : null}
          <div className="pp-actions">
            {/* retry fetches the page again; reset would only redraw the failed one (Next 16) */}
            <button type="button" className="pp-btn" onClick={() => retry()}>
              Try again
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
