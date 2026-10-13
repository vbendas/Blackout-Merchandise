import { humanStatus } from '@/lib/format/status';
import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { ActionRow, CardFrame, CardHead, RowSub, SpecRows, formatMoney, type SpecRowData } from '@/components/cards/CardKit';
import { StatusPill, runStatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type BulkQuoteCardType = Extract<Card, { kind: 'bulk_quote' }>;
type BulkQuoteLine = BulkQuoteCardType['lines'][number];

/** Older cards carry 'Name · Colour · 40 pcs' as the line label; the name is what comes first. */
function itemName(line: BulkQuoteLine): string {
  return line.label.split(' · ')[0];
}

function quoteTitle(lines: BulkQuoteLine[]): string {
  if (lines.length === 0) return 'Your run';
  const pieces = lines.reduce((sum, line) => sum + line.qty, 0);
  const count = `${pieces} ${pieces === 1 ? 'piece' : 'pieces'}`;
  const first = lines[0];
  if (lines.length === 1) return [itemName(first), first.colour?.toLowerCase(), count].filter(Boolean).join(', ');
  return `${itemName(first)} and ${lines.length - 1} more, ${count}`;
}

/** The money side of a run: what is in it, what it costs, where it ships.
 * The card's title is the run's name ('Run 3'); its stage lives on the run card. */
export function BulkQuoteCard({ card, ctx }: { card: BulkQuoteCardType; ctx: CardActionContext }) {
  // Cards saved before runs had numbers are titled 'Bulk order — N lines'.
  const label = card.title && !/^bulk order/i.test(card.title) ? card.title : 'Your run';

  const rows: SpecRowData[] = [
    ...card.lines.map((line, index) => ({
      key: `line-${index}`,
      label: (
        <>
          {itemName(line)}
          {line.colour ? ` · ${line.colour}` : ''}
          <RowSub>
            {line.qty} × {formatMoney(line.unitCents)}
            {line.sizes ? ` · ${line.sizes}` : ''}
          </RowSub>
        </>
      ),
      value: formatMoney(line.totalCents),
    })),
    ...(card.setupCents !== undefined ? [{ key: 'setup', label: 'Setup', value: formatMoney(card.setupCents), dim: true }] : []),
    { key: 'shipping', label: 'Shipping', value: formatMoney(card.shippingCents), dim: true },
    { key: 'total', label: 'Total', value: formatMoney(card.totalCents), strong: true },
    ...(card.shipTo ? [{ key: 'shipTo', label: 'Ships to', value: card.shipTo }] : []),
    ...(card.leadTime ? [{ key: 'lead', label: 'Lead time', value: card.leadTime }] : []),
  ];

  return (
    <CardFrame>
      <CardHead
        label={label}
        title={quoteTitle(card.lines)}
        aside={<StatusPill label={humanStatus(card.status)} tone={runStatusTone(card.status)} />}
      />
      <SpecRows rows={rows} variant="plain" />
      {card.checkoutUrl ? (
        <ActionRow actions={[{ key: 'pay', label: 'Pay now', href: card.checkoutUrl, primary: true }]} />
      ) : (
        <CardActions actions={card.actions} ctx={ctx} />
      )}
    </CardFrame>
  );
}
