'use client';

import Image from 'next/image';
import { typeFor } from '@/lib/catalog-filters';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useT, type Key } from '@/lib/i18n';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { PRODUCTS } from '@/lib/products';
import { OutlinedWord } from './OutlinedWord';
import { MONO_LABEL } from './styles';

// Real blanks, black colourway (PRODUCTS' own default src is already
// C002/black) — matches the mock's black packshots.
const CODES = ['STSU797', 'STTU078', 'STSU177'];
const TILES = CODES.flatMap((code) => {
  const product = PRODUCTS.find((p) => p.code === code);
  return product ? [{ code, product }] : [];
});

interface Stat {
  value: number;
  suffix?: string;
  muted?: string;
  labelKey: Key;
}

export function Cloth() {
  const t = useT();

  const stats: Stat[] = [
    { value: CATALOG_STATS.heaviestGsm, suffix: 'gsm', labelKey: 'home.cloth.stat.heaviest' },
    { value: CATALOG_STATS.heaviestTeeGsm, suffix: 'gsm', labelKey: 'home.cloth.stat.heaviestTee' },
    { value: CATALOG_STATS.gots, labelKey: 'home.cloth.stat.gots' },
    { value: CATALOG_STATS.oeko, muted: `/${CATALOG_STATS.total}`, labelKey: 'home.cloth.stat.oeko' },
  ];

  return (
    <section
      id="cloth"
      data-scene="cloth"
      className="home-section"
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', borderTop: '1px solid var(--hairline)' }}
    >
      <OutlinedWord as="h2">{t('nav.cloth')}</OutlinedWord>

      <div className="home-stat-row">
        {stats.map((stat) => (
          <div key={stat.labelKey} className="home-stat-cell">
            <span className="home-stat-value">
              <span data-count>{stat.value}</span>
              {stat.suffix && <span className="home-stat-suffix">{stat.suffix}</span>}
              {stat.muted && <span className="home-stat-muted">{stat.muted}</span>}
            </span>
            <span style={MONO_LABEL}>{t(stat.labelKey)}</span>
          </div>
        ))}
      </div>

      <div className="home-tile-row">
        {TILES.map(({ code, product }) => {
          const details = PRODUCT_DETAILS[code];
          const name = details?.name ?? product.name;
          const caption = `${code} · ${name} · ${typeFor(code)}`;
          return (
            <div key={code} className="flex flex-col gap-3.5" data-rise>
              <div className="home-tile-media">
                <Image src={product.src} alt={name} fill className="object-contain" sizes="(min-width: 640px) 30vw, 90vw" />
              </div>
              <span style={MONO_LABEL}>{caption}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
