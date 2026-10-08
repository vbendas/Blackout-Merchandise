'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { submitWaitlist } from '@/app/waitlist/actions';
import { RolePicker } from '@/components/editorial/RolePicker';
import { useT } from '@/lib/i18n';
import { OutlinedWord } from './OutlinedWord';
import { FOCUS_RING, MONO_LABEL } from './styles';

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
        <span style={MONO_LABEL}>{t('apply.index')}</span>
        <span className="text-[18px] font-light leading-[1.4] md:text-[20px]">{t('home.apply.title')}</span>

        {submitted ? (
          <p style={{ ...MONO_LABEL, color: 'var(--soft)' }} role="status">
            {t('waitlist.success')}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-3">
              <RolePicker value={role} onChange={setRole} disabled={isPending} />
            </div>

            <label htmlFor="applyEmail" className="sr-only">
              {t('waitlist.emailPlaceholder')}
            </label>
            <div className="home-brief-input-row">
              <input
                id="applyEmail"
                type="email"
                required
                autoComplete="email"
                placeholder={t('waitlist.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                className={`disabled:opacity-50 ${FOCUS_RING}`}
              />
            </div>
            <button type="submit" disabled={isPending} className="btn-ink w-full">
              {isPending ? t('waitlist.applying') : `${t('waitlist.apply')} →`}
            </button>
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
