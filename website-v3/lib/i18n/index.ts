'use client';

import { createContext, createElement, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Dictionary, Key, Lang } from './types';
import { LANGS } from './types';
import { en } from './en';
import { pt } from './pt';
import { es } from './es';
import { fr } from './fr';
import { nl } from './nl';
import { de } from './de';

export type { Dictionary, Key, Lang } from './types';
export { LANGS } from './types';
export { typeKey, fitKey, techniqueKey } from './catalog-keys';

const DICTIONARIES: Record<Lang, Dictionary> = { en, pt, es, fr, nl, de };
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
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always starts 'en' for SSR and first client paint — localStorage and
  // navigator.language only exist client-side, and guessing at them
  // during the initial render would produce a hydration mismatch.
  // detectLang() runs once after mount instead.
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable — the in-memory state still updates for
      // this session
    }
  }, []);

  // Plain createElement (not JSX) so this file can stay a .ts module.
  return createElement(LanguageContext.Provider, { value: { lang, setLang } }, children);
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
  const { lang } = useLang();
  const dict = DICTIONARIES[lang];

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
