// Presentation helpers for the fan shop: money, size ranges and the spec line
// under a piece. Pure and client-safe (no database, no catalog tables), so
// server pages and client components share one set of rules.

export function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/** A dash when the piece has no price yet. */
export function formatPrice(cents: number | null): string {
  return cents == null ? '—' : formatCents(cents);
}

/** '1 piece', '4 pieces'. */
export function piecesLabel(count: number): string {
  return `${count} ${count === 1 ? 'piece' : 'pieces'}`;
}

// Garment sizes in the order people read them. 2XL and XXL are the same size
// written two ways, so they share a rank.
const SIZE_RANK: Record<string, number> = {
  XXS: 0,
  XS: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
  XXL: 6,
  '2XL': 6,
  XXXL: 7,
  '3XL': 7,
  '4XL': 8,
  '5XL': 9,
};

function sizeRank(size: string): number {
  const key = size.trim().toUpperCase();
  return Object.hasOwn(SIZE_RANK, key) ? SIZE_RANK[key] : -1;
}

/** Known sizes small to large, then anything else in natural order. The
 * database returns a product's sizes in no particular order. */
export function sortSizes(sizes: readonly string[]): string[] {
  return [...sizes].sort((a, b) => {
    const rankA = sizeRank(a);
    const rankB = sizeRank(b);
    if (rankA !== -1 && rankB !== -1) return rankA - rankB;
    if (rankA !== -1) return -1;
    if (rankB !== -1) return 1;
    return a.localeCompare(b, 'en', { numeric: true });
  });
}

/** 'S–2XL' for a run of consecutive sizes, the sizes themselves when there
 * are a few with gaps, a count otherwise. */
export function sizeRange(sizes: readonly string[]): string | null {
  const sorted = sortSizes(sizes);
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];

  const ranks = sorted.map(sizeRank);
  const consecutive = ranks.every((rank, i) => rank !== -1 && (i === 0 || rank === ranks[i - 1] + 1));
  if (consecutive) return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  return sorted.length <= 4 ? sorted.join(', ') : `${sorted.length} sizes`;
}

/** The small line under a piece in the grid: 'Black · 100% organic cotton ·
 * 350 g · S–XXL'. `facts` is the blank's facts line (fabric, weight, fit);
 * the fit stays on the product page to keep this line short. */
export function buildSpecLine(input: { colours: readonly string[]; facts: string | null; sizes: readonly string[] }): string | null {
  const parts: string[] = [];

  if (input.colours.length === 1) parts.push(input.colours[0]);
  else if (input.colours.length > 1) parts.push(`${input.colours.length} colours`);

  if (input.facts) parts.push(...input.facts.split(' · ').slice(0, 2));

  const range = sizeRange(input.sizes);
  if (range) parts.push(range);

  return parts.length > 0 ? parts.join(' · ') : null;
}

/** An artist-written link as a safe href: web addresses only (a bare
 * 'instagram.com/band' gets https://), anything else, handles and scripts
 * included, is dropped. */
export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.startsWith('@')) return null;

  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
    const web = url.protocol === 'https:' || url.protocol === 'http:';
    return web && url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}
