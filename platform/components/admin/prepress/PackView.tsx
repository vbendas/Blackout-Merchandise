import type { PackDetailView } from '@/lib/services/prepress';
import { backHref, isReplaced, replacementTab } from './format';
import { CheckList, DtgPack, EngineChoices, HistoryList, PackBanners } from './PackSections';
import { PackHeader } from './PackHeader';
import { PackWatcher } from './PackWatcher';
import { RerunSection, RunAgainButton } from './RerunSection';
import { ScreenWorkbench } from './ScreenWorkbench';
import { TabNav } from './TabNav';
import { UnapproveButton } from './UnapproveButton';

/** A pack page from its view: the top bar with the auditor's actions, the banners
 * its state calls for, the production-file tabs, then the screen or DTG/DTF body.
 * `canWork` is what the actor may do (the pack view says what the service
 * allows; the page ANDs it with the actor's own level), so a button the person
 * can't use is never drawn. A pack that a newer one replaced is read-only too:
 * every action on it would be refused. */
export function PackView({ detail, canWork: mayWork, maxUploadBytes, now }: { detail: PackDetailView; canWork: boolean; maxUploadBytes: number; now: Date }) {
  const isScreen = detail.technique === 'screen';
  const replaced = isReplaced(detail);
  const replacement = replaced ? replacementTab(detail.tabs, detail.technique, detail.screenSetKey) : null;
  const canWork = mayWork && !replaced;

  return (
    <>
      <PackHeader
        pack={{
          packId: detail.packId,
          title: detail.title,
          meta: detail.meta,
          technique: detail.technique,
          auditStatus: detail.auditStatus,
          buildStatus: detail.buildStatus,
          downloadUrl: detail.downloadUrl,
          psdUrl: detail.psdUrl,
          jobSheetUrl: detail.jobSheetUrl,
          backHref: backHref(detail.auditStatus),
        }}
        canWork={canWork}
        replaced={replaced}
        maxUploadBytes={maxUploadBytes}
      />
      <PackWatcher packId={detail.packId} watching={detail.buildStatus === 'building'} baseline={{ buildStatus: detail.buildStatus, replaced }} />

      <div className="pp-page">
        <PackBanners
          packId={detail.packId}
          auditStatus={detail.auditStatus}
          buildStatus={detail.buildStatus}
          canWork={canWork}
          replaced={replaced}
          replacedBy={replacement}
          undoApproval={<UnapproveButton packId={detail.packId} />}
        />
        <TabNav
          label="Production file"
          spaced
          items={detail.tabs.map((tab) => ({ href: `/admin/prepress/${tab.packId}`, label: tab.label, current: tab.current }))}
        />
        <div className="pp pp-stack">
          {isScreen ? (
            <>
              <ScreenWorkbench key={`films-${detail.packId}`} packId={detail.packId} films={detail.films} proofs={detail.proofs} canWork={canWork} />
              <div className="pp-split">
                {detail.engine ? <EngineChoices engine={detail.engine} headingId="choices-h" /> : null}
                <CheckList checks={detail.checks} headingId="checks-h" />
              </div>
              {canWork ? (
                <RerunSection key={`rerun-${detail.packId}`} packId={detail.packId} defaults={detail.rerunDefaults} failed={detail.buildStatus === 'failed'} />
              ) : null}
            </>
          ) : (
            <>
              <DtgPack files={detail.dtgFiles} loupeUrl={detail.dtgLoupeUrl} checks={detail.checks} />
              {canWork && detail.buildStatus === 'failed' ? <RunAgainButton key={`again-${detail.packId}`} packId={detail.packId} /> : null}
            </>
          )}
          <HistoryList history={detail.history} now={now} headingId="log-h" />
        </div>
      </div>
    </>
  );
}
