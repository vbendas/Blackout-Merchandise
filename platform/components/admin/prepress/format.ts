// Plain-words formatting for the pre-press pages. Pure, so the tests cover it
// and server and client components can both import it.
import type { PackTab, PrepressTab } from '@/lib/services/prepress';
import type { PrintTechnique } from '@/lib/print/types';
import { EXTRA_SCREEN_CENTS_PER_PIECE, STANDARD_MAX_SCREENS } from '@/lib/print/defaults';

/** The shop is in Barcelona: times on the pages are theirs, whatever the server's zone is. */
export const SHOP_TIME_ZONE = 'Europe/Madrid';

/** How long a pack has waited: '40 min', '2 h', '1 d'. */
export function formatWaiting(sinceIso: string, now: Date = new Date()): string {
  const since = Date.parse(sinceIso);
  if (Number.isNaN(since)) return '–';
  const minutes = Math.max(0, Math.floor((now.getTime() - since) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

const timeOfDay = new Intl.DateTimeFormat('en-GB', { timeZone: SHOP_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayOfYear = new Intl.DateTimeFormat('en-GB', { timeZone: SHOP_TIME_ZONE, day: 'numeric', month: 'short' });
// en-CA gives yyyy-mm-dd, which compares as a string.
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: SHOP_TIME_ZONE });

/** A history entry's time: '13:40' today, '13 Oct, 13:40' on any other day. */
export function formatHistoryTime(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const time = timeOfDay.format(at);
  return dayKey.format(at) === dayKey.format(now) ? time : `${dayOfYear.format(at)}, ${time}`;
}

/** A date and time for a settings page: '15 Oct, 11:20'. */
export function formatStamp(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  return `${dayOfYear.format(at)}, ${timeOfDay.format(at)}`;
}

export const PREPRESS_TABS: { id: PrepressTab; label: string }[] = [
  { id: 'waiting', label: 'Waiting' },
  { id: 'being_fixed', label: 'Being fixed' },
  { id: 'approved', label: 'Approved' },
  { id: 'sent_back', label: 'Sent back' },
];

export function parseTab(value: string | string[] | undefined): PrepressTab {
  const first = Array.isArray(value) ? value[0] : value;
  return PREPRESS_TABS.find((tab) => tab.id === first)?.id ?? 'waiting';
}

/** The search box's text, as the page and the service see it: one line, trimmed, 80 characters at most. */
export function cleanSearch(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  return (first ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

/** The queue's address for a tab and a search; the default view has no query. */
export function queueHref(tab: PrepressTab, search: string): string {
  const params = new URLSearchParams();
  if (tab !== 'waiting') params.set('tab', tab);
  if (search) params.set('q', search);
  const query = params.toString();
  return query ? `/admin/prepress?${query}` : '/admin/prepress';
}

/** 'Black', 'Black and French Navy', 'Black, French Navy and White'. */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The line over the films: which garment colours print from them. */
export function filmsSharedNote(garmentNames: string[], films: number): string {
  if (garmentNames.length === 0 || films < 1) return '';
  const verb = garmentNames.length === 1 ? 'prints' : 'print';
  return `${joinNames(garmentNames)} ${verb} from these ${films} screens.`;
}

/** What each screen above the standard 8 costs on a run, in whole cents per piece. */
export function extraScreenCents(screens: number): number {
  return Math.max(0, Math.round(screens) - STANDARD_MAX_SCREENS) * EXTRA_SCREEN_CENTS_PER_PIECE;
}

export function formatEuros(cents: number): string {
  const euros = cents / 100;
  return `€${Number.isInteger(euros) ? euros : euros.toFixed(2)}`;
}

/** The sentence under "Run again": the standing rule, plus the price when the count goes past 8. */
export function surchargeNote(screens: number): string {
  const rule = `On a run, each screen above ${STANDARD_MAX_SCREENS} adds ${formatEuros(EXTRA_SCREEN_CENTS_PER_PIECE)} per piece. The artist is asked again only if the proof changes.`;
  const extra = extraScreenCents(screens);
  if (extra === 0) return rule;
  return `${screens} screens add ${formatEuros(extra)} per piece on a run. ${rule}`;
}

/** '#abc' or '#AABBCC' (the leading # optional) to '#AABBCC', or null. */
export function parseHex(value: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1];
  return `#${digits.toUpperCase()}`;
}

/** '1.2 GB', '340 MB', '12 kB': for upload messages. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

/** Where "back" goes from a pack: the queue tab the pack sits in. */
export function backHref(auditStatus: string): string {
  const tab = PREPRESS_TABS.find((entry) => entry.id === auditStatus)?.id ?? 'waiting';
  return queueHref(tab, '');
}

/** A pack the view lists as a tab of its own design is current. One that is built
 * but absent from its own tabs was replaced by a newer pack (a run again or a
 * corrected PSD finished). While a pack is still building or has failed it is
 * absent too, which is why only a built pack can be "replaced". */
export function isReplaced(pack: { buildStatus: string; tabs: PackTab[] }): boolean {
  return pack.buildStatus === 'ready' && pack.tabs.length > 0 && !pack.tabs.some((tab) => tab.current);
}

/** The tab that took over from a replaced pack: the one of the same technique, or
 * of the same screen set when the design has several ('Screen · Darks · 6' is
 * the set 'darks'). Null when that can't be told, and the page offers the queue. */
export function replacementTab(tabs: PackTab[], technique: PrintTechnique, screenSetKey: string | null): PackTab | null {
  const same = tabs.filter((tab) => tab.technique === technique);
  if (same.length === 1) return same[0];
  if (technique === 'screen' && screenSetKey) {
    const key = screenSetKey.toLowerCase();
    const named = same.filter((tab) => tab.label.split(' · ')[1]?.trim().toLowerCase() === key);
    if (named.length === 1) return named[0];
  }
  return null;
}
