import { notFound } from 'next/navigation';
import { requireRegistered } from '@/lib/auth';
import { getApprovalView } from '@/lib/services/print-prep';
import { PageTopBar } from '@/components/studio/PageTopBar';
import { ApproveWorkspace } from '@/components/studio/approve/ApproveWorkspace';
import { AskLink, BackLink } from '@/components/studio/approve/ApproveLinks';
import { changesPrompt, cleanId, parseTab, placementSummary } from '@/components/studio/approve/approve-logic';
import '@/components/studio/approve/approve.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Approve artwork' };

/** /studio/approve/<designId>: the artist looks over a design's print proofs
 * and approves them once, for both ways it prints (DTG/DTF for the shop, screen
 * print for runs) on every garment colour. Opened from the proof card in the
 * chat, which adds ?from=<session> so the way back lands in that conversation;
 * ?tab=runs opens the runs tab. The shell, sign-in and the sidebar come from
 * ../../layout.tsx; loading, error and not-found screens sit beside this file. */
export default async function ApprovePage({
  params,
  searchParams,
}: {
  params: Promise<{ designId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ designId: rawId }, query] = await Promise.all([params, searchParams]);
  const designId = cleanId(rawId);
  if (!designId) notFound();

  const { store } = await requireRegistered();
  const sessionId = cleanId(query.from);

  if (!store) {
    return (
      <main className="ap">
        <PageTopBar title="Approve artwork" lead={<BackLink sessionId={sessionId} />} />
        <section className="ap-wait">
          <p className="ap-a8">This account has no shop, so there is no artwork to approve here.</p>
        </section>
      </main>
    );
  }

  const view = await getApprovalView({ storeId: store.id, designId });
  if (!view) notFound();

  const ask = (
    <AskLink prompt={changesPrompt(view)} sessionId={sessionId} className="ap-btn ap-bar-ask">
      Ask for changes
    </AskLink>
  );

  return (
    <main className="ap">
      <PageTopBar
        title="Approve artwork"
        lead={<BackLink sessionId={sessionId} />}
        meta={
          <span className="mf-mono-note ap-barmeta">
            <span className="ap-barname" title={view.designName}>
              {view.designName}
            </span>
            {` · Version ${view.versionNumber} · ${placementSummary(view)}`}
          </span>
        }
      >
        {ask}
      </PageTopBar>
      <ApproveWorkspace view={view} sessionId={sessionId} initialTab={parseTab(query.tab)} />
    </main>
  );
}
