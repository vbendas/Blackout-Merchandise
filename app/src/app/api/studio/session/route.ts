import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import {
  createChatSession,
  getChatSession,
  getUserChatSessions,
  addMessageToSession,
  updateSessionMessages,
} from '@db-root/chat';

/**
 * Studio Session API
 * Handles persistent storage of studio chat sessions
 */

// GET /api/studio/session - Get latest or all studio sessions
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const sessionId = searchParams.get('id');

    if (sessionId) {
      // Get specific session
      const session = await getChatSession(sessionId, userId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ session });
    }

    if (all) {
      // Get all user sessions
      const sessions = await getUserChatSessions(userId);
      // Filter for studio sessions (those with francisca agent messages)
      const studioSessions = sessions.filter((session) =>
        session.messages.some((msg) => msg.agent === 'francisca')
      );
      return NextResponse.json({ sessions: studioSessions });
    }

    // Get most recent active studio session
    const sessions = await getUserChatSessions(userId);
    const studioSessions = sessions.filter((session) =>
      session.messages.some((msg) => msg.agent === 'francisca')
    );

    const latestSession = studioSessions[0] || null;
    return NextResponse.json({ session: latestSession });
  } catch (error) {
    console.error('[Studio Session API] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

// POST /api/studio/session - Create new studio session
export async function POST(_request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await createChatSession(userId);

    // Studio metadata is stored in the session, not as a message
    // The messages array starts empty

    return NextResponse.json({ session });
  } catch (error) {
    console.error('[Studio Session API] POST error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// PATCH /api/studio/session/:id - Append messages to session
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { messages } = body;

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    // Verify session belongs to user
    const session = await getChatSession(sessionId, userId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Append each message
    for (const message of messages) {
      await addMessageToSession(sessionId, {
        id: message.id,
        role: message.role,
        content: message.content,
        agent: message.agent,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Studio Session API] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

// PUT /api/studio/session/:id - Replace all messages (for restoration)
export async function PUT(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const body = await request.json();
    const { messages } = body;

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array required' }, { status: 400 });
    }

    // Verify session belongs to user
    const session = await getChatSession(sessionId, userId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await updateSessionMessages(
      sessionId,
      messages.map((msg: { id: string; role: 'user' | 'assistant'; content: string; agent?: string; timestamp?: string }) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        agent: msg.agent as 'leopoldo' | 'francisca' | 'antonia',
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Studio Session API] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
