/**
 * Test Data Factories
 *
 * Factory functions for creating test data with sensible defaults.
 * Makes tests more readable and easier to maintain.
 */

import { ulid } from 'ulid';

// Types based on database schema
export interface User {
  id: string;
  clerkId: string;
  email: string;
  displayName?: string;
  role: 'artist' | 'customer' | 'admin';
  stripeCustomerId?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  name?: string;
  socialLink?: string;
  followerRange?: string;
  interviewResponses?: Record<string, string>;
  source: string;
  position?: number;
  status: 'pending' | 'approved' | 'rejected' | 'notified';
  timestamp: Date;
  notified: boolean;
}

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

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  baseCost: number;
  retailPrice: number;
  mockupUrl: string;
  designFileUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtistStore {
  id: string;
  artistId: string;
  slug: string;
  name: string;
  isLive: boolean;
  themeConfig?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Factory functions
export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: ulid(),
    clerkId: `clerk_${ulid()}`,
    email: `test_${ulid().slice(0, 8)}@example.com`,
    displayName: 'Test User',
    role: 'customer',
    stripeCustomerId: `cus_${ulid()}`,
    imageUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createWaitlistEntry(overrides: Partial<WaitlistEntry> = {}): WaitlistEntry {
  const id = ulid();
  return {
    id,
    email: `waitlist_${id.slice(0, 8)}@example.com`,
    name: 'Test User',
    socialLink: 'https://instagram.com/testuser',
    followerRange: '10k-50k',
    interviewResponses: {
      q1: 'I want to sell merchandise to my fans',
      q2: 'Digital art and illustrations',
    },
    source: 'organic',
    position: 1,
    status: 'pending',
    timestamp: new Date(),
    notified: false,
    ...overrides,
  };
}

export function createChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: ulid(),
    role: 'user',
    content: 'Hello, can you help me with merchandise?',
    agent: 'leopoldo',
    timestamp: new Date(),
    ...overrides,
  };
}

export function createChatSession(overrides: Partial<ChatSession> = {}): ChatSession {
  const now = new Date();
  return {
    id: `chat_${ulid()}`,
    userId: ulid(),
    messages: [createChatMessage()],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createProduct(overrides: Partial<Product> = {}): Product {
  const now = new Date();
  return {
    id: ulid(),
    storeId: ulid(),
    name: 'Test T-Shirt',
    description: 'A high-quality cotton t-shirt',
    baseCost: 1500, // $15.00 in cents
    retailPrice: 2999, // $29.99 in cents
    mockupUrl: 'https://example.com/mockup.jpg',
    designFileUrl: 'https://example.com/design.pdf',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createArtistStore(overrides: Partial<ArtistStore> = {}): ArtistStore {
  const now = new Date();
  return {
    id: ulid(),
    artistId: ulid(),
    slug: `store-${ulid().slice(0, 8)}`,
    name: 'Test Store',
    isLive: false,
    themeConfig: { primaryColor: '#000000', font: 'Inter' },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Mock Clerk user for testing
export function createMockClerkUser(overrides: Record<string, unknown> = {}) {
  return {
    id: `user_${ulid()}`,
    email_addresses: [{ email_address: 'test@example.com' }],
    first_name: 'Test',
    last_name: 'User',
    image_url: 'https://example.com/avatar.jpg',
    ...overrides,
  };
}

// Mock Stripe event for testing
export function createMockStripeCheckoutSession(overrides: Record<string, unknown> = {}) {
  return {
    id: `cs_${ulid()}`,
    object: 'checkout.session',
    amount_total: 2999,
    currency: 'usd',
    metadata: {
      userId: ulid(),
      storeId: ulid(),
      items: JSON.stringify([{ productId: ulid(), quantity: 1 }]),
    },
    ...overrides,
  };
}
