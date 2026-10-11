// No central locale list exists in the codebase (app/layout.tsx just reads
// users.locale, default 'en'), so the Studio settings define the set here.
export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
] as const;

export const LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code) as unknown as [string, ...string[]];
