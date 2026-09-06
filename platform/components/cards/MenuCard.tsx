import type { Card } from '@/lib/ui-cards/schemas';
import { Chip } from '@/components/ui/Chip';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type MenuCardType = Extract<Card, { kind: 'menu' }>;

export function MenuCard({ card, ctx }: { card: MenuCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-3">{card.title}</div> : null}
      <div className="flex flex-col gap-4">
        {card.sections.map((section) => (
          <div key={section.title}>
            <div className="mf-label mf-dimmed mb-2">{section.title}</div>
            <div className="flex flex-wrap gap-2">
              {section.chips.map((chip) => (
                <Chip key={chip.label} primary={chip.primary} onClick={() => ctx.onPrompt(chip.prompt ?? chip.label)}>
                  {chip.label}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
