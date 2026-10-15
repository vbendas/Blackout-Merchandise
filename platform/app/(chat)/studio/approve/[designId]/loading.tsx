import { PageTopBar } from '@/components/studio/PageTopBar';
import { ApproveSkeleton } from '@/components/studio/approve/ApproveSkeleton';
import '@/components/studio/approve/approve.css';

/** Shown the moment the artist opens the page, while the approval view loads. */
export default function ApproveLoading() {
  return (
    <main className="ap" aria-busy="true">
      <PageTopBar title="Approve artwork" />
      <ApproveSkeleton />
    </main>
  );
}
