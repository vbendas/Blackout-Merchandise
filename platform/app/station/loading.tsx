import { StationBar } from '@/components/station/StationBar';

/** What an iPad shows while the next screen is on its way: the bar and a few plates, so a tap is answered at once. */
export default function StationLoading() {
  return (
    <>
      <StationBar title="Loading…" />
      <main className="st-main" aria-busy="true">
        <p className="st-sr-only" role="status">
          Loading
        </p>
        <div className="st-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </main>
    </>
  );
}
