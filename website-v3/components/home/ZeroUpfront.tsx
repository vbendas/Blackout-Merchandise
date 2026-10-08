'use client';

import Link from 'next/link';
import { useT, type Key } from '@/lib/i18n';
import { OutlinedWord } from './OutlinedWord';
import { FOCUS_RING, MORE_LINK, PRIMARY_BTN } from './styles';

interface Column {
  titleKey: Key;
  bodyKey: Key;
}

const COLUMNS: Column[] = [
  { titleKey: 'home.zero.stock.title', bodyKey: 'home.zero.stock.body' },
  { titleKey: 'home.zero.min.title', bodyKey: 'home.zero.min.body' },
  { titleKey: 'home.zero.margin.title', bodyKey: 'home.zero.margin.body' },
];

export function ZeroUpfront() {
  const t = useT();

  return (
    <section
      id="zero-upfront"
      data-scene="zero"
      data-theme="ink"
      className="home-section"
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)' }}
    >
      <OutlinedWord as="h2">{t('home.zero.word')}</OutlinedWord>

      <p className="home-cover-tagline" data-lines style={{ marginTop: '-16px' }}>
        {t('home.zero.headline')}
      </p>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8" style={{ borderTop: '1px solid var(--hairline)', paddingTop: '32px' }}>
        {COLUMNS.map((col) => (
          <div key={col.titleKey} className="flex flex-col gap-3" data-rise>
            <h3 className="m-0 text-[22px] font-semibold md:text-[26px]">{t(col.titleKey)}</h3>
            <p className="m-0 text-[16px] leading-[1.55]" style={{ color: 'var(--soft)' }}>
              {t(col.bodyKey)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-6" data-rise>
        <Link href="/waitlist" className={FOCUS_RING} style={PRIMARY_BTN}>
          {t('home.zero.cta')}
        </Link>
        <Link href="/#paths" className={FOCUS_RING} style={MORE_LINK}>
          {t('home.zero.bulk')} →
        </Link>
      </div>
    </section>
  );
}
