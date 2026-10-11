import { appUrl, renderEmail } from '@/lib/emails/layout';

export interface StripeActionRequiredPayload {
  requirements?: string[];
  onboardingUrl?: string;
}

export function stripeActionRequiredEmail(payload: StripeActionRequiredPayload) {
  const requirements = payload.requirements ?? [];
  const { html, text } = renderEmail({
    heading: 'A few things left before you can get paid',
    paragraphs: [
      'Stripe needs a bit more information to finish connecting your payouts.',
      requirements.length > 0 ? `Outstanding: ${requirements.join(', ')}.` : 'Open the onboarding link to see what is missing.',
    ],
    buttonLabel: 'Finish Stripe setup',
    buttonUrl: payload.onboardingUrl ?? appUrl('/studio'),
  });
  return { subject: 'Action needed to receive payouts', html, text };
}
