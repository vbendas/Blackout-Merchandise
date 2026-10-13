import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead } from '@/components/cards/CardKit';
import { ChecklistList } from '@/components/cards/ChecklistList';
import type { CardActionContext } from '@/components/cards/actions';

type OnboardingChecklistCardType = Extract<Card, { kind: 'onboarding_checklist' }>;

export function OnboardingChecklistCard({ card, ctx }: { card: OnboardingChecklistCardType; ctx: CardActionContext }) {
  return (
    <CardFrame>
      <CardHead label={card.title ?? 'Getting set up'} />
      <ChecklistList items={card.items} onPrompt={ctx.onPrompt} />
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
