import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, POST, PATCH, PUT } from './route';

// Mock the database functions
vi.mock('@db-root/chat', () => ({
  createChatSession: vi.fn(),
  getChatSession: vi.fn(),
  getUserChatSessions: vi.fn(),
  addMessageToSession: vi.fn(),
  updateSessionMessages: vi.fn(),
}));

import {
  createChatSession,
  getChatSession,
  getUserChatSessions,
  updateSessionMessages,
} from '@db-root/chat';

// Mock auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: 'test-user-id' }),
}));

describe('Studio Session API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: null });
      
      const request = new Request('http://localhost/api/studio/session');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return latest session for user', async () => {
      vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: 'test-user-id' });
      
      const mockSession = {
        id: 'session-1',
        userId: 'test-user-id',
        messages: [
          { id: '1', role: 'assistant' as const, content: 'Hello', agent: 'francisca' as const, timestamp: new Date() },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(getUserChatSessions).mockResolvedValue([mockSession]);
      
      const request = new Request('http://localhost/api/studio/session');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session).toBeDefined();
      expect(data.session.id).toBe('session-1');
    });

    it('should return all sessions when ?all=true', async () => {
      vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: 'test-user-id' });
      
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'test-user-id',
          messages: [{ id: '1', role: 'assistant' as const, content: 'Hello', agent: 'francisca' as const, timestamp: new Date() }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'session-2',
          userId: 'test-user-id',
          messages: [{ id: '1', role: 'assistant' as const, content: 'Hi', agent: 'francisca' as const, timestamp: new Date() }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      vi.mocked(getUserChatSessions).mockResolvedValue(mockSessions);
      
      const request = new Request('http://localhost/api/studio/session?all=true');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessions).toHaveLength(2);
    });

    it('should filter non-studio sessions', async () => {
      vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: 'test-user-id' });
      
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'test-user-id',
          messages: [{ id: '1', role: 'assistant' as const, content: 'Hello', agent: 'francisca' as const, timestamp: new Date() }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'session-2',
          userId: 'test-user-id',
          messages: [{ id: '1', role: 'assistant' as const, content: 'Hi', agent: 'leopoldo' as const, timestamp: new Date() }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      vi.mocked(getUserChatSessions).mockResolvedValue(mockSessions);
      
      const request = new Request('http://localhost/api/studio/session?all=true');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessions).toHaveLength(1);
      expect(data.sessions[0].id).toBe('session-1');
    });

    it('should return specific session by id', async () => {
      vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: 'test-user-id' });
      
      const mockSession = {
        id: 'session-1',
        userId: 'test-user-id',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(getChatSession).mockResolvedValue(mockSession);
      
      const request = new Request('http://localhost/api/studio/session?id=session-1');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session.id).toBe('session-1');
    });

    it('should return 404 for non-existent session', async () => {
      vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: 'test-user-id' });
      vi.mocked(getChatSession).mockResolvedValue(null);
      
      const request = new Request('http://localhost/api/studio/session?id=nonexistent');
      const response = await GET(request);
      
      expect(response.status).toBe(404);
    });
  });

  describe('POST', () => {
    it('should create new session', async () => {
      vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: 'test-user-id' });
      
      const mockSession = {
        id: 'new-session',
        userId: 'test-user-id',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(createChatSession).mockResolvedValue(mockSession);
      
      const request = new Request('http://localhost/api/studio/session', {
        method: 'POST',
      });
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.session.id).toBe('new-session');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: null });
      
      const request = new Request('http://localhost/api/studio/session', {
        method: 'POST',
      });
      const response = await POST(request);
      
      expect(response.status).toBe(401);
    });
  });

  describe('PUT', () => {
    it('should update session messages', async () => {
      vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: 'test-user-id' });
      
      const mockSession = {
        id: 'session-1',
        userId: 'test-user-id',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(getChatSession).mockResolvedValue(mockSession);
      vi.mocked(updateSessionMessages).mockResolvedValue(undefined);
      
      const request = new Request('http://localhost/api/studio/session?id=session-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
          ],
        }),
      });
      const response = await PUT(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 400 when messages is not an array', async () => {
      vi.mocked(require('@clerk/nextjs/server')).auth = () => Promise.resolve({ userId: 'test-user-id' });
      
      const request = new Request('http://localhost/api/studio/session?id=session-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: 'not-an-array' }),
      });
      const response = await PUT(request);
      
      expect(response.status).toBe(400);
    });
  });
});
