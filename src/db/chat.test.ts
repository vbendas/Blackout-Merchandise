import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createChatSession,
  getChatSession,
  addMessageToSession,
  updateSessionMessages,
  getUserChatSessions,
  type ChatMessage,
} from './chat';

// Mock the database
const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
};

vi.mock('./index', () => ({
  db: mockDb,
  eq: vi.fn((field, value) => ({ field, value })),
  and: vi.fn((...conditions) => ({ conditions })),
  desc: vi.fn((field) => ({ field, direction: 'desc' })),
}));

vi.mock('ulid', () => ({
  ulid: vi.fn(() => 'mock-ulid-123'),
}));

describe('Chat Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createChatSession', () => {
    it('should create a new chat session', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'chat_mock-ulid-123',
            userId: 'user-123',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }]),
        }),
      });

      const result = await createChatSession('user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('chat_mock-ulid-123');
      expect(result.userId).toBe('user-123');
      expect(result.messages).toEqual([]);
    });

    it('should create anonymous session without userId', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'chat_mock-ulid-123',
            userId: null,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }]),
        }),
      });

      const result = await createChatSession();

      expect(result).toBeDefined();
      expect(result.userId).toBeUndefined();
    });
  });

  describe('getChatSession', () => {
    it('should return session by id', async () => {
      const mockSession = {
        id: 'chat-123',
        userId: 'user-123',
        messages: [{ id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date() }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSession]),
          }),
        }),
      });

      const result = await getChatSession('chat-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('chat-123');
      expect(result?.messages).toHaveLength(1);
    });

    it('should return session with userId verification', async () => {
      const mockSession = {
        id: 'chat-123',
        userId: 'user-123',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSession]),
          }),
        }),
      });

      const result = await getChatSession('chat-123', 'user-123');

      expect(result).not.toBeNull();
    });

    it('should return null for non-existing session', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await getChatSession('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('addMessageToSession', () => {
    it('should add message to existing session', async () => {
      const existingSession = {
        id: 'chat-123',
        messages: [],
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingSession]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const message: Omit<ChatMessage, 'timestamp'> = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        agent: 'leopoldo',
      };

      const result = await addMessageToSession('chat-123', message);

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello');
      expect(result.role).toBe('user');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should throw error for non-existing session', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const message: Omit<ChatMessage, 'timestamp'> = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
      };

      await expect(addMessageToSession('nonexistent', message)).rejects.toThrow('Chat session not found');
    });

    it('should append message to existing messages', async () => {
      const existingSession = {
        id: 'chat-123',
        messages: [{ id: 'msg-1', role: 'user', content: 'First', timestamp: new Date() }],
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingSession]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const newMessage: Omit<ChatMessage, 'timestamp'> = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Response',
        agent: 'leopoldo',
      };

      const result = await addMessageToSession('chat-123', newMessage);

      expect(result).toBeDefined();
    });
  });

  describe('updateSessionMessages', () => {
    it('should update all messages in session', async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const messages: ChatMessage[] = [
        { id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date() },
        { id: 'msg-2', role: 'assistant', content: 'Hi!', agent: 'leopoldo', timestamp: new Date() },
      ];

      await expect(updateSessionMessages('chat-123', messages)).resolves.not.toThrow();
    });
  });

  describe('getUserChatSessions', () => {
    it('should return all sessions for user', async () => {
      const mockSessions = [
        {
          id: 'chat-1',
          userId: 'user-123',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'chat-2',
          userId: 'user-123',
          messages: [{ id: 'msg-1', role: 'user', content: 'Test', timestamp: new Date() }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockSessions),
          }),
        }),
      });

      const result = await getUserChatSessions('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-123');
    });

    it('should return empty array for user with no sessions', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await getUserChatSessions('user-no-sessions');

      expect(result).toEqual([]);
    });

    it('should order sessions by updatedAt desc', async () => {
      const mockSessions = [
        { id: 'chat-2', userId: 'user-123', messages: [], createdAt: new Date(), updatedAt: new Date('2024-01-02') },
        { id: 'chat-1', userId: 'user-123', messages: [], createdAt: new Date(), updatedAt: new Date('2024-01-01') },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockSessions),
          }),
        }),
      });

      const result = await getUserChatSessions('user-123');

      expect(result[0].id).toBe('chat-2');
      expect(result[1].id).toBe('chat-1');
    });
  });
});
