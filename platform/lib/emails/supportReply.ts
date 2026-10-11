import { appUrl, renderEmail } from '@/lib/emails/layout';

export interface SupportReplyPayload {
  subject?: string;
  preview?: string;
}

export function supportReplyEmail(payload: SupportReplyPayload) {
  const subject = payload.subject ?? 'your support ticket';
  const { html, text } = renderEmail({
    heading: 'New reply on your ticket',
    paragraphs: [
      `There's a new reply on "${subject}"${payload.preview ? `: "${payload.preview}"` : '.'}`,
    ],
    buttonLabel: 'Open ticket',
    buttonUrl: appUrl('/studio'),
  });
  return { subject: `Re: ${subject}`, html, text };
}
