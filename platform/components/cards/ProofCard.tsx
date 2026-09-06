import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type ProofCardType = Extract<Card, { kind: 'proof' }>;

const statusLabel: Record<ProofCardType['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  changes_requested: 'Changes requested',
};

const statusTone: Record<ProofCardType['status'], StatusTone> = {
  pending: 'neutral',
  approved: 'positive',
  changes_requested: 'warning',
};

export function ProofCard({ card, ctx }: { card: ProofCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      <div className="flex items-center justify-between">
        <div className="mf-label mf-dimmed">Proof v{card.version}</div>
        <StatusPill label={statusLabel[card.status]} tone={statusTone[card.status]} />
      </div>
      {card.mockupUrls.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {card.mockupUrls.map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt={`Proof mockup ${index + 1}`}
              className="mf-hairline h-28 w-28 shrink-0 rounded-2xl object-cover"
              loading="lazy"
            />
          ))}
        </div>
      ) : null}
      {card.spec.length > 0 ? (
        <div className="mf-hairline-t mt-3 pt-2">
          {card.spec.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1.5 text-[13px]">
              <span className="mf-dimmed">{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {/* Approve is a confirm-gated tool call, so it arrives as a separate
          confirm card — this card only renders whatever actions it was given. */}
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
