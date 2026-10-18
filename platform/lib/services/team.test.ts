// Team service on PGlite: loading an actor, invites and the accept flow,
// access changes, suspension, removal, the last-owner rule and the activity
// log. Email and Clerk are stubbed (setTeamGatewaysForTests): nothing leaves.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedUser, setupTestDb, type TestDb } from '../../scripts/test/pglite';
import { PermissionError, can, type Actor } from '@/lib/auth/permissions';
import type { EmailMessage } from '@/lib/services/email';

let t: TestDb;
let team: typeof import('./team');
let sent: EmailMessage[];
let revoked: string[];
let accounts: string[];
let counter = 0;

before(async () => {
  t = await setupTestDb();
  team = await import('./team');
});

after(async () => {
  team.setTeamGatewaysForTests();
  await t.close();
});

beforeEach(() => {
  sent = [];
  revoked = [];
  accounts = [];
  team.setTeamGatewaysForTests({
    sendEmail: async (message) => {
      sent.push(message);
      return { ok: true, id: `test-${sent.length}` };
    },
    revokeSessions: async (clerkId) => {
      revoked.push(clerkId);
    },
    ensureSignInAccount: async (email) => {
      accounts.push(email);
    },
  });
});

function email(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}@blackoutmerch.test`;
}

async function owner(): Promise<Actor> {
  const { userId } = await seedUser(t.db, { email: email('owner'), role: 'admin' });
  return { userId, role: 'admin' };
}

async function staffMember(permissions: Record<string, string> = {}, opts: { suspended?: boolean } = {}): Promise<{ userId: string; actor: Actor }> {
  const { userId } = await seedUser(t.db, { email: email('staff'), role: 'staff' });
  const rows = Object.entries(permissions).map(([area, level]) => ({ userId, area, level }));
  if (rows.length > 0) await t.db.insert(schema.staffPermissions).values(rows);
  if (opts.suspended) await t.db.update(schema.users).set({ suspendedAt: new Date() }).where(eq(schema.users.id, userId));
  return { userId, actor: await team.loadActor(userId, 'staff') };
}

async function userRow(userId: string) {
  const [row] = await t.db.select().from(schema.users).where(eq(schema.users.id, userId));
  return row;
}

function tokenFrom(url: string): string {
  return new URL(url).searchParams.get('token') ?? '';
}

async function activity(actorId: string) {
  return t.db.select().from(schema.staffActivity).where(eq(schema.staffActivity.actorId, actorId));
}

// ---------------------------------------------------------------------------

test('loadActor: the owner has everything, an artist nothing, staff their rows', async () => {
  const boss = await owner();
  assert.equal(can(await team.loadActor(boss.userId, 'admin'), 'team', 'manage'), true);

  const { userId: artistId } = await seedUser(t.db, { email: email('artist'), withStore: true });
  const artist = await team.loadActor(artistId, 'artist');
  assert.equal(can(artist, 'prepress', 'view'), false);

  const { actor } = await staffMember({ prepress: 'work', production: 'view', team: 'manage', money: 'bogus' });
  assert.deepEqual(actor.permissions, { prepress: 'work', production: 'view' });
  assert.equal(actor.suspended, false);
  assert.equal(can(actor, 'prepress', 'work'), true);
  assert.equal(can(actor, 'team', 'view'), false);
});

test('loadActor: a suspended employee is marked suspended and can do nothing', async () => {
  const { actor } = await staffMember({ prepress: 'manage' }, { suspended: true });
  assert.equal(actor.suspended, true);
  assert.equal(can(actor, 'prepress', 'view'), false);
});

test('loadActor: the row decides, so someone removed since the session was read has no access', async () => {
  const { userId } = await staffMember({ prepress: 'manage' });
  await t.db.update(schema.users).set({ role: 'artist' }).where(eq(schema.users.id, userId));
  const actor = await team.loadActor(userId, 'staff');
  assert.equal(actor.role, 'artist');
  assert.equal(can(actor, 'prepress', 'view'), false);
});

test('only the owner can invite; the invite stores a hash, emails the link and records the activity', async () => {
  const boss = await owner();
  const { actor: lead } = await staffMember({ prepress: 'manage', production: 'manage', support: 'manage' });
  await assert.rejects(() => team.inviteStaff(lead, { email: 'x@blackoutmerch.test', permissions: { prepress: 'work' } }), PermissionError);

  const address = email('New.Printer').toUpperCase();
  const result = await team.inviteStaff(boss, { email: `  ${address} `, title: 'Printer', permissions: { prepress: 'work', team: 'manage', money: 'work' } });
  assert.ok(result.ok, JSON.stringify(result));
  const token = tokenFrom(result.value.acceptUrl);
  assert.ok(token.length >= 40);

  const [row] = await t.db.select().from(schema.staffInvites).where(eq(schema.staffInvites.id, result.value.inviteId));
  assert.equal(row.email, address.toLowerCase());
  assert.notEqual(row.tokenHash, token, 'the token itself is never stored');
  assert.deepEqual(row.permissions, { prepress: 'work', money: 'view' }, 'team dropped, money work read as view');
  assert.ok(row.expiresAt.getTime() > Date.now() + 6 * 24 * 3600 * 1000);

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, address.toLowerCase());
  assert.ok(sent[0].html.includes(token), 'the email carries the link');
  assert.deepEqual(accounts, [address.toLowerCase()], 'the invitee can sign in through the door');
  assert.equal(result.value.emailSent, true);

  const log = await activity(boss.userId);
  assert.ok(log.some((entry) => entry.action === 'team.invite' && entry.itemId === result.value.inviteId));
});

test('invites refuse a bad address, no access, and someone already on the team', async () => {
  const boss = await owner();
  const bad = await team.inviteStaff(boss, { email: 'not-an-email', permissions: { prepress: 'view' } });
  assert.equal(bad.ok, false);
  assert.equal(!bad.ok && bad.code, 'invalid_email');

  const none = await team.inviteStaff(boss, { email: email('x'), permissions: { team: 'manage' } });
  assert.equal(!none.ok && none.code, 'no_access');

  const { userId } = await staffMember({ support: 'work' });
  const existing = await userRow(userId);
  const member = await team.inviteStaff(boss, { email: existing.email.toUpperCase(), permissions: { prepress: 'view' } });
  assert.equal(!member.ok && member.code, 'already_member');
  assert.equal(sent.length, 0);
});

test('a newer invite replaces an open one for the same address', async () => {
  const boss = await owner();
  const address = email('twice');
  const first = await team.inviteStaff(boss, { email: address, permissions: { prepress: 'view' } });
  const second = await team.inviteStaff(boss, { email: address, permissions: { prepress: 'work' } });
  assert.ok(first.ok && second.ok);
  const old = await team.findInviteByToken(tokenFrom(first.value.acceptUrl));
  assert.equal(old?.status, 'revoked');
  const fresh = await team.findInviteByToken(tokenFrom(second.value.acceptUrl));
  assert.equal(fresh?.status, 'pending');
});

test('accepting: the invited address signs in and becomes staff with the chosen access', async () => {
  const boss = await owner();
  const address = email('joiner');
  const invite = await team.inviteStaff(boss, { email: address, title: 'Pre-press', permissions: { prepress: 'work', production: 'view' } });
  assert.ok(invite.ok);
  const { userId } = await seedUser(t.db, { email: address.toUpperCase() });

  const accepted = await team.acceptStaffInvite({ id: userId, email: address.toUpperCase() }, tokenFrom(invite.value.acceptUrl));
  assert.ok(accepted.ok, JSON.stringify(accepted));

  const user = await userRow(userId);
  assert.equal(user.role, 'staff');
  assert.equal(user.staffTitle, 'Pre-press');
  const actor = await team.loadActor(userId, 'staff');
  assert.deepEqual(actor.permissions, { prepress: 'work', production: 'view' });

  const [row] = await t.db.select().from(schema.staffInvites).where(eq(schema.staffInvites.id, invite.value.inviteId));
  assert.equal(row.acceptedBy, userId);
  assert.ok(row.acceptedAt);
  assert.ok((await activity(userId)).some((entry) => entry.action === 'team.join'));

  // The same person opening the link again is fine; anyone else is refused.
  const again = await team.acceptStaffInvite({ id: userId, email: address }, tokenFrom(invite.value.acceptUrl));
  assert.ok(again.ok);
  const { userId: otherId } = await seedUser(t.db, { email: email('other') });
  const other = await team.acceptStaffInvite({ id: otherId, email: address }, tokenFrom(invite.value.acceptUrl));
  assert.equal(!other.ok && other.code, 'used');
});

test('accepting refuses a different address, and changes nothing', async () => {
  const boss = await owner();
  const invite = await team.inviteStaff(boss, { email: email('meant-for'), permissions: { prepress: 'manage' } });
  assert.ok(invite.ok);
  const { userId } = await seedUser(t.db, { email: email('somebody-else') });
  const user = await userRow(userId);
  const result = await team.acceptStaffInvite({ id: userId, email: user.email }, tokenFrom(invite.value.acceptUrl));
  assert.equal(!result.ok && result.code, 'email_mismatch');
  assert.equal((await userRow(userId)).role, 'artist');
  assert.equal((await team.findInviteByToken(tokenFrom(invite.value.acceptUrl)))?.status, 'pending');
  const rows = await t.db.select().from(schema.staffPermissions).where(eq(schema.staffPermissions.userId, userId));
  assert.equal(rows.length, 0);
});

test('accepting refuses an expired, a withdrawn and an unknown link', async () => {
  const boss = await owner();
  const address = email('late');
  const { userId } = await seedUser(t.db, { email: address });

  const expired = await team.inviteStaff(boss, { email: address, permissions: { prepress: 'view' } });
  assert.ok(expired.ok);
  await t.db.update(schema.staffInvites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.staffInvites.id, expired.value.inviteId));
  const late = await team.acceptStaffInvite({ id: userId, email: address }, tokenFrom(expired.value.acceptUrl));
  assert.equal(!late.ok && late.code, 'expired');

  const withdrawn = await team.inviteStaff(boss, { email: address, permissions: { prepress: 'view' } });
  assert.ok(withdrawn.ok);
  assert.ok((await team.revokeInvite(boss, withdrawn.value.inviteId)).ok);
  const revokedResult = await team.acceptStaffInvite({ id: userId, email: address }, tokenFrom(withdrawn.value.acceptUrl));
  assert.equal(!revokedResult.ok && revokedResult.code, 'revoked');

  const unknown = await team.acceptStaffInvite({ id: userId, email: address }, 'not-a-real-token');
  assert.equal(!unknown.ok && unknown.code, 'not_found');
  const empty = await team.acceptStaffInvite({ id: userId, email: address }, '');
  assert.equal(!empty.ok && empty.code, 'not_found');
  assert.equal((await userRow(userId)).role, 'artist');
});

test('sending again makes a new link and kills the old one; an expired invite can be sent again', async () => {
  const boss = await owner();
  const address = email('resend');
  const invite = await team.inviteStaff(boss, { email: address, permissions: { support: 'work' } });
  assert.ok(invite.ok);
  await t.db.update(schema.staffInvites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.staffInvites.id, invite.value.inviteId));
  const again = await team.resendInvite(boss, invite.value.inviteId);
  assert.ok(again.ok);
  assert.equal(await team.findInviteByToken(tokenFrom(invite.value.acceptUrl)), null, 'the old link no longer opens anything');
  const { userId } = await seedUser(t.db, { email: address });
  assert.ok((await team.acceptStaffInvite({ id: userId, email: address }, tokenFrom(again.value.acceptUrl))).ok);
});

test('accepting refuses the owner, an account with a shop, and a paused employee', async () => {
  const boss = await owner();

  const bossRow = await userRow(boss.userId);
  const forOwner = await team.inviteStaff(boss, { email: email('x'), permissions: { prepress: 'view' } });
  assert.ok(forOwner.ok);
  await t.db.update(schema.staffInvites).set({ email: bossRow.email }).where(eq(schema.staffInvites.id, forOwner.value.inviteId));
  const asOwner = await team.acceptStaffInvite({ id: boss.userId, email: bossRow.email }, tokenFrom(forOwner.value.acceptUrl));
  assert.equal(!asOwner.ok && asOwner.code, 'owner');

  const shopAddress = email('shopkeeper');
  const { userId: artistId } = await seedUser(t.db, { email: shopAddress, withStore: true });
  const forArtist = await team.inviteStaff(boss, { email: shopAddress, permissions: { prepress: 'view' } });
  assert.ok(forArtist.ok);
  const asArtist = await team.acceptStaffInvite({ id: artistId, email: shopAddress }, tokenFrom(forArtist.value.acceptUrl));
  assert.equal(!asArtist.ok && asArtist.code, 'has_shop');
  assert.equal((await userRow(artistId)).role, 'artist');

  const { userId: pausedId } = await staffMember({ support: 'view' }, { suspended: true });
  const pausedRow = await userRow(pausedId);
  const forPaused = await team.inviteStaff(boss, { email: email('y'), permissions: { prepress: 'manage' } });
  assert.ok(forPaused.ok);
  await t.db.update(schema.staffInvites).set({ email: pausedRow.email }).where(eq(schema.staffInvites.id, forPaused.value.inviteId));
  const asPaused = await team.acceptStaffInvite({ id: pausedId, email: pausedRow.email }, tokenFrom(forPaused.value.acceptUrl));
  assert.equal(!asPaused.ok && asPaused.code, 'suspended');
  assert.ok((await userRow(pausedId)).suspendedAt, 'still paused');
});

test('access changes are the owner’s, cleaned, and count from the next load', async () => {
  const boss = await owner();
  const { userId, actor } = await staffMember({ prepress: 'manage' });
  await assert.rejects(() => team.updatePermissions(actor, userId, { prepress: 'manage', money: 'manage' }), PermissionError);

  const result = await team.updatePermissions(boss, userId, { production: 'work', money: 'work', team: 'manage', prepress: 'none' });
  assert.ok(result.ok);
  const next = await team.loadActor(userId, 'staff');
  assert.deepEqual(next.permissions, { production: 'work', money: 'view' });
  assert.equal(can(next, 'prepress', 'view'), false);

  const notOwner = await team.updatePermissions(boss, boss.userId, { prepress: 'view' });
  assert.equal(!notOwner.ok && notOwner.code, 'owner');
  const { userId: artistId } = await seedUser(t.db, { email: email('artist') });
  const notStaff = await team.updatePermissions(boss, artistId, { prepress: 'view' });
  assert.equal(!notStaff.ok && notStaff.code, 'not_staff');
});

test('pausing blocks an employee and resuming restores them; owners and yourself can’t be paused', async () => {
  const boss = await owner();
  const { userId } = await staffMember({ support: 'work' });
  assert.ok((await team.setSuspended(boss, userId, true)).ok);
  assert.equal((await team.loadActor(userId, 'staff')).suspended, true);
  assert.equal(can(await team.loadActor(userId, 'staff'), 'support', 'view'), false);
  assert.ok((await team.setSuspended(boss, userId, false)).ok);
  assert.equal(can(await team.loadActor(userId, 'staff'), 'support', 'work'), true);

  const other = await owner();
  const ownerPause = await team.setSuspended(boss, other.userId, true);
  assert.equal(!ownerPause.ok && ownerPause.code, 'owner');
  const self = await team.setSuspended(boss, boss.userId, true);
  assert.equal(!self.ok && self.code, 'self');
  assert.ok((await activity(boss.userId)).some((entry) => entry.action === 'team.suspend' && entry.itemId === userId));
});

test('removing someone ends their access and their sessions at once', async () => {
  const boss = await owner();
  const { userId } = await staffMember({ prepress: 'manage', production: 'work' });
  await t.db.update(schema.users).set({ staffTitle: 'Printer', clerkId: `user_remove_${userId}` }).where(eq(schema.users.id, userId));

  const result = await team.removeStaff(boss, userId);
  assert.ok(result.ok);
  assert.equal(result.value.sessionsEnded, true);
  assert.deepEqual(revoked, [`user_remove_${userId}`]);

  const user = await userRow(userId);
  assert.equal(user.role, 'artist');
  assert.equal(user.staffTitle, null);
  const rows = await t.db.select().from(schema.staffPermissions).where(eq(schema.staffPermissions.userId, userId));
  assert.equal(rows.length, 0);
  const actor = await team.loadActor(userId, 'staff');
  assert.equal(can(actor, 'prepress', 'view'), false);
  assert.ok((await activity(boss.userId)).some((entry) => entry.action === 'team.remove' && entry.itemId === userId));
});

test('a failing Clerk call doesn’t stop a removal', async () => {
  const boss = await owner();
  const { userId } = await staffMember({ support: 'view' });
  team.setTeamGatewaysForTests({
    revokeSessions: async () => {
      throw new Error('clerk down');
    },
  });
  const result = await team.removeStaff(boss, userId);
  assert.ok(result.ok);
  assert.equal(result.value.sessionsEnded, false);
  assert.equal((await userRow(userId)).role, 'artist');
});

test('owners: one can make another staff or remove them, never themselves', async () => {
  await t.db.update(schema.users).set({ role: 'artist' }).where(eq(schema.users.role, 'admin'));
  const first = await owner();
  const second = await owner();

  const selfDemote = await team.setOwner(first, first.userId, false);
  assert.equal(!selfDemote.ok && selfDemote.code, 'self');
  const selfRemove = await team.removeStaff(first, first.userId);
  assert.equal(!selfRemove.ok && selfRemove.code, 'self');

  // Two owners: one may make the other staff (with no areas until set).
  assert.ok((await team.setOwner(first, second.userId, false)).ok);
  assert.equal((await userRow(second.userId)).role, 'staff');
  assert.deepEqual((await team.loadActor(second.userId, 'staff')).permissions, {});

  // And make an employee an owner, whose rows then go (an owner has everything).
  const { userId: thirdId } = await staffMember({ support: 'view' });
  assert.ok((await team.setOwner(first, thirdId, true)).ok);
  assert.equal((await userRow(thirdId)).role, 'admin');
  const rows = await t.db.select().from(schema.staffPermissions).where(eq(schema.staffPermissions.userId, thirdId));
  assert.equal(rows.length, 0);
  assert.equal(await team.countOwners(first), 2);
});

test('the last owner can’t be made staff or removed, even by an owner acting on stale rights', async () => {
  await t.db.update(schema.users).set({ role: 'artist' }).where(eq(schema.users.role, 'admin'));
  const only = await owner();
  const { userId: otherOwnerId } = await seedUser(t.db, { email: email('ghost-owner'), role: 'admin' });
  // Two owners: removing one works and leaves exactly one.
  assert.ok((await team.removeStaff(only, otherOwnerId)).ok);
  assert.equal(await team.countOwners(only), 1);
  // The removed owner's request, authorised a moment before the removal,
  // reaches the service afterwards: the guard in the update refuses it.
  const stale: Actor = { userId: otherOwnerId, role: 'admin' };
  const demote = await team.setOwner(stale, only.userId, false);
  assert.equal(!demote.ok && demote.code, 'last_owner');
  const remove = await team.removeStaff(stale, only.userId);
  assert.equal(!remove.ok && remove.code, 'last_owner');
  assert.equal((await userRow(only.userId)).role, 'admin');
});

test('two owners demoting each other at the same moment leave exactly one owner', async () => {
  await t.db.update(schema.users).set({ role: 'artist' }).where(eq(schema.users.role, 'admin'));
  const a = await owner();
  const b = await owner();
  const results = await Promise.all([team.setOwner(a, b.userId, false), team.setOwner(b, a.userId, false)]);
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.filter((r) => !r.ok && r.code === 'last_owner').length, 1);
  assert.equal(await team.countOwners(a), 1);
});

test('an owner made staff takes their open invites with them; another owner’s stay open', async () => {
  const boss = await owner();
  const leaving = await owner();
  const address = email('via-demoted');
  const theirs = await team.inviteStaff(leaving, { email: address, permissions: { prepress: 'view' } });
  const ours = await team.inviteStaff(boss, { email: email('via-boss'), permissions: { prepress: 'view' } });
  assert.ok(theirs.ok && ours.ok);

  assert.ok((await team.setOwner(boss, leaving.userId, false)).ok);
  assert.equal((await team.findInviteByToken(tokenFrom(theirs.value.acceptUrl)))?.status, 'revoked');
  assert.equal((await team.findInviteByToken(tokenFrom(ours.value.acceptUrl)))?.status, 'pending');

  const { userId } = await seedUser(t.db, { email: address });
  const result = await team.acceptStaffInvite({ id: userId, email: address }, tokenFrom(theirs.value.acceptUrl));
  assert.equal(!result.ok && result.code, 'revoked');
  assert.equal((await userRow(userId)).role, 'artist');
});

test('an owner removed from the team takes their open invites with them', async () => {
  const boss = await owner();
  const leaving = await owner();
  const address = email('via-removed');
  const invite = await team.inviteStaff(leaving, { email: address, permissions: { support: 'work' } });
  assert.ok(invite.ok);

  assert.ok((await team.removeStaff(boss, leaving.userId)).ok);
  assert.equal((await team.findInviteByToken(tokenFrom(invite.value.acceptUrl)))?.status, 'revoked');

  const { userId } = await seedUser(t.db, { email: address });
  const result = await team.acceptStaffInvite({ id: userId, email: address }, tokenFrom(invite.value.acceptUrl));
  assert.equal(!result.ok && result.code, 'revoked');
  assert.equal((await userRow(userId)).role, 'artist');
});

test('accepting refuses an invite whose sender is no longer an owner, even one never withdrawn', async () => {
  const boss = await owner();
  const address = email('stale-sender');
  const invite = await team.inviteStaff(boss, { email: address, permissions: { prepress: 'manage' } });
  assert.ok(invite.ok);
  const token = tokenFrom(invite.value.acceptUrl);
  // The sender lost the role without the invites going with it (as before
  // they did): the link still reads as pending, but lets nobody in.
  await t.db.update(schema.users).set({ role: 'staff' }).where(eq(schema.users.id, boss.userId));
  assert.equal((await team.findInviteByToken(token))?.status, 'pending');

  const { userId } = await seedUser(t.db, { email: address });
  const result = await team.acceptStaffInvite({ id: userId, email: address }, token);
  assert.deepEqual(result, { ok: false, code: 'revoked', error: 'This invite is no longer valid. Ask the owner to send a new one.' });
  assert.equal((await userRow(userId)).role, 'artist');
  const rows = await t.db.select().from(schema.staffPermissions).where(eq(schema.staffPermissions.userId, userId));
  assert.equal(rows.length, 0);
  const [row] = await t.db.select().from(schema.staffInvites).where(eq(schema.staffInvites.id, invite.value.inviteId));
  assert.equal(row.acceptedAt, null, 'the invite was not claimed');
});

test('recordStaffActivity writes for the owner and staff, ignores artists, and never throws', async () => {
  const boss = await owner();
  const { actor } = await staffMember({ prepress: 'work' });
  await team.recordStaffActivity(boss, { area: 'prepress', action: 'pack.approve', itemType: 'production_pack', itemId: 'pack-1', detail: { summary: 'Approved the Underwriter v3 screen pack' } });
  await team.recordStaffActivity(actor, { area: 'prepress', action: 'pack.rerun', itemType: 'production_pack', itemId: 'pack-1' });
  const { userId: artistId } = await seedUser(t.db, { email: email('artist') });
  await team.recordStaffActivity({ userId: artistId, role: 'artist' }, { area: 'prepress', action: 'pack.approve' });
  await team.recordStaffActivity({ userId: '00000000-0000-0000-0000-000000000000', role: 'staff' }, { area: 'x', action: 'y' });

  const rows = await t.db.select().from(schema.staffActivity).where(eq(schema.staffActivity.itemId, 'pack-1'));
  assert.equal(rows.length, 2);
  assert.equal((await activity(artistId)).length, 0);
});

test('the owner reads activity per employee and per item, including the assistant’s tool calls', async () => {
  const boss = await owner();
  const { userId, actor } = await staffMember({ production: 'work' });
  const orderId = '11111111-2222-3333-4444-555555555555';
  await team.recordStaffActivity(actor, { area: 'production', action: 'production.advance', itemType: 'order', itemId: orderId });
  await team.recordStaffActivity(actor, { area: 'production', action: 'page.view', itemType: 'page', itemId: '/admin/production', detail: { page: '/admin/production' } });

  const [conversation] = await t.db.insert(schema.conversations).values({ userId, roleAtTime: 'staff' }).returning();
  await t.db.insert(schema.toolInvocations).values([
    { conversationId: conversation.id, toolName: 'set_tracking', input: { orderId, carrier: 'DHL', code: '1' }, status: 'ok', idempotencyKey: `k-${userId}-1` },
    { conversationId: conversation.id, toolName: 'list_production', input: {}, status: 'ok', idempotencyKey: `k-${userId}-2` },
    { conversationId: conversation.id, toolName: 'advance_production', input: { orderId }, status: 'error', idempotencyKey: `k-${userId}-3` },
  ]);

  const mine = await team.listActivity(boss, { userId, toolNames: ['set_tracking', 'advance_production'] });
  assert.deepEqual(mine.map((e) => e.action).sort(), ['page.view', 'production.advance', 'tool.set_tracking'].sort());
  assert.ok(mine.every((e) => e.actorId === userId));
  assert.ok(mine.find((e) => e.source === 'assistant')?.summary.includes('Set tracking'));

  const item = await team.listActivity(boss, { itemId: orderId });
  assert.deepEqual(item.map((e) => e.action).sort(), ['production.advance', 'tool.set_tracking'].sort());

  await assert.rejects(() => team.listActivity(actor, { userId }), PermissionError);
});

test('listTeam: owners first, then staff, with access, pause and the latest invites', async () => {
  const boss = await owner();
  const { userId } = await staffMember({ prepress: 'work' }, { suspended: true });
  const view = await team.listTeam(boss);
  const firstStaff = view.members.findIndex((m) => m.role === 'staff');
  const lastOwner = view.members.map((m) => m.role).lastIndexOf('admin');
  assert.ok(lastOwner < firstStaff);
  const member = view.members.find((m) => m.userId === userId);
  assert.equal(member?.suspended, true);
  assert.deepEqual(member?.permissions, { prepress: 'work' });
  assert.ok(Array.isArray(view.invites));
  assert.equal(await team.getTeamMember(boss, '00000000-0000-0000-0000-000000000000'), null);
});
