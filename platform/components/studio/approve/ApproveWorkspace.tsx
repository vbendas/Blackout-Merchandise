'use client';

import { useId, useState } from 'react';
import type { ApprovalView } from '@/lib/services/print-prep';
import { ApprovalBox } from './ApprovalBox';
import { AskLink } from './ApproveLinks';
import { ApproveTabs } from './ApproveTabs';
import { ScreenPanel, ShopPanel, WarningsPanel } from './MethodPanels';
import { ProofColumn } from './ProofColumn';
import { FailedPanel, PreparingPanel } from './WaitPanels';
import { barMeta, changesPrompt, dtgFactsFor, phaseOf, pickGarment, pickLoupe, pickProof, pickScreenSet, techniqueOf, type ApproveTab } from './approve-logic';

/** Everything under the top bar of the approval page. While the proofs render,
 * or if they failed, it is a single panel; otherwise two tabs (shop products
 * first, then runs) over the same layout: the proof and its loupe for the
 * chosen garment colour on the left; what that method does, what is worth a
 * look and the approval box on the right. The tab, the colour and the loupe
 * are the page's own state; the view comes from the server and is refreshed
 * under it (the proofs arriving, the approval landing). */
export function ApproveWorkspace({ view, sessionId, initialTab }: { view: ApprovalView; sessionId: string | null; initialTab: ApproveTab }) {
  const base = useId();
  const [tab, setTab] = useState<ApproveTab>(initialTab);
  const [garmentCode, setGarmentCode] = useState<string | null>(view.garments[0]?.code ?? null);
  const [loupeOn, setLoupeOn] = useState(true);

  // Under about 720px the top bar has no room for the design line and the
  // link, so this row under it carries them (approve.css shows one or the other).
  const subhead = (
    <div className="ap-subhead">
      <span className="mf-mono-note">{barMeta(view)}</span>
      <AskLink prompt={changesPrompt(view)} sessionId={sessionId} className="ap-btn">
        Ask for changes
      </AskLink>
    </div>
  );

  const phase = phaseOf(view);
  if (phase === 'preparing') {
    return (
      <>
        {subhead}
        <PreparingPanel view={view} />
      </>
    );
  }
  if (phase === 'failed') {
    return (
      <>
        {subhead}
        <FailedPanel view={view} sessionId={sessionId} />
      </>
    );
  }

  const technique = techniqueOf(tab);
  const garment = pickGarment(view.garments, garmentCode);
  const tabId = (id: ApproveTab) => `${base}-tab-${id}`;
  const panelId = `${base}-panel`;

  return (
    <>
      {subhead}
      <ApproveTabs tab={tab} onSelect={setTab} tabId={tabId} panelId={panelId} />
      <div id={panelId} role="tabpanel" aria-labelledby={tabId(tab)} className="ap-body">
        <ProofColumn
          garments={view.garments}
          garment={garment}
          onPick={setGarmentCode}
          proof={pickProof(view.proofs, technique, garment?.code)}
          loupe={pickLoupe(view.loupes, technique, garment?.code)}
          technique={technique}
          loupeOn={loupeOn}
          onToggleLoupe={() => setLoupeOn((on) => !on)}
          placementLabel={view.placementLabel}
        />
        <aside className="ap-aside" aria-label="Print details and approval">
          {tab === 'runs' ? <ScreenPanel set={pickScreenSet(view.screenSets, garment)} garment={garment} /> : <ShopPanel facts={dtgFactsFor(view.dtgFacts, garment)} />}
          <WarningsPanel warnings={view.warnings} />
          {/* Keyed by version: a newer version arriving starts the box over, so an
              approval (or a half-made one) never carries over to proofs the artist
              has not seen. */}
          <ApprovalBox key={view.versionId} view={view} sessionId={sessionId} />
        </aside>
      </div>
    </>
  );
}
