import Link from 'next/link';
import { StationBar } from '@/components/station/StationBar';

export default function StationNotFound() {
  return (
    <>
      <StationBar title="Job not found" />
      <main className="st-main st-center">
        <h1>That job is not on the floor</h1>
        <p className="st-dim">It may have shipped or been cleared. Go back to the queue for what is there now.</p>
        <div className="st-actions">
          <Link href="/station" className="st-btn st-btn-primary">
            Back to the queue
          </Link>
        </div>
      </main>
    </>
  );
}
