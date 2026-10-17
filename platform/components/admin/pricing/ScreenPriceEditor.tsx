'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { saveScreenPriceTableAction } from '@/app/(chat)/admin/pricing/actions';
import { formatStamp } from '@/components/admin/prepress/format';
import { ABSOLUTE_MAX_SCREENS, EXTRA_SCREEN_CENTS_PER_PIECE, STANDARD_MAX_SCREENS, euros, screenSurchargeCents, type ScreenPriceTable } from '@/lib/pricing/screen-print';
import { cn } from '@/lib/utils';
import {
  EXAMPLE_GARMENT_CENTS,
  addBand,
  addBreak,
  addTier,
  bandLabel,
  canAddBand,
  canAddBreak,
  canAddTier,
  exampleRows,
  formFromTable,
  removeBand,
  removeBreak,
  removeTier,
  tableFromForm,
  tierLabel,
  type PriceFormErrors,
  type PriceFormValues,
} from './price-form';

type Message = { tone: 'ok' | 'error'; text: string };

/** The screens of the example in the fixed rule's text: a front and a back of this many. */
const EXAMPLE_POSITION_SCREENS = 10;

/** The screen-print price table (Plan section 10). Anyone with Catalogue and pricing "View" reads it; with "Manage" the same
 * numbers become boxes. Checks run as you type once a save has been tried, and a failed save moves focus to the first box
 * that needs a look. The table as last saved is kept here, so a save leaves the boxes as they are, the Save button greys
 * out, and the "Saved" message stays. Until a table has been saved, every number is a placeholder, and the page says so. */
export function ScreenPriceEditor({
  initial,
  placeholder,
  updatedLabel,
  canManage,
}: {
  initial: ScreenPriceTable;
  placeholder: boolean;
  updatedLabel: string | null;
  canManage: boolean;
}) {
  const uid = useId();
  const [saved, setSaved] = useState<ScreenPriceTable>(initial);
  const [isPlaceholder, setIsPlaceholder] = useState(placeholder);
  const [stamp, setStamp] = useState<string | null>(updatedLabel);
  // Someone who can only read always sees what the page was drawn from.
  const base = canManage ? saved : initial;
  const baseValues = formFromTable(base);
  const [values, setValues] = useState<PriceFormValues>(() => formFromTable(initial));
  const [tried, setTried] = useState(false);
  const [serverErrors, setServerErrors] = useState<PriceFormErrors>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = canManage ? values : baseValues;
  const dirty = JSON.stringify(values) !== JSON.stringify(baseValues);
  const checked = tableFromForm(shown);
  const errors: PriceFormErrors = { ...(tried && !checked.ok ? checked.errors : {}), ...serverErrors };
  // The examples follow what is typed while it makes sense, and the saved table while it doesn't.
  const exampleTable = checked.ok ? checked.table : base;
  const examples = exampleRows(exampleTable);

  function change(next: PriceFormValues) {
    setValues(next);
    setServerErrors({});
    setMessage(null);
  }

  function reset() {
    setValues(baseValues);
    setTried(false);
    setServerErrors({});
    setMessage(null);
  }

  const id = (key: string) => `${uid}-${key.replace(/\./g, '-')}`;

  function focusBox(key: string) {
    document.getElementById(id(key))?.focus();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setTried(true);
    if (!checked.ok) {
      setMessage({ tone: 'error', text: 'Some prices need a look. They are marked below.' });
      focusBox(checked.first);
      return;
    }
    setMessage(null);
    const table = checked.table;
    startTransition(async () => {
      try {
        const result = await saveScreenPriceTableAction(table);
        if (result.ok) {
          setSaved(table);
          setIsPlaceholder(false);
          setStamp(formatStamp(result.updatedAt) || null);
          setTried(false);
          setServerErrors({});
          setMessage({ tone: 'ok', text: 'Saved. Runs quoted from now on use these prices.' });
        } else if (result.field) {
          setServerErrors({ [result.field]: result.error });
          setMessage({ tone: 'error', text: 'Some prices need a look. They are marked below.' });
          focusBox(result.field);
        } else {
          setMessage({ tone: 'error', text: result.error });
        }
      } catch {
        setMessage({ tone: 'error', text: "You don't have Manage access to Catalogue and pricing, so nothing was saved." });
      }
    });
  }

  /** A box, or its number as plain text for someone who can only read. */
  function box(key: string, label: string, value: string, onChange: (next: string) => void, opts: { className?: string; disabled?: boolean; describedBy?: string } = {}) {
    if (!canManage) return <span className="pp-mono">{value || '–'}</span>;
    const error = errors[key];
    return (
      <input
        id={id(key)}
        className={cn('pp-field prc-box', opts.className)}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        value={value}
        disabled={opts.disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? `${id(key)}-error` : null, opts.describedBy].filter(Boolean).join(' ') || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  const errorFor = (key: string) =>
    errors[key] ? (
      <span id={`${id(key)}-error`} role="alert" className="pp-error prc-error">
        {errors[key]}
      </span>
    ) : null;

  const gridErrors = Object.entries(errors).filter(([key]) => key.startsWith('breaks.') || key.startsWith('tiers.'));
  // A problem with a whole list, not one box (an empty table), has no box to sit by: it reads at the foot.
  const formError = errors.form ?? errors.breaks ?? errors.tiers ?? errors.bands;

  return (
    <form className="prc-form" onSubmit={onSubmit} noValidate>
      {isPlaceholder ? (
        <div className="prc-note" role="note">
          <p className="prc-note-title">Placeholder prices</p>
          <p>
            Nothing here has been set yet. The prices carry on from the old seed prices (1 screen €3.50, 2 screens €5.20, 3 screens €6.90 a piece, then €1.70 more for each screen), with a 30% margin, no setup
            fee and no extra charge for a second print position or a bigger print. Runs are quoted from them until you save your own.
          </p>
        </div>
      ) : null}

      <section className="prc-group" aria-labelledby={id('rule')}>
        <h2 id={id('rule')} className="mf-label">
          Fixed rule
        </h2>
        <p className="pp-soft">
          1 to {STANDARD_MAX_SCREENS} screens is the standard price. Each screen above {STANDARD_MAX_SCREENS} adds {euros(EXTRA_SCREEN_CENTS_PER_PIECE)} per piece, up to {ABSOLUTE_MAX_SCREENS} screens, counted per print position on
          that position&apos;s own design: {STANDARD_MAX_SCREENS + 1} screens add {euros(screenSurchargeCents(STANDARD_MAX_SCREENS + 1))}, {STANDARD_MAX_SCREENS + 4} add{' '}
          {euros(screenSurchargeCents(STANDARD_MAX_SCREENS + 4))}, {ABSOLUTE_MAX_SCREENS} add {euros(screenSurchargeCents(ABSOLUTE_MAX_SCREENS))} on one position, so a front and a back of {EXAMPLE_POSITION_SCREENS} screens each add{' '}
          {euros(screenSurchargeCents(EXAMPLE_POSITION_SCREENS))} + {euros(screenSurchargeCents(EXAMPLE_POSITION_SCREENS))} = {euros(2 * screenSurchargeCents(EXAMPLE_POSITION_SCREENS))} in all. A position that needs more than{' '}
          {ABSOLUTE_MAX_SCREENS} can&apos;t be quoted. It applies to screen-printed runs only, never to shop products; DTG and DTF runs pay the shop extras for more print positions instead. It is a fixed rule, not a
          setting.
        </p>
      </section>

      <section className="prc-group" aria-labelledby={id('prices')}>
        <h2 id={id('prices')} className="mf-label">
          Print price per piece{isPlaceholder ? <span className="prc-tag">Placeholder</span> : null}
        </h2>
        <p className="pp-dim">
          The print only: the blank&apos;s own cost and the margin are added on top. A design with more than {STANDARD_MAX_SCREENS} screens uses the last tier&apos;s price, plus the fixed rule above.
        </p>
        <div className="pp-scroll">
          <table className="pp-table prc-grid">
            <caption className="sr-only">Print price per piece in euros, by number of screens and quantity</caption>
            <thead>
              <tr>
                <th scope="col">Screens</th>
                {shown.breaks.map((text, j) => (
                  <th key={j} scope="col" className={canManage ? undefined : 'prc-num'}>
                    <div className="prc-head">
                      <span>Pieces from</span>
                      <span className="prc-head-row">
                        {box(`breaks.${j}`, `Quantity break ${j + 1}, pieces from`, text, (next) => change({ ...values, breaks: values.breaks.map((b, i) => (i === j ? next : b)) }), {
                          className: 'prc-narrow',
                          disabled: j === 0,
                        })}
                        {canManage && j > 0 ? (
                          <button type="button" className="pp-btn pp-btn-xs" onClick={() => change(removeBreak(values, j))} aria-label={`Remove the quantity break from ${text} pieces`}>
                            Remove
                          </button>
                        ) : null}
                      </span>
                    </div>
                  </th>
                ))}
                {canManage ? <th scope="col" aria-label="Remove a tier" /> : null}
              </tr>
            </thead>
            <tbody>
              {shown.tiers.map((tier, i) => (
                <tr key={i}>
                  <th scope="row">
                    <div className="prc-rowhead">
                      <span>{tierLabel(shown, i)}</span>
                      {canManage ? (
                        <label className="prc-from">
                          <span className="pp-dim">from</span>
                          {box(`tiers.${i}.from`, `Tier ${i + 1}, starts at this many screens`, tier.from, (next) => change({ ...values, tiers: values.tiers.map((t, k) => (k === i ? { ...t, from: next } : t)) }), {
                            className: 'prc-narrow',
                            disabled: i === 0,
                          })}
                        </label>
                      ) : null}
                    </div>
                  </th>
                  {tier.cells.map((cell, j) => (
                    <td key={j} className={canManage ? undefined : 'prc-num'}>
                      {box(
                        `tiers.${i}.cells.${j}`,
                        `Price per piece in euros, ${tierLabel(shown, i)}, ${shown.breaks[j]} pieces or more`,
                        cell,
                        (next) => change({ ...values, tiers: values.tiers.map((t, k) => (k === i ? { ...t, cells: t.cells.map((c, m) => (m === j ? next : c)) } : t)) }),
                        { className: 'prc-money' },
                      )}
                    </td>
                  ))}
                  {canManage ? (
                    <td>
                      {i > 0 ? (
                        <button type="button" className="pp-btn pp-btn-xs" onClick={() => change(removeTier(values, i))} aria-label={`Remove the tier from ${tier.from} screens`}>
                          Remove
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {gridErrors.length > 0 ? (
          <div className="prc-errors">
            {gridErrors.map(([key]) => (
              <span key={key}>{errorFor(key)}</span>
            ))}
          </div>
        ) : null}
        {canManage ? (
          <>
            <div className="pp-actions">
              <button type="button" className="pp-btn pp-btn-sm" disabled={!canAddTier(values)} onClick={() => change(addTier(values))}>
                Add a tier
              </button>
              <button type="button" className="pp-btn pp-btn-sm" disabled={!canAddBreak(values)} onClick={() => change(addBreak(values))}>
                Add a quantity break
              </button>
            </div>
            {!canAddTier(values) ? (
              <p className="pp-dim">
                Every screen count from 1 to {STANDARD_MAX_SCREENS} has its own row. Remove a row to price those screens together with the row before it.
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="prc-group" aria-labelledby={id('other')}>
        <h2 id={id('other')} className="mf-label">
          Other settings{isPlaceholder ? <span className="prc-tag">Placeholder</span> : null}
        </h2>
        <div className="prc-rows">
          <div className="prc-row">
            <div className="prc-k">
              <label htmlFor={id('setup')}>Setup fee for each screen</label>
              <span className="prc-hint">
                A one-off cost of making a screen, charged once for each set of screens in a run: garment colours that share screens count once. 0.00 means no setup fee.
              </span>
            </div>
            <div className="prc-v">
              {box('setup', 'Setup fee for each screen, in euros', shown.setup, (next) => change({ ...values, setup: next }), { className: 'prc-money' })}
              <span className="pp-dim">€</span>
              {errorFor('setup')}
            </div>
          </div>
          <div className="prc-row">
            <div className="prc-k">
              <label htmlFor={id('additional')}>Second print position</label>
              <span className="prc-hint">
                What each print position after the first costs, as a percentage of its own price. 100 means the same price. The dearest position always pays in full.
              </span>
            </div>
            <div className="prc-v">
              {box('additional', 'Second print position, percent of its own price', shown.additional, (next) => change({ ...values, additional: next }), { className: 'prc-narrow' })}
              <span className="pp-dim">%</span>
              {errorFor('additional')}
            </div>
          </div>
          <div className="prc-row">
            <div className="prc-k">
              <label htmlFor={id('margin')}>Margin</label>
              <span className="prc-hint">Added to the blank and the print, before the fixed rule&apos;s charge.</span>
            </div>
            <div className="prc-v">
              {box('margin', 'Margin, percent', shown.margin, (next) => change({ ...values, margin: next }), { className: 'prc-narrow' })}
              <span className="pp-dim">%</span>
              {errorFor('margin')}
            </div>
          </div>
        </div>
      </section>

      <section className="prc-group" aria-labelledby={id('size')}>
        <h2 id={id('size')} className="mf-label">
          Print size{isPlaceholder ? <span className="prc-tag">Placeholder</span> : null}
        </h2>
        <p className="pp-dim">
          A bigger or smaller print can cost more or less. Each band is a percentage of the print price from the width it starts at. 100 means no change, so with one band at 100 the size has no effect.
        </p>
        <div className="prc-rows">
          {shown.bands.map((band, i) => (
            <div key={i} className="prc-row">
              <div className="prc-k">
                {canManage ? <label htmlFor={id(`bands.${i}.percent`)}>{bandLabel(shown, i)}</label> : <span>{bandLabel(shown, i)}</span>}
              </div>
              <div className="prc-v">
                {canManage ? (
                  <>
                    <span className="pp-dim">from</span>
                    {box(`bands.${i}.from`, `Band ${i + 1}, starts at this width in centimetres`, band.from, (next) => change({ ...values, bands: values.bands.map((b, k) => (k === i ? { ...b, from: next } : b)) }), {
                      className: 'prc-narrow',
                      disabled: i === 0,
                    })}
                    <span className="pp-dim">cm</span>
                  </>
                ) : null}
                {box(`bands.${i}.percent`, `Band ${i + 1}, percent of the print price`, band.percent, (next) => change({ ...values, bands: values.bands.map((b, k) => (k === i ? { ...b, percent: next } : b)) }), {
                  className: 'prc-narrow',
                })}
                <span className="pp-dim">%</span>
                {canManage && i > 0 ? (
                  <button type="button" className="pp-btn pp-btn-xs" onClick={() => change(removeBand(values, i))} aria-label={`Remove the size band from ${band.from} cm`}>
                    Remove
                  </button>
                ) : null}
                {errorFor(`bands.${i}.from`)}
                {errorFor(`bands.${i}.percent`)}
              </div>
            </div>
          ))}
        </div>
        {canManage ? (
          <div className="pp-actions">
            <button type="button" className="pp-btn pp-btn-sm" disabled={!canAddBand(values)} onClick={() => change(addBand(values))}>
              Add a size band
            </button>
          </div>
        ) : null}
      </section>

      <section className="prc-group" aria-labelledby={id('examples')}>
        <h2 id={id('examples')} className="mf-label">
          Example prices
        </h2>
        <p className="pp-dim">
          What one piece costs the artist: a blank at {euros(EXAMPLE_GARMENT_CENTS)} and one 28 cm print position, by number of screens and quantity. The fixed charge is for that position alone: a second position adds its own.{' '}
          {canManage ? 'They follow what is typed above.' : ''}
        </p>
        <div className="pp-scroll">
          <table className="pp-table prc-examples">
            <caption className="sr-only">Example price per piece by number of screens and quantity</caption>
            <thead>
              <tr>
                <th scope="col">Screens</th>
                <th scope="col">Fixed charge</th>
                {exampleTable.breaks.map((from, j) => (
                  <th key={j} scope="col" className="prc-num">
                    {from}+ pieces
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {examples.map((row) => (
                <tr key={row.screens} data-over={row.surchargeCents > 0 ? 'true' : undefined}>
                  <th scope="row">{row.screens}</th>
                  <td>{row.surchargeCents > 0 ? `+${euros(row.surchargeCents)}` : 'none'}</td>
                  {row.unitCents.map((cents, j) => (
                    <td key={j} className="prc-num pp-mono">
                      {(cents / 100).toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="prc-foot">
        {formError ? (
          <p role="alert" className="pp-error">
            {formError}
          </p>
        ) : null}
        <p className="pp-dim">{stamp ? `Last saved ${stamp}.` : 'Nothing has been saved yet: runs are quoted from the placeholder prices.'}</p>
        {canManage ? (
          <div className="pp-actions">
            <button type="submit" className="pp-btn pp-btn-primary" disabled={pending || !dirty}>
              {pending ? 'Saving…' : 'Save prices'}
            </button>
            <button type="button" className="pp-btn" disabled={pending || !dirty} onClick={reset}>
              Reset
            </button>
          </div>
        ) : (
          <p className="pp-soft">You can read these prices. Changing them needs Manage access to Catalogue and pricing.</p>
        )}
        {message ? (
          <p role={message.tone === 'error' ? 'alert' : 'status'} className={message.tone === 'error' ? 'pp-error' : 'pp-soft'}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
