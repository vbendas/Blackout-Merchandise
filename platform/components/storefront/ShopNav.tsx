'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Shop and About, left of the mark. A client component only to underline the
// page you are on (the layout above doesn't re-render between pages).
export function ShopNav({ slug, showAbout }: { slug: string; showAbout: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="sf-nav sf-top-nav" aria-label="Shop">
      <Link
        href={`/${slug}`}
        className="mf-label sf-navlink"
        aria-current={pathname === `/${slug}` ? 'page' : undefined}
      >
        Shop
      </Link>
      {showAbout && (
        <Link
          href={`/${slug}/about`}
          className="mf-label sf-navlink"
          aria-current={pathname === `/${slug}/about` ? 'page' : undefined}
        >
          About
        </Link>
      )}
    </nav>
  );
}
