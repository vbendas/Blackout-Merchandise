'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RegisterMark } from '@/components/RegisterMark';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT, type Key } from '@/lib/i18n';

const SWITCHED_KEY = 'mf-switched';

const VIEW_OPTIONS: { href: string; key: Key }[] = [
  { href: '/', key: 'nav.partners' },
  { href: '/catalog', key: 'nav.catalog' },
  { href: '/gallery', key: 'nav.gallery' },
];

interface ViewSwitcherProps {
  pathname: string;
  /** blur the active view's label — off until the user has switched
      views once this session, so the home tab isn't blurred on arrival */
  indicateActive: boolean;
  onSwitch: () => void;
}

/**
 * The five fixed corner anchors that frame the showcase: brand mark,
 * view switcher, About/Contact, location line, waitlist link. No bars,
 * no backgrounds — just text floating on black, positioned with the
 * shared --gutter token.
 */
export function Corners() {
  const pathname = usePathname();
  const t = useT();
  // The blur-as-active-tab signifier only earns its meaning once the
  // user has actually switched views; on first load (and on later
  // visits before any switch) the active tab stays crisp. Tracked in
  // sessionStorage so it survives the full navigation each switch is
  // now (a route change, not client state).
  const [indicateActive, setIndicateActive] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SWITCHED_KEY)) setIndicateActive(true);
    } catch {
      // storage unavailable — the active tab just stays crisp
    }
  }, []);

  function markSwitched() {
    setIndicateActive(true);
    try {
      sessionStorage.setItem(SWITCHED_KEY, '1');
    } catch {
      // storage unavailable — no persistence, harmless
    }
  }

  return (
    // The reference sets its UI text in the Medium weight
    <div className="text-[color:var(--signal)]" style={{ fontWeight: 500 }}>
      {/* Desktop layout. Color is pinned, not var(--signal): these anchors
          render through mix-blend-mode difference, which inverts them
          against whatever is behind — cream stays cream on black, flips to
          near-black on the light Catalog ground. A token-driven color
          would be double-inverted into camouflage in light mode. */}
      <div className="hidden md:block" style={{ color: '#ede4dd' }}>
        {/* mix-blend-mode: difference keeps the floating labels legible when
            Grid/Gallery images scroll beneath them — cream stays cream on
            black, and self-inverts to dark over bright photos. */}
        <a
          href="/"
          aria-label={t('nav.homeAriaLabel')}
          className="fixed z-10 flex items-center text-sm"
          style={{ top: '24px', left: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          <RegisterMark className="h-6 w-6" />
        </a>

        <div
          className="fixed z-10 left-1/2 -translate-x-1/2 flex items-center text-sm"
          style={{ top: '24px', mixBlendMode: 'difference' }}
        >
          <ViewSwitcher pathname={pathname} indicateActive={indicateActive} onSwitch={markSwitched} />
        </div>

        <nav
          className="fixed z-10 flex items-center gap-6 text-sm"
          style={{ top: '24px', right: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          <a href="/about">{t('nav.about')}</a>
          <a href="/contact">{t('nav.contact')}</a>
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
          className="fixed z-10 text-sm"
          style={{ bottom: '24px', right: 'var(--gutter)', mixBlendMode: 'difference' }}
        >
          {t('nav.waitlist')}
        </a>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        <div
          className="mobile-corner-top fixed z-10 top-0 left-0 right-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px]"
          style={{
            paddingLeft: 'var(--gutter)',
            paddingRight: 'var(--gutter)',
            paddingTop: '8px',
            paddingBottom: '8px',
            background: 'var(--paper)',
            transition: 'background-color 800ms ease',
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

          <div className="flex items-center" style={{ minHeight: '40px' }}>
            <ViewSwitcher pathname={pathname} indicateActive={indicateActive} onSwitch={markSwitched} />
          </div>

          <nav className="flex items-center gap-3" style={{ minHeight: '40px' }}>
            <a href="/about" className="flex items-center" style={{ minHeight: '40px' }}>
              {t('nav.about')}
            </a>
            <a href="/contact" className="flex items-center" style={{ minHeight: '40px' }}>
              {t('nav.contact')}
            </a>
            <div className="flex items-center" style={{ minHeight: '40px' }}>
              <LanguageSwitcher />
            </div>
          </nav>
        </div>

        <div
          className="mobile-corner-bottom fixed z-10 bottom-0 left-0 right-0 flex items-center justify-between text-[12px]"
          style={{
            paddingLeft: 'var(--gutter)',
            paddingRight: 'var(--gutter)',
            paddingTop: '8px',
            paddingBottom: '8px',
            background: 'var(--paper)',
            transition: 'background-color 800ms ease',
          }}
        >
          <span className="opacity-60" style={{ lineHeight: '40px' }}>
            {t('corners.tagline')}
          </span>
          <a href="/waitlist" className="flex items-center" style={{ minHeight: '40px' }}>
            {t('nav.waitlist')}
          </a>
        </div>
      </div>
    </div>
  );
}

function ViewSwitcher({ pathname, indicateActive, onSwitch }: ViewSwitcherProps) {
  const t = useT();
  return (
    <>
      {VIEW_OPTIONS.map(({ href, key }, index) => {
        const active = pathname === href;
        return (
          <span key={href} className="flex items-center">
            {index > 0 && <span className="opacity-40 px-1">/</span>}
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (!active) onSwitch();
              }}
              className="cursor-pointer transition-[filter] duration-300"
              style={{
                filter: active && indicateActive ? 'blur(3px)' : 'none',
                opacity: active ? 1 : 0.6,
                padding: '10px 2px',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.filter = 'blur(1.5px)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.filter = 'none';
              }}
            >
              {t(key)}
            </Link>
          </span>
        );
      })}
    </>
  );
}
