// The ONLY file that imports typefaces (Round 9 plan 4.6, WP4).
//
// Each loader exposes one next/font CSS variable; app/layout.tsx applies the
// three variable classes on <html>. design-tokens/type.css reads them through
// its metric block (--type-display / --type-mono / --type-body), and
// everything else reads --font-display / --font-mono / --font-body, so no
// other file names a family.
//
// Faces locked by the owner, 9 Oct 2026: display = Anton, mono = IBM Plex
// Mono, body = Barlow 400/500. A later swap is a one-token change: edit the
// loader below and the metric block at the top of design-tokens/type.css
// (README "Swap a face"), then re-run `npm run measure-face` and re-shoot.
// Variable names stay.
//
// Docs read (Next 16.3.0):
//   node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md
import { Anton, Barlow, IBM_Plex_Mono } from 'next/font/google';

// Every loader writes its options as literals (a next/font rule). latin-ext
// keeps artist names and the pt/es/fr/de/nl diacritics (decision 26).

/** Poster, h1-h3, UI caps, stats. Anton ships a single weight (400). */
export const display = Anton({
  variable: '--ff-display',
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
});

/** Labels, spec rows, tool status, agent text. */
export const mono = IBM_Plex_Mono({
  variable: '--ff-mono',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  display: 'swap',
});

/** Body and UI. 400/500 only: weight 300 is banned (plan 4.1). */
export const body = Barlow({
  variable: '--ff-body',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  display: 'swap',
});
