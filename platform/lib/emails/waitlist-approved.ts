import { appUrl, renderEmail } from '@/lib/emails/layout';

export interface WaitlistApprovedPayload {
  inviteToken?: string;
  product?: string;
}

export function waitlistApprovedEmail(payload: WaitlistApprovedPayload) {
  const inviteUrl = appUrl(payload.inviteToken ? `/sign-up?invite=${payload.inviteToken}` : '/sign-up');
  const { html, text } = renderEmail({
    heading: "You're in. Create your Blackout Merchandise shop",
    paragraphs: [
      payload.product
        ? `Your spot is confirmed — set up your shop and start selling your ${payload.product} merch.`
        : 'Your spot is confirmed — set up your shop whenever you are ready.',
    ],
    buttonLabel: 'Create your shop',
    buttonUrl: inviteUrl,
  });
  return { subject: "You're in. Create your Blackout Merchandise shop", html, text };
}
