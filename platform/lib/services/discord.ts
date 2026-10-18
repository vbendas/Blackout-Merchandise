/**
 * Discord DM notifications (Platform-Plan §0, §7): an artist links their
 * Discord account via OAuth2 (scope `identify`, opt-in pre-checked at
 * registration — see lib/services/registration.ts), and a bot DMs them
 * queued events (proof ready, new sale, order shipped, payout paid).
 * lib/services/notifications.ts already inserts `notifications` rows with
 * channel 'discord' and status 'pending' when the artist's prefs allow it;
 * this file drains them.
 *
 * Endpoints verified via WebFetch of docs.discord.com on 6 Sep 2026:
 *
 *   GET    /oauth2/authorize (discord.com, not /api)   authorize a user, scope + state
 *   POST   /api/v10/oauth2/token                       exchange code -> access_token
 *   GET    /api/v10/users/@me                           OAuth2 Bearer: the linking user
 *   GET    /api/v10/users/{id}                          Bot token: any user's public profile
 *   POST   /api/v10/users/@me/channels {recipient_id}   Bot token: open/reuse a DM channel
 *   POST   /api/v10/channels/{id}/messages {content}    Bot token: send the DM
 *
 * Rate limits: a 429 body carries `retry_after` (seconds) and `global`;
 * `drainPending` treats that as "try again next run", never as a permanent
 * failure.
 *
 * `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are
 * all empty in this environment, so `getDiscordGateway()` falls back to an
 * in-memory MOCK (mirrors lib/services/vercel.ts / stripe.ts) that logs each
 * "DM" and records it in `mockDiscordDeliveries()` for the smoke test.
 */
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { appUrl } from '@/lib/emails/layout';

const API_BASE = 'https://discord.com/api/v10';
const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const OAUTH_SCOPE = 'identify';
const STATE_TTL_MS = 10 * 60 * 1000;
const DRAIN_HARD_CAP = 50;

// ---------------------------------------------------------------------------
// Gateway contract
// ---------------------------------------------------------------------------

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  globalName: string | null;
}

export interface DiscordTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface DiscordSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  /** set only on a 429; the caller backs off rather than failing the row */
  retryAfterMs?: number;
}

export interface DiscordGateway {
  exchangeCode(code: string, redirectUri: string): Promise<DiscordTokenResult>;
  fetchMe(accessToken: string): Promise<DiscordUser>;
  fetchUserById(discordUserId: string): Promise<DiscordUser>;
  openDm(discordUserId: string): Promise<{ channelId: string }>;
  sendDm(channelId: string, content: string): Promise<DiscordSendResult>;
}

/** Never carries the bot token / client secret — only status + Discord's own message. */
export class DiscordApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DiscordApiError';
  }
}

/** `username#discriminator` for the legacy-discriminator accounts Discord's
 * own docs still show in examples (discriminator '0' means the new unique
 * -username system, where there's nothing to append). */
export function formatDiscordUsername(user: DiscordUser): string {
  if (user.discriminator && user.discriminator !== '0') return `${user.username}#${user.discriminator}`;
  return user.globalName ?? user.username;
}

// ---------------------------------------------------------------------------
// Real gateway
// ---------------------------------------------------------------------------

function mapUser(raw: { id: string; username: string; discriminator: string; global_name: string | null }): DiscordUser {
  return { id: raw.id, username: raw.username, discriminator: raw.discriminator, globalName: raw.global_name ?? null };
}

async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body?.message ?? `Discord API request failed (${res.status})`;
  } catch {
    return `Discord API request failed (${res.status})`;
  }
}

class RealDiscordGateway implements DiscordGateway {
  private readonly botToken: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!botToken || !clientId || !clientSecret) {
      throw new DiscordApiError(500, 'DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET must all be set to use the real Discord gateway.');
    }
    this.botToken = botToken;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<DiscordTokenResult> {
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: `Basic ${basic}` },
      body,
    });
    if (!res.ok) throw new DiscordApiError(res.status, await safeErrorMessage(res));
    const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
    return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in };
  }

  async fetchMe(accessToken: string): Promise<DiscordUser> {
    const res = await fetch(`${API_BASE}/users/@me`, { headers: { authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new DiscordApiError(res.status, await safeErrorMessage(res));
    return mapUser(await res.json());
  }

  async fetchUserById(discordUserId: string): Promise<DiscordUser> {
    const res = await fetch(`${API_BASE}/users/${discordUserId}`, { headers: { authorization: `Bot ${this.botToken}` } });
    if (!res.ok) throw new DiscordApiError(res.status, await safeErrorMessage(res));
    return mapUser(await res.json());
  }

  async openDm(discordUserId: string): Promise<{ channelId: string }> {
    const res = await fetch(`${API_BASE}/users/@me/channels`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bot ${this.botToken}` },
      body: JSON.stringify({ recipient_id: discordUserId }),
    });
    if (!res.ok) throw new DiscordApiError(res.status, await safeErrorMessage(res));
    const json = (await res.json()) as { id: string };
    return { channelId: json.id };
  }

  async sendDm(channelId: string, content: string): Promise<DiscordSendResult> {
    const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bot ${this.botToken}` },
      body: JSON.stringify({ content }),
    });
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}) as { retry_after?: number });
      const seconds = body.retry_after ?? Number(res.headers.get('x-ratelimit-reset-after') ?? '1');
      return { ok: false, error: 'rate_limited', retryAfterMs: Math.max(1, Math.round(seconds * 1000)) };
    }
    if (!res.ok) return { ok: false, error: await safeErrorMessage(res) };
    const json = (await res.json()) as { id: string };
    return { ok: true, messageId: json.id };
  }
}

// ---------------------------------------------------------------------------
// Mock gateway — used whenever the three Discord env vars aren't all set
// (this environment today)
// ---------------------------------------------------------------------------

const MOCK_DISCORD_USER: DiscordUser = { id: 'mock-discord-dev', username: 'dev', discriminator: '0001', globalName: null };

export interface MockDelivery {
  channelId: string;
  content: string;
  at: Date;
}

class MockDiscordGateway implements DiscordGateway {
  private readonly channels = new Map<string, string>();
  readonly deliveries: MockDelivery[] = [];

  async exchangeCode(): Promise<DiscordTokenResult> {
    return { accessToken: `mock_token_${randomUUID()}`, expiresIn: 604_800 };
  }

  async fetchMe(): Promise<DiscordUser> {
    return MOCK_DISCORD_USER;
  }

  async fetchUserById(discordUserId: string): Promise<DiscordUser> {
    if (discordUserId === MOCK_DISCORD_USER.id) return MOCK_DISCORD_USER;
    // Any other id (a real one, if a real link ever happened before mock mode
    // was re-enabled) still resolves to something displayable.
    return { id: discordUserId, username: 'discord-user', discriminator: '0', globalName: null };
  }

  async openDm(discordUserId: string): Promise<{ channelId: string }> {
    let channelId = this.channels.get(discordUserId);
    if (!channelId) {
      channelId = `mock_channel_${discordUserId}`;
      this.channels.set(discordUserId, channelId);
    }
    return { channelId };
  }

  async sendDm(channelId: string, content: string): Promise<DiscordSendResult> {
    this.deliveries.push({ channelId, content, at: new Date() });
    console.log(`[discord:mock] DM -> ${channelId}: ${content.replace(/\n/g, ' | ')}`);
    return { ok: true, messageId: `mock_msg_${randomUUID()}` };
  }
}

const mockGateway = new MockDiscordGateway();
let gateway: DiscordGateway | null = null;

/** True unless all three Discord credentials are set — matches how
 * getStripeGateway / getVercelGateway pick real vs mock. */
export function isDiscordMockMode(): boolean {
  return !(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
}

export function getDiscordGateway(): DiscordGateway {
  if (!gateway) gateway = isDiscordMockMode() ? mockGateway : new RealDiscordGateway();
  return gateway;
}

/** Test-only: what the mock gateway has "sent" so far this process. */
export function mockDiscordDeliveries(): MockDelivery[] {
  return mockGateway.deliveries;
}

// ---------------------------------------------------------------------------
// OAuth2 state — HMAC-signed, not a DB row: the link flow is short-lived
// (authorize -> callback, same browser) and stateless state avoids a table
// just to hold a 10-minute nonce.
// ---------------------------------------------------------------------------

function stateSecret(): string {
  const secret = process.env.DISCORD_STATE_SECRET;
  if (!secret) throw new Error('DISCORD_STATE_SECRET is not configured.');
  return secret;
}

function signPayload(payload: string): string {
  return createHmac('sha256', stateSecret()).update(payload).digest('base64url');
}

/** userId.nonce.expiresAt.signature, base64url-wrapped so it's one opaque query param. */
export function encodeState(userId: string): string {
  const nonce = randomBytes(9).toString('base64url');
  const expiresAt = Date.now() + STATE_TTL_MS;
  const payload = `${userId}.${nonce}.${expiresAt}`;
  return Buffer.from(`${payload}.${signPayload(payload)}`, 'utf8').toString('base64url');
}

/** Verifies the signature (constant-time) and expiry; returns the bound userId or null. */
export function decodeState(state: string): { userId: string } | null {
  let decoded: string;
  try {
    decoded = Buffer.from(state, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const parts = decoded.split('.');
  if (parts.length !== 4) return null;
  const [userId, nonce, expiresAtRaw, signature] = parts;
  const expected = signPayload(`${userId}.${nonce}.${expiresAtRaw}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  return { userId };
}

function redirectUri(): string {
  return appUrl('/api/discord/callback');
}

/** Discord's authorize URL for the `identify` scope, state bound to `userId`. */
export function buildAuthorizeUrl(userId: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', process.env.DISCORD_CLIENT_ID ?? '');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('scope', OAUTH_SCOPE);
  url.searchParams.set('state', encodeState(userId));
  return url.toString();
}

// ---------------------------------------------------------------------------
// Link / unlink / status
// ---------------------------------------------------------------------------

export type CompleteLinkResult =
  | { ok: true; userId: string; discordUserId: string; username: string }
  | { ok: false; error: 'invalid_state' | 'exchange_failed' | 'fetch_me_failed' };

/** Exchanges the OAuth2 code, stores `users.discordUserId` +
 * `notification_prefs.discordUserId`, and turns Discord DMs on (re-linking
 * after an unlink should re-enable them; a fresh link inherits the
 * pre-checked registration default anyway). */
export async function completeLink(state: string, code: string): Promise<CompleteLinkResult> {
  const decoded = decodeState(state);
  if (!decoded) return { ok: false, error: 'invalid_state' };

  const client = getDiscordGateway();
  let token: DiscordTokenResult;
  try {
    token = await client.exchangeCode(code, redirectUri());
  } catch (err) {
    console.error('[discord] token exchange failed:', err instanceof Error ? err.message : err);
    return { ok: false, error: 'exchange_failed' };
  }

  let me: DiscordUser;
  try {
    me = await client.fetchMe(token.accessToken);
  } catch (err) {
    console.error('[discord] fetchMe failed:', err instanceof Error ? err.message : err);
    return { ok: false, error: 'fetch_me_failed' };
  }

  await db.update(schema.users).set({ discordUserId: me.id }).where(eq(schema.users.id, decoded.userId));
  await db
    .insert(schema.notificationPrefs)
    .values({ userId: decoded.userId, discordUserId: me.id, discordDm: true, email: true })
    .onConflictDoUpdate({ target: schema.notificationPrefs.userId, set: { discordUserId: me.id, discordDm: true } });

  return { ok: true, userId: decoded.userId, discordUserId: me.id, username: formatDiscordUsername(me) };
}

/** Clears the link and turns Discord DMs off — a row queued between now and
 * the next drain will have nowhere to go (see drainPending's 'not_linked'
 * branch below) rather than being delivered to a now-disconnected account. */
export async function unlink(userId: string): Promise<void> {
  await db.update(schema.users).set({ discordUserId: null }).where(eq(schema.users.id, userId));
  await db
    .insert(schema.notificationPrefs)
    .values({ userId, discordUserId: null, discordDm: false, email: true })
    .onConflictDoUpdate({ target: schema.notificationPrefs.userId, set: { discordUserId: null, discordDm: false } });
}

export interface DiscordLinkStatus {
  linked: boolean;
  discordUserId: string | null;
  /** best-effort display name, refetched from Discord each call — nothing
   * beyond the id is persisted, so there's no stale username to invalidate */
  username: string | null;
  discordDm: boolean;
  email: boolean;
}

export async function linkStatus(userId: string): Promise<DiscordLinkStatus> {
  const [[user], [prefs]] = await Promise.all([
    db.select({ discordUserId: schema.users.discordUserId }).from(schema.users).where(eq(schema.users.id, userId)).limit(1),
    db.select().from(schema.notificationPrefs).where(eq(schema.notificationPrefs.userId, userId)).limit(1),
  ]);
  const discordUserId = user?.discordUserId ?? null;

  let username: string | null = null;
  if (discordUserId) {
    try {
      username = formatDiscordUsername(await getDiscordGateway().fetchUserById(discordUserId));
    } catch {
      // Best-effort display name only; still report linked from the stored id.
    }
  }

  return {
    linked: Boolean(discordUserId),
    discordUserId,
    username,
    discordDm: prefs?.discordDm ?? true,
    email: prefs?.email ?? true,
  };
}

/** Upserts whichever of discordDm/email were passed; omitted fields keep
 * their current value (or the schema default of true for a first-ever row). */
export async function setPrefs(userId: string, patch: { discordDm?: boolean; email?: boolean }): Promise<{ discordDm: boolean; email: boolean }> {
  const [existing] = await db.select().from(schema.notificationPrefs).where(eq(schema.notificationPrefs.userId, userId)).limit(1);
  const discordDm = patch.discordDm ?? existing?.discordDm ?? true;
  const email = patch.email ?? existing?.email ?? true;
  await db
    .insert(schema.notificationPrefs)
    .values({ userId, discordDm, email })
    .onConflictDoUpdate({ target: schema.notificationPrefs.userId, set: { discordDm, email } });
  return { discordDm, email };
}

// ---------------------------------------------------------------------------
// Drain
// ---------------------------------------------------------------------------

type NotificationRow = typeof schema.notifications.$inferSelect;

/** Wording matches the email tone (lib/emails/layout.ts): calm, one link,
 * no exclamation marks. The `prompt` hint lets the artist reply in Discord
 * with the exact words that resume the conversation in chat. */
function renderDmContent(row: NotificationRow): string {
  const payload = (row.payload as Record<string, unknown> | null) ?? {};
  const text = typeof payload.message === 'string' ? payload.message : row.event.replace(/[._]/g, ' ');
  const prompt = typeof payload.prompt === 'string' ? payload.prompt : undefined;
  const lines = [`Blackout Merchandise — ${text}`, appUrl('/chat')];
  if (prompt) lines.push(`Reply in Blackout Merchandise: "${prompt}"`);
  return lines.join('\n');
}

async function markNotification(id: string, status: 'sent' | 'failed', payload: Record<string, unknown>, extra: Record<string, unknown>): Promise<void> {
  await db
    .update(schema.notifications)
    .set({ status, payload: { ...payload, ...extra }, ...(status === 'sent' ? { sentAt: new Date() } : {}) })
    .where(eq(schema.notifications.id, id));
}

export interface DrainResult {
  processed: number;
  sent: number;
  failed: number;
  /** true if a 429 stopped this run early; remaining rows are untouched (still pending) for the next run */
  rateLimited: boolean;
}

/** Delivers up to `limit` (capped at 50) pending 'discord' notifications as
 * bot DMs. Per-user DM channel ids are cached for the life of one call so a
 * user with several queued notifications only opens one channel. A 429 stops
 * the run (remaining rows stay 'pending' for the next drain); every other
 * failure — including a since-unlinked user — marks the row 'failed' with a
 * reason in its payload rather than retrying forever. */
export async function drainPending(opts: { limit?: number } = {}): Promise<DrainResult> {
  const limit = Math.max(1, Math.min(opts.limit ?? DRAIN_HARD_CAP, DRAIN_HARD_CAP));
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(and(eq(schema.notifications.channel, 'discord'), eq(schema.notifications.status, 'pending')))
    .orderBy(asc(schema.notifications.createdAt))
    .limit(limit);

  const client = getDiscordGateway();
  const channelCache = new Map<string, string | null>();
  let sent = 0;
  let failed = 0;
  let rateLimited = false;

  for (const row of rows) {
    const payload = (row.payload as Record<string, unknown> | null) ?? {};
    const [user] = await db.select({ discordUserId: schema.users.discordUserId }).from(schema.users).where(eq(schema.users.id, row.userId)).limit(1);
    const discordUserId = user?.discordUserId ?? null;

    if (!discordUserId) {
      // Unlinked (or never linked) between queueing and draining: fail
      // rather than retry a row that can never succeed. See docs at the
      // bottom of this file for why 'failed' was chosen over leaving it
      // 'pending'.
      await markNotification(row.id, 'failed', payload, { discordFailReason: 'not_linked' });
      failed += 1;
      continue;
    }

    let channelId = channelCache.get(discordUserId);
    if (channelId === undefined) {
      try {
        channelId = (await client.openDm(discordUserId)).channelId;
      } catch (err) {
        console.error(`[discord] openDm failed for user ${row.userId}:`, err instanceof Error ? err.message : err);
        channelId = null;
      }
      channelCache.set(discordUserId, channelId);
    }
    if (!channelId) {
      await markNotification(row.id, 'failed', payload, { discordFailReason: 'dm_open_failed' });
      failed += 1;
      continue;
    }

    const result = await client.sendDm(channelId, renderDmContent(row));
    if (result.ok) {
      await markNotification(row.id, 'sent', payload, { discordMessageId: result.messageId });
      sent += 1;
      continue;
    }

    if (result.retryAfterMs) {
      rateLimited = true;
      break; // leave this row and everything after it 'pending' for the next run
    }

    await markNotification(row.id, 'failed', payload, { discordFailReason: result.error ?? 'send_failed' });
    failed += 1;
  }

  return { processed: sent + failed, sent, failed, rateLimited };
}
