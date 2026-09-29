'use client';

import { CLIENTS } from '@/lib/clients';
import { useT } from '@/lib/i18n';
import { MONO_LABEL } from './styles';

// Round 6: the roster of client names is still the placeholder set from
// the v2 gallery pieces (see lib/clients.ts) — not real clients yet. Per
// the redesign plan, this section is kept in the tree but renders
// nothing until CLIENTS holds real entries; flip this flag once it
// does, and the single quiet mono line below picks it up automatically.
const CLIENTS_ARE_REAL = false;

export function PrintedFor() {
  const t = useT();

  if (!CLIENTS_ARE_REAL || CLIENTS.length === 0) return null;

  const names = CLIENTS.slice(0, 8).map((client) => client.name);

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2"
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', paddingBottom: '64px' }}
    >
      <span style={MONO_LABEL}>{t('home.printedFor')}</span>
      <span style={{ ...MONO_LABEL, color: 'var(--soft)', textTransform: 'none', letterSpacing: 'normal' }}>
        {names.join(' · ')}
      </span>
    </div>
  );
}
