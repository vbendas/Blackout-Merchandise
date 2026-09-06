/**
 * Agent runtime smoke test. Runs the loop directly (no HTTP), against the
 * scripted mock transport, so it exercises tools + DB writes + SSE event
 * shapes + the confirm gate without needing ANTHROPIC_API_KEY.
 *
 * Run with: `AGENT_MOCK=1 npx tsx scripts/agent-smoke.ts` (from `platform/`).
 *
 * Env vars must load before any module that opens a DB connection at import
 * time (`lib/db.ts` calls `neon()` at module scope) — since bundler-hoisted
 * `import` statements would otherwise run ahead of a top-level `dotenv`
 * call, every value import below is a dynamic `import()` inside `main()`,
 * after `config()` has run. Type-only imports are erased at compile time and
 * are safe to keep static.
 */

import { config } from 'dotenv';
import type { AgentEvent } from '../lib/agent/protocol';
import type { BaseAgentContext } from '../lib/agent/loop';

config({ path: '.env.local', quiet: true });
process.env.AGENT_MOCK = process.env.AGENT_MOCK ?? '1';

function collector() {
  const events: AgentEvent[] = [];
  return { events, emit: (event: AgentEvent) => events.push(event) };
}

function summarizeEvent(event: AgentEvent): string {
  switch (event.type) {
    case 'cards':
      return `cards[${event.cards.map((c) => c.kind).join(',')}]`;
    case 'chips':
      return `chips(${event.chips.length})`;
    case 'tool_start':
    case 'tool_end':
      return `${event.type}:${event.name}`;
    case 'confirm_required':
      return `confirm_required:${event.name}`;
    case 'message_end':
      return `message_end:${event.stopReason}`;
    case 'project':
      return `project:${event.project?.kind ?? 'null'}`;
    case 'error':
      return `error:${event.message}`;
    default:
      return event.type;
  }
}

async function main() {
  const { eq } = await import('drizzle-orm');
  const { db, schema } = await import('../lib/db');
  const { startAgentTurn, resumeAgentTurn } = await import('../lib/agent/loop');
  const { getOrCreateConversation } = await import('../lib/services/conversations');

  async function ensureSmokeUser() {
    const clerkId = 'smoke-test';
    const existing = await db.select().from(schema.users).where(eq(schema.users.clerkId, clerkId)).limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.users)
      .values({ clerkId, email: 'smoke@merchfrom.test', displayName: 'Smoke Test', role: 'artist' })
      .returning();
    return created;
  }

  async function ensureSmokeStore(userId: string) {
    const existing = await db.select().from(schema.artistStores).where(eq(schema.artistStores.artistId, userId)).limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.artistStores)
      .values({ artistId: userId, slug: 'smoke-shop', name: 'Smoke Shop', country: 'ES', currency: 'EUR', locale: 'en' })
      .returning();
    return created;
  }

  /** Blocks up to 5 minutes for the schema/seed agent's blanks table to be populated. */
  async function waitForBlanksSeed(maxMs = 5 * 60_000): Promise<boolean> {
    const start = Date.now();
    for (;;) {
      const rows = await db.select({ code: schema.blanks.code }).from(schema.blanks).limit(1);
      if (rows.length > 0) return true;
      if (Date.now() - start > maxMs) return false;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log('Checking blank catalogue seed...');
  const seeded = await waitForBlanksSeed();
  if (!seeded) {
    console.error('Timed out after 5 min waiting for the blanks table to be seeded — continuing anyway.');
  } else {
    console.log('Blanks table has data.');
  }

  const user = await ensureSmokeUser();
  const store = await ensureSmokeStore(user.id);
  const conversation = await getOrCreateConversation(user.id, 'artist');

  const base: BaseAgentContext = {
    userId: user.id,
    clerkId: user.clerkId,
    role: 'artist',
    storeId: store.id,
    conversationId: conversation.id,
    locale: 'en',
  };

  const turns = ['what can I do', 'show me hoodies', 'show me STTU169', 'publish my store'];
  let pendingConfirmToolCallId: string | null = null;
  let sawConfirmRequired = false;

  for (const text of turns) {
    console.log(`\n=== turn: "${text}" ===`);
    const { events, emit } = collector();
    // eslint-disable-next-line no-await-in-loop
    await startAgentTurn({ base, userText: text, emit });
    console.log(events.map(summarizeEvent).join(' -> '));

    const confirmEvent = events.find((e): e is Extract<AgentEvent, { type: 'confirm_required' }> => e.type === 'confirm_required');
    if (confirmEvent) {
      sawConfirmRequired = true;
      pendingConfirmToolCallId = confirmEvent.toolCallId;
    }
  }

  if (!sawConfirmRequired || !pendingConfirmToolCallId) {
    console.error('\nFAILED: expected a confirm_required event from "publish my store".');
    process.exitCode = 1;
    return;
  }

  console.log(`\n=== confirm approve: ${pendingConfirmToolCallId} ===`);
  const { events, emit } = collector();
  await resumeAgentTurn({ base, toolCallId: pendingConfirmToolCallId, approve: true, emit });
  console.log(events.map(summarizeEvent).join(' -> '));

  const completed = events.some((e) => e.type === 'message_end');
  if (!completed) {
    console.error('\nFAILED: confirm approval did not reach message_end.');
    process.exitCode = 1;
    return;
  }

  console.log('\nSmoke test passed.');

  console.log('\n=== guidance + suggest ===');
  const { loadGuidanceCounts, guidanceStateFor, greetingFor, quickActionsFor, checklistFor } = await import('../lib/agent/guidance');
  const { suggestFor } = await import('../lib/agent/suggest');

  const session = { user, store, role: 'artist' as const };
  const counts = await loadGuidanceCounts(session);
  const state = guidanceStateFor(session, counts);
  const greeting = await greetingFor(session, state, counts);
  const quickActions = quickActionsFor(state);
  const checklist = await checklistFor(session);

  console.log('state:', state);
  console.log('counts:', counts);
  console.log('greeting:', greeting);
  console.log('quickActions:', quickActions);
  console.log('checklist:', checklist);

  for (const q of ['hoo', '', 'bottle']) {
    // eslint-disable-next-line no-await-in-loop
    const suggestions = await suggestFor(q, { role: 'artist', state });
    console.log(`suggestFor(${JSON.stringify(q)}):`, suggestions);
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
