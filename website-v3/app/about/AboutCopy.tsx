'use client';

import { useT } from '@/lib/i18n';

const display = {
  fontFamily: 'var(--font-display), sans-serif',
};

export function AboutCopy() {
  const t = useT();

  return (
    <>
      <h1
        className="uppercase leading-[0.94]"
        style={{ ...display, fontSize: 'clamp(3rem, 8vw, 8rem)' }}
      >
        {t('about.headline')}
      </h1>
      <p
        className="uppercase leading-[0.94]"
        style={{
          ...display,
          fontSize: 'clamp(3rem, 8vw, 8rem)',
          color: 'color-mix(in srgb, var(--signal) 38%, transparent)',
        }}
      >
        {t('about.subline')}
      </p>

      <div className="mt-16 grid gap-6 text-[15px] leading-[1.5] md:mt-24 md:grid-cols-12 md:gap-8">
        <p className="md:col-span-4">{t('about.paragraph1')}</p>
        <p className="md:col-span-4">{t('about.paragraph2')}</p>
        <dl className="grid grid-cols-3 gap-4 text-[13px] uppercase tracking-[0.08em] md:col-span-4 md:self-end">
          {[
            [t('about.est'), '2017'],
            [t('about.shop'), 'Barcelos, PT'],
            [t('about.press'), 'Anatol Volt-M'],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1">
              <dt style={{ color: 'color-mix(in srgb, var(--signal) 50%, transparent)' }}>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
