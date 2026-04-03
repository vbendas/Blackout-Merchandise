/**
 * Session Persistence Utilities
 * Handles localStorage persistence for studio sessions, product lists, and chat messages
 * For logged-in users, data is also synced to the database
 */

import type { ProductListItem } from '@/lib/ProductListContext';
import type { StudioMessage } from '@/types/quickActions';

// Storage keys
const STUDIO_SESSION_KEY = 'merchfrom_studio_session';
const PRODUCT_LIST_KEY = 'merchfrom_product_list';
const CHAT_MESSAGES_KEY = 'merchfrom_chat_messages';

// Types
export interface DesignInstance {
  id: string;
  name: string;
  placement: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    designUrl: string;
  };
  source: 'upload' | 'ai-generated' | 'reference';
  styleId?: string;
  createdAt: number;
}

export interface SeparatedColor {
  id: string;
  name: string;
  pantone: string;
  hex: string;
  inkType: string;
  visible: boolean;
}

export interface PersistedStudioSession {
  step: number;
  designInstances: Record<string, DesignInstance[]>;
  activePrintArea: string;
  selectedStyle: string | null;
  halftoneLPI: number;
  separatedColors: SeparatedColor[];
  chatMessages: StudioMessage[];
  timestamp: number;
}

// Studio Session Persistence
export function saveStudioSession(data: PersistedStudioSession): void {
  try {
    const serialized = JSON.stringify({
      ...data,
      timestamp: Date.now(),
    });
    localStorage.setItem(STUDIO_SESSION_KEY, serialized);
  } catch (error) {
    console.error('[SessionPersistence] Failed to save studio session:', error);
  }
}

export function loadStudioSession(): PersistedStudioSession | null {
  try {
    const stored = localStorage.getItem(STUDIO_SESSION_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as PersistedStudioSession;

    // Validate timestamp (sessions older than 7 days are considered stale)
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > oneWeek) {
      console.log('[SessionPersistence] Studio session expired, clearing');
      clearStudioSession();
      return null;
    }

    // Restore Date objects for messages
    if (parsed.chatMessages) {
      parsed.chatMessages = parsed.chatMessages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }

    return parsed;
  } catch (error) {
    console.error('[SessionPersistence] Failed to load studio session:', error);
    clearStudioSession();
    return null;
  }
}

export function clearStudioSession(): void {
  try {
    localStorage.removeItem(STUDIO_SESSION_KEY);
  } catch (error) {
    console.error('[SessionPersistence] Failed to clear studio session:', error);
  }
}

// Product List Persistence
export function saveProductList(items: ProductListItem[]): void {
  try {
    const serialized = JSON.stringify({
      items,
      timestamp: Date.now(),
    });
    localStorage.setItem(PRODUCT_LIST_KEY, serialized);
  } catch (error) {
    console.error('[SessionPersistence] Failed to save product list:', error);
  }
}

export function loadProductList(): ProductListItem[] | null {
  try {
    const stored = localStorage.getItem(PRODUCT_LIST_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as { items: ProductListItem[]; timestamp: number };

    // Validate timestamp (lists older than 7 days are considered stale)
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > oneWeek) {
      console.log('[SessionPersistence] Product list expired, clearing');
      clearProductList();
      return null;
    }

    // Restore Date objects
    return parsed.items.map((item) => ({
      ...item,
      addedAt: new Date(item.addedAt),
    }));
  } catch (error) {
    console.error('[SessionPersistence] Failed to load product list:', error);
    clearProductList();
    return null;
  }
}

export function clearProductList(): void {
  try {
    localStorage.removeItem(PRODUCT_LIST_KEY);
  } catch (error) {
    console.error('[SessionPersistence] Failed to clear product list:', error);
  }
}

// Chat Messages Persistence (for main workspace chat)
export function saveChatMessages(messages: StudioMessage[]): void {
  try {
    const serialized = JSON.stringify({
      messages,
      timestamp: Date.now(),
    });
    localStorage.setItem(CHAT_MESSAGES_KEY, serialized);
  } catch (error) {
    console.error('[SessionPersistence] Failed to save chat messages:', error);
  }
}

export function loadChatMessages(): StudioMessage[] | null {
  try {
    const stored = localStorage.getItem(CHAT_MESSAGES_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as { messages: StudioMessage[]; timestamp: number };

    // Validate timestamp (messages older than 24 hours are considered stale)
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > oneDay) {
      console.log('[SessionPersistence] Chat messages expired, clearing');
      clearChatMessages();
      return null;
    }

    // Restore Date objects
    return parsed.messages.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error('[SessionPersistence] Failed to load chat messages:', error);
    clearChatMessages();
    return null;
  }
}

export function clearChatMessages(): void {
  try {
    localStorage.removeItem(CHAT_MESSAGES_KEY);
  } catch (error) {
    console.error('[SessionPersistence] Failed to clear chat messages:', error);
  }
}

// Utility: Clear all session data (e.g., on logout)
export function clearAllSessionData(): void {
  clearStudioSession();
  clearProductList();
  clearChatMessages();
}
