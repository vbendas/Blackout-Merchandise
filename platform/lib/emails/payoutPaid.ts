import { appUrl, formatCents, renderEmail } from '@/lib/emails/layout';

export interface PayoutPaidPayload {
  amountCents?: number;
  currency?: string;
  arrivalDate?: string;
}

export function payoutPaidEmail(payload: PayoutPaidPayload) {
  const amount = formatCents(payload.amountCents, payload.currency ?? 'EUR');
  const { html, text } = renderEmail({
    heading: 'Payout sent',
    paragraphs: [`Stripe sent ${amount} to your connected account${payload.arrivalDate ? `, arriving ${payload.arrivalDate}` : ''}.`],
    buttonLabel: 'Open MerchFrom',
    buttonUrl: appUrl('/studio'),
  });
  return { subject: `Payout sent: ${amount}`, html, text };
}
