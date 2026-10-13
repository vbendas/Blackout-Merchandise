// The door's contract with whatever opens it: Clerk's email code
// (ClerkDoors.tsx) or the local preview (PreviewDoor.tsx). DoorGate.tsx draws
// the steps and only ever shows the plain sentences below, never a Clerk code
// or message. Client-only helpers: call them from handlers and effects.

import { CONTACT_EMAIL } from '@/components/auth/door-links';

export type DoorVariant = 'sign-in' | 'sign-up';

/** sent: step 2 shows. opening: the session is active and the Studio is
 * loading. error: one plain sentence for the hint line. */
export type DoorResult = { kind: 'sent' } | { kind: 'opening' } | { kind: 'error'; message: string };

export interface DoorFlow {
  /** Asks for a key for this address (step 1 and Send again). Replies the same
   * way whether or not the address belongs to a member. */
  send(email: string): Promise<DoorResult>;
  /** Checks the six digits; 'opening' means the Studio is on its way. */
  verify(code: string): Promise<DoorResult>;
  /** Forgets the attempt in progress (Use another email). */
  reset(): void;
}

export const SENT: DoorResult = { kind: 'sent' };
export const OPENING: DoorResult = { kind: 'opening' };

export function refuse(message: string): DoorResult {
  return { kind: 'error', message };
}

export const MESSAGES = {
  noEmail: 'Enter your email.',
  badEmail: 'Check the address.',
  shortKey: 'Enter all six digits.',
  wrongKey: "That key didn't work. Check it, or send a new one.",
  tooMany: 'Too many tries. Wait a minute.',
  locked: 'Too many tries. Try again later.',
  offline: 'No connection. Try again.',
  slow: "The door didn't answer. Try again.",
  closed: `We couldn't send a key. Write to ${CONTACT_EMAIL}.`,
  stuck: `We couldn't open the door. Write to ${CONTACT_EMAIL}.`,
  other: 'Something went wrong. Try again.',
} as const;

/** The website's own check (mainpage/index.html) before anything is sent. */
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** What went wrong, in the door's terms. 'unknown' is an address that can't
 * sign in (no account, no email-code factor, not allowed): the door answers it
 * exactly like a member's. */
export type Trouble =
  | 'unknown'
  | 'exists'
  | 'wrong-key'
  | 'bad-email'
  | 'too-many'
  | 'locked'
  | 'signed-in'
  | 'closed'
  | 'offline'
  | 'other';

const TROUBLE_BY_CODE: Record<string, Trouble> = {
  form_identifier_not_found: 'unknown',
  strategy_for_user_invalid: 'unknown',
  not_allowed_access: 'unknown',
  invitation_account_not_exists: 'unknown',
  user_banned: 'unknown',
  user_deactivated: 'unknown',
  form_identifier_exists: 'exists',
  form_identifier_exists__email_address: 'exists',
  form_code_incorrect: 'wrong-key',
  verification_failed: 'wrong-key',
  verification_expired: 'wrong-key',
  verification_missing: 'wrong-key',
  form_param_format_invalid: 'bad-email',
  form_param_format_invalid__email_address: 'bad-email',
  form_param_type_invalid__email_address: 'bad-email',
  too_many_requests: 'too-many',
  rate_limit_exceeded: 'too-many',
  signup_rate_limit_exceeded: 'too-many',
  user_locked: 'locked',
  session_exists: 'signed-in',
  identifier_already_signed_in: 'signed-in',
  sign_up_mode_restricted: 'closed',
  sign_up_restricted_waitlist: 'closed',
  not_allowed_to_sign_up: 'closed',
  form_email_address_blocked: 'closed',
  captcha_invalid: 'closed',
  captcha_unavailable: 'closed',
  captcha_missing_token: 'closed',
  device_blocked: 'closed',
  action_blocked: 'closed',
  clerk_offline: 'offline',
  network_error: 'offline',
};

/** Error codes on a Clerk error: an API error carries them in errors[].code
 * (ClerkAPIResponseError), a runtime error in code (ClerkRuntimeError). */
function codesOf(error: unknown): string[] {
  if (!error || typeof error !== 'object') return [];
  const codes: string[] = [];
  const { errors, code } = error as { errors?: unknown; code?: unknown };
  if (Array.isArray(errors)) {
    for (const item of errors) {
      const itemCode = (item as { code?: unknown } | null)?.code;
      if (typeof itemCode === 'string') codes.push(itemCode);
    }
  }
  if (typeof code === 'string') codes.push(code);
  return codes;
}

export function classify(error: unknown): Trouble {
  if (!error) return 'other';
  if ((error as { status?: unknown }).status === 429) return 'too-many';
  for (const code of codesOf(error)) {
    const trouble = TROUBLE_BY_CODE[code];
    if (trouble) return trouble;
  }
  const text = `${(error as { name?: unknown }).name ?? ''} ${(error as { message?: unknown }).message ?? ''}`.toLowerCase();
  if (text.includes('network') || text.includes('failed to fetch') || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return 'offline';
  }
  return 'other';
}

/** The sentence for a trouble that the flow doesn't handle itself. While a
 * key is checked, anything that isn't about tries or the connection reads as
 * a wrong key, so no reply says more about the address than a member's would. */
export function messageFor(trouble: Trouble, phase: 'send' | 'verify'): string {
  switch (trouble) {
    case 'too-many':
      return MESSAGES.tooMany;
    case 'locked':
      return MESSAGES.locked;
    case 'offline':
      return MESSAGES.offline;
    default:
      break;
  }
  if (phase === 'verify') return MESSAGES.wrongKey;
  if (trouble === 'bad-email') return MESSAGES.badEmail;
  if (trouble === 'closed') return MESSAGES.closed;
  return MESSAGES.other;
}

/** In development, the console says what Clerk answered (the page never does). */
export function logTrouble(where: string, error: unknown): void {
  if (process.env.NODE_ENV !== 'production') console.warn(`[door] ${where}:`, codesOf(error).join(', ') || error);
}

/** A flow's reply; anything it throws becomes the plain fallback sentence. */
export async function settle(work: Promise<DoorResult>): Promise<DoorResult> {
  try {
    return await work;
  } catch (error) {
    logTrouble('unexpected', error);
    return refuse(MESSAGES.other);
  }
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Resolves with the work's result, but never sooner than ms after it began,
 * so a quick refusal and a slow success take about as long. */
export async function atLeast<T>(ms: number, work: Promise<T>): Promise<T> {
  const [result] = await Promise.all([work, wait(ms)]);
  return result;
}

/** The work's result, or 'timeout' when it takes longer than ms (Clerk's
 * script failing to load would otherwise leave the door waiting for good). */
export async function withTimeout<T>(ms: number, work: Promise<T>): Promise<T | 'timeout'> {
  let timer = 0;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = window.setTimeout(() => resolve('timeout'), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

/** Where the key leads: Clerk's ?redirect_url= when it is a page of this
 * origin (not the door itself), otherwise the fallback. */
export function safeNext(redirectUrl: string | null, fallback: string): string {
  if (!redirectUrl) return fallback;
  try {
    const url = new URL(redirectUrl, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    if (/^\/(sign-in|sign-up)(\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The website's refusal: a short sideways shake. */
export function shake(el: HTMLElement | null): void {
  if (!el?.animate || prefersReducedMotion()) return;
  el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-2px)', offset: 0.15 },
      { transform: 'translateX(2px)', offset: 0.35 },
      { transform: 'translateX(-2px)', offset: 0.55 },
      { transform: 'translateX(2px)', offset: 0.75 },
      { transform: 'translateX(-1px)', offset: 0.9 },
      { transform: 'translateX(0)' },
    ],
    { duration: 380, easing: 'linear' },
  );
}

/** A split-flap tile settling on its new character. */
export function flip(el: HTMLElement | null, duration: number): void {
  if (!el?.animate || prefersReducedMotion()) return;
  el.animate([{ transform: 'scaleY(.2)' }, { transform: 'scaleY(1)' }], { duration, easing: 'ease-out' });
}

let measure: CanvasRenderingContext2D | null = null;

/** The website's fitEmail: a long address shrinks to fit the field instead of
 * scrolling out of sight (never below 16px). */
export function fitToWidth(el: HTMLInputElement): void {
  el.style.fontSize = '';
  const text = el.value || el.placeholder;
  if (!text) return;
  measure ??= document.createElement('canvas').getContext('2d');
  if (!measure) return;
  const style = getComputedStyle(el);
  const base = parseFloat(style.fontSize);
  measure.font = `${style.fontWeight} ${base}px ${style.fontFamily}`;
  measure.letterSpacing = style.letterSpacing;
  const width = measure.measureText(text).width;
  const room = el.clientWidth - 4;
  if (width > room && room > 0) el.style.fontSize = `${Math.max(16, Math.floor((base * room) / width))}px`;
}

/** Focus a field with the caret after its text (an email input has no
 * setSelectionRange, so its value is put back instead). */
export function focusAtEnd(el: HTMLInputElement | null): void {
  if (!el) return;
  el.focus({ preventScroll: true });
  const value = el.value;
  if (!value) return;
  try {
    el.setSelectionRange(value.length, value.length);
  } catch {
    el.value = '';
    el.value = value;
  }
}
