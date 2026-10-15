/**
 * ElevenLabs Conversational AI custom-LLM bridge.
 *
 * Setup notes (there is no separate doc for wave 4 voice — this header is it):
 *
 * 1. ElevenLabs' Conversational AI agent is configured with `Custom LLM`
 *    pointed at `${NEXT_PUBLIC_APP_URL}/api/voice/llm` (see
 *    `lib/services/voice.ts#ensureAgent`, a one-off admin call — it is not
 *    invoked automatically because it needs a public URL and writes agent
 *    config, so it stays a manual step until deploy). ElevenLabs then talks
 *    to *this* route exactly like it would talk to OpenAI's
 *    /v1/chat/completions: a JSON body with `messages`, `stream: true`, and
 *    an SSE response of `data: {..openai chat.completion.chunk..}\n\n`
 *    terminated by `data: [DONE]\n\n`.
 *
 * 2. Auth here is a static bearer secret (`VOICE_BRIDGE_SECRET`), not Clerk —
 *    ElevenLabs calls this route server-to-server with no browser session.
 *    The value is set on the agent's `customLlm.requestHeaders.authorization`
 *    (see ensureAgent) and checked against `Authorization: Bearer <secret>`
 *    below, in constant time.
 *
 * 3. *Which* MerchFrom user is talking is a separate problem from bridge
 *    auth. The secret only proves the request came from ElevenLabs; the rest
 *    of it was set by the browser that started the conversation, so a bare
 *    `user_id` on it could be anyone's (the owner's included) and is never
 *    read. Instead /api/voice/session, behind Clerk, mints a signed caller
 *    token for the signed-in user (`mintVoiceCallerToken` in
 *    lib/services/voice.ts: `v1.<userId>.<expiry>.<HMAC-SHA256>` keyed with
 *    VOICE_BRIDGE_SECRET, good for about an hour). The client starts the
 *    conversation with it as the `user_token` dynamic variable
 *    (`startSession({ dynamicVariables: { user_token } })`,
 *    components/chat/useVoice.ts), and it shows up on this request either
 *    top-level as `user_token` or nested under
 *    `elevenlabs_extra_body.user_token` depending on how the agent's
 *    extra-body template is configured. `resolveVoiceCaller` acts only for a
 *    token that verifies, looking its user up by `users.id`. Until a real
 *    agent exists there is nothing to forward a token from, so in local dev
 *    (AUTH_DEV_BYPASS=1) a request without one falls back to the same fixed
 *    dev-bypass user everything else in the app uses.
 *
 * 4. The bridge runs *our* agent loop (`runTurnForText`, wrapping
 *    `startAgentTurn`) against that user's own conversation — same tools,
 *    same memory, same project card. Voice is a client of the one brain, not
 *    a second one. If the turn stops at a confirm-gated tool, we speak a
 *    short nudge and rely on the tool call already being recorded as
 *    `pending_confirm` (lib/services/tools-audit.ts) for the human to act on
 *    from the web chat — there is no separate voice-only confirm flow.
 *
 * 5. Latency: tool-heavy turns can take a couple of seconds before the model
 *    produces its first token (parallel tool calls, image generation, etc).
 *    If nothing has streamed after 1.2s we inject a filler "One moment." so
 *    the caller doesn't sit in silence — the real reply keeps streaming
 *    after it.
 */
import { randomUUID, timingSafeEqual } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import type { BaseAgentContext } from '@/lib/agent/loop';
import { runTurnForText } from '@/lib/agent/run-turn';
import { checkRateLimit } from '@/lib/agent/rate-limit';
import { getOrCreateConversation } from '@/lib/services/conversations';
import { loadActor } from '@/lib/services/team';
import { resolveVoiceCaller } from '@/lib/services/voice';

export const runtime = 'nodejs';

const WAIT_FILLER_MS = 1200;

interface ChatContentPart {
  type?: string;
  text?: string;
}

interface ChatMessage {
  role?: string;
  content?: string | ChatContentPart[];
}

interface VoiceLlmRequestBody {
  messages?: ChatMessage[];
  model?: string;
  stream?: boolean;
  /** the caller token from /api/voice/session (see point 3 above) */
  user_token?: string;
  elevenlabs_extra_body?: { user_token?: string; [key: string]: unknown };
}

/** Whether the Authorization header carries the bridge secret, compared in
 * constant time (timingSafeEqual throws on lengths that differ, so the
 * length is checked first). */
function hasBridgeSecret(authHeader: string | null, secret: string): boolean {
  if (!authHeader) return false;
  const given = Buffer.from(authHeader);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function textOfContent(content: ChatMessage['content']): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((part): part is ChatContentPart & { text: string } => typeof part.text === 'string')
      .map((part) => part.text)
      .join(' ')
      .trim();
  }
  return '';
}

/** The LAST user message text — the thing the caller just said. */
function extractLastUserText(messages: ChatMessage[] | undefined): string {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return textOfContent(messages[i]?.content).trim();
  }
  return '';
}

function sseChunk(id: string, model: string, created: number, content: string, finishReason: string | null = null): string {
  const delta: Record<string, unknown> = finishReason ? {} : { role: 'assistant', content };
  const payload = {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.VOICE_BRIDGE_SECRET;
  if (!secret || !hasBridgeSecret(req.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: VoiceLlmRequestBody;
  try {
    body = (await req.json()) as VoiceLlmRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const callerToken = body.user_token ?? body.elevenlabs_extra_body?.user_token ?? null;
  const caller = await resolveVoiceCaller(callerToken);
  if (!caller) {
    return NextResponse.json({ error: 'unknown_caller' }, { status: 401 });
  }
  // The same access as the web chat: an employee's areas as of this call,
  // and nothing at all for a suspended one.
  const actor = await loadActor(caller.userId, caller.role);
  if (actor.role === 'staff' && actor.suspended) {
    return NextResponse.json({ error: 'suspended' }, { status: 403 });
  }

  const rate = checkRateLimit(`voice-llm:${caller.userId}`);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'retry-after': Math.ceil(rate.retryAfterMs / 1000).toString() } },
    );
  }

  const userText = extractLastUserText(body.messages);
  if (!userText) {
    return NextResponse.json({ error: 'no_user_message' }, { status: 400 });
  }

  const conversation = await getOrCreateConversation(caller.userId, actor.role);
  const base: BaseAgentContext = {
    userId: caller.userId,
    clerkId: caller.clerkId,
    role: actor.role,
    storeId: caller.storeId,
    conversationId: conversation.id,
    locale: caller.locale,
    permissions: actor.permissions ?? null,
    suspended: actor.suspended ?? false,
  };

  const modelName = body.model || 'merchfrom-agent';
  const completionId = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sawToken = false;
      let closed = false;
      const enqueue = (frame: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(frame));
      };

      const waitTimer = setTimeout(() => {
        if (!sawToken) enqueue(sseChunk(completionId, modelName, created, 'One moment. '));
      }, WAIT_FILLER_MS);

      const onTextDelta = (text: string) => {
        if (!text) return;
        sawToken = true;
        enqueue(sseChunk(completionId, modelName, created, text));
      };

      try {
        const result = await runTurnForText(base, userText, { onTextDelta });
        clearTimeout(waitTimer);

        if (result.error) {
          enqueue(sseChunk(completionId, modelName, created, "Sorry, I hit a problem on my end. Let's try that again."));
        } else if (result.confirmRequired) {
          enqueue(sseChunk(completionId, modelName, created, ' I need you to confirm that on screen.'));
        } else if (!result.text.trim()) {
          enqueue(sseChunk(completionId, modelName, created, "I didn't get anything back for that — could you say it again?"));
        }

        enqueue(sseChunk(completionId, modelName, created, '', 'stop'));
        enqueue('data: [DONE]\n\n');
      } catch (err) {
        clearTimeout(waitTimer);
        const message = err instanceof Error ? err.message : 'voice bridge error';
        enqueue(sseChunk(completionId, modelName, created, `Sorry, something went wrong: ${message}`));
        enqueue(sseChunk(completionId, modelName, created, '', 'stop'));
        enqueue('data: [DONE]\n\n');
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
