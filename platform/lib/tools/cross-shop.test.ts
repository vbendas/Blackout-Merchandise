// The checks inside shared tools that reach across shops, moved from
// role === 'admin' to can(): support tickets (Support View to read, Work to
// answer), custom domains (Shops and artists Work), refunds (Shop orders
// Manage), and the admin queue, which shows each employee only their areas.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '../../scripts/test/pglite';
import type { PermissionMap, Role } from '@/lib/auth/permissions';
import type { ToolContext } from './types';

process.env.STRIPE_MOCK = '1';
delete process.env.STRIPE_SECRET_KEY;
delete process.env.VERCEL_TOKEN;

let t: TestDb;
let support: typeof import('./support');
let domains: typeof import('./domains');
let commerce: typeof import('./commerce');
let admin: typeof import('./admin');
let artistA: { userId: string; storeId: string };
let artistB: { userId: string; storeId: string };
let ticketId: string;
let counter = 0;

before(async () => {
  t = await setupTestDb();
  support = await import('./support');
  domains = await import('./domains');
  commerce = await import('./commerce');
  admin = await import('./admin');

  const a = await seedUser(t.db, { email: 'shop-a@blackoutmerch.test', withStore: true });
  const b = await seedUser(t.db, { email: 'shop-b@blackoutmerch.test', withStore: true });
  artistA = { userId: a.userId, storeId: a.storeId! };
  artistB = { userId: b.userId, storeId: b.storeId! };
  // Replies notify the ticket's owner; keep that in the app (no email outbox).
  await t.db.insert(schema.notificationPrefs).values({ userId: a.userId, email: false, discordDm: false });
  const [ticket] = await t.db.insert(schema.supportTickets).values({ agentId: 'Antônia', subject: 'Missing parcel', userId: a.userId, status: 'pending' }).returning();
  ticketId = ticket.id;
  await t.db.insert(schema.customDomains).values({ storeId: a.storeId!, hostname: 'merch.shop-a.test', status: 'active', verification: [] });
});

after(async () => {
  await t.close();
});

function ctx(role: Role, opts: { userId?: string; storeId?: string | null; permissions?: PermissionMap; suspended?: boolean } = {}): ToolContext {
  counter += 1;
  return {
    userId: opts.userId ?? '00000000-0000-4000-8000-0000000000aa',
    clerkId: `test-${counter}`,
    role,
    storeId: opts.storeId ?? null,
    conversationId: '00000000-0000-4000-8000-0000000000bb',
    idempotencyKey: `key-${counter}`,
    locale: 'en',
    permissions: opts.permissions ?? null,
    suspended: opts.suspended ?? false,
  };
}

async function staffUser(): Promise<string> {
  counter += 1;
  return (await seedUser(t.db, { email: `cross-${counter}@blackoutmerch.test`, role: 'staff' })).userId;
}

type Data = { ok?: boolean; error?: string };

test('tickets: your own, or anyone’s with Support View', async () => {
  const read = async (c: ToolContext) => ((await support.getTicketTool.run(c, { id: ticketId })).data as Data).ok === true;
  assert.equal(await read(ctx('artist', { userId: artistA.userId, storeId: artistA.storeId })), true);
  assert.equal(await read(ctx('artist', { userId: artistB.userId, storeId: artistB.storeId })), false);
  assert.equal(await read(ctx('staff', { permissions: { shops: 'manage', production: 'manage' } })), false);
  assert.equal(await read(ctx('staff', { permissions: { support: 'view' } })), true);
  assert.equal(await read(ctx('staff', { permissions: { support: 'view' }, suspended: true })), false);
  assert.equal(await read(ctx('admin')), true);
});

test('answering someone else’s ticket needs Support Work, and comes from the Blackout Merchandise side', async () => {
  const viewer = await staffUser();
  const refused = await support.replyTicketTool.run(ctx('staff', { userId: viewer, permissions: { support: 'view' } }), { id: ticketId, text: 'On it.' });
  assert.equal((refused.data as Data).error, 'forbidden');
  const other = await support.replyTicketTool.run(ctx('artist', { userId: artistB.userId, storeId: artistB.storeId }), { id: ticketId, text: 'Me too.' });
  assert.equal((other.data as Data).error, 'forbidden');
  let messages = await t.db.select().from(schema.ticketMessages).where(eq(schema.ticketMessages.ticketId, ticketId));
  assert.equal(messages.length, 0, 'nothing was posted');

  const worker = await staffUser();
  const answered = await support.replyTicketTool.run(ctx('staff', { userId: worker, permissions: { support: 'work' } }), { id: ticketId, text: 'Your parcel ships today.' });
  assert.equal((answered.data as Data).ok, true);
  messages = await t.db.select().from(schema.ticketMessages).where(eq(schema.ticketMessages.ticketId, ticketId));
  assert.equal(messages.length, 1);
  assert.equal(messages[0].senderType, 'human');
  assert.equal(messages[0].senderId, worker);
});

test('domains: another shop’s needs Shops and artists Work; no shop and no access means nothing', async () => {
  const check = async (c: ToolContext) => ((await domains.checkDomainTool.run(c, { hostname: 'merch.shop-a.test' })).data as Data).ok === true;
  assert.equal(await check(ctx('artist', { userId: artistA.userId, storeId: artistA.storeId })), true, 'its own shop');
  assert.equal(await check(ctx('artist', { userId: artistB.userId, storeId: artistB.storeId })), false, 'another artist');
  assert.equal(await check(ctx('artist', { userId: artistB.userId, storeId: null })), false, 'an artist without a shop is not unfiltered');
  assert.equal(await check(ctx('staff', { permissions: { shops: 'view' } })), false, 'Shops View');
  assert.equal(await check(ctx('staff', { permissions: { shops: 'work' } })), true, 'Shops Work');
  assert.equal(await check(ctx('admin')), true, 'the owner');

  const remove = await domains.removeDomainTool.run(ctx('staff', { permissions: { shops: 'view', support: 'manage' } }), { hostname: 'merch.shop-a.test' });
  assert.equal((remove.data as Data).ok, false);
  const still = await t.db.select().from(schema.customDomains).where(eq(schema.customDomains.hostname, 'merch.shop-a.test'));
  assert.equal(still.length, 1, 'the domain is still connected');
});

test('refunds: only Shop orders Manage reaches another shop’s order', async () => {
  const [order] = await t.db
    .insert(schema.orders)
    .values({ storeId: artistA.storeId, status: 'paid', totalAmount: 3000, stripePaymentIntentId: 'pi_test_cross_shop', productionStatus: 'queued' })
    .returning();
  const refund = (c: ToolContext) => commerce.refundOrderTool.run(c, { orderId: order.id, reason: 'Damaged' });

  const noShop = await refund(ctx('staff', { permissions: { shop_orders: 'work' } }));
  assert.equal((noShop.data as Data).ok, false);
  const wrongShop = await refund(ctx('artist', { userId: artistB.userId, storeId: artistB.storeId }));
  assert.equal((wrongShop.data as Data).ok, false);
  const [unchanged] = await t.db.select().from(schema.orders).where(eq(schema.orders.id, order.id));
  assert.equal(unchanged.status, 'paid');

  const allowed = await refund(ctx('staff', { permissions: { shop_orders: 'manage' } }));
  assert.equal((allowed.data as Data).ok, true, JSON.stringify(allowed.data));
  const [refunded] = await t.db.select().from(schema.orders).where(eq(schema.orders.id, order.id));
  assert.equal(refunded.status, 'cancelled');
});

test('orders: your own shop’s, or any shop’s with Shop orders View', async () => {
  const [order] = await t.db
    .insert(schema.orders)
    .values({ storeId: artistA.storeId, status: 'paid', totalAmount: 2500, productionStatus: 'queued' })
    .returning();
  const open = async (c: ToolContext) => ((await commerce.getOrderTool.run(c, { orderId: order.id })).data as Data).ok === true;

  assert.equal(await open(ctx('artist', { userId: artistA.userId, storeId: artistA.storeId })), true, 'its own shop');
  assert.equal(await open(ctx('artist', { userId: artistB.userId, storeId: artistB.storeId })), false, 'another artist');
  assert.equal(await open(ctx('staff', { permissions: { support: 'manage', production: 'manage' } })), false, 'no Shop orders access');
  assert.equal(await open(ctx('staff', { permissions: { shop_orders: 'view' } })), true, 'Shop orders View');
  assert.equal(await open(ctx('staff', { permissions: { shop_orders: 'view' }, suspended: true })), false, 'suspended');
  assert.equal(await open(ctx('admin')), true, 'the owner');
});

test('the admin queue shows each employee only the sections of their areas', () => {
  const sections = ['payout_anomalies', 'production', 'bulk_awaiting_payment', 'supplier_drafts', 'domains_stuck', 'waitlist', 'support', 'something_new'].map((key) => ({
    key,
    title: key,
    count: 1,
    items: [{ id: `${key}-1`, text: key, prompt: `Open ${key}` }],
  }));
  const keys = (c: Parameters<typeof admin.queueSectionsFor>[0]) => admin.queueSectionsFor(c, sections).map((s) => s.key);

  assert.deepEqual(keys({ role: 'admin' }), sections.map((s) => s.key), 'the owner sees everything, new sections too');
  assert.deepEqual(keys({ role: 'staff', permissions: { production: 'view' } }), ['production', 'supplier_drafts']);
  assert.deepEqual(keys({ role: 'staff', permissions: { support: 'work', applications: 'view' } }), ['waitlist', 'support']);
  assert.deepEqual(keys({ role: 'staff', permissions: { production: 'view' }, suspended: true }), []);

  // Money View sees the anomalies but not the "Review payout" prompt (Manage).
  const money = admin.queueSectionsFor({ role: 'staff', permissions: { money: 'view' } }, sections);
  assert.deepEqual(money.map((s) => s.key), ['payout_anomalies']);
  assert.equal(money[0].items[0].prompt, undefined);
  const manager = admin.queueSectionsFor({ role: 'staff', permissions: { money: 'manage' } }, sections);
  assert.equal(manager[0].items[0].prompt, 'Open payout_anomalies');
});

test('supplier order cards offer Place and Receive only to Production Work', async () => {
  const viewer = await admin.listSupplierOrdersTool.run(ctx('staff', { permissions: { production: 'view' } }), {});
  assert.equal(viewer.ui?.next, undefined, 'no "Draft from queued" chip for View');
  const worker = await admin.listSupplierOrdersTool.run(ctx('staff', { permissions: { production: 'work' } }), {});
  assert.ok(worker.ui?.next?.some((chip) => chip.label === 'Draft from queued'));
});
