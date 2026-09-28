'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { RegisterMark } from '@/components/RegisterMark';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT, type Key } from '@/lib/i18n';
import { PLATFORM_URL, SITE_NAME } from '@/lib/site';

const HAIRLINE = '1px solid var(--hairline)';

interface NavLink {
  href: string;
  key: Key;
}

// Home's own sections (built in WP2). Anchor links work from any route
// since they carry the leading "/".
const NAV_LINKS: NavLink[] = [
  { href: '/#assistant', key: 'nav.howItWorks' },
  { href: '/#paths', key: 'nav.shopRun' },
  { href: '/catalog', key: 'nav.catalog' },
  { href: '/#agents', key: 'nav.agents' },
];

const applyButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: '44px',
  padding: '0 20px',
  borderRadius: '4px',
  background: 'var(--signal)',
  color: 'var(--paper)',
  fontSize: '13px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

/**
 * Site header mounted once in the root layout. Not sticky: it sits
 * absolutely at the top of the page as part of each page's hero and
 * scrolls away with it. Transparent everywhere, it takes the page's own
 * palette — bone over the dark pages, warm-black ink on the vintage
 * (catalog, gallery) pages via the same data-theme those pages use.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const t = useT();
  const vintage = pathname.startsWith('/catalog') || pathname.startsWith('/gallery');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuLinkRef = useRef<HTMLAnchorElement>(null);

  // A route change is the one thing that should always close the mobile
  // menu — including the in-page hash jumps the nav itself triggers.
  // Adjusted during render (React's documented pattern for state that
  // depends on a prop change) rather than in an effect, which would
  // cause an extra, avoidable re-render.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => firstMenuLinkRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(raf);
    };
  }, [menuOpen]);

  // Only path-only links (no "#") ever claim aria-current — an anchor
  // into a home section isn't "the current page" without a scroll-spy,
  // which is out of scope here.
  function isCurrent(href: string) {
    return !href.includes('#') && pathname === href;
  }

  return (
    <>
      <header
        data-theme={vintage ? 'vintage' : undefined}
        // Pinned only while the mobile menu is open, so its close button
        // stays reachable however far the page was scrolled.
        className={`${menuOpen ? 'fixed' : 'absolute'} inset-x-0 top-0 z-50 flex items-center justify-between`}
        style={{
          height: 'var(--header-h)',
          paddingLeft: 'var(--gutter)',
          paddingRight: 'var(--gutter)',
          color: 'var(--signal)',
          background: 'transparent',
        }}
      >
        <Link href="/" aria-label={t('nav.homeAriaLabel')} className="flex items-center gap-2">
          <RegisterMark className="h-6 w-6" />
          <span className="text-sm" style={{ fontWeight: 600, letterSpacing: '0.02em' }}>
            {SITE_NAME}
          </span>
        </Link>

        {/* Desktop nav — hidden below 768px per the mobile layout. */}
        <nav className="hidden items-center gap-7 text-sm md:flex" style={{ fontWeight: 500 }}>
          {NAV_LINKS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(href) ? 'page' : undefined}
              style={{ opacity: isCurrent(href) ? 1 : 0.7 }}
            >
              {t(key)}
            </Link>
          ))}

          <span aria-hidden style={{ opacity: 0.3 }}>
            |
          </span>

          {PLATFORM_URL && (
            <a href={PLATFORM_URL} style={{ opacity: 0.7 }}>
              {t('nav.signIn')}
            </a>
          )}
          <Link href="/waitlist" style={applyButton}>
            {t('nav.apply')}
          </Link>
        </nav>

        {/* Mobile: mark + wordmark (above), Apply + menu trigger (here). */}
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/waitlist" style={{ ...applyButton, height: '36px', padding: '0 16px', fontSize: '12px' }}>
            {t('nav.apply')}
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={t(menuOpen ? 'nav.close' : 'nav.menu')}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex flex-col items-center justify-center gap-[5px]"
            style={{ width: '36px', height: '36px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span
              aria-hidden
              style={{
                width: '18px',
                height: '1.5px',
                background: 'var(--signal)',
                transform: menuOpen ? 'translateY(3.25px) rotate(45deg)' : 'none',
                transition: 'transform 200ms ease',
              }}
            />
            <span
              aria-hidden
              style={{
                width: '18px',
                height: '1.5px',
                background: 'var(--signal)',
                transform: menuOpen ? 'translateY(-3.25px) rotate(-45deg)' : 'none',
                transition: 'transform 200ms ease',
              }}
            />
          </button>
        </div>
      </header>

      {/* Full-screen mobile menu */}
      {menuOpen && (
        <div
          id="site-menu"
          data-theme={vintage ? 'vintage' : undefined}
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.menu')}
          className="fixed inset-0 z-40 flex flex-col md:hidden"
          style={{ background: 'var(--paper)', paddingTop: 'var(--header-h)' }}
        >
          <nav
            className="flex flex-1 flex-col gap-6 overflow-y-auto"
            style={{ padding: '32px var(--gutter)', fontSize: '28px', fontWeight: 600 }}
          >
            {NAV_LINKS.map(({ href, key }, index) => (
              <Link
                key={href}
                href={href}
                ref={index === 0 ? firstMenuLinkRef : undefined}
                aria-current={isCurrent(href) ? 'page' : undefined}
                style={{ opacity: isCurrent(href) ? 1 : 0.7 }}
              >
                {t(key)}
              </Link>
            ))}
            {PLATFORM_URL && (
              <a href={PLATFORM_URL} style={{ fontSize: '18px', fontWeight: 500, opacity: 0.7 }}>
                {t('nav.signIn')}
              </a>
            )}
          </nav>
          <div
            className="flex items-center justify-between"
            style={{ padding: '24px var(--gutter)', borderTop: HAIRLINE }}
          >
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </>
  );
}
