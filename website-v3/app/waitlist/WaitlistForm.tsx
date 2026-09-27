'use client';

import { useEffect, useState, useTransition } from 'react';
import { PRODUCTS, type Product } from '@/lib/products';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { colourName } from '@/lib/colour-names';
import { useFavourites } from '@/lib/favourites';
import { useT, type Key } from '@/lib/i18n';
import { submitWaitlist } from './actions';

const HAIRLINE = '1px solid var(--hairline)';
const BRIEF_MAX = 500;

const display = {
  fontFamily: 'var(--font-display), sans-serif',
};

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

// Canonical English values — sent to the server and validated there
// against the exact same list (see actions.ts); only the displayed
// option label is translated.
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

interface ProjectContext {
  code: string;
  name: string;
  colour: string | null;
}

export function WaitlistForm() {
  const t = useT();
  // Read from the URL on mount (not useSearchParams) so this page stays
  // static — the query string only decorates it client-side.
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<'invalid_email' | 'server' | null>(null);
  const [isPending, startTransition] = useTransition();
  const [urlFavourites, setUrlFavourites] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [attachedFavourites, setAttachedFavourites] = useState(0);
  const { codes: favouriteCodes, has: hasFavourite, toggle: toggleFavourite } = useFavourites();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('product');
    if (code) {
      const product = PRODUCTS.find((p) => p.code === code);
      if (product) {
        setProject({
          code,
          name: PRODUCT_DETAILS[code]?.name ?? product.name,
          colour: params.get('colour'),
        });
      }
    }
    const favourites = params.get('favourites');
    if (favourites) {
      setUrlFavourites(favourites.split(',').map((c) => c.trim()).filter(Boolean));
    }
    const briefParam = params.get('brief');
    if (briefParam) {
      setBrief(briefParam.trim().slice(0, BRIEF_MAX));
    }
  }, []);

  const savedCodes = Array.from(new Set([...favouriteCodes, ...urlFavourites])).filter(
    (code) => !dismissed.includes(code)
  );
  const savedBlanks = savedCodes
    .map((code) => PRODUCTS.find((p) => p.code === code))
    .filter((product): product is Product => Boolean(product));

  function removeSavedBlank(code: string) {
    if (hasFavourite(code)) toggleFavourite(code);
    setDismissed((prev) => (prev.includes(code) ? prev : [...prev, code]));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const favourites = savedBlanks.map((product) => product.code);
    startTransition(async () => {
      const result = await submitWaitlist({
        email,
        product: project?.code,
        colour: project?.colour ?? undefined,
        role: role || undefined,
        favourites,
        brief: brief ?? undefined,
      });
      if (result.ok) {
        setAttachedFavourites(favourites.length);
        setSubmitted(true);
      } else {
        setError(result.error ?? 'server');
      }
    });
  }

  return (
    <>
      <h1 className="leading-[1.0]" style={{ ...display, fontWeight: 600, fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>
        {t('waitlist.headline')}
      </h1>
      <p
        style={{
          ...mono,
          marginTop: '16px',
          color: 'var(--muted)',
        }}
      >
        {t('waitlist.subline')}
      </p>

      {brief && (
        <div
          className="mt-10 md:max-w-md"
          style={{ border: HAIRLINE, background: 'var(--raised)', padding: '12px 16px', fontSize: '14px' }}
        >
          <span style={{ ...mono, display: 'block', marginBottom: '6px', color: 'var(--muted)' }}>
            {t('home.brief.label')}
          </span>
          <span style={{ display: 'block', fontSize: '15px', lineHeight: 1.5, color: 'var(--soft)' }}>“{brief}”</span>
        </div>
      )}

      {project && (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-4 md:max-w-md"
          style={{ border: HAIRLINE, padding: '12px 16px', fontSize: '14px' }}
        >
          <span style={{ ...mono, color: 'var(--muted)' }}>{t('waitlist.projectLabel')}</span>
          <span style={{ color: 'var(--signal)' }}>
            {project.code} — {project.name}
            {project.colour ? ` — ${colourName(project.colour)}` : ''}
          </span>
        </div>
      )}

      {savedBlanks.length > 0 && (
        <div
          className="mt-4 flex flex-col gap-3 md:max-w-md"
          style={{ border: HAIRLINE, padding: '12px 16px', fontSize: '14px' }}
        >
          <span style={{ ...mono, color: 'var(--muted)' }}>{t('waitlist.savedBlanks')}</span>
          {savedBlanks.map((product) => (
            <div key={product.code} className="flex items-center justify-between gap-4">
              <span style={{ ...mono, color: 'var(--signal)' }}>
                {PRODUCT_DETAILS[product.code]?.name ?? product.name} — {product.code}
              </span>
              <button
                type="button"
                onClick={() => removeSavedBlank(product.code)}
                style={{
                  ...mono,
                  textDecoration: 'underline',
                  textDecorationThickness: '1px',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: 'var(--muted)',
                }}
              >
                {t('common.remove')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 md:max-w-md">
        {submitted ? (
          <>
            <p style={{ ...mono, color: 'var(--muted)' }}>{t('waitlist.success')}</p>
            {project && (
              <p style={{ ...mono, marginTop: '4px', color: 'var(--muted)' }}>
                {t('waitlist.projectAttached', { code: project.code })}
              </p>
            )}
            {attachedFavourites > 0 && (
              <p style={{ ...mono, marginTop: '4px', color: 'var(--muted)' }}>
                {t.tPlural('waitlist.savedBlanksAttached', attachedFavourites)}
              </p>
            )}
          </>
        ) : (
          <>
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isPending}
                className="bg-transparent disabled:opacity-50"
                style={{
                  ...mono,
                  border: HAIRLINE,
                  padding: '14px',
                  color: 'var(--signal)',
                  background: 'var(--surface)',
                }}
              >
                <option value="" style={{ background: 'var(--surface)' }}>
                  {t('waitlist.rolePlaceholder')}
                </option>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option} style={{ background: 'var(--surface)' }}>
                    {t(ROLE_KEYS[option])}
                  </option>
                ))}
              </select>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  required
                  placeholder={t('waitlist.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                  className="flex-1 bg-transparent placeholder:text-[color-mix(in_srgb,var(--signal)_50%,transparent)] disabled:opacity-50"
                  style={{
                    ...mono,
                    border: HAIRLINE,
                    padding: '14px',
                    color: 'var(--signal)',
                    background: 'var(--surface)',
                  }}
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="transition-colors duration-500 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    ...mono,
                    padding: '14px 24px',
                    cursor: 'pointer',
                    background: 'var(--signal)',
                    color: 'var(--paper)',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                >
                  {isPending ? t('waitlist.applying') : t('waitlist.apply')}
                </button>
              </div>
            </form>
            <p style={{ fontSize: '13px', marginTop: '10px', color: 'var(--muted)' }}>{t('waitlist.privacy')}</p>
            {error && (
              <p style={{ ...mono, marginTop: '12px', color: 'var(--signal)' }}>
                {t(error === 'invalid_email' ? 'waitlist.errorInvalidEmail' : 'waitlist.errorGeneric')}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
