import { appUrl, formatCents, renderEmail } from '@/lib/emails/layout';

export interface SaleNewPayload {
  productName?: string;
  qty?: number;
  grossCents?: number;
  transferCents?: number;
  currency?: string;
  orderReference?: string;
  orderUrl?: string;
}

export function saleNewEmail(payload: SaleNewPayload) {
  const productName = payload.productName ?? 'A product';
  const qty = payload.qty ?? 1;
  const currency = payload.currency ?? 'EUR';
  const rows = [
    { label: 'Item', value: `${productName} × ${qty}` },
    { label: 'Order total', value: formatCents(payload.grossCents, currency) },
    ...(payload.transferCents !== undefined ? [{ label: 'Your share', value: formatCents(payload.transferCents, currency) }] : []),
  ];
  const { html, text } = renderEmail({
    heading: 'You made a sale',
    paragraphs: [`${productName} just sold${payload.orderReference ? ` — order ${payload.orderReference}` : ''}.`],
    rows,
    buttonLabel: 'View order',
    buttonUrl: payload.orderUrl ?? appUrl('/studio'),
  });
  return { subject: `New sale: ${productName} × ${qty}`, html, text };
}
