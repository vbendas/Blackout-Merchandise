// Rules the pre-press pages, actions and the upload route share: pack ids,
// the corrected-PSD upload (size, name, file signature, error words), and the
// checks on what staff type (Pantone code, note to the artist, run settings).
// Pure and client-safe. Server actions and the route handler re-run every
// check: what a browser sends is never trusted.
import type { RerunSettings, ScreenMethod } from '@/lib/print/types';
import { ABSOLUTE_MAX_SCREENS } from '@/lib/print/defaults';
import { printMockOn } from '@/lib/print/mock-mode';

// ---------------------------------------------------------------------------
// Pack ids
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A pack id is a UUID. With PRINT_MOCK=1 the sample ids ('mock-pack-darks') pass too. */
export function isPackId(value: string): boolean {
  if (UUID.test(value)) return true;
  return printMockOn() && /^mock-[a-z0-9-]{1,40}$/.test(value);
}

// ---------------------------------------------------------------------------
// Corrected PSD upload
//
// A PSD is hundreds of MB and a function's request body stops at 4.5 MB, so the
// browser sends the file straight to print storage on a short-lived signed URL.
// The app's own routes only see small JSON: "give me a place to put it" and
// "it's there". What those routes check, and the keys they hand out, live here.
// ---------------------------------------------------------------------------

/** A full front with 8 plates at 600 ppi is a few hundred MB (Plan 6.1). */
export const DEFAULT_UPLOAD_MAX_BYTES = 1024 * 1024 * 1024;
/** The PSD format's own limit; the service holds the file in memory, so nothing goes past it. */
export const HARD_UPLOAD_MAX_BYTES = 2 * 1024 * 1024 * 1024 - 1;

/** The largest upload accepted: PREPRESS_UPLOAD_MAX_MB, or 1 GiB. */
export function uploadMaxBytes(env: Record<string, string | undefined>): number {
  const megabytes = Number(env.PREPRESS_UPLOAD_MAX_MB);
  if (!Number.isFinite(megabytes) || megabytes <= 0) return DEFAULT_UPLOAD_MAX_BYTES;
  return Math.min(Math.floor(megabytes * 1024 * 1024), HARD_UPLOAD_MAX_BYTES);
}

/** The two upload routes take small JSON only: a name and a size, or a key. */
export const MAX_JSON_BODY_BYTES = 4096;
/** How long the signed upload URL works: a few hundred MB on a slow line takes a while. */
export const UPLOAD_URL_LIFETIME_SECONDS = 30 * 60;
export const UPLOAD_CONTENT_TYPE = 'application/octet-stream';

const DEFAULT_UPLOAD_NAME = 'corrected.psd';
const MAX_NAME_LENGTH = 150;

/** The file name the browser sent, made safe to keep: no folders, no control
 * characters, .psd or .psb only. A missing name becomes 'corrected.psd'. Null
 * when it isn't a Photoshop name. */
export function parseUploadFilename(raw: string | null | undefined): string | null {
  if (raw == null || raw.trim() === '') return DEFAULT_UPLOAD_NAME;
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    // not percent-encoded after all: use it as it came
  }
  name = name.split(/[\\/]/).pop() ?? '';
  name = name.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').replace(/\s+/g, ' ').trim();
  const match = /^(.*?)(\.(?:psd|psb))$/i.exec(name);
  if (!match || !match[1]) return null;
  const stem = match[1].slice(0, MAX_NAME_LENGTH - match[2].length).trim();
  return stem ? `${stem}${match[2].toLowerCase()}` : null;
}

/** Photoshop files start with '8BPS', then version 1 (PSD) or 2 (PSB, for files past 2 GB). */
export function isPsdSignature(head: Uint8Array): boolean {
  if (head.length < 6) return false;
  const magic = head[0] === 0x38 && head[1] === 0x42 && head[2] === 0x50 && head[3] === 0x53;
  return magic && head[4] === 0 && (head[5] === 1 || head[5] === 2);
}

/** Print storage keys are folders of letters, digits, '.', '_' and '-'. A name
 * with spaces, brackets or accents ('Café front (2).psd') becomes 'Cafe-front-2.psd'. */
export function keySafeFilename(name: string): string {
  const dot = name.lastIndexOf('.');
  const extension = dot === -1 ? '.psd' : name.slice(dot).toLowerCase();
  const stem = (dot === -1 ? name : name.slice(0, dot))
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 100);
  return `${stem || 'corrected'}${extension}`;
}

/** Where corrected PSDs wait for the service: 'prepress-uploads/<pack>/<nonce>/<name>'.
 * Outside 'print/<design>/...', so the print-files route never serves one; the
 * pack in the key is how the "it's there" route knows an upload is this pack's. */
export const UPLOAD_KEY_PREFIX = 'prepress-uploads';

export function uploadKey(packId: string, nonce: string, filename: string): string {
  return [UPLOAD_KEY_PREFIX, packId.toLowerCase(), nonce, keySafeFilename(filename)].join('/');
}

/** True for a key that uploadKey() made for this pack: nothing else may be handed to the service. */
export function isUploadKeyFor(packId: string, key: string): boolean {
  const parts = key.split('/');
  return (
    parts.length === 4 &&
    parts[0] === UPLOAD_KEY_PREFIX &&
    parts[1] === packId.toLowerCase() &&
    /^[0-9a-f-]{16,64}$/i.test(parts[2]) &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.(?:psd|psb)$/i.test(parts[3])
  );
}

export const UPLOAD_ERRORS = {
  unauthorised: 'Sign in again to upload.',
  forbidden: 'You can look at this pack but not change it. Ask the owner for Work access to Pre-press.',
  not_found: 'This pack doesn’t exist.',
  bad_request: 'That request couldn’t be read. Reload the page and try again.',
  too_large: 'That file is bigger than the server accepts.',
  not_a_psd: 'That isn’t a Photoshop file. Upload the .psd you downloaded, after fixing it.',
  empty: 'The file is empty.',
  incomplete: 'The file didn’t arrive in storage. Try again.',
  storage: 'The file couldn’t be sent to storage. Try again; if it keeps failing, the upload link may have expired.',
  rejected: 'The pack couldn’t be rebuilt from that file.',
  failed: 'Something went wrong on our side. Try again.',
  network: 'The connection dropped. Try again.',
} as const;
export type UploadErrorCode = keyof typeof UPLOAD_ERRORS;

function isUploadErrorCode(value: unknown): value is UploadErrorCode {
  return typeof value === 'string' && Object.hasOwn(UPLOAD_ERRORS, value);
}

/** A failed upload response in words: the route's error code and any message of
 * its own, or, when something in front of the route answered (a gateway's 413
 * has no JSON), the status alone. */
export function describeUploadFailure(status: number, body: unknown): { code: UploadErrorCode; message: string } {
  const fields = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  let code: UploadErrorCode;
  if (isUploadErrorCode(fields.error)) code = fields.error;
  else if (status === 413) code = 'too_large';
  else if (status === 401) code = 'unauthorised';
  else if (status === 403) code = 'forbidden';
  else if (status === 404) code = 'not_found';
  else code = 'failed';
  const own = typeof fields.message === 'string' && fields.message.trim() ? fields.message.trim() : null;
  return { code, message: own ?? UPLOAD_ERRORS[code] };
}

/** Headers the browser sets itself and refuses to take from a script. */
const FORBIDDEN_REQUEST_HEADERS = new Set(['content-length', 'host', 'connection', 'transfer-encoding', 'expect', 'origin', 'cookie', 'user-agent']);

/** The headers a signed upload asks for, less the ones a browser won't let a page set. */
export function settableUploadHeaders(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof headers !== 'object' || headers === null) return out;
  for (const [name, value] of Object.entries(headers as Record<string, unknown>)) {
    if (typeof value !== 'string' || FORBIDDEN_REQUEST_HEADERS.has(name.toLowerCase())) continue;
    out[name] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// What staff type
// ---------------------------------------------------------------------------

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

/** A Pantone code as typed in MagnaMix ('PANTONE 186 C' or just '186 C'). The
 * service normalises the prefix and case; this only keeps junk out. */
export function checkPantoneCode(raw: unknown): Checked<string> {
  if (typeof raw !== 'string') return { ok: false, error: 'Enter a Pantone code.' };
  const value = raw.replace(/\s+/g, ' ').trim();
  if (value.length < 2) return { ok: false, error: 'Enter a Pantone code, such as 186 C.' };
  if (value.length > 40) return { ok: false, error: 'That code is too long.' };
  if (!/^[A-Za-z0-9 .+/-]+$/.test(value)) return { ok: false, error: 'Use letters, numbers and spaces only.' };
  return { ok: true, value };
}

export const SEND_BACK_NOTE_MAX = 1000;

export function checkSendBackNote(raw: unknown): Checked<string> {
  if (typeof raw !== 'string' || raw.trim() === '') return { ok: false, error: 'Add a note so the artist knows what to fix.' };
  const value = raw.trim();
  if (value.length > SEND_BACK_NOTE_MAX) return { ok: false, error: `Keep the note under ${SEND_BACK_NOTE_MAX} characters.` };
  // The artist reads this note, and clients never see Pantone codes (the service refuses one too).
  if (/\bpantone\b|\bpms\s?\d|\b\d{1,4}\s?[cu]\b/i.test(value)) {
    return { ok: false, error: 'Artists never see Pantone codes. Name the colour in plain words instead, such as deep purple.' };
  }
  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// Run again
// ---------------------------------------------------------------------------

export const SCREEN_METHODS: { id: ScreenMethod; label: string }[] = [
  { id: 'sim_process', label: 'Simulated process' },
  { id: 'spot', label: 'Spot' },
  { id: 'index', label: 'Index' },
];

export const RERUN_BOUNDS = {
  maxScreens: { min: 1, max: ABSOLUTE_MAX_SCREENS },
  lpi: { min: 20, max: 100 },
  angleDeg: { min: 0, max: 180 },
  underbaseChokeMm: { min: 0, max: 2 },
  trapMm: { min: 0, max: 2 },
} as const;

type NumericRerunKey = keyof typeof RERUN_BOUNDS;

const NUMERIC_LABELS: Record<NumericRerunKey, string> = {
  maxScreens: 'Screens',
  lpi: 'Lines per inch',
  angleDeg: 'Angle',
  underbaseChokeMm: 'Underbase choke',
  trapMm: 'Trap',
};

function checkNumber(key: NumericRerunKey, value: unknown): string | null {
  const { min, max } = RERUN_BOUNDS[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return `${NUMERIC_LABELS[key]} needs a number.`;
  if (value < min || value > max) return `${NUMERIC_LABELS[key]} goes from ${min} to ${max}.`;
  if (key === 'maxScreens' && !Number.isInteger(value)) return 'Screens is a whole number.';
  return null;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Re-run settings from a browser: only the known fields, each in range. Returns
 * a fresh RerunSettings, so nothing unchecked reaches the service. */
export function checkRerunSettings(raw: unknown): Checked<RerunSettings> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ok: false, error: 'Those settings can’t be used.' };
  const input = raw as Record<string, unknown>;
  const allowed = new Set(['method', 'maxScreens', 'lpi', 'angleDeg', 'underbaseChokeMm', 'trapMm', 'inkSubstitutions']);
  if (Object.keys(input).some((key) => !allowed.has(key))) return { ok: false, error: 'Those settings can’t be used.' };

  const settings: RerunSettings = {};
  if (input.method !== undefined) {
    if (!SCREEN_METHODS.some((method) => method.id === input.method)) return { ok: false, error: 'Pick a method from the list.' };
    settings.method = input.method as ScreenMethod;
  }
  for (const key of Object.keys(RERUN_BOUNDS) as NumericRerunKey[]) {
    if (input[key] === undefined) continue;
    const problem = checkNumber(key, input[key]);
    if (problem) return { ok: false, error: problem };
    settings[key] = input[key] as number;
  }
  if (input.inkSubstitutions !== undefined) {
    const list = input.inkSubstitutions;
    if (!Array.isArray(list) || list.length > ABSOLUTE_MAX_SCREENS) return { ok: false, error: 'Those ink changes can’t be used.' };
    const substitutions: NonNullable<RerunSettings['inkSubstitutions']> = [];
    for (const entry of list) {
      const item = typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : {};
      const index = item.plateIndex;
      const hex = item.hex;
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 1 || index > ABSOLUTE_MAX_SCREENS) return { ok: false, error: 'That ink isn’t in this pack.' };
      if (typeof hex !== 'string' || !HEX.test(hex)) return { ok: false, error: 'Enter the colour as six hex digits, such as #C363DA.' };
      substitutions.push({ plateIndex: index, hex: hex.toUpperCase() });
    }
    settings.inkSubstitutions = substitutions;
  }
  return { ok: true, value: settings };
}

/** What the "Run again" form holds: the method and the numbers as typed. */
export interface RerunFormValues {
  method: ScreenMethod;
  maxScreens: string;
  lpi: string;
  angleDeg: string;
  underbaseChokeMm: string;
  trapMm: string;
}

export type RerunDefaults = { method: ScreenMethod } & Record<NumericRerunKey, number>;

export function rerunFormFrom(defaults: RerunDefaults): RerunFormValues {
  return {
    method: defaults.method,
    maxScreens: String(defaults.maxScreens),
    lpi: String(defaults.lpi),
    angleDeg: String(defaults.angleDeg),
    underbaseChokeMm: String(defaults.underbaseChokeMm),
    trapMm: String(defaults.trapMm),
  };
}

/** The form to settings: only what differs from the pack's own values is sent,
 * so "Run again" with nothing changed is an empty change the page can disable. */
export function rerunSettingsFromForm(
  values: RerunFormValues,
  defaults: RerunDefaults,
): { ok: true; settings: RerunSettings; changed: boolean } | { ok: false; errors: Partial<Record<keyof RerunFormValues, string>> } {
  const errors: Partial<Record<keyof RerunFormValues, string>> = {};
  const settings: RerunSettings = {};
  if (values.method !== defaults.method) settings.method = values.method;
  for (const key of Object.keys(RERUN_BOUNDS) as NumericRerunKey[]) {
    const text = values[key].trim();
    const number = text === '' ? Number.NaN : Number(text);
    const problem = checkNumber(key, number);
    if (problem) errors[key] = problem;
    else if (number !== defaults[key]) settings[key] = number;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, settings, changed: Object.keys(settings).length > 0 };
}
