// DEV ONLY (WP3). Wrapper for app/dev/** routes: scoped specimen font
// variables (--sp-*), noindex. Not linked from nav, not in sitemap.ts, and
// not a route at all in a production build (pageExtensions in next.config.ts).
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { FONT_VARIABLE_CLASSES } from './specimen/faces';

export const metadata: Metadata = {
  title: 'Specimen (dev only)',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function DevLayout({ children }: { children: ReactNode }) {
  return <div className={FONT_VARIABLE_CLASSES}>{children}</div>;
}
