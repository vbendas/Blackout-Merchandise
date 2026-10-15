// The agent loop checks access again right before a tool runs, both for a
// call the model makes (executeToolCall) and for a confirmed step
// (resumeAgentTurn), so nothing the model sends runs past the caller's access.
// Also here: whom the voice bridge acts for, and which attached designs the
// model is told about.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq } from 'drizzle-orm';
import type Anthropic from '@anthropic-ai/sdk';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '../../scripts/test/pglite';
import type { AgentEvent } from '@/lib/agent/protocol';
import type { PermissionMap } from '@/lib/auth/permissions';

// Never a real model: the mock answers if anything reaches it.
process.env.AGENT_MOCK = '1';
delete process.env.ANTHROPIC_API_KEY;
// Never the dev-bypass user: the voice bridge must find nobody without a token.
delete process.env.AUTH_DEV_BYPASS;

let t: TestDb;
let loop: typeof import('./loop');
let conversations: typeof import('@/lib/services/conversations');
let audit: typeof import('@/lib/services/tools-audit');
let counter = 0;

before(async () => {
  t = await setupTestDb();
  loop = await import('./loop');
  conversations = await import('@/lib/services/conversations');
  audit = await import('@/lib/services/tools-audit');
});

after(async () => {
  await t.close();
});

async function staffSetup(permissions: PermissionMap, suspended = false) {
  counter += 1;
  const { userId } = await seedUser(t.db, { email: `loop-${counter}@merchfrom.test`, role: 'staff' });
  const conversation = await conversations.getOrCreateConversation(userId, 'staff');
  const base = {
    userId,
    clerkId: `test-loop-${counter}`,
    role: 'staff' as const,
    storeId: null,
    conversationId: conversation.id,
    locale: 'en',
    permissions,
    suspended,
  };
  return { userId, base };
}

async function ticket(): Promise<string> {
  const [row] = await t.db.insert(schema.supportTickets).values({ agentId: 'Antônia', subject: 'Where is my order?', status: 'pending' }).returning();
  return row.id;
}

async function ticketStatus(id: string): Promise<string> {
  const [row] = await t.db.select().from(schema.supportTickets).where(eq(schema.supportTickets.id, id));
  return row.status;
}

function toolUse(name: string, input: Record<string, unknown>): Anthropic.ToolUseBlock {
  counter += 1;
  return { type: 'tool_use', id: `toolu_test_${counter}`, name, input } as Anthropic.ToolUseBlock;
}

function collector() {
  const events: AgentEvent[] = [];
  return { events, emit: (event: AgentEvent) => events.push(event) };
}

test('a call outside the caller’s access is refused, recorded, and never runs', async () => {
  const { base } = await staffSetup({ support: 'view' });
  const id = await ticket();
  const block = toolUse('resolve_ticket', { id });
  const message = await conversations.appendMessage(base.conversationId, 'assistant', { blocks: [block], ui: null });
  const { events, emit } = collector();

  const outcome = await loop.executeToolCall(block, base, message.id, emit);
  assert.equal(outcome.kind, 'done');
  assert.ok(outcome.kind === 'done' && outcome.result.is_error);
  assert.match(String(outcome.kind === 'done' ? outcome.result.content : ''), /not available/);
  assert.equal(await ticketStatus(id), 'pending', 'the tool did not run');

  const row = await audit.findByIdempotencyKey(block.id);
  assert.equal(row?.status, 'error');
  assert.equal(row?.error, 'forbidden');
  assert.ok(events.some((e) => e.type === 'tool_end' && !e.ok));
});

test('the same call runs for an employee whose access reaches it', async () => {
  const { base } = await staffSetup({ support: 'work' });
  const id = await ticket();
  const block = toolUse('resolve_ticket', { id });
  const message = await conversations.appendMessage(base.conversationId, 'assistant', { blocks: [block], ui: null });
  const outcome = await loop.executeToolCall(block, base, message.id, collector().emit);
  assert.ok(outcome.kind === 'done' && !outcome.result.is_error);
  assert.equal(await ticketStatus(id), 'resolved');
  assert.equal((await audit.findByIdempotencyKey(block.id))?.status, 'ok');
});

test('a suspended employee can run nothing, not even a tool their map allows', async () => {
  const { base } = await staffSetup({ support: 'manage' }, true);
  const id = await ticket();
  const block = toolUse('resolve_ticket', { id });
  const message = await conversations.appendMessage(base.conversationId, 'assistant', { blocks: [block], ui: null });
  const outcome = await loop.executeToolCall(block, base, message.id, collector().emit);
  assert.ok(outcome.kind === 'done' && outcome.result.is_error);
  assert.equal(await ticketStatus(id), 'pending');
});

test('a confirm-gated tool outside the caller’s access never gets a confirm card', async () => {
  const { base } = await staffSetup({ applications: 'view' });
  const block = toolUse('approve_waitlist', { id: 1, email: 'a@b.test' });
  const message = await conversations.appendMessage(base.conversationId, 'assistant', { blocks: [block], ui: null });
  const outcome = await loop.executeToolCall(block, base, message.id, collector().emit);
  assert.equal(outcome.kind, 'done', 'refused outright, not held for a click');
  assert.equal((await audit.findByIdempotencyKey(block.id))?.status, 'error');
});

test('an artist calling a staff tool by name is refused the same way', async () => {
  counter += 1;
  const { userId, storeId } = await seedUser(t.db, { email: `loop-artist-${counter}@merchfrom.test`, withStore: true });
  const conversation = await conversations.getOrCreateConversation(userId, 'artist');
  const base = { userId, clerkId: `test-artist-${counter}`, role: 'artist' as const, storeId, conversationId: conversation.id, locale: 'en' };
  const block = toolUse('list_production', {});
  const message = await conversations.appendMessage(base.conversationId, 'assistant', { blocks: [block], ui: null });
  const outcome = await loop.executeToolCall(block, base, message.id, collector().emit);
  assert.ok(outcome.kind === 'done' && outcome.result.is_error);
});

test('a confirmed step whose access was taken away is declined, without running or calling the model', async () => {
  const { base } = await staffSetup({ applications: 'view' });
  const [signup] = await t.db.insert(schema.waitlistSignups).values({ email: `wait-${counter}@merchfrom.test` }).returning();
  const block = toolUse('approve_waitlist', { id: signup.id, email: signup.email });
  const message = await conversations.appendMessage(base.conversationId, 'assistant', { blocks: [block], ui: null });
  // Offered while they still had Work; pending their click.
  await audit.recordInvocation({
    conversationId: base.conversationId,
    messageId: message.id,
    toolName: 'approve_waitlist',
    input: block.input,
    idempotencyKey: block.id,
    status: 'pending_confirm',
  });

  const { events, emit } = collector();
  await loop.resumeAgentTurn({ base, toolCallId: block.id, approve: true, emit });

  const row = await audit.findByIdempotencyKey(block.id);
  assert.equal(row?.status, 'cancelled');
  assert.deepEqual(row?.output, { declined: true, message: "You don't have access to this step any more, so it did not run." });
  const [after] = await t.db.select().from(schema.waitlistSignups).where(eq(schema.waitlistSignups.id, signup.id));
  assert.equal(after.status, 'pending', 'the approval did not run');
  assert.ok(events.some((e) => e.type === 'error'));
  assert.ok(!events.some((e) => e.type === 'text_delta' || e.type === 'message_end'), 'no model turn followed');
  const last = await conversations.latestMessage(base.conversationId);
  assert.equal(last?.role, 'tool', 'the turn’s tool results were stored, so the history stays whole');
});

function voiceRequest(body: Record<string, unknown>, authorization: string | null = 'Bearer test-bridge-secret'): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (authorization !== null) headers.authorization = authorization;
  return new Request('http://localhost/api/voice/llm', {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages: [{ role: 'user', content: 'Show open tickets' }], ...body }),
  });
}

test('the voice bridge gives a suspended employee nothing', async () => {
  process.env.VOICE_BRIDGE_SECRET = 'test-bridge-secret';
  const { POST } = await import('@/app/api/voice/llm/route');
  const { mintVoiceCallerToken } = await import('@/lib/services/voice');
  const { userId } = await staffSetup({ support: 'work' });
  await t.db.update(schema.users).set({ suspendedAt: new Date() }).where(eq(schema.users.id, userId));
  const response = await POST(voiceRequest({ user_token: mintVoiceCallerToken(userId) }) as never);
  assert.equal(response.status, 403);
});

test('the voice bridge acts for nobody named by a bare user id, the owner’s included, and needs the exact secret', async () => {
  process.env.VOICE_BRIDGE_SECRET = 'test-bridge-secret';
  const { POST } = await import('@/app/api/voice/llm/route');
  const { mintVoiceCallerToken } = await import('@/lib/services/voice');
  counter += 1;
  const { userId: ownerId } = await seedUser(t.db, { email: `loop-owner-${counter}@merchfrom.test`, role: 'admin' });

  for (const body of [{ user_id: ownerId }, { elevenlabs_extra_body: { user_id: ownerId } }, { user_token: ownerId }, { elevenlabs_extra_body: { user_token: ownerId } }]) {
    const response = await POST(voiceRequest(body) as never);
    assert.equal(response.status, 401, JSON.stringify(body));
    assert.deepEqual(await response.json(), { error: 'unknown_caller' });
  }

  // a real token, but not the bridge's secret: refused before anyone is looked up
  const token = mintVoiceCallerToken(ownerId);
  for (const authorization of [null, 'Bearer wrong', 'Bearer test-bridge-secretX', 'Bearer test-bridge-secre', 'test-bridge-secret']) {
    const response = await POST(voiceRequest({ user_token: token }, authorization) as never);
    assert.equal(response.status, 401, String(authorization));
    assert.deepEqual(await response.json(), { error: 'unauthorized' });
  }
});

test('an attached design is described to the model only when it is the caller’s own shop’s', async () => {
  counter += 1;
  const mine = await seedUser(t.db, { email: `loop-designs-${counter}@merchfrom.test`, withStore: true });
  const theirs = await seedUser(t.db, { email: `loop-designs-other-${counter}@merchfrom.test`, withStore: true });
  const [own] = await t.db.insert(schema.designs).values({ storeId: mine.storeId!, source: 'upload', widthPx: 4000, heightPx: 3000, readiness: 'ready' }).returning();
  const [other] = await t.db.insert(schema.designs).values({ storeId: theirs.storeId!, source: 'upload', widthPx: 1200, heightPx: 900, readiness: 'needs_cleanup' }).returning();
  const conversation = await conversations.getOrCreateConversation(mine.userId, 'artist');
  const base = { userId: mine.userId, clerkId: `test-designs-${counter}`, role: 'artist' as const, storeId: mine.storeId, conversationId: conversation.id, locale: 'en' };

  await loop.startAgentTurn({
    base,
    userText: 'How do they look?',
    attachments: [
      { url: 'https://example.test/theirs.png', kind: 'file', designId: other.id },
      { url: 'https://example.test/mine.png', kind: 'file', designId: own.id },
    ],
    emit: collector().emit,
  });

  const [sent] = await t.db
    .select()
    .from(schema.messages)
    .where(and(eq(schema.messages.conversationId, conversation.id), eq(schema.messages.role, 'user')));
  const stored = JSON.stringify(sent.content);
  assert.ok(stored.includes(`Attached design ${own.id} (4000×3000, ready).`), stored);
  assert.ok(!stored.includes(other.id), 'another shop’s design is neither named nor described');
  assert.ok(!stored.includes('1200×900'));
});
