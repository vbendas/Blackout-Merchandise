import { appUrl, formatCents, renderEmail } from '@/lib/emails/layout';

export interface BulkQuoteReadyPayload {
  totalCents?: number;
  currency?: string;
  quoteUrl?: string;
}

export function bulkQuoteReadyEmail(payload: BulkQuoteReadyPayload) {
  const rows = payload.totalCents !== undefined ? [{ label: 'Quote total', value: formatCents(payload.totalCents, payload.currency ?? 'EUR') }] : [];
  const { html, text } = renderEmail({
    heading: 'Your quote for the run is ready',
    paragraphs: ['Review the pricing and confirm to move to proof and payment.'],
    rows,
    buttonLabel: 'Review quote',
    buttonUrl: payload.quoteUrl ?? appUrl('/studio'),
  });
  return { subject: 'Your quote for the run is ready', html, text };
}
