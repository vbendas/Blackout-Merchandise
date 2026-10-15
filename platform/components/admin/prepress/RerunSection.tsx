'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { rerunPackAction } from '@/app/(chat)/admin/prepress/actions';
import { ABSOLUTE_MAX_SCREENS } from '@/lib/print/defaults';
import type { ScreenMethod } from '@/lib/print/types';
import { surchargeNote } from './format';
import { PackWatcher } from './PackWatcher';
import { rerunFormFrom, rerunSettingsFromForm, SCREEN_METHODS, type RerunDefaults, type RerunFormValues } from './rules';

type NumberField = Exclude<keyof RerunFormValues, 'method'>;

const NUMBER_FIELDS: { key: NumberField; label: string; step: string; min?: number; max?: number }[] = [
  { key: 'maxScreens', label: `Screens (up to ${ABSOLUTE_MAX_SCREENS})`, step: '1', min: 1, max: ABSOLUTE_MAX_SCREENS },
  { key: 'lpi', label: 'Lines per inch', step: '1' },
  { key: 'angleDeg', label: 'Angle (°)', step: '0.5' },
  { key: 'underbaseChokeMm', label: 'Underbase choke (mm)', step: '0.01' },
  { key: 'trapMm', label: 'Trap (mm)', step: '0.05' },
];

/** "Run again with changes" (Plan section 8): method, screen count, lines per
 * inch, angle, underbase choke and trap. The form opens on the pack's own values
 * and only what differs is sent, so running again with nothing changed is
 * greyed out rather than a wasted job. The separation runs in the background; the
 * pack page keeps checking until it is built. */
export function RerunSection({ packId, defaults, failed = false }: { packId: string; defaults: RerunDefaults; failed?: boolean }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<RerunFormValues>(() => rerunFormFrom(defaults));
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Once a run is queued the page keeps asking: when the job finishes, this pack is replaced by the new one.
  const queued = message?.tone === 'ok';
  const parsed = rerunSettingsFromForm(values, defaults);
  const errors: Partial<Record<keyof RerunFormValues, string>> = parsed.ok ? {} : parsed.errors;
  const screens = Number(values.maxScreens);

  function set<K extends keyof RerunFormValues>(key: K, value: RerunFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  // A pack whose build failed can be run again as it is; otherwise only a change is worth a job.
  const canRun = parsed.ok && (parsed.changed || failed) && !queued;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed.ok || !canRun) return;
    const settings = parsed.settings;
    setMessage(null);
    startTransition(async () => {
      const result = await rerunPackAction(packId, settings);
      if (result.ok) setMessage({ tone: 'ok', text: 'Run queued. This page updates when the new films are ready.' });
      else setMessage({ tone: 'error', text: result.error });
    });
  }

  return (
    <section aria-labelledby={`${uid}-h`} className="pp-box">
      <div className="pp-boxhead">
        <h2 id={`${uid}-h`} className="mf-label">
          Run again with changes
        </h2>
        <button type="button" className="pp-btn pp-btn-sm" aria-expanded={open} aria-controls={`${uid}-form`} onClick={() => setOpen(!open)}>
          {open ? 'Hide' : 'Show settings'}
        </button>
      </div>
      {open ? (
        <form id={`${uid}-form`} className="pp-section pp-section-tight" onSubmit={onSubmit} noValidate>
          <div className="pp-fields">
            <div className="pp-fieldwrap">
              <label className="pp-dim" htmlFor={`${uid}-method`}>
                Method
              </label>
              <select id={`${uid}-method`} className="pp-field" value={values.method} onChange={(event) => set('method', event.target.value as ScreenMethod)}>
                {SCREEN_METHODS.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            {NUMBER_FIELDS.map((field) => {
              const error = errors[field.key];
              return (
                <div key={field.key} className="pp-fieldwrap">
                  <label className="pp-dim" htmlFor={`${uid}-${field.key}`}>
                    {field.label}
                  </label>
                  <input
                    id={`${uid}-${field.key}`}
                    className="pp-field"
                    type="number"
                    inputMode="decimal"
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    value={values[field.key]}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${uid}-${field.key}-error` : undefined}
                    onChange={(event) => set(field.key, event.target.value)}
                  />
                  {error ? (
                    <span id={`${uid}-${field.key}-error`} role="alert" className="pp-error">
                      {error}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="pp-actions">
            <button type="submit" className="pp-btn pp-btn-strong" disabled={pending || !canRun}>
              {pending ? 'Queuing…' : 'Run again'}
            </button>
            <span className="pp-dim">{surchargeNote(Number.isFinite(screens) ? screens : 0)}</span>
          </div>
          {message ? (
            <p role={message.tone === 'error' ? 'alert' : 'status'} className={message.tone === 'error' ? 'pp-error' : 'pp-soft'}>
              {message.text}
            </p>
          ) : null}
          <PackWatcher packId={packId} watching={queued} limitSeconds={300} />
        </form>
      ) : null}
    </section>
  );
}

/** "Run again" for a DTG/DTF pack whose build failed: the same settings, a new job. The page keeps
 * checking until the new pack is built. */
export function RunAgainButton({ packId }: { packId: string }) {
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const queued = message?.tone === 'ok';

  function runAgain() {
    setMessage(null);
    startTransition(async () => {
      const result = await rerunPackAction(packId, {});
      if (result.ok) setMessage({ tone: 'ok', text: 'Run queued. This page updates when the new files are ready.' });
      else setMessage({ tone: 'error', text: result.error });
    });
  }

  return (
    <section aria-label="Run again" className="pp-box">
      <div className="pp-actions">
        <button type="button" className="pp-btn pp-btn-strong" disabled={pending || queued} onClick={runAgain}>
          {pending ? 'Queuing…' : 'Run again'}
        </button>
      </div>
      {message ? (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={message.tone === 'error' ? 'pp-error' : 'pp-soft'}>
          {message.text}
        </p>
      ) : null}
      <PackWatcher packId={packId} watching={queued} limitSeconds={300} />
    </section>
  );
}
