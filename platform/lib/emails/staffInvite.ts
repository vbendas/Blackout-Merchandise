import { escapeHtml, renderEmail } from '@/lib/emails/layout';

export interface StaffInvitePayload {
  /** the one-time link to /staff-invite?token=… */
  acceptUrl: string;
  /** who invited them, by name */
  invitedBy: string;
  title?: string | null;
  /** one line per area, e.g. 'Pre-press: Work' */
  access: string[];
  /** when the link stops working, e.g. '22 Oct 2026' */
  expiresOn: string;
}

/** The owner's invitation to join the team. The link only works after the
 * invitee signs in with this same address, so the email says which one. */
export function staffInviteEmail(payload: StaffInvitePayload) {
  const subject = 'Join the MerchFrom team';
  const role = payload.title?.trim() ? ` as ${escapeHtml(payload.title.trim())}` : '';
  const { html, text } = renderEmail({
    preheader: `${payload.invitedBy} added you to the MerchFrom team.`,
    heading: subject,
    paragraphs: [
      `${escapeHtml(payload.invitedBy)} invited you to work in the MerchFrom admin${role}.`,
      'Open the link and sign in with this email address. The link works once.',
    ],
    rows: [
      ...payload.access.map((line) => {
        const [area, level] = line.split(': ');
        return { label: area, value: level ?? '' };
      }),
      { label: 'Link expires', value: payload.expiresOn },
    ],
    buttonLabel: 'Accept the invite',
    buttonUrl: payload.acceptUrl,
    footerNote: "If you weren't expecting this, you can ignore it. Nothing happens until you accept.",
  });
  return { subject, html, text };
}
