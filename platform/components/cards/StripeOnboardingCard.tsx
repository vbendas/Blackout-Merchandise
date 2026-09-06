import type { Card, CardAction } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type StripeOnboardingCardType = Extract<Card, { kind: 'stripe_onboarding' }>;

const statusLabel: Record<StripeOnboardingCardType['status'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  action_required: 'Action required',
  ready: 'Ready',
};

const statusTone: Record<StripeOnboardingCardType['status'], StatusTone> = {
  not_started: 'neutral',
  in_progress: 'dim',
  action_required: 'warning',
  ready: 'positive',
};

function CheckRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 text-[13px]">
      <span
        aria-hidden
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center border"
        style={{
          borderColor: 'color-mix(in srgb, var(--signal) 45%, transparent)',
          background: done ? 'var(--signal)' : 'transparent',
        }}
      />
      <span className={done ? '' : 'mf-dimmed'}>{label}</span>
    </div>
  );
}

/** Card-computed fallback so 'Connect payouts' / 'Refresh status' work even
 * before the emitting tool attaches its own action list. */
function computedAction(card: StripeOnboardingCardType): CardAction | null {
  if (card.status === 'ready') return null;
  if (card.status === 'in_progress') return { label: 'Refresh status', prompt: 'Refresh my Stripe onboarding status' };
  if (card.onboardingUrl) return { label: 'Connect payouts', href: card.onboardingUrl, variant: 'primary' };
  return null;
}

export function StripeOnboardingCard({ card, ctx }: { card: StripeOnboardingCardType; ctx: CardActionContext }) {
  const fallback = computedAction(card);
  const actions = (card.actions?.length ? card.actions : fallback ? [fallback] : []).slice(0, 4);

  return (
    <div className="mf-card p-4">
      <div className="flex items-center justify-between">
        {card.title ? <div className="mf-label mf-dimmed">{card.title}</div> : <div className="mf-label mf-dimmed">Stripe payouts</div>}
        <StatusPill label={statusLabel[card.status]} tone={statusTone[card.status]} />
      </div>
      <div className="mf-hairline-t mt-3 pt-1">
        <CheckRow label="Charges" done={card.chargesEnabled} />
        <CheckRow label="Payouts" done={card.payoutsEnabled} />
      </div>
      {card.requirements && card.requirements.length > 0 ? (
        <ul className="mf-dimmed mt-2 flex flex-col gap-1 text-[12px]">
          {card.requirements.map((requirement, index) => (
            <li key={`${requirement}-${index}`}>{requirement}</li>
          ))}
        </ul>
      ) : null}
      <CardActions actions={actions} ctx={ctx} />
    </div>
  );
}
