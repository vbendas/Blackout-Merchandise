'use client';

import Image from 'next/image';
import Link from 'next/link';
import { typeFor } from '@/lib/catalog-filters';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useT } from '@/lib/i18n';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { PRODUCTS } from '@/lib/products';
import { FOCUS_RING, MONO_LABEL } from './styles';

// Four real blanks, black colourway (PRODUCTS' own src is already
// C002/black) — chosen for variety (tee / hoodie / jacket / bag).
const CODES = ['STTU258', 'STSW268', 'STJU251', 'STAU892'];
const FEATURED = CODES.flatMap((code) => {
  const product = PRODUCTS.find((p) => p.code === code);
  return product ? [product] : [];
});

export function CatalogTeaser() {
  const t = useT();

  return (
    <section
      id="catalog"
      className="home-section"
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', borderTop: '1px solid var(--hairline)' }}
    >
      <div className="flex flex-col gap-5" style={{ borderBottom: '1px solid var(--signal)', paddingBottom: '16px' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span style={MONO_LABEL}>{t('nav.catalog')}</span>
          <Link href="/catalog" className="link-ink">
            {t('home.catalog.link')} →
          </Link>
        </div>
        <h2 className="home-setlist-heading" style={{ margin: 0 }}>
          {t('home.catalog.title', { n: CATALOG_STATS.total })}
        </h2>
        <p className="m-0 max-w-[520px] text-[16px] leading-[1.55]" style={{ color: 'var(--soft)' }}>
          {t('home.catalog.body', {
            gots: CATALOG_STATS.gots,
            min: CATALOG_STATS.lightestTeeGsm,
            max: CATALOG_STATS.heaviestGsm,
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
        {FEATURED.map((product) => {
          const details = PRODUCT_DETAILS[product.code];
          const name = details?.name ?? product.name;
          const caption = `MF-${product.code} · ${name} · ${typeFor(product.code)}`;
          return (
            <Link
              key={product.code}
              href={`/catalog?product=${product.code}`}
              className={`flex flex-col gap-3 ${FOCUS_RING}`}
              data-rise
            >
              <div className="home-tile-media">
                <Image src={product.src} alt={name} fill className="object-contain" sizes="(min-width: 768px) 22vw, 45vw" />
              </div>
              <span style={MONO_LABEL}>{caption}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
