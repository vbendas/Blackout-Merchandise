'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT, type Key } from '@/lib/i18n';
import { PLATFORM_URL } from '@/lib/site';

// Mobile menu index (numbered). Anchors are the ids that exist on the home
// page: #cloth, #paths, #agents.
const MENU_LINKS: NavLink[] = [
  { href: '/#cloth', key: 'nav.cloth' },
  { href: '/#paths', key: 'nav.shopRun' },
  { href: '/catalog', key: 'nav.blanks' },
  { href: '/gallery', key: 'nav.gallery' },
  { href: '/#agents', key: 'nav.agents' },
  { href: '/about', key: 'nav.about' },
  { href: '/contact', key: 'nav.contact' },
];

const HAIRLINE = '1px solid var(--hairline)';

interface NavLink {
  href: string;
  key: Key;
}

// Home's own sections (Round 6 — premium editorial rewrite). Anchor
// links work from any route since they carry the leading "/". Shared by
// both header variants: the home issue-line nav and the wordmark nav on
// every other route.
const NAV_LINKS: NavLink[] = [
  { href: '/#cloth', key: 'nav.cloth' },
  { href: '/#paths', key: 'nav.shopRun' },
  { href: '/#catalog', key: 'nav.blanks' },
  { href: '/#agents', key: 'nav.agents' },
];

// Ink block, square corners — same on both header variants.
const applyButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: '40px',
  padding: '0 18px',
  background: 'var(--signal)',
  color: 'var(--paper)',
  fontSize: '12px',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
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
  const isHome = pathname === '/';
  // Round 6: the home page moves to the same vintage paper ground as
  // the catalog/gallery, and the header re-scopes with it so the issue
  // line and nav read in ink, not bone.
  // Round 7: paper on every route. Round 8: the home hero is an ink
  // band, so on '/' the header (which overlays it) reads bone on black.
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = isHome || menuOpen ? 'ink' : 'vintage';
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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
    // Focus trap: Tab cycles between the header's menu button and the
    // menu's own controls only.
    function onTrap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const inMenu = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      );
      const items = menuButtonRef.current ? [menuButtonRef.current, ...inMenu] : inMenu;
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !items.includes(active as HTMLElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !items.includes(active as HTMLElement))) {
        e.preventDefault();
        first.focus();
      }
    }
    // Leaving the mobile breakpoint with the menu open would strand the
    // scroll lock, so close it.
    const mq = window.matchMedia('(min-width: 768px)');
    const onMq = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', onMq);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keydown', onTrap);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => firstMenuLinkRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keydown', onTrap);
      mq.removeEventListener('change', onMq);
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
        data-theme={theme}
        // Pinned only while the mobile menu is open, so its close button
        // stays reachable however far the page was scrolled. Home has no
        // left-side brand mark (the fitted masthead below is the logo),
        // so its mobile row only has the right-hand Apply+menu block —
        // justify-end there, back to justify-between once the issue
        // line reappears at md.
        className={`${menuOpen ? 'fixed' : 'absolute'} inset-x-0 top-0 z-50 flex items-center ${isHome ? 'justify-end md:justify-between' : 'justify-between'}`}
        style={{
          height: 'var(--header-h)',
          paddingLeft: 'var(--gutter)',
          paddingRight: 'var(--gutter)',
          color: 'var(--signal)',
          background: 'transparent',
        }}
      >
        {isHome ? (
          // Home variant: mono issue line instead of the crosshair mark
          // + wordmark — the giant masthead in Cover is the only logo
          // on this page. Desktop only; mobile keeps just Apply + menu.
          <span
            className="hidden md:inline"
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
            }}
          >
            {t('home.header.line')}
          </span>
        ) : (
          <Link href="/" aria-label={t('nav.homeAriaLabel')} className="flex items-center">
            <span className="site-wordmark">MerchFrom</span>
          </Link>
        )}

        {/* Desktop nav — hidden below 768px per the mobile layout. Home
            reads small-caps (uppercase, tracked) instead of the plain
            sentence-case nav used elsewhere. */}
        <nav
          className="header-cap hidden items-center gap-9 md:flex"
        >
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
          <Link
            href="/waitlist"
            tabIndex={menuOpen ? -1 : undefined}
            aria-hidden={menuOpen || undefined}
            // Hidden while the menu is open: the menu has its own full-width
            // Apply, and two side by side read as a mistake.
            style={{ ...applyButton, height: '36px', padding: '0 16px', visibility: menuOpen ? 'hidden' : 'visible' }}
          >
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

      {/* Full-screen mobile menu: an ink band with a numbered index. */}
      {menuOpen && (
        <div
          id="site-menu"
          ref={menuRef}
          data-theme="ink"
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.menu')}
          className="fixed inset-0 z-40 flex flex-col md:hidden"
          style={{ background: 'var(--paper)', color: 'var(--signal)', paddingTop: 'var(--header-h)' }}
        >
          <nav
            aria-label={t('nav.menu')}
            className="flex flex-1 flex-col overflow-y-auto"
            style={{ padding: '8px var(--gutter) 0' }}
          >
            <ol className="m-0 flex list-none flex-col p-0" style={{ borderTop: HAIRLINE }}>
              {MENU_LINKS.map(({ href, key }, index) => {
                const current = isCurrent(href);
                return (
                  <li key={href} style={{ borderBottom: HAIRLINE }}>
                    <Link
                      href={href}
                      ref={index === 0 ? firstMenuLinkRef : undefined}
                      aria-current={current ? 'page' : undefined}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-baseline gap-4"
                      style={{ padding: '12px 0', opacity: current ? 1 : 0.78 }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: '28px',
                          fontFamily: 'var(--font-mono), monospace',
                          fontSize: '12px',
                          letterSpacing: '0.08em',
                          color: 'var(--muted)',
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontFamily: 'var(--font-condensed), var(--font-sans), sans-serif',
                          fontWeight: 600,
                          fontSize: 'clamp(38px, 11vw, 52px)',
                          lineHeight: 1,
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {t(key)}
                      </span>
                      {current && (
                        <span
                          aria-hidden
                          style={{ width: '8px', height: '8px', background: 'var(--signal)', alignSelf: 'center' }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ol>
            {PLATFORM_URL && (
              <a href={PLATFORM_URL} className="link-ink self-start" style={{ marginTop: '20px' }}>
                {t('nav.signIn')}
              </a>
            )}
          </nav>
          <div
            className="flex flex-col gap-4"
            style={{ padding: '20px var(--gutter) calc(24px + env(safe-area-inset-bottom))', borderTop: HAIRLINE }}
          >
            <LanguageSwitcher />
            <Link href="/waitlist" className="btn-ink w-full" onClick={() => setMenuOpen(false)}>
              {t('nav.apply')}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
