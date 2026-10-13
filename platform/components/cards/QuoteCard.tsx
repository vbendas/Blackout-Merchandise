import type { Card } from '@/lib/ui-cards/schemas';
import { blankDisplayName } from '@/lib/catalog/display-names';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, RowSub, SpecRows, formatMoney, type SpecRowData } from '@/components/cards/CardKit';
import type { CardActionContext } from '@/components/cards/actions';

type QuoteCardType = Extract<Card, { kind: 'quote' }>;

/** 'Quote — STSU177' becomes 'Quote — Heavy hoodie'; a code with no name is dropped. */
function quoteLabel(title: string | undefined): string {
  if (!title) return 'Quote';
  return title.replace(/\s*[—–-]\s*(ST[A-Z]{2}\d{3})$/i, (_match, code: string) => {
    const name = blankDisplayName(code, '');
    return name ? ` — ${name}` : '';
  });
}

export function QuoteCard({ card, ctx }: { card: QuoteCardType; ctx: CardActionContext }) {
  const rows: SpecRowData[] = [
    ...card.lines.map((line, index) => ({
      key: `line-${index}`,
      label: (
        <>
          {line.label}
          <RowSub>
            {line.qty} × {formatMoney(line.unitCents, card.currency)}
          </RowSub>
        </>
      ),
      value: formatMoney(line.totalCents, card.currency),
    })),
    { key: 'total', label: 'Your total', value: formatMoney(card.totalCents, card.currency), strong: true },
  ];

  return (
    <CardFrame>
      <CardHead label={quoteLabel(card.title)} sentence={card.note} />
      <SpecRows rows={rows} variant="plain" />
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
