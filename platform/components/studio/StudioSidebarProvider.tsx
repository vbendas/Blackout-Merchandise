'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { StudioCollection, StudioSession, StudioSidebarData } from '@/lib/studio/types';
import type { StudioHomeData } from '@/lib/services/studio-home';

export interface StudioAccount {
  displayName: string;
  imageUrl: string | null;
  shopName: string | null;
  /** the shop's address segment, for its public link; null without a shop */
  shopSlug: string | null;
  role: 'artist' | 'admin';
  /** false under the dev auth bypass: no Clerk component or hook may render */
  showClerk: boolean;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

interface StudioSidebarContextValue {
  account: StudioAccount;
  data: StudioSidebarData | null;
  loading: boolean;
  loadError: boolean;
  refresh: () => Promise<void>;
  /** the shop, this month's sales, what needs the artist and the live run;
   * null until the first load (and if it never arrives) */
  home: StudioHomeData | null;
  refreshHome: () => Promise<void>;
  /** opens a fresh session on the home screen and sends `prompt` there once
   * it has loaded (Settings and the Shop block use this; the home reads
   * /studio?prompt=, see PromptParam) */
  askStudio: (prompt: string) => void;
  /** the prompt an in-app button asked the fresh session to send; read once */
  takePendingPrompt: () => string | null;
  renameSession: (id: string, title: string) => Promise<Result<StudioSession>>;
  moveSession: (id: string, collectionId: string | null) => Promise<Result<StudioSession>>;
  createCollection: (name: string) => Promise<Result<StudioCollection>>;
  renameCollection: (id: string, name: string) => Promise<Result<StudioCollection>>;
  deleteCollection: (id: string) => Promise<Result<true>>;
  /** session title for the header, by conversation id */
  titleFor: (conversationId: string) => string | null;
  /** mobile drawer */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** bumped by "New session" so the home screen remounts even when the URL
   * is already /studio (a fresh session keeps that route until its first
   * message replaces the URL in place) */
  homeNonce: number;
  newSession: () => void;
}

const StudioSidebarContext = createContext<StudioSidebarContextValue | null>(null);

const FALLBACK_ERROR = 'That did not go through. Please try again.';

/** API errors are either a sentence for people or a short code; only the
 * sentence is shown. */
function readableError(error: unknown): string {
  return typeof error === 'string' && error.includes(' ') ? error : FALLBACK_ERROR;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    });
    const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!response.ok || !body) return { ok: false, error: readableError(body?.error) };
    return { ok: true, value: body };
  } catch {
    return { ok: false, error: 'No connection. Please try again.' };
  }
}

export function StudioSidebarProvider({ account, children }: { account: StudioAccount; children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<StudioSidebarData | null>(null);
  const [home, setHome] = useState<StudioHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [homeNonce, setHomeNonce] = useState(0);
  // Latest data, for rolling back optimistic edits without stale closures.
  const dataRef = useRef<StudioSidebarData | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const refresh = useCallback(async () => {
    const result = await requestJson<StudioSidebarData>('/api/studio/sessions', { cache: 'no-store' });
    if (result.ok) {
      setData(result.value);
      setLoadError(false);
    } else {
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial load of the sidebar lists; the setState calls happen after the
    // fetch resolves, not synchronously in the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // The shop's state is a nicety: when it does not load the home screen and
  // the Shop block simply show less, and the last good copy stays on screen.
  const refreshHome = useCallback(async () => {
    const result = await requestJson<StudioHomeData>('/api/studio/home', { cache: 'no-store' });
    if (result.ok) setHome(result.value);
  }, []);

  // Loaded on mount and again on every New session, so the home screen is
  // current after something changed in the session before it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshHome();
  }, [refreshHome, homeNonce]);

  /** Applies `apply` now, runs `request`, then reconciles with the server's
   * row or restores the snapshot on failure. */
  const optimistic = useCallback(
    async <T,>(
      apply: (current: StudioSidebarData) => StudioSidebarData,
      request: () => Promise<Result<T>>,
      reconcile: (current: StudioSidebarData, value: T) => StudioSidebarData,
    ): Promise<Result<T>> => {
      const snapshot = dataRef.current;
      if (snapshot) setData(apply(snapshot));
      const result = await request();
      if (result.ok) {
        setData((current) => (current ? reconcile(current, result.value) : current));
      } else if (snapshot) {
        setData(snapshot);
      }
      return result;
    },
    [],
  );

  const patchSession = useCallback(
    (id: string, patch: { title?: string; collectionId?: string | null }) =>
      optimistic<StudioSession>(
        (current) => ({
          ...current,
          sessions: current.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }),
        () =>
          requestJson<StudioSession>(`/api/studio/sessions/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(patch),
          }),
        (current, value) => ({
          ...current,
          sessions: current.sessions.map((s) => (s.id === value.id ? value : s)),
        }),
      ),
    [optimistic],
  );

  const renameSession = useCallback(
    (id: string, title: string) => patchSession(id, { title: title.trim() }),
    [patchSession],
  );
  const moveSession = useCallback(
    (id: string, collectionId: string | null) => patchSession(id, { collectionId }),
    [patchSession],
  );

  const createCollection = useCallback(
    async (name: string) => {
      const result = await requestJson<StudioCollection>('/api/studio/collections', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      if (result.ok) {
        setData((current) =>
          current ? { ...current, collections: [...current.collections, result.value] } : current,
        );
      }
      return result;
    },
    [],
  );

  const renameCollection = useCallback(
    (id: string, name: string) =>
      optimistic<StudioCollection>(
        (current) => ({
          ...current,
          collections: current.collections.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)),
        }),
        () =>
          requestJson<StudioCollection>(`/api/studio/collections/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ name: name.trim() }),
          }),
        (current, value) => ({
          ...current,
          collections: current.collections.map((c) => (c.id === value.id ? value : c)),
        }),
      ),
    [optimistic],
  );

  // Not optimistic: removing the row first would unmount it, losing the
  // inline error when the server refuses (a collection that still has
  // products).
  const deleteCollection = useCallback(async (id: string): Promise<Result<true>> => {
    const result = await requestJson<{ ok: true }>(`/api/studio/collections/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!result.ok) return result;
    setData((current) =>
      current
        ? {
            collections: current.collections.filter((c) => c.id !== id),
            sessions: current.sessions.map((s) => (s.collectionId === id ? { ...s, collectionId: null } : s)),
          }
        : current,
    );
    return { ok: true, value: true };
  }, []);

  const titleFor = useCallback(
    (conversationId: string) => data?.sessions.find((s) => s.id === conversationId)?.title ?? null,
    [data],
  );

  const newSession = useCallback(() => {
    setHomeNonce((n) => n + 1);
    setDrawerOpen(false);
  }, []);

  // Starts over on the home screen (the nonce remounts it even when the URL
  // is already /studio) with the message in the URL for PromptParam to send.
  // In-app buttons (the artist's own click) hand their prompt over in memory,
  // so the fresh session sends it. A ?prompt= in the URL can come from any
  // link, so it only fills the composer (components/studio/PromptParam.tsx).
  const pendingPrompt = useRef<string | null>(null);
  const askStudio = useCallback(
    (prompt: string) => {
      pendingPrompt.current = prompt;
      setHomeNonce((n) => n + 1);
      setDrawerOpen(false);
      router.push('/studio');
    },
    [router],
  );
  const takePendingPrompt = useCallback(() => {
    const prompt = pendingPrompt.current;
    pendingPrompt.current = null;
    return prompt;
  }, []);

  // The provider only re-renders on its own state changes (children come
  // from the server layout), so a fresh object here is not wasteful.
  const value: StudioSidebarContextValue = {
    account,
    data,
    loading,
    loadError,
    refresh,
    home,
    refreshHome,
    askStudio,
    takePendingPrompt,
    renameSession,
    moveSession,
    createCollection,
    renameCollection,
    deleteCollection,
    titleFor,
    drawerOpen,
    setDrawerOpen,
    homeNonce,
    newSession,
  };

  return <StudioSidebarContext.Provider value={value}>{children}</StudioSidebarContext.Provider>;
}

export function useStudioSidebar(): StudioSidebarContextValue {
  const value = useContext(StudioSidebarContext);
  if (!value) throw new Error('useStudioSidebar must be used inside StudioSidebarProvider');
  return value;
}

/** Same as useStudioSidebar, but null outside the Studio shell (ChatShell can
 * still render on its own). */
export function useOptionalStudioSidebar(): StudioSidebarContextValue | null {
  return useContext(StudioSidebarContext);
}
