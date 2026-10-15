// Notification fan-out: in-app row always; email via Resend (or the dev
// outbox) and a pending Discord row, both gated by notification_prefs.
// Every step is best-effort — a failure in one channel never blocks another
// and never throws to the caller (callers fire-and-forget from services).
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getEmailGateway } from '@/lib/services/email';
import {
  adminQueueItemEmail,
  type AdminQueueItemPayload,
  bulkQuoteReadyEmail,
  type BulkQuoteReadyPayload,
  domainActiveEmail,
  type DomainActivePayload,
  orderConfirmedFanEmail,
  type OrderConfirmedFanPayload,
  orderShippedArtistEmail,
  type OrderShippedArtistPayload,
  orderShippedFanEmail,
  type OrderShippedFanPayload,
  payoutPaidEmail,
  type PayoutPaidPayload,
  printReapprovalEmail,
  type PrintReapprovalPayload,
  printSentBackEmail,
  type PrintSentBackPayload,
  proofReadyEmail,
  type ProofReadyPayload,
  saleNewEmail,
  type SaleNewPayload,
  stripeActionRequiredEmail,
  type StripeActionRequiredPayload,
  stripeReadyEmail,
  type StripeReadyPayload,
  supportReplyEmail,
  type SupportReplyPayload,
} from '@/lib/emails';

export type NotificationEvent =
  | 'stripe.action_required'
  | 'stripe.ready'
  | 'proof.ready'
  | 'sale.new'
  | 'order.shipped'
  | 'bulk.quote_ready'
  | 'payout.paid'
  | 'domain.active'
  | 'admin.queue_item'
  | 'support.reply'
  | 'print.sent_back'
  | 'print.reapproval';

export interface NotifyInput {
  userId: string;
  event: NotificationEvent;
  /** short human line shown in the inbox */
  text: string;
  /** structured payload for templates (orderId, amounts, urls…) */
  payload?: Record<string, unknown>;
  /** chat prompt attached to the inbox row */
  prompt?: string;
}

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function renderEventEmail(event: NotificationEvent, payload: Record<string, unknown>): RenderedEmail {
  switch (event) {
    case 'stripe.action_required':
      return stripeActionRequiredEmail(payload as StripeActionRequiredPayload);
    case 'stripe.ready':
      return stripeReadyEmail(payload as StripeReadyPayload);
    case 'proof.ready':
      return proofReadyEmail(payload as ProofReadyPayload);
    case 'sale.new':
      return saleNewEmail(payload as SaleNewPayload);
    case 'order.shipped':
      return orderShippedArtistEmail(payload as OrderShippedArtistPayload);
    case 'bulk.quote_ready':
      return bulkQuoteReadyEmail(payload as BulkQuoteReadyPayload);
    case 'payout.paid':
      return payoutPaidEmail(payload as PayoutPaidPayload);
    case 'domain.active':
      return domainActiveEmail(payload as DomainActivePayload);
    case 'admin.queue_item':
      return adminQueueItemEmail(payload as AdminQueueItemPayload);
    case 'support.reply':
      return supportReplyEmail(payload as SupportReplyPayload);
    case 'print.sent_back':
      return printSentBackEmail(payload as PrintSentBackPayload);
    case 'print.reapproval':
      return printReapprovalEmail(payload as PrintReapprovalPayload);
  }
}

function adminRecipients(fallback: string): string[] {
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [fallback];
}

export async function notify(input: NotifyInput): Promise<void> {
  const payload = { ...(input.payload ?? {}), message: input.text, prompt: input.prompt };

  // 1. in-app row — always, independent of prefs.
  try {
    await db.insert(schema.notifications).values({
      userId: input.userId,
      channel: 'inapp',
      event: input.event,
      payload,
      status: 'sent',
      sentAt: new Date(),
    });
  } catch (err) {
    console.error(`[notify] inapp insert failed for ${input.event}:`, err instanceof Error ? err.message : err);
  }

  let user: typeof schema.users.$inferSelect | undefined;
  let prefs: typeof schema.notificationPrefs.$inferSelect | undefined;
  try {
    [user] = await db.select().from(schema.users).where(eq(schema.users.id, input.userId)).limit(1);
    [prefs] = await db.select().from(schema.notificationPrefs).where(eq(schema.notificationPrefs.userId, input.userId)).limit(1);
  } catch (err) {
    console.error(`[notify] prefs lookup failed for ${input.event}:`, err instanceof Error ? err.message : err);
  }
  const emailPref = prefs?.email ?? true;
  const discordPref = prefs?.discordDm ?? true;

  // 2. Discord DM — wave 4 bot drains 'pending' rows; we only queue here.
  if (discordPref) {
    try {
      await db.insert(schema.notifications).values({
        userId: input.userId,
        channel: 'discord',
        event: input.event,
        payload,
        status: 'pending',
      });
    } catch (err) {
      console.error(`[notify] discord queue failed for ${input.event}:`, err instanceof Error ? err.message : err);
    }
  }

  // 3. Email.
  if (emailPref && user) {
    try {
      const rendered = renderEventEmail(input.event, payload);
      const to = input.event === 'admin.queue_item' ? adminRecipients(user.email) : user.email;
      const result = await getEmailGateway().send({ to, subject: rendered.subject, html: rendered.html, text: rendered.text, event: input.event });
      await db.insert(schema.notifications).values({
        userId: input.userId,
        channel: 'email',
        event: input.event,
        payload,
        status: result.ok ? 'sent' : 'failed',
        sentAt: result.ok ? new Date() : null,
      });
      if (!result.ok) console.error(`[notify] email failed for ${input.event}: ${result.error}`);
    } catch (err) {
      console.error(`[notify] email send threw for ${input.event}:`, err instanceof Error ? err.message : err);
    }
  }
}

/** Fan-facing email (no user row): order confirmation / shipped. */
export async function notifyFan(input: { email: string; event: 'order.confirmed' | 'order.shipped'; payload: Record<string, unknown> }): Promise<void> {
  try {
    const rendered =
      input.event === 'order.confirmed'
        ? orderConfirmedFanEmail(input.payload as OrderConfirmedFanPayload)
        : orderShippedFanEmail(input.payload as OrderShippedFanPayload);
    const result = await getEmailGateway().send({
      to: input.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      event: `fan.${input.event}`,
    });
    if (!result.ok) console.error(`[notifyFan] email failed for ${input.event}: ${result.error}`);
  } catch (err) {
    console.error(`[notifyFan] email send threw for ${input.event}:`, err instanceof Error ? err.message : err);
  }
}
