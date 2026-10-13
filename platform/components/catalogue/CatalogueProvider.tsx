'use client';

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { PickBlank, PickColour } from '@/lib/agent/pick';
import { addToPick as addColour, createPickStore, removeBlankFromPick, removeColourFromPick, type PickBlankBase } from './catalogue-pick';
import { catalogueHref, sessionIdFromPath } from './catalogue-url';

/** How to open the catalogue: a category, a search, straight onto one
 * blank, or to pick garments for a design. */
export interface CatalogueOpenOptions {
  /** a category as named by typeFor() in lib/catalog/catalog-filters.ts
   * ('Sweats & Hoodies'); matched without regard to case, and also from the
   * type names list_blanks takes ('T-Shirts', 'hoodies') */
  category?: string;
  /** search text, as typed in the catalogue's search field */
  q?: string;
  /** a blank's style code: opens on that blank's detail */
  code?: string;
  /** a design to pick garments for ("Put it on garments" on a design card):
   * the page says so, and everything picked goes to the chat with it */
  design?: { id: string; name: string };
}

export interface CatalogueContextValue {
  /** goes to the catalogue page (/studio/catalogue) with these options in its
   * address. From a chat (/studio/s/<id>) it adds from=<id>, so the page can
   * lead back to that conversation */
  open: (options?: CatalogueOpenOptions) => void;
  /** the artist's pick, in the order the blanks were added */
  pick: readonly PickBlank[];
  /** puts one colour of a blank in the pick; false when the pick is full (12
   * blanks) and the blank is not in it */
  addToPick: (blank: PickBlankBase, colour: PickColour) => boolean;
  /** takes a colour out of the pick (the blank goes with its last colour), or
   * the whole blank when no colour is given */
  removeFromPick: (code: string, colourCode?: string) => void;
  clearPick: () => void;
}

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

/** Studio-wide catalogue state: how to open the catalogue page from anywhere
 * (the sidebar, chat cards), and the artist's pick, which stays while they
 * move between categories, sessions and pages and survives a refresh (it is
 * mirrored to sessionStorage, see catalogue-pick.ts). */
export function CatalogueProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [store] = useState(createPickStore);
  const pick = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const open = useCallback(
    (options: CatalogueOpenOptions = {}) => {
      router.push(catalogueHref(options, sessionIdFromPath(window.location.pathname)));
    },
    [router],
  );

  const addToPick = useCallback(
    (blank: PickBlankBase, colour: PickColour) => {
      const before = store.getSnapshot();
      const { pick: next, full } = addColour(before, blank, colour);
      if (next !== before) store.set(next);
      return !full;
    },
    [store],
  );

  const removeFromPick = useCallback(
    (code: string, colourCode?: string) => {
      const before = store.getSnapshot();
      const next = colourCode === undefined ? removeBlankFromPick(before, code) : removeColourFromPick(before, code, colourCode);
      if (next !== before) store.set(next);
    },
    [store],
  );

  const clearPick = useCallback(() => {
    if (store.getSnapshot().length > 0) store.set([]);
  }, [store]);

  const value = useMemo<CatalogueContextValue>(
    () => ({ open, pick, addToPick, removeFromPick, clearPick }),
    [open, pick, addToPick, removeFromPick, clearPick],
  );

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

/** The catalogue, or null outside the Studio (cards also render elsewhere). */
export function useOptionalCatalogue(): CatalogueContextValue | null {
  return useContext(CatalogueContext);
}

export function useCatalogue(): CatalogueContextValue {
  const value = useContext(CatalogueContext);
  if (!value) throw new Error('useCatalogue must be used inside CatalogueProvider');
  return value;
}
