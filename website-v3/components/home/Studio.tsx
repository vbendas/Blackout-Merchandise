'use client';

import Image from 'next/image';
import { useT } from '@/lib/i18n';
import { MONO_LABEL } from './styles';

const STUDIO_IMAGE = '/gallery/8a.png';

export function Studio() {
  const t = useT();

  return (
    <section className="relative h-[560px] overflow-hidden md:h-[800px]" style={{ background: 'var(--raised)' }}>
      <Image src={STUDIO_IMAGE} alt="" fill className="object-cover" sizes="100vw" />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(20,20,20,0) 45%, rgba(15,15,15,.7) 100%)' }}
      />
      <div
        className="absolute bottom-12 flex flex-col gap-3 md:bottom-24 md:gap-4"
        style={{ left: 'var(--gutter)', right: 'var(--gutter)' }}
      >
        <h2 className="m-0 max-w-[720px] text-[34px] leading-[1.08] font-semibold md:text-[56px] md:leading-[1.05] md:tracking-[-0.015em]">
          {t('home.studio.title')}
        </h2>
        <span style={MONO_LABEL}>{t('home.studio.meta')}</span>
      </div>
    </section>
  );
}
