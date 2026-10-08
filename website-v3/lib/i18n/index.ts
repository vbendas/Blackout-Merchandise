'use client';

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Dictionary, Key, Lang } from './types';
import { LANGS } from './types';
import { en } from './en';

export type { Dictionary, Key, Lang } from './types';
export { LANGS } from './types';
export { typeKey, fitKey, techniqueKey } from './catalog-keys';

// English ships in the initial bundle (SSR + first paint are always
// English). Every other dictionary is its own lazily-loaded chunk,
// fetched the first time that language is selected or detected.
const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<Dictionary>> = {
  pt: () => import('./pt').then((m) => m.pt),
  es: () => import('./es').then((m) => m.es),
  fr: () => import('./fr').then((m) => m.fr),
  nl: () => import('./nl').then((m) => m.nl),
  de: () => import('./de').then((m) => m.de),
};

// Latest requested language; a slow chunk for an earlier pick must not
// overwrite a newer choice.
let latestRequest: Lang = 'en';

const loaded: Partial<Record<Lang, Dictionary>> = { en };

async function loadDictionary(lang: Lang): Promise<Dictionary> {
  const cached = loaded[lang];
  if (cached) return cached;
  const dict = await LOADERS[lang as Exclude<Lang, 'en'>]();
  loaded[lang] = dict;
  return dict;
}
const SUPPORTED_LANGS = LANGS.map((l) => l.code);
const STORAGE_KEY = 'mf-lang';

function isLang(value: string | null | undefined): value is Lang {
  return value != null && (SUPPORTED_LANGS as string[]).includes(value);
}

// localStorage first (an explicit prior choice), then the browser's
// language list, else English. Only ever called client-side.
function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    // storage unavailable (private mode, disabled cookies) — fall
    // through to navigator detection
  }
  if (typeof navigator !== 'undefined') {
    const prefix = navigator.language?.slice(0, 2).toLowerCase();
    if (isLang(prefix)) return prefix;
  }
  return 'en';
}

interface LanguageContextValue {
  lang: Lang;
  dict: Dictionary;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always starts 'en' for SSR and first client paint — localStorage and
  // navigator.language only exist client-side, and guessing at them
  // during the initial render would produce a hydration mismatch.
  // detectLang() runs once after mount instead. `lang` and `dict` are
  // committed together, only once the dictionary chunk has arrived, so
  // the UI never renders a language without its strings.
  const [state, setState] = useState<{ lang: Lang; dict: Dictionary }>({ lang: 'en', dict: en });
  const apply = useCallback((next: Lang) => {
    latestRequest = next;
    loadDictionary(next)
      .then((dict) => {
        if (latestRequest === next) setState({ lang: next, dict });
      })
      .catch(() => {
        // chunk failed to load (offline) — stay on the current language
      });
  }, []);

  useEffect(() => {
    apply(detectLang());
  }, [apply]);

  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  const setLang = useCallback(
    (next: Lang) => {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // storage unavailable — the in-memory state still updates for
        // this session
      }
      apply(next);
    },
    [apply]
  );

  const value = useMemo(() => ({ lang: state.lang, dict: state.dict, setLang }), [state, setLang]);

  // Plain createElement (not JSX) so this file can stay a .ts module.
  return createElement(LanguageContext.Provider, { value }, children);
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider');
  return ctx;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

export interface TFunction {
  (key: Key, vars?: Record<string, string | number>): string;
  /** Picks `${base}.one` or `${base}.other` by `n`, interpolating {n} automatically. */
  tPlural: (base: string, n: number) => string;
}

// Translated strings for the active language, with {var} interpolation.
// Falls back to English for any key missing from the active dictionary
// (shouldn't happen — Dictionary's type enforces full coverage — but
// keeps a bad translation file from ever rendering blank).
export function useT(): TFunction {
  const { dict } = useLang();

  const t = ((key: Key, vars?: Record<string, string | number>): string => {
    const template = dict[key] ?? en[key];
    return interpolate(template, vars);
  }) as TFunction;

  t.tPlural = (base: string, n: number): string => {
    const suffix = n === 1 ? 'one' : 'other';
    const key = `${base}.${suffix}` as Key;
    return t(key, { n });
  };

  return t;
}
