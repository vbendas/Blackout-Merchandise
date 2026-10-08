'use client';

import Link from 'next/link';
import { FittedWord } from '@/components/editorial/FittedWord';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { FooterEcho } from '@/components/motion/FooterEcho';
import { useT, type Key } from '@/lib/i18n';
import { SOCIALS } from '@/lib/socials';

const INDEX_LINKS: { href: string; key: Key }[] = [
  { href: '/#cloth', key: 'nav.cloth' },
  { href: '/#paths', key: 'nav.shopRun' },
  { href: '/#catalog', key: 'nav.blanks' },
  { href: '/#agents', key: 'nav.agents' },
];

const STUDIO_LINKS: { href: string; key: Key }[] = [
  { href: '/about', key: 'nav.about' },
  { href: '/gallery', key: 'nav.gallery' },
  { href: '/contact', key: 'nav.contact' },
  { href: '/waitlist', key: 'nav.apply' },
];

// Mounted once in the root layout, after `children` — the only dark band
// on the paper site. Signature: MERCHFROM fitted to the content width.
export function SiteFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <FooterEcho />
      <div className="site-footer-cols">
        <div className="site-footer-intro flex flex-col gap-3">
          <span className="site-footer-label">MerchFrom</span>
          <p className="m-0 max-w-[360px] text-[20px] font-light leading-[1.35] md:text-[22px]">
            {t('home.header.line')}
          </p>
        </div>

        <nav className="site-footer-col flex flex-col gap-2.5" aria-label={t('footer.index')}>
          <span className="site-footer-label mb-1.5">{t('footer.index')}</span>
          {INDEX_LINKS.map(({ href, key }) => (
            <Link key={href} href={href} className="site-footer-link">
              {t(key)}
            </Link>
          ))}
        </nav>

        <nav className="site-footer-col flex flex-col gap-2.5" aria-label={t('footer.studio')}>
          <span className="site-footer-label mb-1.5">{t('footer.studio')}</span>
          {STUDIO_LINKS.map(({ href, key }) => (
            <Link key={href} href={href} className="site-footer-link">
              {t(key)}
            </Link>
          ))}
        </nav>

        <nav className="site-footer-col flex flex-col gap-2.5" aria-label={t('footer.elsewhere')}>
          <span className="site-footer-label mb-1.5">{t('footer.elsewhere')}</span>
          {SOCIALS.map(({ label, href }) => (
            <a key={label} href={href} className="site-footer-link" target="_blank" rel="noreferrer">
              {label}
            </a>
          ))}
        </nav>

        <div className="site-footer-col flex flex-col items-start gap-2.5">
          <span className="site-footer-label mb-1.5">{t('footer.language')}</span>
          <LanguageSwitcher />
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <FittedWord text="MerchFrom" className="site-footer-word" decorative />
      </div>

      <div className="site-footer-base">
        <span>{t('footer.copyright', { year })}</span>
        <span>{t('footer.motto')}</span>
        <a href="/llms.txt" className="site-footer-link" style={{ fontSize: 'inherit', color: 'inherit' }}>
          llms.txt
        </a>
      </div>
    </footer>
  );
}
