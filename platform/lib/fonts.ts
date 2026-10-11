import { IBM_Plex_Mono, Inter } from 'next/font/google';

// Type system shared with the website (mainpage/): Inter for display and
// body, IBM Plex Mono for tags, timers and key-style tiles.
export const inter = Inter({
  variable: '--font-inter',
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
