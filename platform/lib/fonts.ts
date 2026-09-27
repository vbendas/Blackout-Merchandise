import { Barlow, IBM_Plex_Mono } from 'next/font/google';

// Type system used across the platform app, mirroring
// website-v3/app/layout.tsx so the artist-facing chrome matches the
// public site's type system.
export const barlow = Barlow({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});
