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
        className="uppercase leading-[0.94]"
        style={{ ...display, fontSize: 'clamp(3rem, 8vw, 8rem)' }}
      >
        {t('contact.headline')}
      </h1>
      <a
        href={`mailto:${EMAIL}`}
        className="uppercase leading-[0.94] transition-[filter] duration-200 hover:blur-[3px]"
        style={{
          ...display,
          fontSize: 'clamp(2rem, 5.5vw, 5.5rem)',
          color: 'color-mix(in srgb, var(--signal) 38%, transparent)',
        }}
      >
        {EMAIL}
      </a>

      <div className="mt-16 grid gap-6 text-[15px] leading-[1.5] md:mt-24 md:grid-cols-12 md:gap-8">
        <p className="md:col-span-4">{t('contact.paragraph')}</p>
        <div className="flex flex-col gap-1 text-[13px] uppercase tracking-[0.08em] md:col-span-4">
          <span style={{ color: 'color-mix(in srgb, var(--signal) 50%, transparent)' }}>{t('contact.shop')}</span>
          <span>Barcelos, Portugal</span>
        </div>
        <div className="flex flex-col gap-1 text-[13px] uppercase tracking-[0.08em] md:col-span-4">
          <span style={{ color: 'color-mix(in srgb, var(--signal) 50%, transparent)' }}>{t('contact.elsewhere')}</span>
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-1 underline-offset-4"
            >
              {social.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
