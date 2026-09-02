'use client';

import { useEffect, useState, useTransition } from 'react';
import { PageCorners } from '@/components/PageCorners';
import { PRODUCTS } from '@/lib/products';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { colourName } from '@/lib/colour-names';
import { submitWaitlist } from './actions';

const HAIRLINE = '1px solid color-mix(in srgb, var(--signal) 22%, transparent)';

const display = {
  fontFamily: 'var(--font-display), sans-serif',
};

const ROLE_OPTIONS = [
  'Band or musician',
  'Tattoo artist',
  'Illustrator',
  'Label or collective',
  'Brand or company',
  'Something else',
];

interface ProjectContext {
  code: string;
  name: string;
  colour: string | null;
}

export default function WaitlistPage() {
  // Read from the URL on mount (not useSearchParams) so this page stays
  // static — the query string only decorates it client-side.
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('product');
    if (!code) return;
    const product = PRODUCTS.find((p) => p.code === code);
    if (!product) return;
    setProject({
      code,
      name: PRODUCT_DETAILS[code]?.name ?? product.name,
      colour: params.get('colour'),
    });
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitWaitlist({
        email,
        product: project?.code,
        colour: project?.colour ?? undefined,
        role: role || undefined,
      });
      if (result.ok) {
        setSubmitted(true);
      } else {
        setError(result.error ?? 'Something went wrong — try again.');
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
          Join the waitlist.
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
          Applications open. One hundred creators a month.
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
              Project
            </span>
            <span>
              {project.code} — {project.name}
              {project.colour ? ` — ${colourName(project.colour)}` : ''}
            </span>
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
                Noted — we will be in touch.
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
                  Project {project.code} attached.
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
                    I&apos;m a…
                  </option>
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option} style={{ background: 'var(--paper)' }}>
                      {option}
                    </option>
                  ))}
                </select>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    required
                    placeholder="YOUR EMAIL"
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
                    {isPending ? 'Applying…' : 'Apply'}
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
                Your email is used only to contact you about MerchFrom. No newsletters, no sharing.
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
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
