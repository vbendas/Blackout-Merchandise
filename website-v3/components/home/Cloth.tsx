'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useT, type Key } from '@/lib/i18n';
import { OutlinedWord } from './OutlinedWord';
import { MONO_LABEL } from './styles';

/** Serialisable catalog numbers, computed server-side in app/page.tsx. */
export interface ClothStats {
  total: number;
  gots: number;
  oeko: number;
  heaviestGsm: number;
  heaviestTeeGsm: number;
}

/** A packshot tile resolved server-side (name + caption already built). */
export interface ClothTile {
  code: string;
  src: string;
  name: string;
  caption: string;
}

interface Stat {
  value: number;
  suffix?: string;
  muted?: string;
  labelKey: Key;
}

export function Cloth({ stats: catalog, tiles }: { stats: ClothStats; tiles: ClothTile[] }) {
  const t = useT();

  const stats: Stat[] = [
    { value: catalog.heaviestGsm, suffix: 'gsm', labelKey: 'home.cloth.stat.heaviest' },
    { value: catalog.heaviestTeeGsm, suffix: 'gsm', labelKey: 'home.cloth.stat.heaviestTee' },
    { value: catalog.gots, labelKey: 'home.cloth.stat.gots' },
    { value: catalog.oeko, muted: `/${catalog.total}`, labelKey: 'home.cloth.stat.oeko' },
  ];

  return (
    <section
      id="cloth"
      data-scene="cloth"
      className="home-section"
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', borderTop: '1px solid var(--hairline)' }}
    >
      <OutlinedWord as="h2">{t('nav.cloth')}</OutlinedWord>

      <p className="home-cover-tagline" data-lines style={{ marginTop: '-16px' }}>
        {t('home.cloth.line')}
      </p>

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

      {/* The eco claim sits right under the certification numbers that back it. */}
      <p className="home-cloth-eco" data-rise>
        {t('home.cloth.eco')}
      </p>

      <div className="home-tile-row">
        {tiles.map(({ code, src, name, caption }) => (
          <div key={code} className="flex flex-col gap-3.5" data-rise>
            <div className="home-tile-media">
              <Image src={src} alt={name} fill className="object-contain" sizes="(min-width: 640px) 30vw, 90vw" />
            </div>
            <span style={MONO_LABEL}>{caption}</span>
          </div>
        ))}
      </div>

      <div data-rise>
        <Link href="/catalog" className="btn-ink">
          {t('home.cloth.cta', { n: catalog.total })} →
        </Link>
      </div>
    </section>
  );
}
