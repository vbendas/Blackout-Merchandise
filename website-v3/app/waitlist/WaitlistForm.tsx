'use client';

import Image from 'next/image';
import { useEffect, useState, useTransition } from 'react';
import { EditorialPage, MONO, Row } from '@/components/editorial/EditorialPage';
import { RolePicker } from '@/components/editorial/RolePicker';
import { PRODUCTS, type Product } from '@/lib/products';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { colourName } from '@/lib/colour-names';
import { useFavourites } from '@/lib/favourites';
import { useT } from '@/lib/i18n';
import { submitWaitlist } from './actions';

const BRIEF_MAX = 500;

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

  const showAttachments = Boolean(brief || project || savedBlanks.length > 0);
  const nextRows = [t('waitlist.next1'), t('waitlist.next2'), t('waitlist.next3')];

  const nextAside = (
    <div style={{ marginTop: '36px', borderTop: '1px solid var(--signal)' }}>
      <h2 style={{ ...MONO, margin: 0, padding: '14px 0', fontWeight: 400 }}>{t('home.brief.next')}</h2>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {nextRows.map((text, i) => (
          <li
            key={i}
            className="grid grid-cols-[40px_1fr]"
            style={{ padding: '14px 0', borderTop: '1px solid var(--hairline)' }}
          >
            <span style={MONO}>{String(i + 1).padStart(2, '0')}</span>
            <span className="text-[16px] leading-[1.45]">{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <EditorialPage
      index={`INDX.10 — ${t('apply.index')}`}
      title={t('waitlist.headline')}
      statement={t('waitlist.statement')}
      plate={{ src: '/gallery/3a.png', caption: `${t('plate.label')} 01 — Yujin · Tour merch`, priority: true }}
      aside={nextAside}
    >
      {submitted ? (
        <div role="status" style={{ borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)', padding: '32px 0 36px' }}>
          <p
            className="font-[family-name:var(--font-condensed)] font-bold uppercase"
            style={{ margin: 0, fontSize: 'clamp(64px, 15vw, 168px)', lineHeight: 0.85, letterSpacing: '-0.02em' }}
          >
            {t('waitlist.received')}
          </p>
          <p className="text-[20px] leading-[1.4] font-light" style={{ margin: '24px 0 0' }}>
            {t('waitlist.success')}
          </p>
          {project && (
            <p style={{ ...MONO, marginTop: '12px' }}>{t('waitlist.projectAttached', { code: project.code })}</p>
          )}
          {attachedFavourites > 0 && (
            <p style={{ ...MONO, marginTop: '4px' }}>{t.tPlural('waitlist.savedBlanksAttached', attachedFavourites)}</p>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--hairline)' }}>
          <Row n="01">
            <RolePicker value={role} onChange={setRole} disabled={isPending} />
          </Row>

          {showAttachments && (
            <Row n="02">
              {brief && (
                <>
                  <span style={MONO}>{t('home.brief.label')}</span>
                  <span className="text-[20px] leading-[1.4] font-light">“{brief}”</span>
                </>
              )}
              {project && (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span style={MONO}>{t('waitlist.projectLabel')}</span>
                  <span style={{ ...MONO, color: 'var(--signal)' }}>
                    {project.code} — {project.name}
                    {project.colour ? ` — ${colourName(project.colour)}` : ''}
                  </span>
                </div>
              )}
              {savedBlanks.length > 0 && (
                <>
                  <span style={MONO}>{t('waitlist.savedBlanks')}</span>
                  <ul className="flex flex-wrap gap-x-6 gap-y-4" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {savedBlanks.map((product) => (
                      <li key={product.code} className="flex items-center gap-3">
                        <Image src={product.src} alt="" width={56} height={64} className="h-16 w-14 object-contain" />
                        <span className="flex flex-col items-start gap-1">
                          <span style={{ ...MONO, color: 'var(--signal)' }}>{product.code}</span>
                          <span className="text-[13px] leading-tight" style={{ color: 'var(--muted)' }}>
                            {PRODUCT_DETAILS[product.code]?.name ?? product.name}
                          </span>
                          <button
                            type="button"
                            className="link-ink"
                            style={{ fontSize: '12px' }}
                            onClick={() => removeSavedBlank(product.code)}
                          >
                            {t('common.remove')}
                            <span className="sr-only"> {product.code}</span>
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Row>
          )}

          <Row n={showAttachments ? '03' : '02'}>
            <label htmlFor="waitlist-email" style={MONO}>
              {t('waitlist.emailLabel')}
            </label>
            <input
              id="waitlist-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@yourband.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              aria-invalid={error === 'invalid_email' ? true : undefined}
              aria-describedby={error ? 'waitlist-error' : undefined}
              className="h-14 w-full border-0 bg-transparent px-0 text-[22px] font-light placeholder:text-[color-mix(in_srgb,var(--signal)_40%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--signal)] disabled:opacity-50"
              style={{ borderBottom: '1px solid var(--signal)', borderRadius: 0, color: 'var(--signal)' }}
            />
            {error && (
              <p id="waitlist-error" role="alert" style={{ ...MONO, margin: 0, color: 'var(--signal)' }}>
                {t(error === 'invalid_email' ? 'waitlist.errorInvalidEmail' : 'waitlist.errorGeneric')}
              </p>
            )}
          </Row>

          <div className="flex flex-col gap-6 pt-7 pb-8 md:flex-row md:items-center md:justify-between md:pl-[72px]">
            <p className="max-w-[380px] text-[13px] leading-[1.7]" style={{ margin: 0, color: 'var(--muted)' }}>
              {t('waitlist.privacy')}
            </p>
            <button type="submit" disabled={isPending} className="btn-ink" style={{ height: '64px', padding: '0 40px', fontSize: '26px' }}>
              {isPending ? t('waitlist.applying') : `${t('waitlist.apply')} →`}
            </button>
          </div>
        </form>
      )}
    </EditorialPage>
  );
}
