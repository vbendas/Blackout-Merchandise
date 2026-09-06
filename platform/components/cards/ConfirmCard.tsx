import type { Card } from '@/lib/ui-cards/schemas';
import { Chip } from '@/components/ui/Chip';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type ConfirmCardType = Extract<Card, { kind: 'confirm' }>;

export function ConfirmCard({
  card,
  ctx,
  resolution,
}: {
  card: ConfirmCardType;
  ctx: CardActionContext;
  resolution?: 'approved' | 'rejected';
}) {
  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-2">{card.title}</div> : null}
      <p className="text-[14px] leading-relaxed">{card.summary}</p>
      {card.details && card.details.length > 0 ? (
        <div className="mf-hairline-t mt-3 pt-2">
          {card.details.map((detail) => (
            <div key={detail.label} className="flex items-center justify-between py-1.5 text-[13px]">
              <span className="mf-dimmed">{detail.label}</span>
              <span>{detail.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {resolution ? (
        <div className="mf-label mt-3">{resolution === 'approved' ? 'Approved' : 'Cancelled'}</div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip small primary onClick={() => ctx.onConfirm(card.toolCallId, true)}>
            Approve
          </Chip>
          <Chip small danger onClick={() => ctx.onConfirm(card.toolCallId, false)}>
            Cancel
          </Chip>
        </div>
      )}
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
