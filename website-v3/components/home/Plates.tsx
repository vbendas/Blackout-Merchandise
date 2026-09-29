'use client';

import { Halftone } from '@/components/editorial/Halftone';
import { useT } from '@/lib/i18n';
import { MONO_LABEL } from './styles';

const PLATE_ONE = '/gallery/8a.png';
const PLATE_TWO = '/gallery/3a.png';

export function Plates() {
  const t = useT();

  return (
    <section
      data-scene="plates"
      className="home-plates-grid"
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', paddingTop: '0', paddingBottom: '96px' }}
    >
      <h2 className="sr-only">Plates</h2>
      <div className="flex flex-col gap-3" data-rise>
        <Halftone src={PLATE_ONE} sizes="(min-width: 768px) 45vw, 100vw" className="home-plate-media" />
        <span style={MONO_LABEL}>{t('home.plates.caption1')}</span>
      </div>
      <div className="flex flex-col gap-3 home-plate-two" data-rise>
        <Halftone src={PLATE_TWO} sizes="(min-width: 768px) 45vw, 100vw" className="home-plate-media" />
        <span style={MONO_LABEL}>{t('home.plates.caption2')}</span>
      </div>
    </section>
  );
}
