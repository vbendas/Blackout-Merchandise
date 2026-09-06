import { appUrl, renderEmail } from '@/lib/emails/layout';

export interface OrderShippedArtistPayload {
  reference?: string;
  carrier?: string;
  trackingUrl?: string;
}

export function orderShippedArtistEmail(payload: OrderShippedArtistPayload) {
  const reference = payload.reference ?? 'Your order';
  const { html, text } = renderEmail({
    heading: `Order ${reference} shipped`,
    paragraphs: [`${reference} is on its way${payload.carrier ? ` with ${payload.carrier}` : ''}.`],
    buttonLabel: 'Track shipment',
    buttonUrl: payload.trackingUrl ?? appUrl('/chat'),
  });
  return { subject: `Order ${reference} shipped`, html, text };
}
