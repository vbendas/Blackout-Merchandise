import { db } from '@db-root/index';
import { waitlist } from '@db-root/schema';
import { eq, sql } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { setCachedWaitlistCount, withRateLimit } from '@/lib/rate-limit';

/**
 * Validation schema for waitlist entry creation
 */
const createWaitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  socialLink: z.string().url('Invalid URL').optional().or(z.literal('')),
  followerRange: z.enum(['1k-5k', '5k-10k', '10k-50k', '50k-100k', '100k+']).optional(),
  interviewResponses: z.record(z.string(), z.string()).optional(),
  source: z.string().max(50).optional(),
});

/**
 * Validation schema for waitlist query
 */
const queryWaitlistSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST handler for waitlist API
 * Creates a new waitlist entry
 */
async function createWaitlistHandler(request: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Waitlist POST request received`);

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error(`[${requestId}] Invalid JSON body:`, error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Validate request body
    const validation = createWaitlistSchema.safeParse(body);
    if (!validation.success) {
      console.error(`[${requestId}] Validation error:`, validation.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email, name, socialLink, followerRange, interviewResponses, source } = validation.data;

    const creationResult = await db.transaction(async (tx) => {
      // Ensure position assignment is serialized to prevent concurrent duplicates.
      await tx.execute(sql`LOCK TABLE waitlist IN EXCLUSIVE MODE`);

      const existing = await tx.select({ id: waitlist.id }).from(waitlist).where(eq(waitlist.email, email)).limit(1);
      if (existing.length > 0) {
        return { duplicate: true as const };
      }

      const countResult = await tx.select({ count: sql<number>`count(*)::int` }).from(waitlist);
      const position = (countResult[0]?.count || 0) + 1;

      const [newEntry] = await tx
        .insert(waitlist)
        .values({
          email,
          name,
          socialLink,
          followerRange,
          interviewResponses,
          source: source || 'organic',
          position,
          status: 'pending',
          notified: false,
        })
        .returning();

      return { duplicate: false as const, position, newEntry };
    });

    if (creationResult.duplicate) {
      console.log(`[${requestId}] Duplicate email: ${email}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Email already registered',
          code: 'DUPLICATE_EMAIL',
        },
        { status: 409 }
      );
    }

    await setCachedWaitlistCount(creationResult.position);

    console.log(
      `[${requestId}] Created waitlist entry ${creationResult.newEntry.id} at position ${creationResult.position}`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: creationResult.newEntry.id,
          position: creationResult.newEntry.position,
          email: creationResult.newEntry.email,
          name: creationResult.newEntry.name,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          error: 'Email already registered',
          code: 'DUPLICATE_EMAIL',
        },
        { status: 409 }
      );
    }

    console.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for waitlist API
 * Retrieves a waitlist entry by email
 */
async function getWaitlistHandler(request: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Waitlist GET request received`);

  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    const validation = queryWaitlistSchema.safeParse({ email });
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email parameter required',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    // Query database
    const entries = await db.select().from(waitlist).where(eq(waitlist.email, validation.data.email)).limit(1);

    if (entries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Entry not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: entries[0].id,
          email: entries[0].email,
          name: entries[0].name,
          position: entries[0].position,
          status: entries[0].status,
          timestamp: entries[0].timestamp,
          notified: entries[0].notified,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Export handlers with rate limiting
 * Strict rate limiting for waitlist (5 requests per minute) to prevent abuse
 */
export const POST = withRateLimit(createWaitlistHandler, 'strict');
export const GET = withRateLimit(getWaitlistHandler, 'public');
