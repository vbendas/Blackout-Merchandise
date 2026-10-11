import { Barlow, IBM_Plex_Mono } from 'next/font/google';

// Type system used across the platform app: Barlow body, IBM Plex Mono
// labels.
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
