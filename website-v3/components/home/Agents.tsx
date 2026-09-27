'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { FOCUS_RING, MONO_LABEL, SECTION_PAD } from './styles';

export function Agents() {
  const t = useT();

  return (
    <section
      id="agents"
      className={`grid grid-cols-1 items-center gap-10 md:grid-cols-12 md:gap-x-6 ${SECTION_PAD}`}
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', background: 'var(--raised)' }}
    >
      <div className="flex flex-col gap-5 md:col-span-5">
        <div className="flex items-center gap-3">
          <span style={MONO_LABEL}>{t('home.agents.label')}</span>
          <span
            style={{
              ...MONO_LABEL,
              fontSize: '11px',
              border: '1px solid rgba(237,228,221,.3)',
              padding: '3px 8px',
              borderRadius: '3px',
            }}
          >
            {t('home.agents.soon')}
          </span>
        </div>
        <h2 className="m-0 text-[32px] leading-[1.1] font-semibold md:text-[44px] md:leading-[1.08] md:tracking-[-0.01em]">
          {t('home.agents.title')}
        </h2>
        <p className="m-0 text-[16px] leading-[1.55] md:text-[17px]" style={{ color: 'var(--soft)' }}>
          {t('home.agents.body')}
        </p>
      </div>

      <div className="flex flex-col gap-4 md:col-span-6 md:col-start-7">
        <div
          style={{
            background: 'var(--well)',
            border: '1px solid rgba(237,228,221,.12)',
            borderRadius: '6px',
            padding: '20px',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: '13px',
            lineHeight: 1.9,
            color: '#d8cfc8',
            // Commands must stay copyable as written: scroll sideways on
            // narrow screens instead of breaking mid-token.
            whiteSpace: 'pre',
            overflowX: 'auto',
          }}
        >
          <div style={{ color: '#9d958f' }}># Claude Code</div>
          <div>claude mcp add merchfrom https://mcp.merchfrom.com</div>
          <div style={{ color: '#9d958f', marginTop: '12px' }}>{t('home.agents.connector')}</div>
          <div>https://mcp.merchfrom.com</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span style={MONO_LABEL}>{t('home.agents.clients')}</span>
          <Link
            href="/llms.txt"
            className={FOCUS_RING}
            style={{ ...MONO_LABEL, borderBottom: '1px solid rgba(237,228,221,.35)', paddingBottom: '3px' }}
          >
            llms.txt →
          </Link>
        </div>
      </div>
    </section>
  );
}
