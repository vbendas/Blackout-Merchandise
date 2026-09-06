import { NextResponse, type NextRequest } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { clerkUserInputFromWebhookUser, getOrCreateUserFromClerk } from '@/lib/services/users';

export async function POST(req: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(req, { signingSecret: process.env.CLERK_WEBHOOK_SECRET });
  } catch (err) {
    console.error('clerk webhook: signature verification failed', err);
    return new NextResponse('invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'user.created':
    case 'user.updated':
      await getOrCreateUserFromClerk(clerkUserInputFromWebhookUser(event.data));
      break;
    case 'user.deleted':
      // Soft: keep the row (orders/store history reference it), just log.
      console.log('clerk webhook: user.deleted', event.data.id);
      break;
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
