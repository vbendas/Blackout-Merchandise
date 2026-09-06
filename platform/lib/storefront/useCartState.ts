'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  addLine,
  lineCount,
  lineKey,
  loadCart,
  removeLine,
  saveCart,
  subtotalCents,
  updateLineQty,
  type CartLine,
  type CartState,
} from '@/lib/storefront/cart';

const EMPTY: CartState = { lines: [] };

// A tiny external store per slug, read via useSyncExternalStore rather than
// useState+useEffect: localStorage can't be touched during SSR, and
// useSyncExternalStore's getServerSnapshot/getSnapshot pair is the
// React-sanctioned way to hydrate an SSR-safe empty cart on the server and
// swap in the real one on the client without a synchronous setState inside
// an effect (which react-hooks/set-state-in-effect flags) or a hasMounted
// gate re-render.
function createStore(slug: string) {
  let state: CartState = EMPTY;
  let hydrated = false;
  const listeners = new Set<() => void>();

  function getSnapshot(): CartState {
    if (!hydrated && typeof window !== 'undefined') {
      state = loadCart(slug);
      hydrated = true;
    }
    return state;
  }

  function set(next: CartState) {
    state = next;
    hydrated = true;
    saveCart(slug, state);
    listeners.forEach((l) => l());
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot,
    getServerSnapshot: () => EMPTY,
    set,
  };
}

const stores = new Map<string, ReturnType<typeof createStore>>();

function storeFor(slug: string) {
  let store = stores.get(slug);
  if (!store) {
    store = createStore(slug);
    stores.set(slug, store);
  }
  return store;
}

/** Underlying cart hook for one store's localStorage-backed cart. Wrapped
 * by CartProvider so every consumer shares one instance instead of each
 * reading localStorage independently and drifting out of sync. */
export function useCartState(slug: string) {
  const store = storeFor(slug);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const add = useCallback((line: CartLine) => store.set(addLine(store.getSnapshot(), line)), [store]);
  const setQty = useCallback((key: string, qty: number) => store.set(updateLineQty(store.getSnapshot(), key, qty)), [store]);
  const remove = useCallback((key: string) => store.set(removeLine(store.getSnapshot(), key)), [store]);
  const clear = useCallback(() => store.set({ lines: [] }), [store]);
  /** drop lines for products the cart page found are no longer live/purchasable */
  const removeMany = useCallback(
    (keys: Set<string>) => store.set({ lines: store.getSnapshot().lines.filter((l) => !keys.has(lineKey(l))) }),
    [store],
  );

  return {
    lines: state.lines,
    subtotalCents: subtotalCents(state),
    count: lineCount(state),
    add,
    setQty,
    remove,
    removeMany,
    clear,
  };
}
