import { appUrl, renderEmail } from '@/lib/emails/layout';

export interface AdminQueueItemPayload {
  summary?: string;
  kind?: string;
}

export function adminQueueItemEmail(payload: AdminQueueItemPayload) {
  const summary = payload.summary ?? 'A new item needs attention';
  const { html, text } = renderEmail({
    heading: 'Admin queue item',
    paragraphs: [payload.kind ? `${payload.kind}: ${summary}` : summary],
    buttonLabel: 'Open admin queue',
    buttonUrl: appUrl('/chat/admin'),
  });
  return { subject: `Queue: ${summary}`, html, text };
}
