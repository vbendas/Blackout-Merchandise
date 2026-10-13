import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, SpecRows, formatMoney, type SpecRowData } from '@/components/cards/CardKit';
import type { CardActionContext } from '@/components/cards/actions';

type SalesSummaryCardType = Extract<Card, { kind: 'sales_summary' }>;

const PERIOD_WORDS: Record<string, string> = {
  month: 'This month',
  '30d': 'Last 30 days',
  all: 'All time',
};

function Sparkline({ series }: { series: NonNullable<SalesSummaryCardType['series']> }) {
  const width = 280;
  const height = 40;
  const max = Math.max(1, ...series.map((point) => point.grossCents));
  const gap = 2;
  const barWidth = Math.max(1, width / series.length - gap);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Daily sales">
      {series.map((point, index) => {
        const barHeight = Math.max(1, (point.grossCents / max) * height);
        const x = index * (barWidth + gap);
        return <rect key={point.day} x={x} y={height - barHeight} width={barWidth} height={barHeight} fill="currentColor" />;
      })}
    </svg>
  );
}

// The three figures are rows, not tiles: a value can grow past EUR 1,000 and
// still fit at 390px, because the row gives it the whole line.
export function SalesSummaryCard({ card, ctx }: { card: SalesSummaryCardType; ctx: CardActionContext }) {
  const rows: SpecRowData[] = [
    { key: 'orders', label: 'Orders', value: String(card.orders) },
    { key: 'gross', label: 'Gross', value: formatMoney(card.grossCents) },
    { key: 'share', label: 'Your share', value: formatMoney(card.transferCents), strong: true },
  ];

  const topRows: SpecRowData[] = card.topProducts.map((product, index) => ({
    key: `${product.name}-${index}`,
    label: `${product.name} × ${product.qty}`,
    value: formatMoney(product.grossCents),
  }));

  return (
    <CardFrame>
      <CardHead label={card.title ?? 'Sales'} title={PERIOD_WORDS[card.period] ?? card.period} />
      <SpecRows rows={rows} />
      {card.series && card.series.length > 0 ? (
        <div className="mfc-sparkline">
          <Sparkline series={card.series} />
        </div>
      ) : null}
      {topRows.length > 0 ? (
        <div className="mfc-section">
          <span className="mfc-label">Top products</span>
          <SpecRows rows={topRows} variant="plain" />
        </div>
      ) : null}
      <CardActions actions={card.actions} ctx={ctx} />
    </CardFrame>
  );
}
