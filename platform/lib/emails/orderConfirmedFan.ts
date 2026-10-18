import { appUrl, formatCents, renderEmail } from '@/lib/emails/layout';

export interface OrderConfirmedFanPayload {
  reference?: string;
  storeName?: string;
  totalCents?: number;
  currency?: string;
  orderStatusUrl?: string;
}

export function orderConfirmedFanEmail(payload: OrderConfirmedFanPayload) {
  const reference = payload.reference ?? 'your order';
  const rows = payload.totalCents !== undefined ? [{ label: 'Total', value: formatCents(payload.totalCents, payload.currency ?? 'EUR') }] : [];
  const { html, text } = renderEmail({
    heading: 'Order confirmed',
    paragraphs: [`Thanks for your order${payload.storeName ? ` from ${payload.storeName}` : ''}. We'll email you again once it ships.`],
    rows,
    buttonLabel: 'View order status',
    buttonUrl: payload.orderStatusUrl ?? appUrl('/'),
    footerNote: `Order ${reference} · Blackout Merchandise — premium merch for artists.`,
  });
  return { subject: `Order confirmed — ${reference}`, html, text };
}
