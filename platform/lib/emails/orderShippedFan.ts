import { appUrl, renderEmail } from '@/lib/emails/layout';

export interface OrderShippedFanPayload {
  reference?: string;
  carrier?: string;
  trackingUrl?: string;
}

export function orderShippedFanEmail(payload: OrderShippedFanPayload) {
  const reference = payload.reference ?? 'your order';
  const { html, text } = renderEmail({
    heading: 'Your order has shipped',
    paragraphs: [`${reference} is on its way${payload.carrier ? ` with ${payload.carrier}` : ''}.`],
    buttonLabel: 'Track your order',
    buttonUrl: payload.trackingUrl ?? appUrl('/'),
  });
  return { subject: 'Your order has shipped', html, text };
}
