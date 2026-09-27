'use client';

import { useT } from '@/lib/i18n';
import { SOCIALS } from '@/lib/socials';

const display = {
  fontFamily: 'var(--font-display), sans-serif',
};

// PLACEHOLDER — swap for the real address when the inbox exists.
const EMAIL = 'hello@merchfrom.com';

export function ContactCopy() {
  const t = useT();

  return (
    <>
      <h1
        className="leading-[1.0]"
        style={{ ...display, fontWeight: 600, fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}
      >
        {t('contact.headline')}
      </h1>
      <a
        href={`mailto:${EMAIL}`}
        className="leading-[1.05] transition-[filter] duration-200 hover:blur-[3px]"
        style={{
          ...display,
          fontWeight: 600,
          fontSize: 'clamp(1.75rem, 5vw, 3rem)',
          color: 'var(--muted)',
        }}
      >
        {EMAIL}
      </a>

      <div className="mt-16 grid gap-6 text-[17px] leading-[1.5] md:mt-24 md:grid-cols-12 md:gap-8" style={{ color: 'var(--soft)' }}>
        <p className="md:col-span-4">{t('contact.paragraph')}</p>
        <div
          className="flex flex-col gap-1 uppercase tracking-[0.08em] md:col-span-4"
          style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '12px' }}
        >
          <span style={{ color: 'var(--muted)' }}>{t('contact.shop')}</span>
          <span style={{ color: 'var(--signal)' }}>Barcelona, Spain</span>
        </div>
        <div
          className="flex flex-col gap-1 uppercase tracking-[0.08em] md:col-span-4"
          style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '12px' }}
        >
          <span style={{ color: 'var(--muted)' }}>{t('contact.elsewhere')}</span>
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-1 underline-offset-4"
              style={{ color: 'var(--signal)' }}
            >
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
