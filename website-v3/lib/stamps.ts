import type { Lang } from './i18n/types';

// Mornsey stamp words (plan 4.5). Fixed strings, never free text: <Stamp>
// takes a StampWord key. Every string here is upper case and was checked
// against the Mornsey-PUA.ttf cmap (WP5, fontkit): Latin-1 accents such as
// E-acute and U-umlaut exist; Latin Extended-A and inverted punctuation do
// not, so keep new words inside Basic Latin + Latin-1. Locales without an
// entry fall back to the English word. scripts/verify/stamps.mjs (WP6b)
// re-checks these against the shipped font.
export type StampWord = 'approved' | 'proof' | 'void';

export const STAMP_WORDS: readonly StampWord[] = ['approved', 'proof', 'void'];

const EN: Record<StampWord, string> = {
  approved: 'APPROVED',
  proof: 'PROOF',
  void: 'VOID',
};

export const STAMPS: Record<Lang, Record<StampWord, string>> = {
  en: EN,
  pt: { approved: 'APROVADO', proof: 'PROVA', void: 'NULO' }, // REVIEW-NATIVE
  es: { approved: 'APROBADO', proof: 'PRUEBA', void: 'NULO' }, // REVIEW-NATIVE
  fr: { approved: 'VALIDÉ', proof: 'ÉPREUVE', void: 'NUL' }, // REVIEW-NATIVE
  nl: { approved: 'GOEDGEKEURD', proof: 'PROEF', void: 'VERVALLEN' }, // REVIEW-NATIVE
  de: { approved: 'FREIGEGEBEN', proof: 'KORREKTUR', void: 'UNGÜLTIG' }, // REVIEW-NATIVE
};

export function stampText(word: StampWord, lang: Lang): string {
  return STAMPS[lang]?.[word] ?? EN[word];
}
