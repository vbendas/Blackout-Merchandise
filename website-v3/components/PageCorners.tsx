'use client';

import { RegisterMark } from '@/components/RegisterMark';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT, type Key } from '@/lib/i18n';

interface PageCornersProps {
  /** which top-right link is the current page — rendered blurred, per the site's active-state convention. Omit when no page is current (e.g. the 404). */
  current?: 'about' | 'contact' | 'waitlist';
}

// Static corner anchors for subpages: same frame as the home Corners but
// without the view switcher. The current page's own link is blurred, the
// same signifier the home switcher uses for the active view.
export function PageCorners({ current }: PageCornersProps) {
  const t = useT();
  const links: { href: string; labelKey: Key; key: 'about' | 'contact' }[] = [
    { href: '/about', labelKey: 'nav.about', key: 'about' },
    { href: '/contact', labelKey: 'nav.contact', key: 'contact' },
  ];

  const nav = (size: string) => (
    <>
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          aria-current={current === l.key ? 'page' : undefined}
          className={`flex items-center ${size}`}
          style={{ filter: current === l.key ? 'blur(3px)' : 'none', minHeight: '40px' }}
        >
          {t(l.labelKey)}
        </a>
      ))}
    </>
  );

  return (
    <div className="text-[color:var(--signal)]" style={{ fontWeight: 500 }}>
      {/* Desktop */}
      <div className="hidden md:block">
        <a
          href="/"
          aria-label={t('nav.homeAriaLabel')}
          className="fixed z-10 flex items-center text-sm"
          style={{ top: '24px', left: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          <RegisterMark className="h-6 w-6" />
        </a>

        <nav
          className="fixed z-10 flex items-center gap-6 text-sm"
          style={{ top: '24px', right: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          {nav('')}
          <LanguageSwitcher />
        </nav>

        <div
          className="fixed z-10 text-sm opacity-60"
          style={{ bottom: '24px', left: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          {t('corners.tagline')}
        </div>

        <a
          href="/waitlist"
          aria-current={current === 'waitlist' ? 'page' : undefined}
          className="fixed z-10 text-sm"
          style={{
            bottom: '24px',
            right: 'var(--gutter)',
            mixBlendMode: 'difference',
            filter: current === 'waitlist' ? 'blur(3px)' : 'none',
          }}
        >
          {t('nav.waitlist')}
        </a>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div
          className="mobile-corner-top fixed z-10 top-0 left-0 right-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px]"
          style={{
            paddingLeft: 'var(--gutter)',
            paddingRight: 'var(--gutter)',
            paddingTop: '8px',
            paddingBottom: '8px',
            background: 'var(--paper)',
          }}
        >
          <a
            href="/"
            aria-label={t('nav.homeAriaLabel')}
            className="flex items-center"
            style={{ minHeight: '40px' }}
          >
            <RegisterMark className="h-5 w-5" />
          </a>

        </div>

        <div
          className="mobile-corner-bottom fixed z-10 bottom-0 left-0 right-0 flex items-center justify-between text-[12px]"
          style={{
            paddingLeft: 'var(--gutter)',
            paddingRight: 'var(--gutter)',
            paddingTop: '8px',
            paddingBottom: '8px',
            background: 'var(--paper)',
          }}
        >
          <nav className="flex items-center gap-3" style={{ minHeight: '40px' }}>
            {nav('')}
            <div className="flex items-center" style={{ minHeight: '40px' }}>
              <LanguageSwitcher />
            </div>
          </nav>
          <a
            href="/waitlist"
            aria-current={current === 'waitlist' ? 'page' : undefined}
            className="flex items-center"
            style={{ minHeight: '40px', filter: current === 'waitlist' ? 'blur(3px)' : 'none' }}
          >
            {t('nav.waitlist')}
          </a>
        </div>
      </div>
    </div>
  );
}
