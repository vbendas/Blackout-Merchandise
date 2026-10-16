// Team and permissions (WP3): the owner's employees, their access by area,
// invites, suspension, and the activity log. Plan section 9.
//
// Every function that changes the team takes the acting owner and checks
// `team` access itself (the pages and actions check first; this is the
// second lock). Writes run as single statements guarded on the state they
// expect (neon-http has no transactions), ordered so a failure part way
// leaves less access, never more.
import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, gt, inArray, isNull, max, ne, sql, type SQL } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import {
  describeAccess,
  normalisePermissions,
  permissionsFromRows,
  requirePermission,
  type Actor,
  type Area,
  type PermissionMap,
  type Role,
} from '@/lib/auth/permissions';
import { getEmailGateway, type EmailMessage, type EmailSendResult } from '@/lib/services/email';
import { staffInviteEmail } from '@/lib/emails';
import { appUrl } from '@/lib/emails/layout';

export type TeamErrorCode =
  | 'invalid_email'
  | 'no_access'
  | 'already_member'
  | 'not_found'
  | 'not_staff'
  | 'owner'
  | 'self'
  | 'last_owner'
  | 'revoked'
  | 'used'
  | 'expired'
  | 'email_mismatch'
  | 'has_shop'
  | 'suspended';

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: string; code?: TeamErrorCode };

function ok<T>(value: T): ServiceResult<T> {
  return { ok: true, value };
}

function fail<T>(code: TeamErrorCode, error: string): ServiceResult<T> {
  return { ok: false, error, code };
}

export interface TeamMemberView {
  userId: string;
  name: string;
  email: string;
  title: string | null;
  role: Extract<Role, 'admin' | 'staff'>;
  suspended: boolean;
  permissions: PermissionMap;
  lastActiveAt: string | null;
}

export interface TeamInviteView {
  id: string;
  email: string;
  title: string | null;
  permissions: PermissionMap;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'expired' | 'revoked' | 'accepted';
}

export interface ActivityEntryView {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  area: string;
  action: string;
  itemType: string | null;
  itemId: string | null;
  /** one plain sentence, e.g. 'Approved the Underwriter v3 screen pack' */
  summary: string;
  /** 'page': a staff page or page action (staff_activity); 'assistant': a
   * tool the assistant ran for them (tool_invocations) */
  source: 'page' | 'assistant';
  /** assistant entries: the tool that ran */
  toolName?: string;
}

// ---------------------------------------------------------------------------
// Outside calls

/** The parts of team work that leave the building, behind small functions so
 * tests swap them out: the invite email (Resend, or the dev outbox), ending a
 * removed employee's Clerk sessions, and making sure an invitee can sign in
 * through the door (it only signs in addresses Clerk already knows). */
export interface TeamGateways {
  sendEmail: (message: EmailMessage) => Promise<EmailSendResult>;
  revokeSessions: (clerkId: string) => Promise<void>;
  ensureSignInAccount: (email: string) => Promise<void>;
}

// The same rule as lib/auth.ts DEV_BYPASS (not imported: lib/auth imports this module).
const DEV_BYPASS = process.env.AUTH_DEV_BYPASS === '1' && process.env.NODE_ENV !== 'production';

function clerkConfigured(): boolean {
  return !DEV_BYPASS && Boolean(process.env.CLERK_SECRET_KEY);
}

async function clerkRevokeSessions(clerkId: string): Promise<void> {
  // Only real Clerk ids: the dev bypass and seeded users have no sessions.
  if (!clerkConfigured() || !clerkId.startsWith('user_')) return;
  const { clerkClient } = await import('@clerk/nextjs/server');
  const client = await clerkClient();
  const { data } = await client.sessions.getSessionList({ userId: clerkId, status: 'active', limit: 100 });
  await Promise.all(data.map((session) => client.sessions.revokeSession(session.id)));
}

async function clerkEnsureSignInAccount(email: string): Promise<void> {
  if (!clerkConfigured()) return;
  const { clerkClient } = await import('@clerk/nextjs/server');
  const client = await clerkClient();
  const existing = await client.users.getUserList({ emailAddress: [email], limit: 1 });
  if (existing.data.length > 0) return;
  await client.users.createUser({ emailAddress: [email], skipPasswordRequirement: true });
}

const DEFAULT_GATEWAYS: TeamGateways = {
  sendEmail: (message) => getEmailGateway().send(message),
  revokeSessions: clerkRevokeSessions,
  ensureSignInAccount: clerkEnsureSignInAccount,
};

let gateways: TeamGateways = DEFAULT_GATEWAYS;

/** Tests only: replace the outside calls (no email, no Clerk). Call with
 * nothing to restore the real ones. */
export function setTeamGatewaysForTests(overrides?: Partial<TeamGateways>): void {
  gateways = overrides ? { ...DEFAULT_GATEWAYS, ...overrides } : DEFAULT_GATEWAYS;
}

// ---------------------------------------------------------------------------
// Helpers

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TITLE_MAX = 80;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

function cleanTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX);
  return title || null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

function sameEmail(column: typeof schema.users.email | typeof schema.staffInvites.email, email: string): SQL {
  return sql`lower(${column}) = ${email}`;
}

type UserRow = typeof schema.users.$inferSelect;
type InviteRow = typeof schema.staffInvites.$inferSelect;

async function userRow(userId: string): Promise<UserRow | null> {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  return rows[0] ?? null;
}

function displayName(user: Pick<UserRow, 'displayName' | 'email'>): string {
  return user.displayName?.trim() || user.email;
}

function inviteStatus(invite: InviteRow, now = new Date()): TeamInviteView['status'] {
  if (invite.acceptedAt) return 'accepted';
  if (invite.revokedAt) return 'revoked';
  if (invite.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'pending';
}

function inviteView(invite: InviteRow): TeamInviteView {
  return {
    id: invite.id,
    email: invite.email,
    title: invite.title,
    permissions: normalisePermissions(invite.permissions),
    invitedAt: invite.createdAt.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
    status: inviteStatus(invite),
  };
}

function formatDay(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });
}

/** Replaces an employee's rows: everything goes, then the new map is
 * written, so a failure in between leaves them with less access, never more. */
async function replacePermissions(userId: string, permissions: PermissionMap, updatedBy: string | null): Promise<void> {
  await db.delete(schema.staffPermissions).where(eq(schema.staffPermissions.userId, userId));
  const rows = (Object.keys(permissions) as Area[]).map((area) => ({
    userId,
    area,
    level: permissions[area] as string,
    updatedBy,
    updatedAt: new Date(),
  }));
  if (rows.length > 0) await db.insert(schema.staffPermissions).values(rows);
}

async function ownerCount(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users).where(eq(schema.users.role, 'admin'));
  return Number(row?.n ?? 0);
}

/** A person's own sessions end when they leave: best effort, logged. */
async function endSessions(user: Pick<UserRow, 'clerkId'>): Promise<boolean> {
  try {
    await gateways.revokeSessions(user.clerkId);
    return true;
  } catch (err) {
    console.error('[team] ending sessions failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// The actor

/** The actor for a signed-in user: role, staff permissions and suspension.
 * Read fresh on every request, so a change of access counts from the
 * employee's next request. For staff the users row decides, not the role
 * passed in: someone removed since the session was read has no access. */
export async function loadActor(userId: string, role: Role): Promise<Actor> {
  if (role !== 'staff') return { userId, role, permissions: null, suspended: false };
  const [user, rows] = await Promise.all([
    userRow(userId),
    db
      .select({ area: schema.staffPermissions.area, level: schema.staffPermissions.level })
      .from(schema.staffPermissions)
      .where(eq(schema.staffPermissions.userId, userId)),
  ]);
  if (!user || user.role !== 'staff') return { userId, role: user?.role ?? 'artist', permissions: null, suspended: false };
  return { userId, role: 'staff', permissions: permissionsFromRows(rows), suspended: user.suspendedAt !== null };
}

// ---------------------------------------------------------------------------
// Reading the team

async function lastActiveByUser(userIds: string[]): Promise<Map<string, Date>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ actorId: schema.staffActivity.actorId, at: max(schema.staffActivity.createdAt) })
    .from(schema.staffActivity)
    .where(inArray(schema.staffActivity.actorId, userIds))
    .groupBy(schema.staffActivity.actorId);
  return new Map(rows.filter((r) => r.at).map((r) => [r.actorId, r.at as Date]));
}

function memberViews(users: UserRow[], permissionRows: { userId: string; area: string; level: string }[], lastActive: Map<string, Date>): TeamMemberView[] {
  return users.map((user) => ({
    userId: user.id,
    name: displayName(user),
    email: user.email,
    title: user.staffTitle,
    role: user.role === 'admin' ? 'admin' : 'staff',
    suspended: user.role === 'staff' && user.suspendedAt !== null,
    permissions: user.role === 'staff' ? permissionsFromRows(permissionRows.filter((r) => r.userId === user.id)) : {},
    lastActiveAt: lastActive.get(user.id)?.toISOString() ?? null,
  }));
}

/** Owners first, then employees by name; and the latest invites. */
export async function listTeam(actor: Actor): Promise<{ members: TeamMemberView[]; invites: TeamInviteView[] }> {
  requirePermission(actor, 'team', 'manage');
  const users = await db.select().from(schema.users).where(inArray(schema.users.role, ['admin', 'staff']));
  const ids = users.map((u) => u.id);
  const [permissionRows, lastActive, invites] = await Promise.all([
    ids.length > 0
      ? db
          .select({ userId: schema.staffPermissions.userId, area: schema.staffPermissions.area, level: schema.staffPermissions.level })
          .from(schema.staffPermissions)
          .where(inArray(schema.staffPermissions.userId, ids))
      : Promise.resolve([]),
    lastActiveByUser(ids),
    db.select().from(schema.staffInvites).orderBy(desc(schema.staffInvites.createdAt)).limit(50),
  ]);
  const members = memberViews(users, permissionRows, lastActive).sort((a, b) =>
    a.role !== b.role ? (a.role === 'admin' ? -1 : 1) : a.name.localeCompare(b.name),
  );
  return { members, invites: invites.map(inviteView) };
}

/** One person on the team, or null when they aren't on it. */
export async function getTeamMember(actor: Actor, userId: string): Promise<TeamMemberView | null> {
  requirePermission(actor, 'team', 'manage');
  const user = await userRow(userId);
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) return null;
  const [permissionRows, lastActive] = await Promise.all([
    db
      .select({ userId: schema.staffPermissions.userId, area: schema.staffPermissions.area, level: schema.staffPermissions.level })
      .from(schema.staffPermissions)
      .where(eq(schema.staffPermissions.userId, userId)),
    lastActiveByUser([userId]),
  ]);
  return memberViews([user], permissionRows, lastActive)[0] ?? null;
}

export async function countOwners(actor: Actor): Promise<number> {
  requirePermission(actor, 'team', 'manage');
  return ownerCount();
}

// ---------------------------------------------------------------------------
// Invites

async function sendInvite(invite: InviteRow, token: string, invitedBy: string): Promise<{ acceptUrl: string; emailSent: boolean }> {
  const acceptUrl = appUrl(`/staff-invite?token=${encodeURIComponent(token)}`);
  // The door signs in only addresses Clerk knows; a new employee needs one.
  try {
    await gateways.ensureSignInAccount(invite.email);
  } catch (err) {
    console.error('[team] preparing the invitee sign-in failed:', err instanceof Error ? err.message : err);
  }
  const rendered = staffInviteEmail({
    acceptUrl,
    invitedBy,
    title: invite.title,
    access: describeAccess(normalisePermissions(invite.permissions)),
    expiresOn: formatDay(invite.expiresAt),
  });
  try {
    const result = await gateways.sendEmail({ to: invite.email, subject: rendered.subject, html: rendered.html, text: rendered.text, event: 'staff.invite' });
    if (!result.ok) console.error('[team] invite email not sent:', result.error);
    return { acceptUrl, emailSent: result.ok };
  } catch (err) {
    console.error('[team] invite email failed:', err instanceof Error ? err.message : err);
    return { acceptUrl, emailSent: false };
  }
}

/** The owner invites someone by email with the access they choose. A newer
 * invite replaces any still open for the same address. The link (shown to
 * the owner too, in case the email doesn't arrive) works once, for 7 days,
 * and only for someone signed in with that address. Only its hash is kept. */
export async function inviteStaff(
  actor: Actor,
  input: { email: string; title?: string; permissions: PermissionMap },
): Promise<ServiceResult<{ inviteId: string; acceptUrl: string; emailSent: boolean }>> {
  requirePermission(actor, 'team', 'manage');
  const email = normaliseEmail(input.email);
  if (!email) return fail('invalid_email', "That email address doesn't look right.");
  const permissions = normalisePermissions(input.permissions);
  if (Object.keys(permissions).length === 0) return fail('no_access', 'Give them access to at least one area.');

  const existing = await db.select({ role: schema.users.role }).from(schema.users).where(sameEmail(schema.users.email, email));
  if (existing.some((u) => u.role === 'admin' || u.role === 'staff')) return fail('already_member', `${email} is already on the team.`);

  const now = new Date();
  await db
    .update(schema.staffInvites)
    .set({ revokedAt: now })
    .where(and(sameEmail(schema.staffInvites.email, email), isNull(schema.staffInvites.acceptedAt), isNull(schema.staffInvites.revokedAt)));

  const token = newToken();
  const [invite] = await db
    .insert(schema.staffInvites)
    .values({
      email,
      title: cleanTitle(input.title),
      permissions,
      tokenHash: hashToken(token),
      invitedBy: actor.userId,
      expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    })
    .returning();

  const inviter = await userRow(actor.userId);
  const sent = await sendInvite(invite, token, inviter ? displayName(inviter) : 'MerchFrom');
  await recordStaffActivity(actor, { area: 'team', action: 'team.invite', itemType: 'staff_invite', itemId: invite.id, detail: { email, permissions } });
  return ok({ inviteId: invite.id, ...sent });
}

/** A new link for an invite that hasn't been used (pending or expired): the
 * old link stops working, the new one runs another 7 days. */
export async function resendInvite(actor: Actor, inviteId: string): Promise<ServiceResult<{ acceptUrl: string; emailSent: boolean }>> {
  requirePermission(actor, 'team', 'manage');
  const token = newToken();
  const [invite] = await db
    .update(schema.staffInvites)
    .set({ tokenHash: hashToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) })
    .where(and(eq(schema.staffInvites.id, inviteId), isNull(schema.staffInvites.acceptedAt), isNull(schema.staffInvites.revokedAt)))
    .returning();
  if (!invite) return fail('not_found', 'That invite was used or withdrawn. Send a new one.');
  const inviter = await userRow(actor.userId);
  const sent = await sendInvite(invite, token, inviter ? displayName(inviter) : 'MerchFrom');
  await recordStaffActivity(actor, { area: 'team', action: 'team.invite_resend', itemType: 'staff_invite', itemId: invite.id, detail: { email: invite.email } });
  return ok(sent);
}

/** Withdraws an invite that hasn't been used. */
export async function revokeInvite(actor: Actor, inviteId: string): Promise<ServiceResult<null>> {
  requirePermission(actor, 'team', 'manage');
  const [invite] = await db
    .update(schema.staffInvites)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.staffInvites.id, inviteId), isNull(schema.staffInvites.acceptedAt), isNull(schema.staffInvites.revokedAt)))
    .returning();
  if (!invite) return fail('not_found', 'That invite was already used or withdrawn.');
  await recordStaffActivity(actor, { area: 'team', action: 'team.invite_revoke', itemType: 'staff_invite', itemId: invite.id, detail: { email: invite.email } });
  return ok(null);
}

/** The invite behind a link, whoever asks (the accept page shows which
 * address it is for). Null for a link that was never issued or was replaced. */
export async function findInviteByToken(token: string): Promise<TeamInviteView | null> {
  if (!token || token.length > 200) return null;
  const rows = await db.select().from(schema.staffInvites).where(eq(schema.staffInvites.tokenHash, hashToken(token))).limit(1);
  return rows[0] ? inviteView(rows[0]) : null;
}

/** Whether an address has an invite waiting (the register page sends such
 * a person to accept it instead of registering a shop). */
export async function hasPendingInvite(email: string): Promise<boolean> {
  const clean = normaliseEmail(email);
  if (!clean) return false;
  const rows = await db
    .select({ id: schema.staffInvites.id })
    .from(schema.staffInvites)
    .where(
      and(
        sameEmail(schema.staffInvites.email, clean),
        isNull(schema.staffInvites.acceptedAt),
        isNull(schema.staffInvites.revokedAt),
        gt(schema.staffInvites.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** The signed-in person accepts an invite with its link. They must be signed
 * in with the invited address, the link must be live (not used, withdrawn or
 * expired) and sent by someone who is still an owner, and the account can't
 * be the owner's or hold an artist shop
 * (staff accounts are separate). The invite is claimed first, in one guarded
 * update, so it can be used once; then the access is written, then the role. */
export async function acceptStaffInvite(
  user: { id: string; email: string },
  token: string,
): Promise<ServiceResult<{ inviteId: string }>> {
  if (!token || token.length > 200) return fail('not_found', "This invite link isn't valid. Ask the owner for a new one.");
  const [invite] = await db.select().from(schema.staffInvites).where(eq(schema.staffInvites.tokenHash, hashToken(token))).limit(1);
  if (!invite) return fail('not_found', "This invite link isn't valid. Ask the owner for a new one.");

  const status = inviteStatus(invite);
  if (status === 'accepted') {
    return invite.acceptedBy === user.id ? ok({ inviteId: invite.id }) : fail('used', 'This invite has already been used.');
  }
  if (status === 'revoked') return fail('revoked', 'This invite was withdrawn. Ask the owner for a new one.');
  if (status === 'expired') return fail('expired', 'This invite has expired. Ask the owner to send it again.');
  // An invite carries its sender's authority: once they are no longer an
  // owner (made staff or removed), the links they sent let nobody in.
  const inviter = await userRow(invite.invitedBy);
  if (inviter?.role !== 'admin') return fail('revoked', 'This invite is no longer valid. Ask the owner to send a new one.');
  if (normaliseEmail(user.email) !== invite.email) {
    return fail('email_mismatch', `This invite is for ${invite.email}. Sign out, then sign in with that address.`);
  }

  const account = await userRow(user.id);
  if (!account) return fail('not_found', "We couldn't find your account. Sign in again.");
  if (account.role === 'admin') return fail('owner', "You're an owner already, with access to everything.");
  if (account.role === 'staff' && account.suspendedAt) return fail('suspended', 'Your access is paused. Ask the owner to resume it.');
  const shops = await db.select({ id: schema.artistStores.id }).from(schema.artistStores).where(eq(schema.artistStores.artistId, user.id)).limit(1);
  if (shops.length > 0) {
    return fail('has_shop', 'This account has an artist shop, and staff accounts are kept apart from shops. Ask the owner to invite another address.');
  }

  const now = new Date();
  const [claimed] = await db
    .update(schema.staffInvites)
    .set({ acceptedAt: now, acceptedBy: user.id })
    .where(
      and(
        eq(schema.staffInvites.id, invite.id),
        isNull(schema.staffInvites.acceptedAt),
        isNull(schema.staffInvites.revokedAt),
        gt(schema.staffInvites.expiresAt, now),
        // checked again in the claim: the sender may lose the role meanwhile
        sql`exists (select 1 from users as inviters where inviters.id = ${schema.staffInvites.invitedBy} and inviters.role = 'admin')`,
      ),
    )
    .returning();
  if (!claimed) return fail('used', 'This invite has already been used.');

  const permissions = normalisePermissions(claimed.permissions);
  await replacePermissions(user.id, permissions, claimed.invitedBy);
  const [joined] = await db
    .update(schema.users)
    .set({ role: 'staff', staffTitle: claimed.title, suspendedAt: null, updatedAt: now })
    .where(and(eq(schema.users.id, user.id), ne(schema.users.role, 'admin')))
    .returning({ id: schema.users.id });
  if (!joined) return fail('owner', "You're an owner already, with access to everything.");

  await recordStaffActivity(
    { userId: user.id, role: 'staff', permissions, suspended: false },
    { area: 'team', action: 'team.join', itemType: 'staff_invite', itemId: claimed.id, detail: { invitedBy: claimed.invitedBy } },
  );
  return ok({ inviteId: claimed.id });
}

// ---------------------------------------------------------------------------
// Changing someone's access

/** Sets an employee's access, area by area (the owner's is always full). */
export async function updatePermissions(actor: Actor, userId: string, permissions: PermissionMap): Promise<ServiceResult<null>> {
  requirePermission(actor, 'team', 'manage');
  const target = await userRow(userId);
  if (!target) return fail('not_found', "That person isn't on the team.");
  if (target.role === 'admin') return fail('owner', 'An owner has access to everything.');
  if (target.role !== 'staff') return fail('not_staff', "That person isn't on the team.");
  const clean = normalisePermissions(permissions);
  await replacePermissions(userId, clean, actor.userId);
  await recordStaffActivity(actor, { area: 'team', action: 'team.access', itemType: 'user', itemId: userId, detail: { permissions: clean } });
  return ok(null);
}

/** An employee's job title, shown on the team page. */
export async function updateTitle(actor: Actor, userId: string, title: string): Promise<ServiceResult<null>> {
  requirePermission(actor, 'team', 'manage');
  const [updated] = await db
    .update(schema.users)
    .set({ staffTitle: cleanTitle(title), updatedAt: new Date() })
    .where(and(eq(schema.users.id, userId), inArray(schema.users.role, ['admin', 'staff'])))
    .returning({ id: schema.users.id });
  if (!updated) return fail('not_found', "That person isn't on the team.");
  await recordStaffActivity(actor, { area: 'team', action: 'team.title', itemType: 'user', itemId: userId, detail: { title: cleanTitle(title) } });
  return ok(null);
}

/** Pauses or resumes an employee. A suspended employee has no access at all
 * (lib/auth.ts blocks their session) until resumed. Owners can't be paused. */
export async function setSuspended(actor: Actor, userId: string, suspended: boolean): Promise<ServiceResult<null>> {
  requirePermission(actor, 'team', 'manage');
  if (userId === actor.userId) return fail('self', "You can't pause your own access.");
  const target = await userRow(userId);
  if (!target) return fail('not_found', "That person isn't on the team.");
  if (target.role === 'admin') return fail('owner', "Owners can't be paused. Make them staff first.");
  if (target.role !== 'staff') return fail('not_staff', "That person isn't on the team.");
  await db
    .update(schema.users)
    .set({ suspendedAt: suspended ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(schema.users.id, userId), eq(schema.users.role, 'staff')));
  await recordStaffActivity(actor, { area: 'team', action: suspended ? 'team.suspend' : 'team.resume', itemType: 'user', itemId: userId });
  return ok(null);
}

/** Withdraws the open invites someone sent, when they stop being an owner:
 * a link they sent must not let anyone in once they could no longer invite.
 * Run after their role changes; acceptStaffInvite checks the sender too. */
async function revokeInvitesFrom(userId: string): Promise<void> {
  await db
    .update(schema.staffInvites)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.staffInvites.invitedBy, userId), isNull(schema.staffInvites.acceptedAt), isNull(schema.staffInvites.revokedAt)));
}

/** Takes the owner role away from an owner, while another owner remains.
 * Guarded in the update itself, and checked again after it: there is always
 * at least one owner. */
async function demoteOwner(userId: string, to: 'staff' | 'artist'): Promise<boolean> {
  const [demoted] = await db
    .update(schema.users)
    .set({ role: to, updatedAt: new Date() })
    .where(
      and(
        eq(schema.users.id, userId),
        eq(schema.users.role, 'admin'),
        sql`(select count(*) from users as owners where owners.role = 'admin') > 1`,
      ),
    )
    .returning({ id: schema.users.id });
  if (!demoted) return false;
  // Two owners demoting each other at the same moment could both pass the
  // guard; whoever finds no owner left puts this one back.
  if ((await ownerCount()) === 0) {
    await db.update(schema.users).set({ role: 'admin' }).where(eq(schema.users.id, userId));
    return false;
  }
  return true;
}

/** Makes an employee an owner (everything, the team included), or an owner
 * an employee with no areas yet (the owner then sets them) and withdraws the
 * invites they sent. Never the last owner, and never yourself. */
export async function setOwner(actor: Actor, userId: string, owner: boolean): Promise<ServiceResult<null>> {
  requirePermission(actor, 'team', 'manage');
  if (userId === actor.userId) return fail('self', 'Ask another owner to change your own role.');
  const target = await userRow(userId);
  if (!target || (target.role !== 'admin' && target.role !== 'staff')) return fail('not_found', "That person isn't on the team.");

  if (owner) {
    if (target.role === 'admin') return ok(null);
    if (target.suspendedAt) return fail('suspended', 'Resume their access first.');
    await db.delete(schema.staffPermissions).where(eq(schema.staffPermissions.userId, userId));
    await db.update(schema.users).set({ role: 'admin', suspendedAt: null, updatedAt: new Date() }).where(eq(schema.users.id, userId));
  } else {
    if (target.role === 'staff') return ok(null);
    if (!(await demoteOwner(userId, 'staff'))) return fail('last_owner', 'There must always be an owner. Make someone else an owner first.');
    await db.delete(schema.staffPermissions).where(eq(schema.staffPermissions.userId, userId));
    await revokeInvitesFrom(userId);
  }
  await recordStaffActivity(actor, { area: 'team', action: owner ? 'team.make_owner' : 'team.make_staff', itemType: 'user', itemId: userId });
  return ok(null);
}

/** Removes someone from the team: their access goes (role back to artist,
 * every area row deleted), the invites they sent are withdrawn and their
 * sessions are ended, so it takes effect at once. Never the last owner, and
 * never yourself. */
export async function removeStaff(actor: Actor, userId: string): Promise<ServiceResult<{ sessionsEnded: boolean }>> {
  requirePermission(actor, 'team', 'manage');
  if (userId === actor.userId) return fail('self', 'Ask another owner to remove you.');
  const target = await userRow(userId);
  if (!target || (target.role !== 'admin' && target.role !== 'staff')) return fail('not_found', "That person isn't on the team.");

  if (target.role === 'admin') {
    if (!(await demoteOwner(userId, 'artist'))) return fail('last_owner', 'There must always be an owner. Make someone else an owner first.');
  } else {
    await db
      .update(schema.users)
      .set({ role: 'artist', updatedAt: new Date() })
      .where(and(eq(schema.users.id, userId), eq(schema.users.role, 'staff')));
  }
  await db.delete(schema.staffPermissions).where(eq(schema.staffPermissions.userId, userId));
  await revokeInvitesFrom(userId);
  await db.update(schema.users).set({ staffTitle: null, suspendedAt: null }).where(eq(schema.users.id, userId));
  const sessionsEnded = await endSessions(target);
  await recordStaffActivity(actor, { area: 'team', action: 'team.remove', itemType: 'user', itemId: userId, detail: { email: target.email } });
  return ok({ sessionsEnded });
}

// ---------------------------------------------------------------------------
// Activity

/** Records a staff page or page action (assistant actions are already in
 * tool_invocations). The owner's and employees' only; an artist's call is
 * ignored. Never throws into the caller: logs and returns on failure. Pass
 * `detail.summary` for the sentence the activity list shows. */
export async function recordStaffActivity(
  actor: Actor,
  entry: { area: string; action: string; itemType?: string; itemId?: string; detail?: unknown },
): Promise<void> {
  if (actor.role !== 'admin' && actor.role !== 'staff') return;
  try {
    await db.insert(schema.staffActivity).values({
      actorId: actor.userId,
      area: entry.area,
      action: entry.action,
      itemType: entry.itemType ?? null,
      itemId: entry.itemId ?? null,
      detail: entry.detail === undefined ? null : (entry.detail as object),
    });
  } catch (err) {
    console.error('[team] activity not recorded:', err instanceof Error ? err.message : err);
  }
}

const ACTION_WORDS: Record<string, string> = {
  'page.view': 'Opened',
  'team.invite': 'Invited someone to the team',
  'team.invite_resend': 'Sent an invite again',
  'team.invite_revoke': 'Withdrew an invite',
  'team.join': 'Joined the team',
  'team.access': 'Changed access',
  'team.title': 'Changed a job title',
  'team.suspend': 'Paused access',
  'team.resume': 'Resumed access',
  'team.make_owner': 'Made someone an owner',
  'team.make_staff': 'Made an owner staff',
  'team.remove': 'Removed someone from the team',
  'production.advance': 'Moved an order along',
  'production.tracking': 'Added tracking to an order',
  'supplier.draft': 'Drafted a supplier order',
  'supplier.place': 'Placed a supplier order',
  'supplier.receive': 'Received a supplier order',
  'ink_system.update': 'Changed the ink system',
  'ink_system.dot_gain': 'Calibrated the dot gain',
  'ink_system.dot_gain_reset': 'Removed the dot-gain calibration',
  'pricing.screen_table': 'Changed the screen-print prices',
};

function humanise(action: string): string {
  const words = action.replace(/[._]+/g, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : 'Did something';
}

function activitySummary(row: typeof schema.staffActivity.$inferSelect, names: Map<string, string>): string {
  const detail = (row.detail ?? {}) as Record<string, unknown>;
  if (typeof detail.summary === 'string' && detail.summary.trim()) return detail.summary.trim();
  if (row.action === 'page.view') {
    const page = typeof detail.page === 'string' ? detail.page : row.itemId;
    return page ? `Opened ${page}` : 'Opened a page';
  }
  const base = ACTION_WORDS[row.action] ?? humanise(row.action);
  const email = typeof detail.email === 'string' ? detail.email : null;
  if (email) return `${base}: ${email}`;
  if (row.itemType === 'user' && row.itemId && names.has(row.itemId)) return `${base}: ${names.get(row.itemId)}`;
  return base;
}

/** The activity log, newest first: staff page actions, and the tools the
 * assistant ran for team members. Filter by person (`userId`) or by item
 * (`itemType` and `itemId`; an item's assistant entries are the tool calls
 * whose input names it). `toolNames` limits assistant entries to those tools
 * (the team page passes the staff tools that change things). */
export async function listActivity(
  actor: Actor,
  filter?: { userId?: string; itemType?: string; itemId?: string; limit?: number; toolNames?: string[] },
): Promise<ActivityEntryView[]> {
  requirePermission(actor, 'team', 'manage');
  const limit = Math.min(Math.max(filter?.limit ?? 50, 1), 200);

  const pageWhere: SQL[] = [];
  if (filter?.userId) pageWhere.push(eq(schema.staffActivity.actorId, filter.userId));
  if (filter?.itemType) pageWhere.push(eq(schema.staffActivity.itemType, filter.itemType));
  if (filter?.itemId) pageWhere.push(eq(schema.staffActivity.itemId, filter.itemId));
  const pageQuery = db.select().from(schema.staffActivity);
  const pageRows = await (pageWhere.length > 0 ? pageQuery.where(and(...pageWhere)) : pageQuery)
    .orderBy(desc(schema.staffActivity.createdAt))
    .limit(limit);

  // Assistant entries: the conversation says whose they were. Only team
  // conversations (the role when the conversation began), only calls that ran.
  const toolNames = filter?.toolNames;
  const assistantWhere: SQL[] = [
    eq(schema.toolInvocations.status, 'ok'),
    inArray(schema.conversations.roleAtTime, ['admin', 'staff']),
  ];
  if (filter?.userId) assistantWhere.push(eq(schema.conversations.userId, filter.userId));
  if (filter?.itemId) assistantWhere.push(sql`position(${filter.itemId} in ${schema.toolInvocations.input}::text) > 0`);
  if (toolNames) assistantWhere.push(toolNames.length > 0 ? inArray(schema.toolInvocations.toolName, toolNames) : sql`false`);
  const assistantRows = await db
    .select({
      id: schema.toolInvocations.id,
      toolName: schema.toolInvocations.toolName,
      createdAt: schema.toolInvocations.createdAt,
      userId: schema.conversations.userId,
    })
    .from(schema.toolInvocations)
    .innerJoin(schema.conversations, eq(schema.toolInvocations.conversationId, schema.conversations.id))
    .where(and(...assistantWhere))
    .orderBy(desc(schema.toolInvocations.createdAt))
    .limit(limit);

  const userIds = new Set<string>();
  for (const row of pageRows) {
    userIds.add(row.actorId);
    if (row.itemType === 'user' && row.itemId) userIds.add(row.itemId);
  }
  for (const row of assistantRows) userIds.add(row.userId);
  const people = userIds.size > 0 ? await db.select().from(schema.users).where(inArray(schema.users.id, [...userIds])) : [];
  const names = new Map(people.map((p) => [p.id, displayName(p)]));

  const entries: ActivityEntryView[] = [
    ...pageRows.map((row) => ({
      id: row.id,
      at: row.createdAt.toISOString(),
      actorId: row.actorId,
      actorName: names.get(row.actorId) ?? 'Someone',
      area: row.area,
      action: row.action,
      itemType: row.itemType,
      itemId: row.itemId,
      summary: activitySummary(row, names),
      source: 'page' as const,
    })),
    ...assistantRows.map((row) => ({
      id: row.id,
      at: row.createdAt.toISOString(),
      actorId: row.userId,
      actorName: names.get(row.userId) ?? 'Someone',
      area: '',
      action: `tool.${row.toolName}`,
      itemType: null,
      itemId: null,
      summary: `Through the assistant: ${humanise(row.toolName)}`,
      source: 'assistant' as const,
      toolName: row.toolName,
    })),
  ];
  return entries.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
