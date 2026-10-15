import { appUrl, escapeHtml, renderEmail } from '@/lib/emails/layout';

export interface PrintReapprovalPayload {
  designId?: string;
  designName?: string;
}

/** Pre-press changed how a design prints beyond the proof threshold, so the
 * artist's approval was withdrawn and they are asked to look again. */
export function printReapprovalEmail(payload: PrintReapprovalPayload) {
  const name = payload.designName?.trim() || 'your design';
  const { html, text } = renderEmail({
    preheader: `Please approve ${name} again.`,
    heading: 'Please approve your print again',
    paragraphs: [
      `Our pre-press team made a change to the print files for ${escapeHtml(name)} that alters how it prints.`,
      'Look over the new proof and approve it again. Production waits until you do.',
    ],
    buttonLabel: 'Open the proof',
    buttonUrl: appUrl(payload.designId ? `/studio/approve/${encodeURIComponent(payload.designId)}` : '/studio'),
  });
  return { subject: `Please approve ${name} again`, html, text };
}
