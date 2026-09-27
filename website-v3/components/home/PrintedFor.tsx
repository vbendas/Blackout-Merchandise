'use client';

import { CLIENTS } from '@/lib/clients';
import { useT } from '@/lib/i18n';
import { HAIRLINE, MONO_LABEL } from './styles';

// One row of client names — the mock shows six; slice rather than
// render all twelve placeholder entries so the row stays a single,
// evenly spaced line on desktop.
const NAMES = CLIENTS.slice(0, 6).map((client) => client.name);

export function PrintedFor() {
  const t = useT();

  return (
    <section
      aria-label={t('home.printedFor')}
      className="flex flex-col gap-4 md:flex-row md:items-center md:gap-14"
      style={{
        borderBottom: HAIRLINE,
        paddingLeft: 'var(--gutter)',
        paddingRight: 'var(--gutter)',
        paddingTop: '24px',
        paddingBottom: '24px',
        minHeight: '120px',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ ...MONO_LABEL, flexShrink: 0 }}>{t('home.printedFor')}</span>
      <div
        className="grid grid-cols-3 gap-x-4 gap-y-3 text-[15px] md:flex md:flex-1 md:flex-row md:justify-between md:text-[20px]"
        style={{ fontWeight: 500, letterSpacing: '0.02em', color: 'var(--soft)' }}
      >
        {NAMES.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
    </section>
  );
}
