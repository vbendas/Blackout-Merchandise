// Pure cart data model + localStorage persistence, no React. Kept
// framework-free so useCartState.ts (the hook) and any future non-hook
// caller (e.g. a checkout summary rendered server-side from a client
// payload) can share the same shape and storage key.

export interface CartLine {
  productId: string;
  colourCode: string;
  size: string;
  qty: number;
  // Denormalised at add-time so the cart page never re-fetches: the price
  // and image can go stale if the artist edits the product later, which is
  // acceptable for MVP — checkout re-validates against the live product on
  // the server before charging anything.
  name: string;
  colourName: string;
  imageUrl: string | null;
  priceCents: number;
}

export interface CartState {
  lines: CartLine[];
}

const EMPTY: CartState = { lines: [] };

function storageKey(slug: string): string {
  return `blackoutmerch:cart:${slug}`;
}

function lineKey(l: Pick<CartLine, 'productId' | 'colourCode' | 'size'>): string {
  return `${l.productId}::${l.colourCode}::${l.size}`;
}

export function loadCart(slug: string): CartState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as CartState;
    if (!Array.isArray(parsed.lines)) return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

export function saveCart(slug: string, state: CartState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(state));
  } catch {
    // storage unavailable (private mode, quota) — cart just won't persist
  }
}

export function addLine(state: CartState, line: CartLine): CartState {
  const key = lineKey(line);
  const existing = state.lines.find((l) => lineKey(l) === key);
  if (existing) {
    return {
      lines: state.lines.map((l) => (lineKey(l) === key ? { ...l, qty: l.qty + line.qty } : l)),
    };
  }
  return { lines: [...state.lines, line] };
}

export function updateLineQty(state: CartState, key: string, qty: number): CartState {
  if (qty <= 0) return removeLine(state, key);
  return { lines: state.lines.map((l) => (lineKey(l) === key ? { ...l, qty } : l)) };
}

export function removeLine(state: CartState, key: string): CartState {
  return { lines: state.lines.filter((l) => lineKey(l) !== key) };
}

export function subtotalCents(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
}

export function lineCount(state: CartState): number {
  return state.lines.reduce((sum, l) => sum + l.qty, 0);
}

export { lineKey };
