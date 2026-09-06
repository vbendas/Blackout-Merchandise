import type { CardAction } from '@/lib/ui-cards/schemas';
import { Chip } from '@/components/ui/Chip';
import { runCardAction, type CardActionContext } from '@/components/cards/actions';

export function CardActions({ actions, ctx }: { actions?: CardAction[]; ctx: CardActionContext }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action, index) => (
        <Chip
          key={`${action.label}-${index}`}
          small
          primary={action.variant === 'primary'}
          danger={action.variant === 'danger'}
          onClick={() => runCardAction(action, ctx)}
        >
          {action.label}
        </Chip>
      ))}
    </div>
  );
}
