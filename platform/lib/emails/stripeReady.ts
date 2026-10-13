import { appUrl, renderEmail } from '@/lib/emails/layout';

export interface StripeReadyPayload {
  storeName?: string;
}

export function stripeReadyEmail(payload: StripeReadyPayload) {
  const { html, text } = renderEmail({
    heading: 'Payouts connected',
    paragraphs: [
      `${payload.storeName ?? 'Your shop'} can now receive sale payouts. You can publish products whenever you are ready.`,
    ],
    buttonLabel: 'Open MerchFrom',
    buttonUrl: appUrl('/studio'),
  });
  return { subject: 'Payouts connected', html, text };
}
