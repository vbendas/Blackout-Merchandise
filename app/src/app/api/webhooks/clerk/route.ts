import { db } from '@db-root/index';
import { consents, dataSubjectRequests, users } from '@db-root/schema';
import { createUser, deleteUser, updateUser } from '@db-root/users';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';

type ClerkEmailAddress = { email_address: string };

interface ClerkUserPayload {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  email_addresses?: ClerkEmailAddress[];
}

interface ClerkDeletedUserPayload {
  id: string;
}

type ClerkWebhookEvent =
  | { type: 'user.created'; data: ClerkUserPayload }
  | { type: 'user.updated'; data: ClerkUserPayload }
  | { type: 'user.deleted'; data: ClerkDeletedUserPayload };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isClerkUserPayload(data: unknown): data is ClerkUserPayload {
  return isObject(data) && typeof data.id === 'string';
}

function isClerkDeletedUserPayload(data: unknown): data is ClerkDeletedUserPayload {
  return isObject(data) && typeof data.id === 'string';
}

function toClerkWebhookEvent(event: unknown): ClerkWebhookEvent | null {
  if (!isObject(event) || typeof event.type !== 'string') {
    return null;
  }

  if (event.type === 'user.created' || event.type === 'user.updated') {
    return isClerkUserPayload(event.data) ? (event as ClerkWebhookEvent) : null;
  }

  if (event.type === 'user.deleted') {
    return isClerkDeletedUserPayload(event.data) ? (event as ClerkWebhookEvent) : null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(`[${requestId}] Clerk webhook secret is missing`);
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: 'Missing signature verification headers' }, { status: 400 });
    }

    const body = await request.text();
    const webhook = new Webhook(webhookSecret);
    let verifiedEvent: unknown;

    try {
      verifiedEvent = webhook.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = toClerkWebhookEvent(verifiedEvent);
    if (!event) {
      return NextResponse.json({ error: 'Unsupported webhook event payload' }, { status: 400 });
    }

    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data);
        break;

      case 'user.updated':
        await handleUserUpdated(event.data);
        break;

      case 'user.deleted':
        await handleUserDeleted(event.data);
        break;
    }

    console.log(`[${requestId}] Processed Clerk webhook`, { eventType: event.type, userId: event.data.id });
    return NextResponse.json({ success: true, eventType: event.type });
  } catch (error) {
    console.error(`[${requestId}] Clerk webhook processing failed`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleUserCreated(data: ClerkUserPayload) {
  // Create user in our database
  await createUser(
    data.id,
    data.email_addresses?.[0]?.email_address || '',
    `${data.first_name || ''} ${data.last_name || ''}`.trim() || undefined
  );
}

async function handleUserUpdated(data: ClerkUserPayload) {
  // Update user in our database
  await updateUser(data.id, {
    email: data.email_addresses?.[0]?.email_address,
    displayName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || undefined,
    imageUrl: data.image_url,
    updatedAt: new Date(),
  });
}

async function handleUserDeleted(data: ClerkDeletedUserPayload) {
  const clerkUserId = data.id;

  // Find user in our database
  const user = await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1);

  if (user.length > 0) {
    const userId = user[0].id;

    // Delete consent records (will cascade due to schema)
    await db.delete(consents).where(eq(consents.userId, userId));

    // Delete data subject requests (will be set to null due to onDelete: 'set null')
    await db.delete(dataSubjectRequests).where(eq(dataSubjectRequests.userId, userId));
  }

  await deleteUser(clerkUserId);
}
