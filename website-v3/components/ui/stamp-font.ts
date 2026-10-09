import localFont from 'next/font/local';

// Mornsey, the stamp face (Round 9 plan 4.5/4.6). Imported ONLY by Stamp.tsx,
// so the face is requested only on routes that render a Stamp. preload:false
// keeps it out of the head of every page; the browser fetches it when the
// glyphs are first painted. The file is a Basic Latin + Latin-1 subset of
// Assets/Fonts/Mornsey-PUA.ttf (scripts/verify/stamps.mjs checks the words
// against the original TTF cmap).
export const stampFont = localFont({
  src: '../../app/fonts/Mornsey.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  preload: false,
  variable: '--ff-stamp',
  fallback: ['Impact', 'sans-serif'],
});
