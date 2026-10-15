import { appUrl, escapeHtml, renderEmail } from '@/lib/emails/layout';

export interface PrintSentBackPayload {
  designId?: string;
  designName?: string;
  /** pre-press's note to the artist (never a Pantone code: sendBackToArtist refuses one) */
  note?: string;
}

/** Pre-press sent a design's print files back: what to change, and where to look. */
export function printSentBackEmail(payload: PrintSentBackPayload) {
  const name = payload.designName?.trim() || 'your design';
  const { html, text } = renderEmail({
    preheader: `Our pre-press team asked for a change to ${name}.`,
    heading: 'A change is needed before printing',
    paragraphs: [
      `Our pre-press team checked the print files for ${escapeHtml(name)} and asked for a change${payload.note ? `: “${escapeHtml(payload.note)}”` : '.'}`,
      'Production waits until the change is made and you approve the new proof.',
    ],
    buttonLabel: 'Open the proof',
    buttonUrl: appUrl(payload.designId ? `/studio/approve/${encodeURIComponent(payload.designId)}` : '/studio'),
  });
  return { subject: `A change is needed on ${name}`, html, text };
}
