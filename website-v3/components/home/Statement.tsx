'use client';

import { useT } from '@/lib/i18n';

export function Statement() {
  const t = useT();

  return (
    <section data-scene="statement" className="home-statement" style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)' }}>
      <p className="home-statement-text">
        {t('home.statement.body')
          .split(/\s+/)
          .map((word, i) => (
            <span key={i} data-word>
              {i > 0 ? ' ' : ''}
              {word}
            </span>
          ))}
      </p>
    </section>
  );
}
