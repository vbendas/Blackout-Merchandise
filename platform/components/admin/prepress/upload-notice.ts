// The "Corrected PSD received" notice. An upload makes a new pack, so the page
// that did the upload navigates to the new pack and the notice has to travel
// with it. It goes in sessionStorage, not the address: a notice built from a
// link's query would let anyone craft a link that puts words on an admin page.
// Client only; every storage access is guarded, and the page works without it.
import { useMemo, useSyncExternalStore } from 'react';

const KEY = 'mf-prepress-upload-notice';

export interface UploadNotice {
  /** the pack the notice belongs to: the new one, the corrected pack */
  packId: string;
  filename: string;
  needsReapproval: boolean;
  /** plain-language list of what differs from the automatic pack */
  changes: string[];
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function read(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function saveUploadNotice(notice: UploadNotice): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(notice));
  } catch {
    // storage is blocked: the pack still opens, only the notice is lost
  }
  emit();
}

export function clearUploadNotice(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
  emit();
}

/** Reads a stored notice, or null when it is missing, malformed or another pack's. */
export function parseUploadNotice(raw: string | null, packId: string): UploadNotice | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<UploadNotice> | null;
    if (!value || value.packId !== packId || typeof value.filename !== 'string') return null;
    return {
      packId: value.packId,
      filename: value.filename,
      needsReapproval: value.needsReapproval === true,
      changes: Array.isArray(value.changes) ? value.changes.filter((change): change is string => typeof change === 'string') : [],
    };
  } catch {
    return null;
  }
}

/** The notice for this pack, if one was just stored. Nothing on the server render. */
export function useUploadNotice(packId: string): UploadNotice | null {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  return useMemo(() => parseUploadNotice(raw, packId), [raw, packId]);
}
