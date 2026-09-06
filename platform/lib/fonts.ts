import { Oswald } from 'next/font/google';

// Display face used for headings across the platform app, mirroring
// website-v3/app/layout.tsx so the artist-facing chrome matches the
// public site's type system.
export const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
  weight: '700',
  display: 'swap',
});
