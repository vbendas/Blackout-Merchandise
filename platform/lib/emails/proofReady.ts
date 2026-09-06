import { appUrl, renderEmail } from '@/lib/emails/layout';

export interface ProofReadyPayload {
  productName?: string;
  version?: number;
  proofUrl?: string;
}

export function proofReadyEmail(payload: ProofReadyPayload) {
  const { html, text } = renderEmail({
    heading: 'Your proof is ready',
    paragraphs: [
      `Proof v${payload.version ?? 1}${payload.productName ? ` for ${payload.productName}` : ''} is ready to review.`,
    ],
    buttonLabel: 'Review proof',
    buttonUrl: payload.proofUrl ?? appUrl('/chat'),
  });
  return { subject: 'Your proof is ready', html, text };
}
