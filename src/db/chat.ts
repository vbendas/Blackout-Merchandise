import { db } from './index';
import { chatSessions } from './schema';
import { eq, and, desc } from 'drizzle-orm';
import { ulid } from 'ulid';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: 'leopoldo' | 'francisca' | 'antonia';
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  userId?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export async function createChatSession(userId?: string): Promise<ChatSession> {
  const sessionId = `chat_${ulid()}`;
  const now = new Date();
  
  const [session] = await db.insert(chatSessions)
    .values({
      id: sessionId,
      userId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  
  return {
    id: session.id,
    userId: session.userId || undefined,
    messages: [],
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export async function getChatSession(sessionId: string, userId?: string): Promise<ChatSession | null> {
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(
      userId 
        ? and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId))
        : eq(chatSessions.id, sessionId)
    )
    .limit(1);
  
  if (!session) return null;
  
  return {
    id: session.id,
    userId: session.userId || undefined,
    messages: (session.messages as ChatMessage[]) || [],
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export async function addMessageToSession(
  sessionId: string,
  message: Omit<ChatMessage, 'timestamp'>
): Promise<ChatMessage> {
  const fullMessage: ChatMessage = {
    ...message,
    timestamp: new Date(),
  };
  
  const [existingSession] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);
  
  if (!existingSession) {
    throw new Error('Chat session not found');
  }
  
  const currentMessages = (existingSession.messages as ChatMessage[]) || [];
  const updatedMessages = [...currentMessages, fullMessage];
  
  await db
    .update(chatSessions)
    .set({
      messages: updatedMessages,
      updatedAt: new Date(),
    })
    .where(eq(chatSessions.id, sessionId));
  
  return fullMessage;
}

export async function updateSessionMessages(
  sessionId: string,
  messages: ChatMessage[]
): Promise<void> {
  await db
    .update(chatSessions)
    .set({
      messages,
      updatedAt: new Date(),
    })
    .where(eq(chatSessions.id, sessionId));
}

export async function getUserChatSessions(userId: string): Promise<ChatSession[]> {
  const sessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt));
  
  return sessions.map(session => ({
    id: session.id,
    userId: session.userId || undefined,
    messages: (session.messages as ChatMessage[]) || [],
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }));
}

// ============================================================================
// HUMAN HANDOFF OPERATIONS
// ============================================================================

export async function linkSessionToTicket(
  sessionId: string,
  ticketId: string
): Promise<void> {
  await db
    .update(chatSessions)
    .set({
      supportTicketId: ticketId,
      updatedAt: new Date(),
    })
    .where(eq(chatSessions.id, sessionId));
}

export async function updateSessionHandoffStatus(
  sessionId: string,
  status: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    humanHandoffStatus: status,
    updatedAt: new Date(),
  };

  if (status === 'pending') {
    updates.humanHandoffRequestedAt = new Date();
  }

  await db
    .update(chatSessions)
    .set(updates)
    .where(eq(chatSessions.id, sessionId));
}

export async function getSessionByTicketId(
  ticketId: string
): Promise<ChatSession | null> {
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.supportTicketId, ticketId))
    .limit(1);

  if (!session) return null;

  return {
    id: session.id,
    userId: session.userId || undefined,
    messages: (session.messages as ChatMessage[]) || [],
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}
