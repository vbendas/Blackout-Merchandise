import type { Card } from '@/lib/ui-cards/schemas';
import { Chip } from '@/components/ui/Chip';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead } from '@/components/cards/CardKit';
import type { CardActionContext } from '@/components/cards/actions';

type MenuCardType = Extract<Card, { kind: 'menu' }>;

export function MenuCard({ card, ctx }: { card: MenuCardType; ctx: CardActionContext }) {
  return (
    <CardFrame>
      <CardHead label={card.title} />
      <div className="mfc-sections">
        {card.sections.map((section) => (
          <div key={section.title} className="mfc-section">
            <span className="mfc-label">{section.title}</span>
            <div className="mfc-chips">
              {section.chips.map((chip) => (
                <Chip key={chip.label} small primary={chip.primary} onClick={() => ctx.onPrompt(chip.prompt ?? chip.label)}>
                  {chip.label}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
