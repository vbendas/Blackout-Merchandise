'use client';

import Link from 'next/link';
import { Halftone } from '@/components/editorial/Halftone';
import { useT, type Key } from '@/lib/i18n';
import { MONO_LABEL } from './styles';

interface PathCard {
  image: string;
  titleKey: Key;
  metaKey: Key;
  bodyKey: Key;
  linkKey: Key;
}

const CARDS: PathCard[] = [
  {
    image: '/gallery/11a.png',
    titleKey: 'home.paths.shop.title',
    metaKey: 'home.paths.shop.meta',
    bodyKey: 'home.paths.shop.body',
    linkKey: 'home.paths.shop.link',
  },
  {
    image: '/gallery/2a.png',
    titleKey: 'home.paths.run.title',
    metaKey: 'home.paths.run.meta',
    bodyKey: 'home.paths.run.body',
    linkKey: 'home.paths.run.link',
  },
];

export function Paths() {
  const t = useT();

  return (
    <section
      id="paths"
      className="home-section"
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', borderTop: '1px solid var(--hairline)' }}
    >
      <div className="flex flex-col gap-5" style={{ borderBottom: '1px solid var(--signal)', paddingBottom: '16px' }}>
        <span style={MONO_LABEL}>{t('home.paths.label')}</span>
        <h2 className="home-setlist-heading" style={{ margin: 0, maxWidth: '16ch' }}>
          {t('home.paths.title')}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-14 md:grid-cols-2 md:gap-8">
        {CARDS.map((card, i) => (
          <div key={card.titleKey} className="flex flex-col gap-5" data-rise>
            <Halftone
              src={card.image}
              sizes="(min-width: 768px) 45vw, 100vw"
              className="h-[300px] md:h-[440px]"
            />
            <div
              className="flex items-baseline justify-between gap-4"
              style={{ borderBottom: '1px solid var(--hairline)', paddingBottom: '14px' }}
            >
              <span className="flex items-baseline gap-4">
                <span style={MONO_LABEL}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className="home-setlist-title" style={{ margin: 0 }}>
                  {t(card.titleKey)}
                </h3>
              </span>
              <span style={{ ...MONO_LABEL, textAlign: 'right' }}>{t(card.metaKey)}</span>
            </div>
            <p className="m-0 max-w-[520px] text-[16px] leading-[1.55]" style={{ color: 'var(--soft)' }}>
              {t(card.bodyKey)}
            </p>
            <Link href="/waitlist" className="link-ink self-start">
              {t(card.linkKey)} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
