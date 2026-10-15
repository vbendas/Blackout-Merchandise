'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// .mf-meta, .mf-field and .mf-select, which AdminPageHeader and the admin
// forms use, live in the Studio's stylesheet.
import '@/components/studio/studio.css';

export interface AdminShellLink {
  href: string;
  label: string;
  /** a small count beside the label (e.g. packs waiting) */
  count?: number;
}

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The admin frame of the approved mocks: one left sidebar (the wordmark,
 * ADMIN, the pages this person may open, the way back to the Studio) and the
 * page to its right, which brings its own AdminPageHeader. Below 768px the
 * sidebar becomes a row of links across the top that scrolls sideways. */
export function AdminShell({
  links,
  devSwitch = false,
  children,
}: {
  links: AdminShellLink[];
  /** under the dev auth bypass: a link to /dev, where the identity can be switched */
  devSwitch?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? '';

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--paper)] text-[var(--signal)] md:flex-row">
      <nav
        aria-label="Admin"
        className="flex shrink-0 items-center gap-1 overflow-x-auto px-3 py-2 [border-bottom:var(--hairline)] md:sticky md:top-0 md:h-dvh md:w-[272px] md:flex-col md:items-stretch md:overflow-x-hidden md:overflow-y-auto md:px-4 md:py-5 md:[border-bottom:0] md:[border-right:var(--hairline)]"
      >
        <Link
          href="/admin"
          className="hidden px-2.5 pt-1.5 pb-[18px] font-mono text-[13px] font-medium tracking-[0.2em] md:block"
        >
          MERCHFROM
        </Link>
        <p className="hidden px-2.5 pt-1 pb-1.5 font-mono text-[11px] tracking-[0.2em] opacity-50 md:block">
          ADMIN
        </p>
        {links.map((link) => {
          const current = isCurrent(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current ? 'page' : undefined}
              className={`flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-[2px] px-2.5 whitespace-nowrap ${
                current ? 'bg-[var(--tint-8)]' : 'opacity-80 hover:bg-[var(--tint-4)] hover:opacity-100'
              }`}
            >
              <span>{link.label}</span>
              {link.count ? <span className="font-mono text-[12px] opacity-80">{link.count}</span> : null}
            </Link>
          );
        })}
        <Link
          href="/studio"
          className={`flex min-h-11 shrink-0 items-center rounded-[2px] px-2.5 whitespace-nowrap opacity-50 hover:opacity-100 ${devSwitch ? '' : 'md:mt-auto'}`}
        >
          Back to Studio
        </Link>
        {devSwitch ? (
          <Link
            href="/dev"
            prefetch={false}
            className="flex min-h-11 shrink-0 items-center rounded-[2px] px-2.5 whitespace-nowrap opacity-50 hover:opacity-100 md:mt-auto"
          >
            Switch identity (dev)
          </Link>
        ) : null}
      </nav>
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
