'use client';

import { useMemo, useRef } from 'react';
import type { ToolUi } from '@/lib/ui-cards/schemas';
import { runLabel } from '@/lib/format/runs';
import type { CardActionContext } from '@/components/cards/actions';
import '@/components/cards/cards.css';
import { OnboardingProjectView } from '@/components/cards/project/OnboardingProjectView';
import { ProductProjectView } from '@/components/cards/project/ProductProjectView';
import { BulkOrderProjectView } from '@/components/cards/project/BulkOrderProjectView';
import type { BulkOrderProjectState, OnboardingProjectState, ProductProjectState } from '@/components/cards/project/types';

type Project = NonNullable<ToolUi['project']>;

const projectTitle: Record<Exclude<Project['kind'], 'bulk_order'>, string> = {
  onboarding: 'Getting set up',
  product: 'Product',
};

function panelLabel(project: Project): string {
  if (project.kind !== 'bulk_order') return projectTitle[project.kind];
  const runNumber = (project.state as Partial<BulkOrderProjectState>).runNumber;
  return runNumber ? runLabel(runNumber) : 'Your run';
}

/** The panel opens in a modal over the thread. A message sent from it lands in
 * the thread behind, so the modal closes once the message is sent. */
export function ProjectPanel({ project, ctx }: { project: ToolUi['project'] | null; ctx: CardActionContext }) {
  const rootRef = useRef<HTMLDivElement>(null);

  const panelCtx = useMemo<CardActionContext>(
    () => ({
      ...ctx,
      onPrompt: (text) => {
        ctx.onPrompt(text);
        rootRef.current?.closest('[role="dialog"]')?.querySelector<HTMLButtonElement>('button[aria-label="Close"]')?.click();
      },
    }),
    [ctx],
  );

  if (!project) {
    return (
      <div ref={rootRef} className="mfc-stack">
        <span className="mfc-label">Project</span>
        <p className="mfc-empty">Nothing active yet. Start a shop or pick a blank to see it here.</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="mfc-stack">
      <span className="mfc-label">{panelLabel(project)}</span>
      {project.kind === 'onboarding' ? (
        <OnboardingProjectView state={project.state as OnboardingProjectState} onPrompt={panelCtx.onPrompt} />
      ) : null}
      {project.kind === 'product' ? <ProductProjectView state={project.state as unknown as ProductProjectState} ctx={panelCtx} /> : null}
      {project.kind === 'bulk_order' ? (
        <BulkOrderProjectView state={project.state as unknown as BulkOrderProjectState} ctx={panelCtx} />
      ) : null}
    </div>
  );
}
