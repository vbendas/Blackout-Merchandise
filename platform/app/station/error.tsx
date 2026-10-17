'use client';

import Link from 'next/link';
import { StationBar } from '@/components/station/StationBar';

/** A screen that failed to draw: what to do next, in buttons the thumb can hit. Nothing a person typed is lost: counts are saved as they are made. */
export default function StationError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <StationBar title="Something went wrong" />
      <main className="st-main st-center">
        <h1>This screen did not load</h1>
        <p className="st-dim">Counts already made are saved. Try again, or go back to the queue.</p>
        <div className="st-actions">
          <button type="button" className="st-btn st-btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/station" className="st-btn">
            Back to the queue
          </Link>
        </div>
      </main>
    </>
  );
}
