'use client';

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from 'react';
import { saveShopPricesAction } from '@/app/(chat)/admin/pricing/actions';
import { formatStamp } from '@/components/admin/prepress/format';
import { podExampleRows, type PodExtras, type PodGarmentRow } from '@/lib/pricing/pod-table';
import { euros } from '@/lib/pricing/screen-print';
import { cn } from '@/lib/utils';
import {
  applyTypePrice,
  EMPTY_ROW,
  defaultPreviewCode,
  editBase,
  editDtf,
  filterRows,
  formFromSaved,
  garmentKey,
  patchFromForm,
  placeholderCount,
  previewBase,
  rowState,
  savedFromRows,
  typeOptions,
  type RowFilter,
  type RowState,
  type SavedShopPrices,
  type ShopFormErrors,
  type ShopFormValues,
  type ShowFilter,
} from './shop-price-form';

type Message = { tone: 'ok' | 'error'; text: string };

const SHOW_OPTIONS: { id: ShowFilter; label: string }[] = [
  { id: 'all', label: 'All garments' },
  { id: 'placeholder', label: 'Placeholder prices only' },
  { id: 'set', label: 'Prices I have set' },
];

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function StateTag({ state }: { state: RowState }) {
  if (state === 'set') return <span className="pp-dim">Set</span>;
  if (state === 'unsaved') return <span className="prc-tag" data-tone="strong">Unsaved</span>;
  if (state === 'none') return <span className="prc-tag">No price</span>;
  return <span className="prc-tag">Placeholder</span>;
}

/** The shop-product prices (Plan sections 1 and 10): a base price for every garment, which covers one print area up to A2 on the
 * front or the back, and two extras for more print areas. Anyone with Catalogue and pricing "View" reads it; with "Manage" the same
 * numbers become boxes.
 *
 * A garment is on a placeholder (today's one-print DTG cost, shown and marked) until the owner chooses its price: typing in its box,
 * or setting its whole type, does that, and it is saved with Save prices. A garment nobody touched is never saved, so it stays a
 * placeholder. Edits are kept until Save; what is saved is only the garments that changed, so two people editing at once don't
 * overwrite each other's garments. */
export function ShopPriceEditor({
  garments,
  extras,
  updatedLabel,
  canManage,
}: {
  garments: PodGarmentRow[];
  extras: PodExtras;
  updatedLabel: string | null;
  canManage: boolean;
}) {
  const uid = useId();
  const [saved, setSaved] = useState<SavedShopPrices>(() => savedFromRows(garments, extras));
  const [stamp, setStamp] = useState<string | null>(updatedLabel);
  const [values, setValues] = useState<ShopFormValues>(() => formFromSaved(garments, savedFromRows(garments, extras)));
  const [tried, setTried] = useState(false);
  const [serverErrors, setServerErrors] = useState<ShopFormErrors>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<RowFilter>({ query: '', type: '', show: 'all' });
  const [bulkType, setBulkType] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkNote, setBulkNote] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState<string | null>(() => defaultPreviewCode(garments, savedFromRows(garments, extras)));
  const [previewMethod, setPreviewMethod] = useState<'dtg' | 'dtf'>('dtg');
  // a box to focus once a render has put it on the page
  const focusAfterRender = useRef<string | null>(null);

  const id = (key: string) => `${uid}-${key.replace(/[^A-Za-z0-9]+/g, '-')}`;

  // Someone who can only read always sees what the page was drawn from.
  const shown = canManage ? values : formFromSaved(garments, saved);
  const result = patchFromForm(shown, garments, saved);
  const dirty = canManage && (!result.ok || result.changed > 0);
  const errors: ShopFormErrors = { ...(tried && !result.ok ? result.errors : {}), ...serverErrors };
  const visible = filterRows(garments, saved, filter);
  const types = typeOptions(garments);
  const placeholders = placeholderCount(garments, saved);

  // Focus moves to the box that needs a look once it is on the page (a filter may have been hiding its garment).
  useEffect(() => {
    const key = focusAfterRender.current;
    if (!key) return;
    focusAfterRender.current = null;
    document.getElementById(`${uid}-${key.replace(/[^A-Za-z0-9]+/g, '-')}`)?.focus();
  });

  function change(next: ShopFormValues) {
    setValues(next);
    setServerErrors({});
    setMessage(null);
    setBulkNote(null);
  }

  function reset() {
    setValues(formFromSaved(garments, saved));
    setTried(false);
    setServerErrors({});
    setMessage(null);
    setBulkError(null);
    setBulkNote(null);
  }

  /** Focus the box with a problem. When its garment is filtered out of the list, show every garment first. */
  function lookAt(key: string) {
    const element = document.getElementById(id(key));
    if (element) {
      element.focus();
      return;
    }
    focusAfterRender.current = key;
    setFilter({ query: '', type: '', show: 'all' });
  }

  function applyBulk() {
    if (pending) return;
    const applied = applyTypePrice(values, garments, bulkType, bulkText);
    if (!applied.ok) {
      setBulkError(applied.error);
      setBulkNote(null);
      return;
    }
    change(applied.values);
    setBulkError(null);
    setBulkNote(`Set ${applied.count} ${applied.count === 1 ? 'garment' : 'garments'} (${bulkType}) to ${euros(applied.cents)}. Press Save prices to keep it.`);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setTried(true);
    if (!result.ok) {
      setMessage({ tone: 'error', text: 'Some prices need a look. They are marked below.' });
      lookAt(result.first);
      return;
    }
    if (result.changed === 0) return;
    setMessage(null);
    const patch = result.patch;
    startTransition(async () => {
      try {
        const done = await saveShopPricesAction(patch);
        if (done.ok) {
          const next: SavedShopPrices = { extras: done.table.extras, garments: done.table.garments };
          setSaved(next);
          setValues(formFromSaved(garments, next));
          setStamp(formatStamp(done.updatedAt) || null);
          setTried(false);
          setServerErrors({});
          setBulkError(null);
          setBulkNote(null);
          setMessage({ tone: 'ok', text: 'Saved. Shop products created or changed from now on use these prices.' });
        } else if (done.field) {
          setServerErrors({ [done.field]: done.error });
          setMessage({ tone: 'error', text: 'Some prices need a look. They are marked below.' });
          lookAt(done.field);
        } else {
          setMessage({ tone: 'error', text: done.error });
        }
      } catch {
        setMessage({ tone: 'error', text: "You don't have Manage access to Catalogue and pricing, so nothing was saved." });
      }
    });
  }

  /** A box, or its number as plain text for someone who can only read. */
  function box(key: string, label: string, value: string, onChange: (next: string) => void, opts: { className?: string; disabled?: boolean; placeholder?: string; empty?: string } = {}) {
    if (!canManage) return <span className="pp-mono">{value || opts.empty || '–'}</span>;
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
        placeholder={opts.placeholder}
        disabled={opts.disabled}
        readOnly={pending}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id(key)}-error` : undefined}
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

  // The examples follow what is typed while it makes sense, and what is saved while it doesn't.
  const previewRow = garments.find((g) => g.code === previewCode) ?? null;
  const preview = previewRow && previewCode ? previewBase(shown, garments, saved, previewCode, previewMethod) : null;
  const examples = preview ? podExampleRows(preview.baseCents, preview.extras) : [];

  return (
    <form className="prc-form" onSubmit={onSubmit} noValidate>
      {placeholders > 0 ? (
        <div className="prc-note" role="note">
          <p className="prc-note-title">Placeholder prices</p>
          <p>
            {placeholders} of {garments.length} garments are still on a placeholder: the current base cost of one print (DTG, or DTF for a garment that can&apos;t take DTG) stands in until you set the garment&apos;s
            base price. Shop products are priced from it meanwhile. {canManage ? 'Typing a price, or setting a whole type, makes it yours once you save.' : ''}
          </p>
        </div>
      ) : null}

      <section className="prc-group" aria-labelledby={id('extras')}>
        <h2 id={id('extras')} className="mf-label">
          Extras for more print areas
        </h2>
        <div className="prc-rows">
          <div className="prc-row">
            <div className="prc-k">
              <label htmlFor={id('extras.secondMain')}>Front and back</label>
              <span className="prc-hint">
                Added once when a product prints on the front and on the back. The base price already covers one print area, up to A2 (42 × 59.4 cm), on the front or the back.
              </span>
            </div>
            <div className="prc-v">
              {box('extras.secondMain', 'Extra for front and back, in euros', shown.secondMain, (next) => change({ ...values, secondMain: next }), { className: 'prc-money' })}
              <span className="pp-dim">€</span>
              {errorFor('extras.secondMain')}
            </div>
          </div>
          <div className="prc-row">
            <div className="prc-k">
              <label htmlFor={id('extras.sleeves')}>Sleeve prints</label>
              <span className="prc-hint">Added once when a product has sleeve prints, whether it prints one sleeve or both.</span>
            </div>
            <div className="prc-v">
              {box('extras.sleeves', 'Extra for sleeve prints, in euros', shown.sleeves, (next) => change({ ...values, sleeves: next }), { className: 'prc-money' })}
              <span className="pp-dim">€</span>
              {errorFor('extras.sleeves')}
            </div>
          </div>
        </div>
      </section>

      <section className="prc-group" aria-labelledby={id('garments')}>
        <h2 id={id('garments')} className="mf-label">
          Base price for each garment
        </h2>
        <p className="pp-dim">
          What the artist pays for the garment with one print area up to A2, on the front or the back. DTF uses the same price unless you set a DTF price for a garment.
        </p>

        {canManage ? (
          <div className="prc-bulk">
            <span className="prc-bulk-label">Set every garment of a type</span>
            <select
              className="pp-field prc-select"
              aria-label="Garment type to set"
              value={bulkType}
              onChange={(event) => {
                setBulkType(event.target.value);
                setBulkError(null);
              }}
            >
              <option value="">Pick a type</option>
              {types.map((option) => (
                <option key={option.type} value={option.type}>
                  {option.type} ({option.count})
                </option>
              ))}
            </select>
            <span className="pp-dim">at €</span>
            <input
              id={id('bulk')}
              className="pp-field prc-box prc-money"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label="Base price for the whole type, in euros"
              placeholder="17.00"
              value={bulkText}
              readOnly={pending}
              aria-invalid={bulkError ? true : undefined}
              aria-describedby={bulkError ? `${id('bulk')}-error` : undefined}
              onChange={(event) => {
                setBulkText(event.target.value);
                setBulkError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyBulk();
                }
              }}
            />
            <button type="button" className="pp-btn pp-btn-sm" disabled={pending} onClick={applyBulk}>
              Apply to the type
            </button>
            {bulkError ? (
              <span id={`${id('bulk')}-error`} role="alert" className="pp-error prc-error">
                {bulkError}
              </span>
            ) : null}
            {bulkNote ? (
              <span role="status" className="pp-soft prc-bulk-hint">
                {bulkNote}
              </span>
            ) : null}
            <span className="prc-hint prc-bulk-hint">Then change single garments below. DTF prices stay as they are, and nothing is saved until you press Save prices.</span>
          </div>
        ) : null}

        <div className="prc-toolbar">
          <label className="sr-only" htmlFor={id('search')}>
            Search garments
          </label>
          <input
            id={id('search')}
            className="pp-field prc-search"
            type="search"
            autoComplete="off"
            placeholder="Search by name, code or type"
            value={filter.query}
            onChange={(event) => setFilter({ ...filter, query: event.target.value })}
            onKeyDown={(event) => {
              // Enter in the search box searches; it must not save the prices.
              if (event.key === 'Enter') event.preventDefault();
            }}
          />
          <select className="pp-field prc-select" aria-label="Show one type" value={filter.type} onChange={(event) => setFilter({ ...filter, type: event.target.value })}>
            <option value="">All types</option>
            {types.map((option) => (
              <option key={option.type} value={option.type}>
                {option.type} ({option.count})
              </option>
            ))}
          </select>
          <select className="pp-field prc-select" aria-label="Which prices to show" value={filter.show} onChange={(event) => setFilter({ ...filter, show: event.target.value as ShowFilter })}>
            {SHOW_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pp-dim" role="status">
            {visible.length === garments.length ? `${garments.length} garments` : `${visible.length} of ${garments.length} garments`}
          </span>
        </div>

        <div className="pp-scroll">
          <table className="pp-table prc-garments">
            <caption className="sr-only">Base price of each garment in euros, and a DTF price where it differs</caption>
            <thead>
              <tr>
                <th scope="col">Garment</th>
                <th scope="col">Code</th>
                <th scope="col">Type</th>
                <th scope="col">Base price</th>
                <th scope="col">DTF price</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const boxes = shown.rows[row.code] ?? EMPTY_ROW;
                const state = rowState(row, shown, saved);
                return (
                  <tr key={row.code}>
                    <th scope="row">{row.name}</th>
                    <td className="pp-mono">{row.code}</td>
                    <td>{row.type}</td>
                    <td>
                      <div className="prc-cell">
                        {box(garmentKey(row.code, 'base'), `Base price in euros, ${row.name}`, boxes.base, (next) => change(editBase(values, row.code, next)), {
                          className: cn('prc-money', state === 'placeholder' && 'prc-ghost'),
                          empty: 'No price',
                        })}
                        {canManage ? <span className="pp-dim">€</span> : null}
                        {errorFor(garmentKey(row.code, 'base'))}
                      </div>
                    </td>
                    <td>
                      <div className="prc-cell">
                        {box(garmentKey(row.code, 'dtf'), `DTF price in euros, ${row.name}. Leave empty to use the base price.`, boxes.dtf, (next) => change(editDtf(values, row.code, next)), {
                          className: 'prc-money',
                          disabled: !boxes.set,
                          placeholder: boxes.set ? 'same' : undefined,
                          empty: 'Same as base',
                        })}
                        {canManage ? <span className="pp-dim">€</span> : null}
                        {errorFor(garmentKey(row.code, 'dtf'))}
                      </div>
                    </td>
                    <td>
                      <StateTag state={state} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? <p className="pp-empty">No garment matches.</p> : null}
        {canManage ? <p className="pp-dim">A DTF price can be set once a garment&apos;s base price is set. Empty means DTF costs the base price.</p> : null}
      </section>

      <section className="prc-group" aria-labelledby={id('examples')}>
        <h2 id={id('examples')} className="mf-label">
          Example prices
        </h2>
        <p className="pp-dim">What a product costs the artist with these print areas, from the numbers above. {canManage ? 'They follow what is typed.' : ''}</p>
        {garments.length > 0 ? (
          <div className="prc-toolbar">
            <label className="prc-pick">
              <span className="pp-dim">Garment</span>
              <select className="pp-field prc-select" value={previewCode ?? ''} onChange={(event) => setPreviewCode(event.target.value)}>
                {types.map((option) => (
                  <optgroup key={option.type} label={option.type}>
                    {garments
                      .filter((g) => g.type === option.type)
                      .map((g) => (
                        <option key={g.code} value={g.code}>
                          {g.name} ({g.code})
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="prc-pick">
              <span className="pp-dim">Print method</span>
              <select className="pp-field prc-select" value={previewMethod} onChange={(event) => setPreviewMethod(event.target.value === 'dtf' ? 'dtf' : 'dtg')}>
                <option value="dtg">DTG</option>
                <option value="dtf">DTF</option>
              </select>
            </label>
          </div>
        ) : null}
        {preview && previewRow ? (
          <>
            <div className="pp-scroll">
              <table className="pp-table prc-examples">
                <caption className="sr-only">Example prices for {previewRow.name}</caption>
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">How it adds up</th>
                    <th scope="col" className="prc-num">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {examples.map((example) => (
                    <tr key={example.key}>
                      <th scope="row">
                        {previewRow.name}, {lowerFirst(example.label)}
                      </th>
                      <td className="pp-dim">{example.sum}</td>
                      <td className="prc-num pp-mono">= {euros(example.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.placeholder ? <p className="pp-dim">This garment is still on its placeholder base price, so these examples are too.</p> : null}
          </>
        ) : (
          <p className="pp-dim">{previewRow ? 'This garment has no price yet. Set one to see examples.' : 'There are no garments to show.'}</p>
        )}
      </section>

      {canManage ? (
        <div className="prc-foot prc-bar">
          <div className="prc-bar-text">
            <p className={result.ok && result.changed > 0 ? 'pp-soft' : 'pp-dim'}>
              {result.ok && result.changed > 0
                ? `${result.changed === 1 ? '1 change' : `${result.changed} changes`} not saved yet.`
                : stamp
                  ? `Last saved ${stamp}.`
                  : 'Nothing has been saved yet: every garment is on its placeholder price.'}
            </p>
            {message ? (
              <p role={message.tone === 'error' ? 'alert' : 'status'} className={message.tone === 'error' ? 'pp-error' : 'pp-soft'}>
                {message.text}
              </p>
            ) : null}
          </div>
          <div className="pp-actions">
            <button type="submit" className="pp-btn pp-btn-primary" disabled={pending || !dirty}>
              {pending ? 'Saving…' : 'Save prices'}
            </button>
            <button type="button" className="pp-btn" disabled={pending || !dirty} onClick={reset}>
              Reset
            </button>
          </div>
        </div>
      ) : (
        <div className="prc-foot">
          <p className="pp-dim">{stamp ? `Last saved ${stamp}.` : 'Nothing has been saved yet: every garment is on its placeholder price.'}</p>
          <p className="pp-soft">You can read these prices. Changing them needs Manage access to Catalogue and pricing.</p>
        </div>
      )}
    </form>
  );
}
