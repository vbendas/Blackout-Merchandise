import { appUrl, renderEmail } from '@/lib/emails/layout';

export interface StripeActionRequiredPayload {
  requirements?: string[];
  onboardingUrl?: string;
}

export function stripeActionRequiredEmail(payload: StripeActionRequiredPayload) {
  // Stripe requirement codes (such as "tos_acceptance.date") are never shown to artists; the button leads to the list.
  const { html, text } = renderEmail({
    heading: 'A few things left before you can get paid',
    paragraphs: [
      'We need a little more information to finish setting up your payouts.',
      'Use the button below to see what is still missing.',
    ],
    buttonLabel: 'Finish payout setup',
    buttonUrl: payload.onboardingUrl ?? appUrl('/studio'),
  });
  return { subject: 'Action needed to receive payouts', html, text };
}
