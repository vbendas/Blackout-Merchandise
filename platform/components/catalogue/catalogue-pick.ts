import { MAX_PICK, type ChatPick, type PickBlank, type PickColour } from '@/lib/agent/pick';

// The artist's pick: blanks gathered across the catalogue, each in one or
// more colours, to send to the chat together (lib/agent/pick.ts is the
// contract). The helpers are pure; the store keeps the pick for the Studio
// (CatalogueProvider) and mirrors it to sessionStorage so a refresh keeps it.

export const PICK_STORAGE_KEY = 'mf-catalogue-pick';

export type Pick = readonly PickBlank[];

/** What a blank brings to the pick besides its colours. */
export type PickBlankBase = Omit<PickBlank, 'colours'>;

/** Adds one colour of a blank: the blank joins the pick if it is not in it
 * (at most MAX_PICK blanks), and a colour already there is added once.
 * `full` is true when the pick had no room for a new blank. */
export function addToPick(pick: Pick, blank: PickBlankBase, colour: PickColour): { pick: Pick; full: boolean } {
  const at = pick.findIndex((entry) => entry.code === blank.code);
  if (at === -1) {
    if (pick.length >= MAX_PICK) return { pick, full: true };
    return { pick: [...pick, { ...blank, colours: [colour] }], full: false };
  }
  if (pick[at].colours.some((c) => c.code === colour.code)) return { pick, full: false };
  return { pick: pick.map((entry, i) => (i === at ? { ...entry, colours: [...entry.colours, colour] } : entry)), full: false };
}

/** Takes one colour out of a blank; the blank leaves with its last colour.
 * The same pick comes back when there was nothing to take out. */
export function removeColourFromPick(pick: Pick, code: string, colourCode: string): Pick {
  let changed = false;
  const next = pick.flatMap((entry) => {
    if (entry.code !== code) return [entry];
    const colours = entry.colours.filter((c) => c.code !== colourCode);
    if (colours.length === entry.colours.length) return [entry];
    changed = true;
    return colours.length > 0 ? [{ ...entry, colours }] : [];
  });
  return changed ? next : pick;
}

/** The same pick comes back when the blank was not in it. */
export function removeBlankFromPick(pick: Pick, code: string): Pick {
  const next = pick.filter((entry) => entry.code !== code);
  return next.length === pick.length ? pick : next;
}

/** '3 blanks · 4 colours' */
export function pickSummary(pick: Pick): string {
  const blanks = pick.length;
  const colours = pick.reduce((sum, entry) => sum + entry.colours.length, 0);
  return `${blanks} ${blanks === 1 ? 'blank' : 'blanks'} · ${colours} ${colours === 1 ? 'colour' : 'colours'}`;
}

/** The message payload: one design on every blank, or one run quote. */
export function toChatPick(pick: Pick, intent: ChatPick['intent'], design?: { id: string; name: string }): ChatPick {
  return { intent, ...(design ? { design: { id: design.id, name: design.name } } : {}), blanks: pick.map((entry) => ({ ...entry, colours: [...entry.colours] })) };
}

// ---------------------------------------------------------------------------
// Storage

const str = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200;

/** What sessionStorage held, kept only if it is shaped like a pick: anything
 * else (an old format, a hand-edited value) is dropped rather than trusted. */
export function sanitisePick(value: unknown): PickBlank[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const clean: PickBlank[] = [];
  for (const entry of value) {
    if (clean.length >= MAX_PICK || typeof entry !== 'object' || entry === null) continue;
    const { code, name, image, colours } = entry as Record<string, unknown>;
    if (!str(code) || !str(name) || !str(image) || !image.startsWith('/') || !Array.isArray(colours) || seen.has(code)) continue;
    const kept: PickColour[] = [];
    for (const colour of colours) {
      if (typeof colour !== 'object' || colour === null) continue;
      const c = colour as Record<string, unknown>;
      if (str(c.code) && str(c.name) && typeof c.hex === 'string' && /^#[0-9a-f]{3,8}$/i.test(c.hex) && !kept.some((k) => k.code === c.code)) {
        kept.push({ code: c.code, name: c.name, hex: c.hex });
      }
    }
    if (kept.length === 0) continue;
    seen.add(code);
    clean.push({ code, name, image, colours: kept });
  }
  return clean;
}

export interface PickStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => Pick;
  /** the server renders an empty pick: it lives in the browser */
  getServerSnapshot: () => Pick;
  set: (next: Pick) => void;
}

const EMPTY: Pick = [];

/** One pick for the Studio. It is read from sessionStorage the first time the
 * browser asks for it and written back on every change; a storage that is
 * missing or full (private windows) just means the pick lasts until a refresh. */
export function createPickStore(): PickStore {
  let current: Pick = EMPTY;
  let loaded = false;
  const listeners = new Set<() => void>();

  function load() {
    loaded = true;
    try {
      const raw = window.sessionStorage.getItem(PICK_STORAGE_KEY);
      const stored = raw ? sanitisePick(JSON.parse(raw)) : [];
      if (stored.length > 0) current = stored;
    } catch {
      // unreadable or blocked: start empty
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      if (!loaded && typeof window !== 'undefined') load();
      return current;
    },
    getServerSnapshot: () => EMPTY,
    set(next) {
      loaded = true;
      current = next;
      try {
        if (next.length > 0) window.sessionStorage.setItem(PICK_STORAGE_KEY, JSON.stringify(next));
        else window.sessionStorage.removeItem(PICK_STORAGE_KEY);
      } catch {
        // storage blocked or full: the pick stays in memory
      }
      for (const listener of listeners) listener();
    },
  };
}
