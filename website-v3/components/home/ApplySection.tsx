'use client';

import { useState, useTransition, type CSSProperties, type FormEvent } from 'react';
import { submitWaitlist } from '@/app/waitlist/actions';
import { useT, type Key } from '@/lib/i18n';
import { FOCUS_RING, HAIRLINE, MONO_LABEL, PRIMARY_BTN, SECTION_PAD } from './styles';

// Canonical English values sent to the server — mirrors the option list
// in app/waitlist/page.tsx / actions.ts (WP3 is adding "Festival or
// promoter" to that list concurrently with this file).
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
  border: '1px solid rgba(237,228,221,.34)',
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
      className={`flex flex-col items-center gap-7 text-center ${SECTION_PAD}`}
      style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)', borderTop: HAIRLINE }}
    >
      <span style={MONO_LABEL}>{t('home.apply.label')}</span>
      <h2 className="m-0 max-w-[720px] text-[36px] leading-[1.08] font-semibold tracking-[-0.015em] md:text-[56px] md:leading-[1.05]">
        {t('home.apply.title')}
      </h2>

      {submitted ? (
        <p style={{ ...MONO_LABEL, color: 'var(--soft)' }}>{t('waitlist.success')}</p>
      ) : (
        <form onSubmit={onSubmit} className="flex w-full max-w-[720px] flex-col gap-3 md:flex-row">
          <label htmlFor="applyRole" className="sr-only">
            {t('waitlist.rolePlaceholder')}
          </label>
          <select
            id="applyRole"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isPending}
            className={`disabled:opacity-50 md:w-[220px] ${FOCUS_RING}`}
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
          <input
            id="applyEmail"
            type="email"
            required
            placeholder={t('waitlist.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            className={`flex-none md:flex-1 placeholder:text-[color-mix(in_srgb,var(--signal)_50%,transparent)] disabled:opacity-50 ${FOCUS_RING}`}
            style={{ ...FIELD, fontFamily: 'var(--font-sans), sans-serif' }}
          />

          <button
            type="submit"
            disabled={isPending}
            className={`disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            style={{ ...PRIMARY_BTN, height: '52px', padding: '0 28px' }}
          >
            {isPending ? t('waitlist.applying') : t('waitlist.apply')}
          </button>
        </form>
      )}

      {error && (
        <p style={{ ...MONO_LABEL, color: 'var(--signal)' }}>
          {t(error === 'invalid_email' ? 'waitlist.errorInvalidEmail' : 'waitlist.errorGeneric')}
        </p>
      )}

      <p className="m-0 text-[14px]" style={{ color: 'var(--muted)' }}>
        {t('waitlist.privacy')}
      </p>
    </section>
  );
}
