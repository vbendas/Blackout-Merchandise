'use client';

import Link from 'next/link';
import { RegisterMark } from '@/components/RegisterMark';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT, type Key } from '@/lib/i18n';
import { SITE_NAME } from '@/lib/site';

const FOOTER_LINKS: { href: string; key: Key }[] = [
  { href: '/catalog', key: 'nav.catalog' },
  { href: '/#paths', key: 'nav.shopRun' },
  { href: '/#agents', key: 'nav.agents' },
  { href: '/gallery', key: 'nav.gallery' },
  { href: '/about', key: 'nav.about' },
  { href: '/contact', key: 'nav.contact' },
];

// Mounted once in the root layout, after `children` — normal document
// flow, at the bottom of every route.
export function SiteFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer
      className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between"
      style={{
        borderTop: '1px solid var(--hairline)',
        background: 'var(--raised)',
        paddingLeft: 'var(--gutter)',
        paddingRight: 'var(--gutter)',
        paddingTop: '56px',
        paddingBottom: '32px',
      }}
    >
      <div className="flex flex-col gap-3">
        <Link href="/" aria-label={t('nav.homeAriaLabel')} className="flex items-center gap-2">
          <RegisterMark className="h-5 w-5" />
          <span className="text-sm" style={{ fontWeight: 600, letterSpacing: '0.02em' }}>
            {SITE_NAME}
          </span>
        </Link>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {t('corners.tagline')}
        </p>
      </div>

      <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm" style={{ color: 'var(--soft)' }}>
        {FOOTER_LINKS.map(({ href, key }) => (
          <Link key={href} href={href}>
            {t(key)}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col items-start gap-4 md:items-end">
        <LanguageSwitcher />
        <p
          className="text-xs"
          style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted)' }}
        >
          {t('footer.rights', { year })}
        </p>
      </div>
    </footer>
  );
}
