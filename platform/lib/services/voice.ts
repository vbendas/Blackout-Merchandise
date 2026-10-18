import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { db, schema } from '@/lib/db';
import { DEV_BYPASS, DEV_DISPLAY_NAME } from '@/lib/auth';
import { getOrCreateUserFromClerk, parseUserRole } from '@/lib/services/users';
import type { Role } from '@/lib/tools/types';

// Scribe for STT; Flash for TTS latency (voice replies are short and
// conversational — Flash trades a little quality for the lowest round trip,
// which matters more than fidelity for a push-to-talk / live-agent voice UI).
const SCRIBE_MODEL = 'scribe_v1';
const TTS_MODEL = 'eleven_flash_v2_5';

// 'River' — calm, neutral-gendered, American, conversational use-case (see
// `voices.getAll()` catalogue at the time of writing: SAz9YHcvj6GT2YYXdXww).
// Picked over the persona voices already in the workspace (Leopoldo,
// Francisca, Antônia) because the Cat-Suite personas were retired in favour
// of one neutral assistant (Platform-Plan.md §0 "Interface").
const DEFAULT_VOICE_ID = 'SAz9YHcvj6GT2YYXdXww';

let cachedClient: ElevenLabsClient | null = null;
function client(): ElevenLabsClient {
  if (!cachedClient) cachedClient = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  return cachedClient;
}

export function activeVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
}

export interface TranscribeResult {
  text: string;
  language?: string;
  durationMs?: number;
}

/** Push-to-talk transcription via ElevenLabs Scribe. */
export async function transcribe(bytes: Uint8Array, mime: string): Promise<TranscribeResult> {
  const startedAt = Date.now();
  const response = await client().speechToText.convert({
    modelId: SCRIBE_MODEL,
    file: { data: bytes, filename: 'push-to-talk-audio', contentType: mime },
  });

  // Single-channel, non-webhook shape is the only one this endpoint can
  // return here (we never set use_multi_channel or webhook on the request).
  if ('text' in response) {
    const durationMs = response.audioDurationSecs != null ? Math.round(response.audioDurationSecs * 1000) : Date.now() - startedAt;
    return { text: response.text, language: response.languageCode, durationMs };
  }
  throw new Error('Unexpected speech-to-text response shape');
}

/** Strips markdown and URLs so TTS doesn't read out punctuation noise or long links. */
export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, '[link]')
    .replace(/[*_#`~]/g, '')
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
}

/** Streams mp3 bytes for a spoken reply. Caller is expected to have already
 * run text through `sanitizeForSpeech`. */
export async function ttsStream(text: string): Promise<ReadableStream<Uint8Array>> {
  return client().textToSpeech.stream(activeVoiceId(), {
    text,
    modelId: TTS_MODEL,
    outputFormat: 'mp3_44100_128',
  });
}

export interface SignedVoiceSession {
  signedUrl: string;
  agentId: string;
}

/** null when no Conversational AI agent is configured yet (ELEVENLABS_AGENT_ID empty). */
export async function getSignedUrl(): Promise<SignedVoiceSession | null> {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) return null;
  const res = await client().conversationalAi.conversations.getSignedUrl({ agentId });
  return { signedUrl: res.signedUrl, agentId };
}

// Who is talking. The bridge secret only proves a custom-LLM request came
// from ElevenLabs; everything else on it was put there by the browser that
// started the session, so a bare user id there could be anyone's. The person
// travels instead as a caller token only this server can make:
// /api/voice/session (behind Clerk) signs the signed-in user's id with
// VOICE_BRIDGE_SECRET, and the bridge acts only for the user a verified token names.

/** Longer than any voice session (the overlay asks for a new token each time
 * it opens), short enough that a token copied out of a browser soon dies. */
const CALLER_TOKEN_TTL_SECONDS = 60 * 60;
const CALLER_TOKEN_VERSION = 'v1';

function callerTokenSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** `v1.<userId>.<expiry, epoch seconds>.<HMAC-SHA256 of the rest>`, good for
 * about an hour. Throws without VOICE_BRIDGE_SECRET: /api/voice/session checks
 * for it first and offers the fallback engine instead. */
export function mintVoiceCallerToken(userId: string, nowMs: number = Date.now()): string {
  const secret = process.env.VOICE_BRIDGE_SECRET;
  if (!secret) throw new Error('VOICE_BRIDGE_SECRET is not set.');
  const payload = `${CALLER_TOKEN_VERSION}.${userId}.${Math.floor(nowMs / 1000) + CALLER_TOKEN_TTL_SECONDS}`;
  return `${payload}.${callerTokenSignature(payload, secret)}`;
}

/** The user id a caller token was minted for, or null when it is malformed,
 * altered, expired or signed with another secret, and when no secret is set. */
export function verifyVoiceCallerToken(token: string | null | undefined, nowMs: number = Date.now()): string | null {
  const secret = process.env.VOICE_BRIDGE_SECRET;
  // a request body can hold anything, whatever its type says
  if (!secret || typeof token !== 'string' || token.length > 512) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [version, userId, expires, signature] = parts;
  if (version !== CALLER_TOKEN_VERSION || !userId || !/^\d{1,12}$/.test(expires)) return null;
  const given = Buffer.from(signature);
  const expected = Buffer.from(callerTokenSignature(`${version}.${userId}.${expires}`, secret));
  // timingSafeEqual throws on buffers of different lengths
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return Number(expires) * 1000 > nowMs ? userId : null;
}

export interface VoiceCaller {
  userId: string;
  clerkId: string;
  role: Role;
  storeId: string | null;
  locale: string;
}

async function callerFromUserRow(user: typeof schema.users.$inferSelect): Promise<VoiceCaller> {
  const stores = await db
    .select()
    .from(schema.artistStores)
    .where(eq(schema.artistStores.artistId, user.id))
    .limit(1);
  return { userId: user.id, clerkId: user.clerkId, role: user.role, storeId: stores[0]?.id ?? null, locale: user.locale ?? 'en' };
}

/**
 * Maps the custom-LLM bridge's caller to one of our users. ElevenLabs has no
 * Clerk session to hand us, so the bridge is authenticated with a shared
 * `VOICE_BRIDGE_SECRET` (checked by the route) and the *person* by the caller
 * token /api/voice/session minted for them (mintVoiceCallerToken; the route's
 * header says how it travels). Only a token that verifies counts, and its
 * user is looked up by `users.id` alone; a raw id is never trusted.
 *
 * In local dev (AUTH_DEV_BYPASS=1) there is no real ElevenLabs agent wired
 * up yet to forward a token at all, so a request without one falls back to
 * the same fixed dev-bypass user the rest of the app uses when bypass is on.
 */
export async function resolveVoiceCaller(callerToken?: string | null): Promise<VoiceCaller | null> {
  if (callerToken) {
    const userId = verifyVoiceCallerToken(callerToken);
    if (!userId) return null;
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    return rows[0] ? callerFromUserRow(rows[0]) : null;
  }
  if (DEV_BYPASS) {
    const user = await getOrCreateUserFromClerk({
      clerkId: 'dev-bypass',
      email: process.env.AUTH_DEV_EMAIL ?? 'dev@blackoutmerch.test',
      displayName: DEV_DISPLAY_NAME,
      imageUrl: null,
      // the same role the rest of the app gives the dev user (lib/auth.ts)
      devRole: parseUserRole(process.env.AUTH_DEV_ROLE),
    });
    return callerFromUserRow(user);
  }
  return null;
}

export interface EnsureAgentParams {
  name?: string;
  firstMessage?: string;
}

/**
 * One-off admin step (never called automatically): creates or updates the
 * ElevenLabs Conversational AI agent so its brain is our custom-LLM bridge.
 * Needs a public NEXT_PUBLIC_APP_URL (ElevenLabs must be able to reach
 * `${NEXT_PUBLIC_APP_URL}/api/voice/llm`) and VOICE_BRIDGE_SECRET set.
 *
 * Run it once from a Node REPL / tsx after deploying:
 *   npx tsx -e "import('./lib/services/voice.ts').then((m) => m.ensureAgent()).then(console.log)"
 * then copy the printed agentId into ELEVENLABS_AGENT_ID.
 */
export async function ensureAgent(params: EnsureAgentParams = {}): Promise<{ agentId: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || appUrl.includes('localhost')) {
    throw new Error('ensureAgent needs a public NEXT_PUBLIC_APP_URL — ElevenLabs must reach /api/voice/llm from the internet.');
  }
  const secret = process.env.VOICE_BRIDGE_SECRET;
  if (!secret) throw new Error('VOICE_BRIDGE_SECRET is not set.');

  const created = await client().conversationalAi.agents.create({
    name: params.name ?? 'Blackout Merchandise',
    conversationConfig: {
      agent: {
        firstMessage: params.firstMessage ?? "Hi, I'm Blackout Merchandise. What are we making today?",
        language: 'en',
        prompt: {
          prompt: 'You help artists design, price and sell merchandise on Blackout Merchandise.',
          llm: 'custom-llm',
          customLlm: {
            url: `${appUrl}/api/voice/llm`,
            modelId: 'blackoutmerch-agent',
            // Static bridge auth — see app/api/voice/llm/route.ts header comment.
            requestHeaders: { authorization: `Bearer ${secret}` },
          },
        },
      },
      tts: { voiceId: activeVoiceId() },
    },
  });
  return { agentId: created.agentId };
}
