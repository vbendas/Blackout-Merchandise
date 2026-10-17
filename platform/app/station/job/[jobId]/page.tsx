import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaffPage } from '@/lib/auth';
import { JobScreen } from '@/components/station/JobScreen';
import { StationBar } from '@/components/station/StationBar';
import { IconBack } from '@/components/station/icons';
import { loadJob } from '../../data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Job' };

/** One job at a production station: the interactive job sheet (stage, screens, pieces with their counters, proofs, the sheet and its PDF).
 * Everyone with Production "View" sees it; the controls need "Work" (the service says which, in `canWork`). */
export default async function StationJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const session = await requireStaffPage('production', 'view', { page: '/station/job/[jobId]', itemType: 'production_job', itemId: jobId.slice(0, 80) });
  const result = await loadJob(session, jobId);
  if (!result.ok) {
    // A job that shipped or was cleared is gone from the floor: that is a 404, not an error to retry.
    if (/not found/i.test(result.error)) notFound();
    return (
      <>
        <StationBar title="Job" />
        <main className="st-main st-center">
          <h1>This job did not open</h1>
          <p className="st-dim">{result.error}</p>
          <div className="st-actions">
            <Link href={`/station/job/${encodeURIComponent(jobId)}`} className="st-btn st-btn-primary">
              Try again
            </Link>
            <Link href="/station" className="st-btn">
              <IconBack /> Back to the queue
            </Link>
          </div>
        </main>
      </>
    );
  }
  return <JobScreen job={result.value.job} view={result.value.view} sheetProblem={result.value.sheetProblem} adminHref="/admin/production" />;
}
