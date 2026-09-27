'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useT, type Key } from '@/lib/i18n';
import { FOCUS_RING, HAIRLINE, MONO_LABEL, MORE_LINK, SECTION_PAD } from './styles';

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
    image: '/gallery/9a.png',
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
      className={`flex flex-col gap-10 md:gap-14 ${SECTION_PAD}`}
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', borderTop: HAIRLINE }}
    >
      <div className="flex flex-col gap-4">
        <span style={MONO_LABEL}>{t('home.paths.label')}</span>
        <h2 className="m-0 text-[36px] leading-[1.08] font-semibold tracking-[-0.015em] md:text-[56px] md:leading-[1.05]">
          {t('home.paths.title')}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-6">
        {CARDS.map((card) => (
          <div key={card.titleKey} className="flex flex-col gap-5">
            <div className="relative h-[260px] overflow-hidden md:h-[320px]" style={{ background: 'var(--surface)' }}>
              <Image src={card.image} alt="" fill className="object-cover" sizes="(min-width: 768px) 45vw, 100vw" />
            </div>
            <div className="flex items-baseline justify-between">
              <h3 className="m-0 text-[26px] font-semibold md:text-[32px]">{t(card.titleKey)}</h3>
              <span style={MONO_LABEL}>{t(card.metaKey)}</span>
            </div>
            <p className="m-0 max-w-[520px] text-[16px] leading-[1.5] md:text-[17px]" style={{ color: 'var(--soft)' }}>
              {t(card.bodyKey)}
            </p>
            <Link href="/waitlist" className={`self-start text-[15px] ${FOCUS_RING}`} style={MORE_LINK}>
              {t(card.linkKey)} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
