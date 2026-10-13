'use client';

import type { Card } from '@/lib/ui-cards/schemas';
import { shopUrl, shopUrlLabel } from '@/lib/format/shop-url';
import { cardActionItems } from '@/components/cards/CardActions';
import { ActionRow, CardFrame, CardHead, Plate, SpecRows, formatMoney, useCopy, type ActionItem, type SpecRowData } from '@/components/cards/CardKit';
import type { CardActionContext } from '@/components/cards/actions';

type StoreCardType = Extract<Card, { kind: 'store' }>;

export function StoreCard({ card, ctx }: { card: StoreCardType; ctx: CardActionContext }) {
  const url = shopUrl(card.slug);
  const { state, copy } = useCopy();

  const rows: SpecRowData[] = [
    { label: 'Shop', value: card.isPublished ? 'Live' : 'Not live', state: card.isPublished ? 'current' : undefined },
    { label: 'Payouts', value: card.stripeReady ? 'Ready' : 'Set up' },
    { label: 'Products live', value: String(card.liveProducts) },
    ...(card.salesThisMonth
      ? [{ label: 'Sales this month', value: card.salesThisMonth.count > 0 ? `${card.salesThisMonth.count} · ${formatMoney(card.salesThisMonth.grossCents)}` : 'None yet' }]
      : []),
  ];

  const copyLabel = state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not copy' : 'Copy link';
  const actions: ActionItem[] = [
    { key: 'open', label: 'Open the shop', href: url },
    { key: 'copy', label: copyLabel, onClick: () => void copy(url), live: true },
    ...(card.stripeReady ? [] : [{ key: 'payouts', label: 'Set up payouts', quiet: true, onClick: () => ctx.onPrompt('Set up payouts') }]),
    ...cardActionItems(card.actions, ctx),
  ];

  return (
    <CardFrame>
      <CardHead
        label={card.title ?? 'Shop'}
        title={card.name}
        sentence={shopUrlLabel(card.slug)}
        aside={card.logoUrl ? <Plate src={card.logoUrl} className="w-10 shrink-0" /> : undefined}
      />
      <SpecRows rows={rows} />
      <ActionRow actions={actions} />
    </CardFrame>
  );
}
