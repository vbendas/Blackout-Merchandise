import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type SalesSummaryCardType = Extract<Card, { kind: 'sales_summary' }>;

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mf-label mf-dimmed">{label}</span>
      <span className="mf-display text-[22px] leading-none">{value}</span>
    </div>
  );
}

function Sparkline({ series }: { series: NonNullable<SalesSummaryCardType['series']> }) {
  const width = 280;
  const height = 40;
  const max = Math.max(1, ...series.map((point) => point.grossCents));
  const gap = 2;
  const barWidth = Math.max(1, width / series.length - gap);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Daily gross sales, last 31 days">
      {series.map((point, index) => {
        const barHeight = Math.max(1, (point.grossCents / max) * height);
        const x = index * (barWidth + gap);
        return <rect key={point.day} x={x} y={height - barHeight} width={barWidth} height={barHeight} fill="var(--signal)" opacity={0.7} />;
      })}
    </svg>
  );
}

export function SalesSummaryCard({ card, ctx }: { card: SalesSummaryCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      <div className="mf-label mf-dimmed mb-3">{card.title ?? card.period}</div>
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Orders" value={String(card.orders)} />
        <StatTile label="Gross" value={formatCents(card.grossCents)} />
        <StatTile label="Your share" value={formatCents(card.transferCents)} />
      </div>

      {card.series && card.series.length > 0 ? (
        <div className="mf-hairline-t mt-3 pt-3">
          <Sparkline series={card.series} />
        </div>
      ) : null}

      {card.topProducts.length > 0 ? (
        <div className="mf-hairline-t mt-3 pt-2">
          <div className="mf-dimmed mb-1 text-[11px] uppercase tracking-wide">Top products</div>
          {card.topProducts.map((product, index) => (
            <div key={`${product.name}-${index}`} className="flex items-center justify-between py-1 text-[13px]">
              <span className="min-w-0 truncate">
                {product.name} <span className="mf-dimmed">× {product.qty}</span>
              </span>
              <span className="mf-dimmed shrink-0">{formatCents(product.grossCents)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
