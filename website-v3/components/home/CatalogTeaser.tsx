'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { FOCUS_RING, MONO_LABEL } from './styles';

/** Serialisable catalog numbers, computed server-side in app/page.tsx. */
export interface TeaserStats {
  total: number;
  gots: number;
  lightestTeeGsm: number;
  heaviestGsm: number;
}

export interface TeaserTile {
  code: string;
  src: string;
  name: string;
  caption: string;
}

export function CatalogTeaser({ stats, tiles }: { stats: TeaserStats; tiles: TeaserTile[] }) {
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
        <h2 className="home-setlist-heading" data-lines style={{ margin: 0 }}>
          {t('home.catalog.title', { n: stats.total })}
        </h2>
        <p className="m-0 max-w-[520px] text-[16px] leading-[1.55]" style={{ color: 'var(--soft)' }}>
          {t('home.catalog.body', {
            gots: stats.gots,
            min: stats.lightestTeeGsm,
            max: stats.heaviestGsm,
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
        {tiles.map(({ code, src, name, caption }) => (
          <Link
            key={code}
            href={`/catalog?product=${code}`}
            className={`flex flex-col gap-3 ${FOCUS_RING}`}
            data-rise
          >
            <div className="home-tile-media">
              <Image src={src} alt={name} fill className="object-contain" sizes="(min-width: 768px) 22vw, 45vw" />
            </div>
            <span style={MONO_LABEL}>{caption}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
