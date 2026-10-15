'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import type { PackFilmView } from '@/lib/services/prepress';
import { rerunPackAction } from '@/app/(chat)/admin/prepress/actions';
import { parseHex } from './format';
import { PackWatcher } from './PackWatcher';

/** "Change ink" for one film (Plan section 8, ink substitution): the auditor
 * picks another colour for that press position and the pack is separated again
 * with it. The rest of the settings stay as the pack was made. It runs as a
 * job, so the answer here is "queued"; the page updates when the films are done. */
export function ChangeInk({ packId, film, onClose }: { packId: string; film: PackFilmView; onClose: () => void }) {
  const id = useId();
  const [text, setText] = useState(film.hex);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [pending, startTransition] = useTransition();
  const parsed = parseHex(text);
  const unchanged = parsed === film.hex.toUpperCase();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed) {
      setError('Enter the colour as six hex digits, such as #C363DA.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rerunPackAction(packId, { inkSubstitutions: [{ plateIndex: film.plateIndex, hex: parsed }] });
      if (result.ok) setQueued(true);
      else setError(result.error);
    });
  }

  return (
    <form className="pp-change-form" onSubmit={onSubmit} aria-label={`Change ink ${film.n}: ${film.label}`}>
      <p className="pp-change-note">
        The pack is separated again with this colour in place of the engine’s choice. The artist is asked again only if the proof changes.
      </p>
      <div className="pp-fieldwrap">
        <label className="pp-dim" htmlFor={`${id}-colour`}>
          New colour
        </label>
        <div className="pp-code-row">
          <input
            type="color"
            className="pp-swatch-input"
            value={(parsed ?? film.hex).toLowerCase()}
            aria-label="Pick the colour"
            onChange={(event) => setText(event.target.value.toUpperCase())}
          />
          <input
            id={`${id}-colour`}
            className="pp-field pp-mono"
            value={text}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
      </div>
      <div className="pp-actions">
        <button type="submit" className="pp-btn pp-btn-strong" disabled={pending || queued || unchanged || !parsed}>
          {pending ? 'Queuing…' : 'Run again with this ink'}
        </button>
        <button type="button" className="pp-btn" onClick={onClose}>
          {queued ? 'Close' : 'Cancel'}
        </button>
      </div>
      {error ? (
        <span id={`${id}-error`} role="alert" className="pp-error pp-full">
          {error}
        </span>
      ) : null}
      {queued ? (
        <span role="status" className="pp-soft pp-full">
          Run queued. This page updates when the new films are ready.
        </span>
      ) : null}
      <PackWatcher packId={packId} watching={queued} limitSeconds={300} />
    </form>
  );
}
