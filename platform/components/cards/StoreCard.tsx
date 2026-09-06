import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type StoreCardType = Extract<Card, { kind: 'store' }>;

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[13px]">
      <span className="mf-dimmed">{label}</span>
      <span>{ok ? 'Ready' : 'Not yet'}</span>
    </div>
  );
}

export function StoreCard({ card, ctx }: { card: StoreCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      <div className="flex items-center gap-3">
        {card.logoUrl ? (
          <img src={card.logoUrl} alt="" className="mf-hairline h-10 w-10 object-contain p-1" />
        ) : null}
        <div className="min-w-0">
          {card.title ? <div className="mf-label mf-dimmed mb-1">{card.title}</div> : null}
          <div className="truncate text-[15px]">{card.name}</div>
          <a href={card.url} target="_blank" rel="noopener noreferrer" className="mf-dimmed block truncate text-[12px] underline">
            {card.slug}
          </a>
        </div>
      </div>
      <div className="mf-hairline-t mt-3 pt-2">
        <StatusRow label="Published" ok={card.isPublished} />
        <StatusRow label="Stripe" ok={card.stripeReady} />
        <div className="flex items-center justify-between py-1.5 text-[13px]">
          <span className="mf-dimmed">Live products</span>
          <span>{card.liveProducts}</span>
        </div>
      </div>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
