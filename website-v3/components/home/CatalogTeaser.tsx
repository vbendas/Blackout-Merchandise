'use client';

import Image from 'next/image';
import Link from 'next/link';
import { typeFor } from '@/lib/catalog-filters';
import { useT } from '@/lib/i18n';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { PRODUCTS } from '@/lib/products';
import { FOCUS_RING, MONO_LABEL, SECTION_PAD } from './styles';

// Four real blanks, picked for variety (tee / hoodie / jacket / bag).
// Shown in light colourways: the base black packshots nearly vanish on
// the dark --surface tiles, while these read clearly and still show the
// range. Front packshots, same naming as public/packshots.
const PICKS = [
  { code: 'STTU258', colour: 'C001' },
  { code: 'STSW268', colour: 'C250' },
  { code: 'STJU251', colour: 'C223' },
  { code: 'STAU892', colour: 'C007' },
];
const FEATURED = PICKS.flatMap(({ code, colour }) => {
  const product = PRODUCTS.find((p) => p.code === code);
  return product ? [{ product, src: `/packshots/PFM0_${code}_${colour}.webp` }] : [];
});

export function CatalogTeaser() {
  const t = useT();

  return (
    <section
      id="catalog"
      className={`flex flex-col gap-14 ${SECTION_PAD}`}
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', background: 'var(--raised)' }}
    >
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="flex flex-col gap-4">
          <h2 className="m-0 text-[36px] leading-[1.08] font-semibold tracking-[-0.015em] md:text-[56px] md:leading-[1.05]">
            {t('home.catalog.title', { n: PRODUCTS.length })}
          </h2>
          <p className="m-0 max-w-[520px] text-[16px] leading-[1.5] md:text-[18px]" style={{ color: 'var(--muted)' }}>
            {t('home.catalog.body')}
          </p>
        </div>
        <Link
          href="/catalog"
          className={FOCUS_RING}
          style={{ color: 'var(--signal)', fontSize: '15px', borderBottom: '1px solid rgba(237,228,221,.35)', paddingBottom: '3px' }}
        >
          {t('home.catalog.link')} →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {FEATURED.map(({ product, src }) => {
          const details = PRODUCT_DETAILS[product.code];
          const caption = [details?.name ?? product.name, typeFor(product.code), details?.weightGsm ? `${details.weightGsm} gsm` : null]
            .filter(Boolean)
            .join(' · ');
          return (
            <Link
              key={product.code}
              href={`/catalog?product=${product.code}`}
              className={`flex flex-col gap-3 md:gap-4 ${FOCUS_RING}`}
            >
              <div
                className="relative h-[220px] md:h-[360px]"
                style={{ background: 'var(--surface)', border: '1px solid rgba(237,228,221,.08)' }}
              >
                <Image
                  src={src}
                  alt={details?.name ?? product.name}
                  fill
                  className="object-contain p-[9%]"
                  sizes="(min-width: 768px) 22vw, 45vw"
                />
              </div>
              <span style={MONO_LABEL}>{caption}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
