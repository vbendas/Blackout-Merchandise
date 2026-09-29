'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { MONO_LABEL } from './styles';

const ENDPOINT = 'https://mcp.merchfrom.com';
const COMMAND = `claude mcp add merchfrom ${ENDPOINT}`;

const MONO_TEXT = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '13px',
  lineHeight: 1.6,
  color: 'var(--signal)',
} as const;

export function Agents() {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable: the command is plain selectable text anyway.
    }
  };

  const rows: Array<[string, string]> = [
    [t('home.agents.endpoint'), ENDPOINT],
    [t('home.agents.protocol'), 'MCP'],
    [t('home.agents.clientsLabel'), t('home.agents.clients')],
    [t('home.agents.status'), t('home.agents.soon')],
  ];

  return (
    <section
      id="agents"
      className="home-section"
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', borderTop: '1px solid var(--hairline)' }}
    >
      <div className="flex flex-col gap-5" style={{ borderBottom: '1px solid var(--signal)', paddingBottom: '16px' }}>
        <span style={MONO_LABEL}>{t('home.agents.label')}</span>
        <h2 className="home-setlist-heading" style={{ margin: 0, maxWidth: '18ch' }}>
          {t('home.agents.title')}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-x-8">
        <p className="m-0 text-[16px] leading-[1.55] md:col-span-5" style={{ color: 'var(--soft)' }}>
          {t('home.agents.body')}
        </p>

        <div className="flex min-w-0 flex-col md:col-span-6 md:col-start-7" data-rise>
          <dl className="m-0">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[96px_1fr] items-baseline gap-4 py-3.5"
                style={{ borderBottom: '1px solid var(--hairline)' }}
              >
                <dt style={MONO_LABEL}>{label}</dt>
                <dd className="m-0 min-w-0 break-words" style={MONO_TEXT}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-3 py-5" style={{ borderBottom: '1px solid var(--hairline)' }}>
            <span style={MONO_LABEL}>{t('home.agents.connector')}</span>
            <code className="block break-all select-all" style={MONO_TEXT}>
              {COMMAND}
            </code>
            <div className="flex flex-wrap items-center gap-6 pt-1">
              <button type="button" onClick={copy} className="link-ink" aria-live="polite">
                {copied ? t('home.agents.copied') : t('home.agents.copy')}
              </button>
              <Link href="/llms.txt" className="link-ink">
                llms.txt →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
