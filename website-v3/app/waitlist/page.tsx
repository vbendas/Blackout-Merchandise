'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageCorners } from '@/components/PageCorners';
import { PRODUCTS, type Product } from '@/lib/products';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { colourName } from '@/lib/colour-names';
import { useFavourites } from '@/lib/favourites';
import { useT, type Key } from '@/lib/i18n';
import { submitWaitlist } from './actions';

const HAIRLINE = '1px solid color-mix(in srgb, var(--signal) 22%, transparent)';

const display = {
  fontFamily: 'var(--font-display), sans-serif',
};

// Canonical English values — sent to the server and validated there
// against the exact same list (see actions.ts); only the displayed
// option label is translated.
const ROLE_OPTIONS = [
  'Band or musician',
  'Tattoo artist',
  'Illustrator',
  'Label or collective',
  'Brand or company',
  'Something else',
];

const ROLE_KEYS: Record<string, Key> = {
  'Band or musician': 'waitlist.role.band',
  'Tattoo artist': 'waitlist.role.tattoo',
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

export default function WaitlistPage() {
  const t = useT();
  // Read from the URL on mount (not useSearchParams) so this page stays
  // static — the query string only decorates it client-side.
  const [project, setProject] = useState<ProjectContext | null>(null);
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
      <PageCorners current="waitlist" />
      <main
        className="flex min-h-screen flex-col justify-center"
        style={{
          paddingLeft: 'var(--gutter)',
          paddingRight: 'var(--gutter)',
          paddingTop: '96px',
          paddingBottom: '96px',
        }}
      >
        <h1
          className="uppercase leading-[0.94]"
          style={{ ...display, fontSize: 'clamp(3rem, 8vw, 8rem)' }}
        >
          {t('waitlist.headline')}
        </h1>
        <p
          className="uppercase"
          style={{
            fontSize: '13px',
            letterSpacing: '0.08em',
            marginTop: '16px',
            color: 'color-mix(in srgb, var(--signal) 55%, transparent)',
          }}
        >
          {t('waitlist.subline')}
        </p>

        {project && (
          <div
            className="mt-10 flex flex-wrap items-center justify-between gap-4 md:max-w-md"
            style={{ border: HAIRLINE, padding: '12px 16px', fontSize: '13px' }}
          >
            <span
              style={{
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'color-mix(in srgb, var(--signal) 55%, transparent)',
              }}
            >
              {t('waitlist.projectLabel')}
            </span>
            <span>
              {project.code} — {project.name}
              {project.colour ? ` — ${colourName(project.colour)}` : ''}
            </span>
          </div>
        )}

        {savedBlanks.length > 0 && (
          <div
            className="mt-4 flex flex-col gap-3 md:max-w-md"
            style={{ border: HAIRLINE, padding: '12px 16px', fontSize: '13px' }}
          >
            <span
              className="uppercase"
              style={{
                letterSpacing: '0.08em',
                color: 'color-mix(in srgb, var(--signal) 55%, transparent)',
                opacity: 0.62,
              }}
            >
              {t('waitlist.savedBlanks')}
            </span>
            {savedBlanks.map((product) => (
              <div key={product.code} className="flex items-center justify-between gap-4">
                <span
                  className="uppercase"
                  style={{ fontSize: '12px', letterSpacing: '0.08em' }}
                >
                  {PRODUCT_DETAILS[product.code]?.name ?? product.name} — {product.code}
                </span>
                <button
                  type="button"
                  onClick={() => removeSavedBlank(product.code)}
                  className="uppercase"
                  style={{
                    fontSize: '12px',
                    letterSpacing: '0.08em',
                    textDecoration: 'underline',
                    textDecorationThickness: '1px',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'color-mix(in srgb, var(--signal) 55%, transparent)',
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
              <p
                className="uppercase"
                style={{
                  fontSize: '13px',
                  letterSpacing: '0.08em',
                  color: 'color-mix(in srgb, var(--signal) 55%, transparent)',
                }}
              >
                {t('waitlist.success')}
              </p>
              {project && (
                <p
                  className="uppercase"
                  style={{
                    fontSize: '13px',
                    letterSpacing: '0.08em',
                    marginTop: '4px',
                    color: 'color-mix(in srgb, var(--signal) 50%, transparent)',
                  }}
                >
                  {t('waitlist.projectAttached', { code: project.code })}
                </p>
              )}
              {attachedFavourites > 0 && (
                <p
                  className="uppercase"
                  style={{
                    fontSize: '13px',
                    letterSpacing: '0.08em',
                    marginTop: '4px',
                    color: 'color-mix(in srgb, var(--signal) 50%, transparent)',
                  }}
                >
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
                  className="bg-transparent uppercase disabled:opacity-50"
                  style={{
                    border: HAIRLINE,
                    padding: '14px',
                    fontSize: '13px',
                    letterSpacing: '0.08em',
                    color: 'var(--signal)',
                    background: 'var(--paper)',
                  }}
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
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    required
                    placeholder={t('waitlist.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    className="flex-1 bg-transparent uppercase placeholder:text-[color-mix(in_srgb,var(--signal)_50%,transparent)] disabled:opacity-50"
                    style={{
                      border: HAIRLINE,
                      padding: '14px',
                      fontSize: '13px',
                      letterSpacing: '0.08em',
                      color: 'var(--signal)',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="uppercase transition-colors duration-500 hover:bg-[color-mix(in_srgb,var(--signal)_8%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      border: HAIRLINE,
                      padding: '14px 24px',
                      fontSize: '13px',
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      background: 'transparent',
                      color: 'var(--signal)',
                    }}
                  >
                    {isPending ? t('waitlist.applying') : t('waitlist.apply')}
                  </button>
                </div>
              </form>
              <p
                style={{
                  fontSize: '12px',
                  marginTop: '10px',
                  opacity: 0.5,
                }}
              >
                {t('waitlist.privacy')}
              </p>
              {error && (
                <p
                  className="uppercase"
                  style={{
                    fontSize: '13px',
                    letterSpacing: '0.08em',
                    marginTop: '12px',
                    color: 'var(--signal)',
                  }}
                >
                  {t(error === 'invalid_email' ? 'waitlist.errorInvalidEmail' : 'waitlist.errorGeneric')}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
