'use client';

import { useState, useTransition, type CSSProperties, type FormEvent } from 'react';
import { submitWaitlist } from '@/app/waitlist/actions';
import { useT, type Key } from '@/lib/i18n';
import { OutlinedWord } from './OutlinedWord';
import { FOCUS_RING, MONO_LABEL } from './styles';

// Canonical English values sent to the server — mirrors the option list
// in app/waitlist/page.tsx / actions.ts.
const ROLE_OPTIONS = [
  'Band or musician',
  'Tattoo artist',
  'Festival or promoter',
  'Illustrator',
  'Label or collective',
  'Brand or company',
  'Something else',
];

const ROLE_KEYS: Record<string, Key> = {
  'Band or musician': 'waitlist.role.band',
  'Tattoo artist': 'waitlist.role.tattoo',
  'Festival or promoter': 'waitlist.role.festival',
  Illustrator: 'waitlist.role.illustrator',
  'Label or collective': 'waitlist.role.label',
  'Brand or company': 'waitlist.role.brand',
  'Something else': 'waitlist.role.other',
};

const FIELD: CSSProperties = {
  height: '52px',
  background: 'transparent',
  border: '1px solid color-mix(in srgb, var(--signal) 34%, transparent)',
  color: 'var(--signal)',
  borderRadius: '4px',
  padding: '0 16px',
  fontSize: '15px',
};

export function ApplySection() {
  const t = useT();
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<'invalid_email' | 'server' | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitWaitlist({ email, role: role || undefined });
      if (result.ok) {
        setSubmitted(true);
      } else {
        setError(result.error ?? 'server');
      }
    });
  }

  return (
    <section
      id="apply"
      data-scene="apply"
      className="grid grid-cols-1 items-end gap-10 md:grid-cols-[1fr_460px] md:gap-16"
      style={{
        paddingLeft: 'var(--gutter)',
        paddingRight: 'var(--gutter)',
        paddingTop: '96px',
        paddingBottom: '96px',
        borderTop: '1px solid var(--hairline)',
      }}
    >
      <OutlinedWord as="h2">Apply</OutlinedWord>

      <div className="flex flex-col gap-4 pb-1" data-rise>
        <span className="text-[18px] font-light leading-[1.4] md:text-[20px]">{t('home.apply.title')}</span>

        {submitted ? (
          <p style={{ ...MONO_LABEL, color: 'var(--soft)' }}>{t('waitlist.success')}</p>
        ) : (
          <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
            <label htmlFor="applyRole" className="sr-only">
              {t('waitlist.rolePlaceholder')}
            </label>
            <select
              id="applyRole"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isPending}
              className={`disabled:opacity-50 ${FOCUS_RING}`}
              style={{ ...FIELD, fontFamily: 'var(--font-sans), sans-serif' }}
            >
              <option value="" style={{ background: 'var(--paper)' }}>
                {t('waitlist.rolePlaceholder')}
              </option>
              {ROLE_OPTIONS.map((option) => (
                <option key={option} value={option} style={{ background: 'var(--paper)' }}>
                  {t(ROLE_KEYS[option])}
                </option>
              ))}
            </select>

            <label htmlFor="applyEmail" className="sr-only">
              {t('waitlist.emailPlaceholder')}
            </label>
            <div className="home-brief-input-row" style={{ borderBottom: '1px solid var(--signal)' }}>
              <input
                id="applyEmail"
                type="email"
                required
                placeholder={t('waitlist.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                className={`disabled:opacity-50 ${FOCUS_RING}`}
              />
              <button type="submit" disabled={isPending} className={`disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}>
                {isPending ? t('waitlist.applying') : t('waitlist.apply')} →
              </button>
            </div>
          </form>
        )}

        {error && (
          <p style={{ ...MONO_LABEL, color: 'var(--signal)' }}>
            {t(error === 'invalid_email' ? 'waitlist.errorInvalidEmail' : 'waitlist.errorGeneric')}
          </p>
        )}

        <p className="m-0 text-[13px]" style={{ color: 'var(--muted)' }}>
          {t('waitlist.privacy')}
        </p>
      </div>
    </section>
  );
}
