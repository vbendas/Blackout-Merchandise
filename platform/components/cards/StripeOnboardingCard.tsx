import type { Card, CardAction } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { CardFrame, CardHead, SpecRows, type SpecRowData } from '@/components/cards/CardKit';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type StripeOnboardingCardType = Extract<Card, { kind: 'stripe_onboarding' }>;
type Status = StripeOnboardingCardType['status'];

const statusLabel: Record<Status, string> = {
  not_started: 'Not set up',
  in_progress: 'Being checked',
  action_required: 'Needs details',
  ready: 'Ready',
};

const statusTone: Record<Status, StatusTone> = {
  not_started: 'neutral',
  in_progress: 'dim',
  action_required: 'warning',
  ready: 'positive',
};

const headline: Record<Status, string> = {
  not_started: 'Set up payouts',
  in_progress: 'Almost there',
  action_required: 'A few details are missing',
  ready: 'Payouts are ready',
};

const sentence: Record<Status, string> = {
  not_started: 'Add your bank details so your sales can be paid out to you.',
  in_progress: 'Your details are in and being checked.',
  action_required: 'Add these details to finish setting up payouts.',
  ready: 'Fans can pay, and your sales are paid out to you.',
};

// The payment provider names what it still needs with field codes
// ('external_account', 'individual.dob.day'). The artist reads plain words.
const WHOLE: Record<string, string> = {
  external_account: 'Bank account',
  business_type: 'Type of business',
  'business_profile.url': 'Website or shop address',
  'business_profile.mcc': 'What you sell',
  'business_profile.product_description': 'What you sell',
  'tos_acceptance.date': 'Accept the payment terms',
  'tos_acceptance.ip': 'Accept the payment terms',
  'tos_acceptance.service_agreement': 'Accept the payment terms',
};

function fieldWords(field: string): string {
  if (/(^|\.)(first_name|last_name|maiden_name|full_name_aliases)(_kana|_kanji)?$/.test(field)) return 'name';
  if (/(^|\.)dob(\.|$)/.test(field)) return 'date of birth';
  if (/(^|\.)address(_kana|_kanji)?(\.|$)/.test(field)) return 'address';
  if (/(^|\.)email$/.test(field)) return 'email address';
  if (/(^|\.)phone$/.test(field)) return 'phone number';
  if (/(^|\.)(id_number|ssn_last_4|personal_id_number)$/.test(field)) return 'ID number';
  if (/(^|\.)(tax_id|vat_id|registration_number)$/.test(field)) return 'tax number';
  if (/(^|\.)verification\.(additional_)?document$/.test(field)) return 'ID document';
  if (/(^|\.)structure$/.test(field)) return 'structure';
  if (/(^|\.)(owners|directors|executives|representatives)_provided$/.test(field)) return 'owners and directors';
  if (/(^|\.)relationship\./.test(field)) return 'role in the business';
  if (/(^|\.)name$/.test(field)) return 'name';
  return (field.split('.').pop() ?? field).replace(/_/g, ' ');
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** 'external_account' becomes 'Bank account', 'individual.dob.day' 'Your date of birth'. */
export function requirementWords(code: string): string {
  if (Object.hasOwn(WHOLE, code)) return WHOLE[code];
  const [scope, ...rest] = code.split('.');
  const field = rest.join('.');
  if (field) {
    if (scope === 'company') return capitalise(`company ${fieldWords(field).replace('ID document', 'document')}`);
    if (scope === 'individual' || scope === 'representative') return capitalise(`your ${fieldWords(field)}`);
    if (/^(person|owner|director|executive)_/.test(scope)) return capitalise(`${fieldWords(field)} for an owner or director`);
  }
  return capitalise(fieldWords(code));
}

const MAX_REQUIREMENTS = 6;

/** Card-computed fallback so 'Refresh status' works even before the emitting
 * tool attaches its own action list. */
function computedAction(card: StripeOnboardingCardType): CardAction | null {
  if (card.status === 'ready') return null;
  if (card.status === 'in_progress') return { label: 'Refresh status', prompt: 'Check my payout status' };
  if (card.onboardingUrl) return { label: 'Continue setup', href: card.onboardingUrl, variant: 'primary' };
  return null;
}

export function StripeOnboardingCard({ card, ctx }: { card: StripeOnboardingCardType; ctx: CardActionContext }) {
  const fallback = computedAction(card);
  const actions = (card.actions?.length ? card.actions : fallback ? [fallback] : []).slice(0, 4);

  const rows: SpecRowData[] = [
    { key: 'charges', label: 'Card payments', value: card.chargesEnabled ? 'On' : 'Off', state: card.chargesEnabled ? 'current' : undefined },
    { key: 'payouts', label: 'Payouts', value: card.payoutsEnabled ? 'On' : 'Off', state: card.payoutsEnabled ? 'current' : undefined },
  ];

  const needed = [...new Set((card.requirements ?? []).map(requirementWords))];
  const neededRows: SpecRowData[] = needed.slice(0, MAX_REQUIREMENTS).map((words) => ({ key: words, label: words }));
  if (needed.length > MAX_REQUIREMENTS) neededRows.push({ key: 'more', label: `And ${needed.length - MAX_REQUIREMENTS} more`, dim: true });

  // 'Stripe' is the provider's name, not a word the artist uses for this.
  const label = card.title && !/stripe/i.test(card.title) ? card.title : 'Payouts';

  return (
    <CardFrame>
      <CardHead
        label={label}
        title={headline[card.status]}
        sentence={sentence[card.status]}
        aside={<StatusPill label={statusLabel[card.status]} tone={statusTone[card.status]} />}
      />
      <SpecRows rows={rows} />
      {neededRows.length > 0 ? (
        <div className="mfc-section">
          <span className="mfc-label">Still needed</span>
          <SpecRows rows={neededRows} variant="plain" />
        </div>
      ) : null}
      <CardActions actions={actions} ctx={ctx} />
    </CardFrame>
  );
}
