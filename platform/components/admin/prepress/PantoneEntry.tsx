'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import type { PackFilmView } from '@/lib/services/prepress';
import { assignPantoneAction } from '@/app/(chat)/admin/prepress/actions';
import { checkPantoneCode } from './rules';

/** An ink with no Pantone code yet (Plan section 5): what the house library
 * suggests for a close colour, with a Use button, and a box to type the code the
 * auditor found in MagnaMix. The platform remembers the pick, so the next close
 * colour is named on its own. Typing needs Work access; the services check it
 * again. */
export function PantoneEntry({ packId, film, canWork }: { packId: string; film: PackFilmView; canWork: boolean }) {
  const inputId = useId();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const suggestion = film.suggestion;

  function save(value: string) {
    const checked = checkPantoneCode(value);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await assignPantoneAction(packId, film.plateIndex, checked.value);
      if (!result.ok) setError(result.error);
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(code);
  }

  return (
    <div className="pp-code">
      <span className="pp-code-need">Pantone code needed</span>
      {suggestion ? (
        <div className="pp-code-row">
          <span className="pp-soft">
            House library: <span className="pp-mono">{suggestion.code}</span>{' '}
            <span title="Colour difference (ΔE2000) between this ink and the colour the code was picked for. Under 3 is a close match.">
              (ΔE {suggestion.deltaE.toFixed(1)})
            </span>
          </span>
          {canWork ? (
            <button type="button" className="pp-btn pp-btn-xs" disabled={pending} aria-label={`Use ${suggestion.code} for ink ${film.n}`} onClick={() => save(suggestion.code)}>
              Use
            </button>
          ) : null}
        </div>
      ) : (
        <span className="pp-soft">No close match in the house library yet.</span>
      )}
      {canWork ? (
        <form className="pp-code-row" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor={inputId}>
            Pantone code for ink {film.n}
          </label>
          <input
            id={inputId}
            className="pp-field"
            value={code}
            placeholder="Code from MagnaMix"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={(event) => setCode(event.target.value)}
          />
          <button type="submit" className="pp-btn pp-btn-xs" disabled={pending || code.trim() === ''}>
            Save code
          </button>
        </form>
      ) : null}
      {error ? (
        <span id={`${inputId}-error`} role="alert" className="pp-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
