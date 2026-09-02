'use client';

import { useT } from '@/lib/i18n';

const display = {
  fontFamily: 'var(--font-display), sans-serif',
};

export function NotFoundCopy() {
  const t = useT();

  return (
    <>
      <h1
        className="uppercase leading-[0.94]"
        style={{ ...display, fontSize: 'clamp(3rem, 8vw, 8rem)' }}
      >
        {t('notFound.headline')}
      </h1>
      <p className="mt-6 text-[15px] leading-[1.5] opacity-60">{t('notFound.paragraph')}</p>
      <a
        href="/"
        className="mt-8 inline-block w-fit text-[15px] underline decoration-1 underline-offset-4"
      >
        {t('notFound.backLink')}
      </a>
    </>
  );
}
