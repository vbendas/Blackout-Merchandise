'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { saveInkSystemAction } from '@/app/(chat)/admin/ink-system/actions';
import { summariseDotGain } from '@/lib/print/calibration/profile';
import type { InkSystemProfile } from '@/lib/print/types';
import { cn } from '@/lib/utils';
import { formatStamp } from '@/components/admin/prepress/format';
import { formFromProfile, opacityInks, profileFromForm, type InkFieldKey, type InkFormValues } from './profile-form';

type PlainKey = Exclude<keyof InkFormValues, 'opacity'>;

interface FieldDef {
  key: PlainKey;
  label: string;
  hint?: string;
  unit?: string;
  /** text, or a number box with this step */
  step?: string;
}

interface GroupDef {
  id: string;
  title: string;
  intro?: string;
  fields: FieldDef[];
}

// The profile's groups, in the order a person reads them: the system, the colour
// inks, the whites, the cure, the mesh, the press. Opacity is drawn after these,
// one row for each ink the groups above name.
const GROUPS: GroupDef[] = [
  { id: 'system', title: 'Ink system', fields: [{ key: 'name', label: 'Name' }] },
  {
    id: 'colour',
    title: 'Colour inks',
    intro: 'The shop mixes any Pantone into these bases, so the palette is the Pantone library, not a stock list.',
    fields: [
      { key: 'baseLight', label: 'Base on light garments', hint: 'Translucent, a mock-discharge look.' },
      { key: 'baseDark', label: 'Base on dark garments', hint: 'Printed wet on wet over the underbase.' },
    ],
  },
  {
    id: 'whites',
    title: 'Whites',
    fields: [
      { key: 'underbaseInk', label: 'Underbase ink', hint: 'Flash cured under the colours on dark garments.' },
      { key: 'flashSeconds', label: 'Flash time', unit: 'seconds', step: '0.5' },
      { key: 'flashCelsius', label: 'Flash temperature', unit: '°C', step: '1' },
      { key: 'highlightInk', label: 'Highlight white ink', hint: 'The last screen, over the brightest points.' },
    ],
  },
  {
    id: 'cure',
    title: 'Cure',
    fields: [
      { key: 'cureMin', label: 'Shortest cure', unit: 'minutes', step: '0.5' },
      { key: 'cureMax', label: 'Longest cure', unit: 'minutes', step: '0.5' },
      { key: 'cureCelsius', label: 'Cure temperature', unit: '°C', step: '1' },
    ],
  },
  {
    id: 'mesh',
    title: 'Mesh',
    intro: 'Threads per inch. The job sheet suggests one for each film; halftones at 55 lpi want the finer end.',
    fields: [
      { key: 'meshMin', label: 'Finest', step: '1' },
      { key: 'meshMax', label: 'Coarsest', step: '1' },
      { key: 'meshHalftone', label: 'Suggested for halftones', step: '1' },
      { key: 'meshSolid', label: 'Suggested for solid colour', step: '1' },
      { key: 'meshUnderbase', label: 'Suggested for the underbase', step: '1' },
    ],
  },
  {
    id: 'press',
    title: 'Press',
    fields: [
      { key: 'pressHeads', label: 'Print heads', hint: 'A job with more screens than this is flagged for planning.', step: '1' },
      { key: 'pigmentMaxPct', label: 'Pigment limit', unit: '% of the ink', step: '0.5' },
      { key: 'offContactMin', label: 'Off-contact, smallest', unit: 'mm', step: '0.5' },
      { key: 'offContactMax', label: 'Off-contact, largest', unit: 'mm', step: '0.5' },
      { key: 'squeegee', label: 'Squeegee' },
    ],
  },
];

const DOT_GAIN_METHODS = { scan: 'from a scan', manual: 'typed in', spectro: 'from a spectrophotometer' } as const;

/** What the profile says about dot gain, in a sentence. */
function dotGainLine(profile: InkSystemProfile): string {
  const gain = profile.dotGain;
  if (!gain) return 'Not calibrated: films are made with linear coverage.';
  const summary = summariseDotGain(gain);
  const when = formatStamp(gain.measuredAt);
  const base = `Calibrated${when ? ` on ${when}` : ''}, ${DOT_GAIN_METHODS[gain.method]}, at ${gain.lpi} lpi, ${gain.angleDeg}° and mesh ${gain.mesh}.`;
  if (!summary) return base;
  return `${base} A 50% tint on the film prints as ${Math.round(summary.printedAt50 * 100)}%, so the engine puts ${Math.round(summary.filmFor50 * 100)}% on the film for a 50% tone.`;
}

/** The ink system profile (Plan section 5). Anyone with Pre-press "View" reads it;
 * with "Manage" the same rows become boxes. Checks run as you type once a save has
 * been tried, and a failed save moves focus to the first box that needs a look. The
 * profile as last saved is kept here, so a save leaves the boxes as they are, the
 * Save button greys out, and the "Saved" message stays. */
export function InkSystemForm({ profile, canManage, updatedLabel }: { profile: InkSystemProfile; canManage: boolean; updatedLabel: string | null }) {
  const uid = useId();
  const [saved, setSaved] = useState<InkSystemProfile>(profile);
  // Someone who can only read always sees what the page was drawn from.
  const shownProfile = canManage ? saved : profile;
  const initial = formFromProfile(shownProfile);
  const [values, setValues] = useState<InkFormValues>(initial);
  const [tried, setTried] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const checked = profileFromForm(values, saved);
  const errors: Partial<Record<InkFieldKey, string>> = tried && !checked.ok ? checked.errors : {};
  const shown = canManage ? values : initial;
  const inks = opacityInks(shown);

  function setField(key: PlainKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  }

  function setOpacity(ink: string, value: string) {
    setValues((current) => ({ ...current, opacity: { ...current.opacity, [ink]: value } }));
    setMessage(null);
  }

  function reset() {
    setValues(initial);
    setTried(false);
    setMessage(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setTried(true);
    if (!checked.ok) {
      setMessage({ tone: 'error', text: 'Some settings need a look. They are marked below.' });
      // Focus the first box with a problem, in the order the page lists them.
      const order = [...GROUPS.flatMap((group) => group.fields.map((field) => field.key)), ...inks.map((ink) => `opacity:${ink}` as const)];
      const first = order.find((key) => (checked.errors as Record<string, string | undefined>)[key]);
      if (first) document.getElementById(fieldId(first))?.focus();
      return;
    }
    setMessage(null);
    const profileToSave = checked.profile;
    startTransition(async () => {
      const result = await saveInkSystemAction(profileToSave);
      if (result.ok) {
        setSaved(profileToSave);
        setTried(false);
        setMessage({ tone: 'ok', text: 'Saved. Packs made from now on use these settings.' });
      } else {
        setMessage({ tone: 'error', text: result.error });
      }
    });
  }

  // Ids can't hold an ink's name (spaces), so an opacity box is addressed by its place in the list.
  function fieldId(key: InkFieldKey | string): string {
    if (key.startsWith('opacity:')) return `${uid}-opacity-${inks.indexOf(key.slice('opacity:'.length))}`;
    return `${uid}-${key}`;
  }

  function row(def: { key: InkFieldKey; label: string; hint?: string; unit?: string; step?: string }, value: string, onChange: (next: string) => void, id: string) {
    const error = errors[def.key];
    const hintId = def.hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    if (!canManage) {
      return (
        <div key={def.key} className="isy-row">
          <dt className="isy-k">
            {def.label}
            {def.hint ? <span className="isy-hint">{def.hint}</span> : null}
          </dt>
          <dd className="isy-v">
            <span className={def.step ? 'pp-mono' : undefined}>{value || '–'}</span>
            {def.unit ? <span className="pp-dim">{def.unit}</span> : null}
          </dd>
        </div>
      );
    }
    return (
      <div key={def.key} className="isy-row">
        <div className="isy-k">
          <label htmlFor={id}>{def.label}</label>
          {def.hint ? (
            <span id={hintId} className="isy-hint">
              {def.hint}
            </span>
          ) : null}
        </div>
        <div className="isy-v">
          <input
            id={id}
            className={cn('pp-field isy-input', def.step && 'isy-num')}
            type={def.step ? 'number' : 'text'}
            inputMode={def.step ? 'decimal' : undefined}
            step={def.step}
            value={value}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            onChange={(event) => onChange(event.target.value)}
          />
          {def.unit ? <span className="pp-dim">{def.unit}</span> : null}
          {error ? (
            <span id={errorId} role="alert" className="pp-error isy-error">
              {error}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  const Rows = canManage ? 'div' : 'dl';

  return (
    <form className="isy-form" onSubmit={onSubmit} noValidate>
      {GROUPS.map((group) => (
        <fieldset key={group.id} className="isy-group">
          <legend className="mf-label">{group.title}</legend>
          {group.intro ? <p className="pp-dim">{group.intro}</p> : null}
          <Rows className="isy-rows">
            {group.fields.map((field) => row(field, shown[field.key], (next) => setField(field.key, next), fieldId(field.key)))}
          </Rows>
        </fieldset>
      ))}

      <fieldset className="isy-group">
        <legend className="mf-label">Opacity</legend>
        <p className="pp-dim">
          How much of what is underneath each ink covers, as a percentage. The proofs draw every ink from these. They are estimates until the inks are measured.
        </p>
        <Rows className="isy-rows">
          {inks.map((ink, index) =>
            row({ key: `opacity:${ink}`, label: ink, unit: '%', step: '1' }, shown.opacity[ink] ?? '', (next) => setOpacity(ink, next), `${uid}-opacity-${index}`),
          )}
        </Rows>
      </fieldset>

      <fieldset className="isy-group">
        <legend className="mf-label">Dot gain</legend>
        <p className="pp-dim">Halftone dots print bigger than they are on the film. A calibration from a printed test chart makes the engine put smaller dots on every new film.</p>
        <p>{dotGainLine(shownProfile)}</p>
        <p>
          <Link className="pp-link" href="/admin/ink-system/calibration">
            {shownProfile.dotGain ? 'Open the dot gain calibration' : 'Calibrate the dot gain'}
          </Link>
        </p>
      </fieldset>

      <div className="isy-foot">
        <p className="pp-dim">
          Inks measured with a spectrophotometer: {shownProfile.measured ? 'yes' : 'not yet'}.
          {shownProfile.measured ? '' : ' Until then, proofs use each ink’s target colour from the art.'}
        </p>
        <p className="pp-dim">{updatedLabel ? `Last saved ${updatedLabel}.` : 'Nothing has been saved yet: these are the built-in MagnaPrint HB settings.'}</p>
        {canManage ? (
          <div className="pp-actions">
            <button type="submit" className="pp-btn pp-btn-primary" disabled={pending || !dirty}>
              {pending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="pp-btn" disabled={pending || !dirty} onClick={reset}>
              Reset
            </button>
          </div>
        ) : (
          <p className="pp-soft">You can read these settings. Changing them needs Manage access to Pre-press.</p>
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
