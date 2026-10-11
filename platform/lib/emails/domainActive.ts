import { appUrl, renderEmail } from '@/lib/emails/layout';

export interface DomainActivePayload {
  hostname?: string;
  storeUrl?: string;
}

export function domainActiveEmail(payload: DomainActivePayload) {
  const hostname = payload.hostname ?? 'Your domain';
  const { html, text } = renderEmail({
    heading: `${hostname} is live`,
    paragraphs: ['DNS verified and the certificate is issued. Your shop is now reachable on your own domain.'],
    buttonLabel: 'Visit your shop',
    buttonUrl: payload.storeUrl ?? appUrl('/studio'),
  });
  return { subject: `${hostname} is live`, html, text };
}
