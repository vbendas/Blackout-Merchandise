'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { checkSlug, submitRegistration } from './actions';
import { COUNTRIES } from './countries';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const inputClass =
  'hairline h-11 w-full rounded-[2px] bg-transparent px-3 text-sm text-signal outline-none';

interface RegisterFormProps {
  defaultDisplayName: string;
}

export function RegisterForm({ defaultDisplayName }: RegisterFormProps) {
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [storeName, setStoreName] = useState('');
  const [manualSlug, setManualSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugCheck, setSlugCheck] = useState<{ slug: string; available: boolean } | null>(null);
  const [country, setCountry] = useState('ES');
  const [discordDm, setDiscordDm] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const checkToken = useRef(0);

  // Derived, not stored: the slug tracks the shop name until the artist
  // edits it directly, at which point the manual value takes over.
  const slug = slugTouched ? manualSlug : slugify(storeName);
  // "checking" is implicit: true whenever the last resolved check is stale.
  const slugStatus: 'checking' | 'available' | 'taken' | null = !slug
    ? null
    : slugCheck?.slug !== slug
      ? 'checking'
      : slugCheck.available
        ? 'available'
        : 'taken';

  useEffect(() => {
    if (!slug) return;
    const token = ++checkToken.current;
    const timer = setTimeout(() => {
      checkSlug(slug).then((available) => {
        if (checkToken.current === token) setSlugCheck({ slug, available });
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setError('You must accept the Terms and Privacy Policy.');
      return;
    }
    if (slugStatus === 'taken') {
      setError('That shop address is taken. Try another.');
      return;
    }

    startTransition(async () => {
      const result = await submitRegistration({
        displayName,
        storeName,
        slug,
        country,
        discordDm,
        acceptedTerms,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="displayName" className="label mf-dim">
          Display name
        </label>
        <input
          id="displayName"
          className={inputClass}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="storeName" className="label mf-dim">
          Shop name
        </label>
        <input
          id="storeName"
          className={inputClass}
          value={storeName}
          onChange={(event) => setStoreName(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="slug" className="label mf-dim">
          Shop URL
        </label>
        <div className="flex items-center gap-2">
          <span className="label mf-dim shrink-0">blackoutmerch.example/</span>
          <input
            id="slug"
            className={inputClass}
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setManualSlug(slugify(event.target.value));
            }}
            required
          />
        </div>
        <p className="label">
          {slugStatus === 'checking' && <span className="mf-dim">Checking availability…</span>}
          {slugStatus === 'available' && <span>Available</span>}
          {slugStatus === 'taken' && <span>That address is taken</span>}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="country" className="label mf-dim">
          Country
        </label>
        <select
          id="country"
          className={inputClass}
          value={country}
          onChange={(event) => setCountry(event.target.value)}
        >
          {COUNTRIES.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={discordDm}
          onChange={(event) => setDiscordDm(event.target.checked)}
          className="mt-1"
        />
        <span>
          Send me Discord DMs for proofs, sales and shipping
          <span className="mf-dim block text-xs">You can turn this off anytime.</span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          required
          className="mt-1"
        />
        <span>
          I accept the{' '}
          <Link href="/terms" className="underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
        </span>
      </label>

      {error && <p className="text-sm text-signal">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 rounded-[2px] bg-signal text-sm font-medium text-paper disabled:opacity-60"
      >
        {isPending ? 'Creating your shop…' : 'Create my shop'}
      </button>
    </form>
  );
}
