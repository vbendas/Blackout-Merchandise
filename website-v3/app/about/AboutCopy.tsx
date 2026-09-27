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
        className="leading-[1.0]"
        style={{ ...display, fontWeight: 600, fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}
      >
        {t('about.headline')}
      </h1>
      <p
        className="leading-[1.05]"
        style={{
          ...display,
          fontWeight: 600,
          fontSize: 'clamp(2.25rem, 6vw, 3.5rem)',
          color: 'var(--muted)',
        }}
      >
        {t('about.subline')}
      </p>

      <div className="mt-16 grid gap-6 text-[17px] leading-[1.5] md:mt-24 md:grid-cols-12 md:gap-8" style={{ color: 'var(--soft)' }}>
        <p className="md:col-span-4">{t('about.paragraph1')}</p>
        <p className="md:col-span-4">{t('about.paragraph2')}</p>
        <dl
          className="grid grid-cols-3 gap-4 uppercase tracking-[0.08em] md:col-span-4 md:self-end"
          style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '12px' }}
        >
          {[
            [t('about.est'), '2017'],
            [t('about.shop'), 'Barcelona, ES'],
            [t('about.press'), 'Anatol Volt-M'],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1">
              <dt style={{ color: 'var(--muted)' }}>{k}</dt>
              <dd style={{ color: 'var(--signal)' }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
