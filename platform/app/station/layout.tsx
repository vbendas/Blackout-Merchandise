import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { WakeLockProvider } from '@/components/station/WakeLock';
import '@/components/station/station.css';

// The production stations: job sheets on the iPads at the press. Its own full-screen frame (no sidebar, not the Studio's and not the
// admin's), made to be added to the iPad's home screen and run full screen: a web app manifest and an apple-touch-icon in public/station,
// and the tags iOS reads for "Add to Home Screen". This layout is not the gate: each page and action checks Production access itself
// (requireStaffPage, requireStaffAction in lib/auth.ts), because a layout does not stop a page rendering on its own.
export const metadata: Metadata = {
  title: 'Station',
  manifest: '/station/manifest.webmanifest',
  icons: {
    icon: [{ url: '/station/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/station/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'Station', statusBarStyle: 'black-translucent' },
  // The tag iOS has always read for full screen; Next writes only the standard mobile-web-app-capable for appleWebApp.
  other: { 'apple-mobile-web-app-capable': 'yes' },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // under the notch and the home bar, with the safe areas kept clear in the CSS
  viewportFit: 'cover',
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function StationLayout({ children }: { children: ReactNode }) {
  return (
    <WakeLockProvider>
      <div className="st-root">{children}</div>
    </WakeLockProvider>
  );
}
