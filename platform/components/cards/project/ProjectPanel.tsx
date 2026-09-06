import type { ToolUi } from '@/lib/ui-cards/schemas';
import type { CardActionContext } from '@/components/cards/actions';
import { OnboardingProjectView } from '@/components/cards/project/OnboardingProjectView';
import { ProductProjectView } from '@/components/cards/project/ProductProjectView';
import { BulkOrderProjectView } from '@/components/cards/project/BulkOrderProjectView';
import type { BulkOrderProjectState, OnboardingProjectState, ProductProjectState } from '@/components/cards/project/types';

type Project = NonNullable<ToolUi['project']>;

const projectTitle: Record<Project['kind'], string> = {
  onboarding: 'Getting set up',
  product: 'Product',
  bulk_order: 'Bulk order',
};

export function ProjectPanel({ project, ctx }: { project: ToolUi['project'] | null; ctx: CardActionContext }) {
  if (!project) {
    return (
      <div className="p-5">
        <div className="mf-label mf-dimmed">Project</div>
        <p className="mf-dimmed mt-3 text-[13px] leading-relaxed">Nothing active yet. Start a shop or pick a blank to see it here.</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="mf-label mf-dimmed mb-4">{projectTitle[project.kind]}</div>
      {project.kind === 'onboarding' ? (
        <OnboardingProjectView state={project.state as OnboardingProjectState} onPrompt={ctx.onPrompt} />
      ) : null}
      {project.kind === 'product' ? <ProductProjectView state={project.state as unknown as ProductProjectState} ctx={ctx} /> : null}
      {project.kind === 'bulk_order' ? (
        <BulkOrderProjectView state={project.state as unknown as BulkOrderProjectState} ctx={ctx} />
      ) : null}
    </div>
  );
}
