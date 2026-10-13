'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

/** How to open the catalogue: a category, a search, or straight onto one blank. */
export interface CatalogueOpenOptions {
  /** a category as named by typeFor() in lib/catalog/catalog-filters.ts
   * ('Sweats & Hoodies'); matched without regard to case */
  category?: string;
  /** search text, as typed in the catalogue's search field */
  q?: string;
  /** a blank's style code: opens on that blank's detail */
  code?: string;
}

/** Sends a message to the conversation the artist is in. */
export type CatalogueSend = (text: string) => void;

export interface CatalogueContextValue {
  /** whether the catalogue panel is showing */
  isOpen: boolean;
  /** the options of the latest open() call */
  options: CatalogueOpenOptions;
  open: (options?: CatalogueOpenOptions) => void;
  close: () => void;
  /** ChatShell registers its send while mounted ("Use this blank" sends
   * there); null when it unmounts */
  registerSend: (send: CatalogueSend | null) => void;
  /** the registered send, if a chat is mounted */
  sendToChat: (text: string) => boolean;
}

const CatalogueContext = createContext<CatalogueContextValue | null>(null);

/** Studio-wide catalogue state. The panel itself renders inside (children
 * plus the panel), so the sidebar, the chat cards and the home can all open
 * it. */
export function CatalogueProvider({ children, panel }: { children: ReactNode; panel?: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CatalogueOpenOptions>({});
  const sendRef = useRef<CatalogueSend | null>(null);

  const open = useCallback((next: CatalogueOpenOptions = {}) => {
    setOptions(next);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const registerSend = useCallback((send: CatalogueSend | null) => {
    sendRef.current = send;
  }, []);
  const sendToChat = useCallback((text: string) => {
    if (!sendRef.current) return false;
    sendRef.current(text);
    return true;
  }, []);

  const value = useMemo<CatalogueContextValue>(
    () => ({ isOpen, options, open, close, registerSend, sendToChat }),
    [isOpen, options, open, close, registerSend, sendToChat],
  );

  return (
    <CatalogueContext.Provider value={value}>
      {children}
      {panel}
    </CatalogueContext.Provider>
  );
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
