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
        className="leading-[1.0]"
        style={{ ...display, fontWeight: 600, fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}
      >
        {t('notFound.headline')}
      </h1>
      <p className="mt-6 text-[17px] leading-[1.5]" style={{ color: 'var(--soft)' }}>
        {t('notFound.paragraph')}
      </p>
      <a
        href="/"
        className="mt-8 inline-block w-fit text-[15px] underline decoration-1 underline-offset-4"
        style={{ color: 'var(--signal)' }}
      >
        {t('notFound.backLink')}
      </a>
    </>
  );
}
