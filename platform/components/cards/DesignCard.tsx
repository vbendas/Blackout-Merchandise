import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type DesignCardType = Extract<Card, { kind: 'design' }>;

const readinessLabel: Record<DesignCardType['readiness'], string> = {
  ready: 'Ready',
  needs_cleanup: 'Needs cleanup',
  blocked: 'Blocked',
};

const readinessTone: Record<DesignCardType['readiness'], StatusTone> = {
  ready: 'neutral',
  needs_cleanup: 'dim',
  blocked: 'danger',
};

export function DesignCard({ card, ctx }: { card: DesignCardType; ctx: CardActionContext }) {
  const dims = card.widthPx && card.heightPx ? `${card.widthPx} × ${card.heightPx} px` : null;
  const dpi = card.dpiAtPrint ? `${card.dpiAtPrint} dpi` : null;
  const meta = [dims, dpi].filter(Boolean).join(' · ');

  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-3">{card.title}</div> : null}
      <div className="mf-checker mf-hairline mx-auto flex max-w-[320px] items-center justify-center rounded-2xl p-3">
        <img
          src={card.previewUrl}
          alt={card.title ?? 'Uploaded artwork'}
          className="max-h-[280px] w-full object-contain"
          loading="lazy"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusPill label={readinessLabel[card.readiness]} tone={readinessTone[card.readiness]} />
        {meta ? <span className="mf-dimmed text-[12px]">{meta}</span> : null}
      </div>
      {card.notes && card.notes.length > 0 ? (
        <ul className="mf-dimmed mt-2 flex flex-col gap-1 text-[12px]">
          {card.notes.map((note, index) => (
            <li key={`${note}-${index}`}>{note}</li>
          ))}
        </ul>
      ) : null}
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
