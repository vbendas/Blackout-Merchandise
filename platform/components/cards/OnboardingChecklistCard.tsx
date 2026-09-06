import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { ChecklistList } from '@/components/cards/ChecklistList';
import type { CardActionContext } from '@/components/cards/actions';

type OnboardingChecklistCard = Extract<Card, { kind: 'onboarding_checklist' }>;

export function OnboardingChecklistCard({ card, ctx }: { card: OnboardingChecklistCard; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-3">{card.title}</div> : null}
      <ChecklistList items={card.items} onPrompt={ctx.onPrompt} />
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
