'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { typeFor } from '@/lib/catalog-filters';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import { useT, type Key } from '@/lib/i18n';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { PRODUCTS } from '@/lib/products';
import { displayColourFor, variantSrc } from '@/lib/variants';
import { HAIRLINE, MONO_LABEL, SECTION_PAD } from './styles';

// Three real heavyweight blanks (all >= 220 gsm, per R2 rules), shown in
// their light colourway — the home stays dark, so a light packshot reads
// clearly against the --surface tile the way a base-black one wouldn't.
const PICK_CODES = ['STSU797', 'STTU078', 'STSU177'];
const TILES = PICK_CODES.flatMap((code) => {
  const product = PRODUCTS.find((p) => p.code === code);
  if (!product) return [];
  const colour = displayColourFor(code);
  const src = colour ? variantSrc(code, colour) : product.src;
  return [{ code, src }];
});

const STAT_CELL: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
  paddingTop: '32px',
  paddingRight: '24px',
  borderRight: HAIRLINE,
};

interface Stat {
  value: number;
  suffix?: string;
  muted?: string;
  labelKey: Key;
}

// Splits a two-sentence English-style title ("A. B.") onto two lines —
// the mock (HomeCopyV2) sets this as a hard <br>. Falls back to a single
// line if a translation doesn't share that shape.
function twoLines(title: string): [string, string | null] {
  const idx = title.indexOf('. ');
  if (idx === -1) return [title, null];
  return [title.slice(0, idx + 1), title.slice(idx + 2)];
}

export function Cloth() {
  const t = useT();
  const [firstLine, secondLine] = twoLines(t('home.cloth.title'));

  const stats: Stat[] = [
    { value: CATALOG_STATS.heaviestGsm, suffix: 'gsm', labelKey: 'home.cloth.stat.heaviest' },
    { value: CATALOG_STATS.heaviestTeeGsm, suffix: 'gsm', labelKey: 'home.cloth.stat.heaviestTee' },
    { value: CATALOG_STATS.gots, labelKey: 'home.cloth.stat.gots' },
    { value: CATALOG_STATS.oeko, muted: `/${CATALOG_STATS.total}`, labelKey: 'home.cloth.stat.oeko' },
  ];

  return (
    <section
      id="cloth"
      className={`flex flex-col gap-14 ${SECTION_PAD}`}
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', borderTop: HAIRLINE }}
    >
      <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-12 md:gap-x-6">
        <div className="flex flex-col gap-5 md:col-span-6">
          <span style={MONO_LABEL}>{t('home.cloth.label')}</span>
          <h2 className="m-0 text-[36px] leading-[1.08] font-semibold tracking-[-0.015em] md:text-[56px] md:leading-[1.05]">
            {firstLine}
            {secondLine && (
              <>
                <br />
                {secondLine}
              </>
            )}
          </h2>
        </div>
        <p
          className="m-0 max-w-[440px] text-[17px] leading-[1.55] md:col-span-5 md:col-start-8 md:text-[18px]"
          style={{ color: 'var(--soft)' }}
        >
          {t('home.cloth.body')}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4" style={{ borderTop: HAIRLINE }}>
        {stats.map((stat, i) => (
          <div
            key={stat.labelKey}
            className="cloth-stat"
            style={{
              ...STAT_CELL,
              borderRight: i === stats.length - 1 ? 'none' : HAIRLINE,
              paddingLeft: i === 0 ? 0 : '24px',
              paddingRight: i === stats.length - 1 ? 0 : '24px',
            }}
          >
            <span
              className="text-[44px] md:text-[84px]"
              style={{ fontWeight: 600, lineHeight: 0.9, letterSpacing: '-0.03em' }}
            >
              {stat.value}
              {stat.suffix && (
                <span className="text-[18px] md:text-[28px]" style={{ fontWeight: 500, marginLeft: '6px' }}>
                  {stat.suffix}
                </span>
              )}
              {stat.muted && (
                <span className="text-[22px] md:text-[40px]" style={{ color: 'var(--muted)' }}>
                  {stat.muted}
                </span>
              )}
            </span>
            <span style={MONO_LABEL}>{t(stat.labelKey)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {TILES.map(({ code, src }) => {
          const details = PRODUCT_DETAILS[code];
          const product = PRODUCTS.find((p) => p.code === code);
          const caption = [details?.name ?? product?.name, typeFor(code), details?.weightGsm ? `${details.weightGsm} gsm` : null]
            .filter(Boolean)
            .join(' · ');
          return (
            <div key={code} className="flex flex-col gap-3">
              <div
                className="relative h-[220px]"
                style={{ background: 'var(--surface)', border: '1px solid rgba(237,228,221,.08)' }}
              >
                <Image
                  src={src}
                  alt={details?.name ?? product?.name ?? code}
                  fill
                  className="object-contain p-[9%]"
                  sizes="(min-width: 640px) 32vw, 90vw"
                />
              </div>
              <span style={MONO_LABEL}>{caption}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .cloth-stat:nth-child(2n) { border-right: none; padding-right: 0; }
        }
      `}</style>
    </section>
  );
}
