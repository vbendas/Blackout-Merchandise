import type { CardAction } from '@/lib/ui-cards/schemas';
import { ActionRow, type ActionItem } from '@/components/cards/CardKit';
import { runCardAction, type CardActionContext } from '@/components/cards/actions';

/** A card's own actions as ActionRow items: web links open in a new tab, the
 * rest run through the shared action handler (prompt, confirm). */
export function cardActionItems(actions: CardAction[] | undefined, ctx: CardActionContext): ActionItem[] {
  return (actions ?? []).map((action, index) => {
    const isLink = Boolean(action.href) && !action.confirmToolCallId;
    return {
      key: `${action.label}-${index}`,
      label: action.label,
      primary: action.variant === 'primary',
      href: isLink ? action.href : undefined,
      onClick: isLink ? undefined : () => runCardAction(action, ctx),
    };
  });
}

export function CardActions({ actions, ctx }: { actions?: CardAction[]; ctx: CardActionContext }) {
  return <ActionRow actions={cardActionItems(actions, ctx)} />;
}
