'use client';

import type { CSSProperties } from 'react';
import { useLang } from '@/lib/i18n';
import { stampText, type StampWord } from '@/lib/stamps';
import { stampFont } from './stamp-font';

// Mornsey stamp (Round 9 plan 4.5). Look: design-tokens/stamp.css (.mf-stamp).
//
//   word  a key of lib/stamps.ts (approved | proof | void); no free text.
//         The string is picked per locale; locales without a word fall back to
//         the English one inside stampText().
//   size  clamped 64-160 (px, the stamp's nominal height)
//   tilt  clamped -3..-6 (deg)
//   tone  brand | fg (fg also gets the 2px brand misregistration)
//
// Decorative: aria-hidden. Budget: max 2 per page, 1 per viewport, enforced by
// scripts/verify/stamps.mjs and check-budgets.mjs. Never on buttons, nav,
// labels or sentences. The 160ms stamp-in only runs under
// prefers-reduced-motion: no-preference (CSS).

export const STAMP_SIZE_MIN = 64;
export const STAMP_SIZE_MAX = 160;
export const STAMP_TILT_MIN = -6;
export const STAMP_TILT_MAX = -3;

export type StampTone = 'brand' | 'fg';

interface StampProps {
  word: StampWord;
  size?: number;
  tilt?: number;
  tone?: StampTone;
  className?: string;
}

function clamp(n: number, lo: number, hi: number, fallback: number) {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

export function Stamp({ word, size = 96, tilt = -4, tone = 'brand', className }: StampProps) {
  const { lang } = useLang();
  const style = {
    '--stamp-size': clamp(size, STAMP_SIZE_MIN, STAMP_SIZE_MAX, 96),
    '--stamp-tilt': `${clamp(tilt, STAMP_TILT_MIN, STAMP_TILT_MAX, -4)}deg`,
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      data-stamp={word}
      data-tone={tone}
      style={style}
      className={['mf-stamp', stampFont.variable, className].filter(Boolean).join(' ')}
    >
      {stampText(word, lang)}
    </span>
  );
}
