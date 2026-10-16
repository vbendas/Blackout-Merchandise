'use client';

import { useId, useMemo, useState, useTransition, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { resetDotGainAction, saveDotGainAction } from '@/app/(chat)/admin/ink-system/calibration/actions';
import { buildDotGainCurves, type CurvePoint, type DotGainCurves } from '@/lib/print/calibration/curve';
import { INK_KINDS, INK_KIND_LABELS, checkChartSettings, type InkKind } from '@/lib/print/calibration/chart-layout';
import { READING_UNITS, isReadingUnit, type ReadingUnit } from '@/lib/print/calibration/murray-davies';
import { buildDotGainProfile, dotGainProblem } from '@/lib/print/calibration/profile';
import type { ScanReading } from '@/lib/print/calibration/scan';
import { CALIBRATION_ERRORS, parseScanFilename } from '@/lib/print/calibration/scan-upload';
import type { DotGainProfile } from '@/lib/print/types';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/components/admin/prepress/format';
import {
  ENTRY_STEPS,
  disagreementNote,
  emptyEntries,
  filmNames,
  filmsWithWedge,
  percentText,
  pointsFromEntries,
  pointsFromScan,
  readableFilms,
  type TypedEntries,
} from './calibration-form';
import { CurvePlot, type PlotLine } from './CurvePlot';
import { sendScan } from './scan-client';

type Method = 'scan' | 'manual' | 'spectro';

const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: 'scan', label: 'Scan', hint: 'A flatbed scan of the printed garment: every patch is measured for you.' },
  { id: 'manual', label: 'Type values', hint: 'You measured the dot area of each step yourself and type it in.' },
  { id: 'spectro', label: 'Spectrophotometer', hint: 'Type what the instrument shows: density, L*, reflectance or its own dot area.' },
];

const METHOD_WORDS: Record<Method, string> = { scan: 'from a scan', manual: 'typed in', spectro: 'from a spectrophotometer' };

/** The tones the tables show, in percent. */
const TABLE_TONES = [5, 10, 25, 50, 75, 90, 95];

const FILM_HINTS: Record<InkKind, string> = {
  underbase: 'Print on a dark blank.',
  base: 'Print on a light blank, in a dark ink.',
  highlight: 'Optional. Print on a dark blank.',
};

type ScanState =
  | { phase: 'idle' }
  | { phase: 'uploading'; filename: string; percent: number | null }
  | { phase: 'error'; message: string }
  | { phase: 'done'; filename: string; reading: ScanReading };

type Message = { tone: 'ok' | 'error'; text: string } | null;

export interface CalibrationPanelProps {
  canManage: boolean;
  /** the calibration in force, or null while films are made with linear coverage */
  current: DotGainProfile | null;
  /** 'Saved 15 Oct, 11:20', worked out on the server in the shop's time zone */
  currentLabel: string | null;
  /** the screen the chart starts with */
  screen: { lpi: number; angleDeg: number; mesh: number; ppi: number };
  /** the screen jobs are made with unless a recipe says otherwise: dot gain changes with the screen, so a measurement is flagged when it was made at another */
  jobScreen: { lpi: number; angleDeg: number; mesh: number };
  /** the largest scan the server takes */
  maxScanBytes: number;
}

const whole = (fraction: number): number => Math.round(fraction * 100);

function toneRows(curves: DotGainCurves): { tone: number; film: number }[] {
  return TABLE_TONES.map((tone) => ({ tone, film: whole(curves.compensate(tone / 100)) }));
}

/** The calibration page's working part (Plan section 4.3 step 7): print the chart, read it, check the curve, save. Anyone with Pre-press View sees what is in force and can download the chart; Manage reads and saves. */
export function CalibrationPanel({ canManage, current, currentLabel, screen, jobScreen, maxScanBytes }: CalibrationPanelProps) {
  const uid = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // The screen the chart is printed with, as text boxes.
  const [lpi, setLpi] = useState(String(screen.lpi));
  const [angleDeg, setAngleDeg] = useState(String(screen.angleDeg));
  const [mesh, setMesh] = useState(String(screen.mesh));
  const [films, setFilms] = useState<InkKind[]>(['underbase', 'base']);

  const [method, setMethod] = useState<Method>('scan');
  const [typed, setTyped] = useState<TypedEntries>(emptyEntries('dot_area'));
  const [measured, setMeasured] = useState<TypedEntries>(emptyEntries('density'));
  const [scan, setScan] = useState<ScanState>({ phase: 'idle' });
  const [use, setUse] = useState<InkKind[]>([]);
  const [message, setMessage] = useState<Message>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  // Which button the pending state belongs to, for its label.
  const [acting, setActing] = useState<'save' | 'reset' | null>(null);

  const settings = useMemo(() => checkChartSettings({ lpi, angleDeg, mesh, films, ppi: screen.ppi }), [lpi, angleDeg, mesh, films, screen.ppi]);

  const href = (format: 'psd' | 'pdf'): string | null => {
    if (!settings.ok) return null;
    const q = new URLSearchParams({ format, lpi: String(settings.value.lpi), angle: String(settings.value.angleDeg), mesh: String(settings.value.mesh), ppi: String(settings.value.ppi), films: settings.value.films.join(',') });
    return `/api/calibration/chart?${q.toString()}`;
  };

  // The readings, whichever way they came.
  const entries = method === 'manual' ? typed : measured;
  const fromEntries = useMemo(() => pointsFromEntries(entries), [entries]);
  const fromScan = useMemo(() => (scan.phase === 'done' ? pointsFromScan(scan.reading, use) : null), [scan, use]);
  const points = useMemo<CurvePoint[]>(() => (method === 'scan' ? (fromScan?.points ?? []) : fromEntries.points), [method, fromScan, fromEntries]);
  const problems: string[] = method === 'scan' ? [] : fromEntries.problems;

  const curves = useMemo(() => buildDotGainCurves(points), [points]);
  const savedCurves = useMemo(() => (current ? buildDotGainCurves(current.points) : null), [current]);

  // The screen the measurement was made at: what the chart was read with for a scan (the boxes may have been changed since), otherwise the boxes.
  const measurementScreen = useMemo(() => {
    if (!settings.ok) return null;
    const boxes = { lpi: settings.value.lpi, angleDeg: settings.value.angleDeg, mesh: settings.value.mesh };
    return method === 'scan' && scan.phase === 'done' ? { ...boxes, lpi: scan.reading.lpi, angleDeg: scan.reading.angleDeg } : boxes;
  }, [settings, method, scan]);

  // What would be saved, and whether it can be.
  const candidate = useMemo(() => {
    if (!measurementScreen || points.length === 0) return null;
    return buildDotGainProfile({ method, ...measurementScreen, points });
  }, [measurementScreen, points, method]);
  const candidateProblem = candidate ? dotGainProblem(candidate) : null;
  const note = fromScan ? disagreementNote(fromScan, use) : null;

  function setEntry(step: number, value: string) {
    const update = (e: TypedEntries): TypedEntries => ({ ...e, values: { ...e.values, [String(step)]: value } });
    if (method === 'manual') setTyped(update);
    else setMeasured(update);
    setMessage(null);
  }

  function toggleFilm(kind: InkKind) {
    setFilms((list) => INK_KINDS.filter((k) => (k === kind ? !list.includes(k) : list.includes(k))));
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again (after a flatter scan) still fires a change.
    event.target.value = '';
    if (!file) return;
    setMessage(null);
    if (!settings.ok) {
      setScan({ phase: 'error', message: `Fix the screen first: ${settings.error}` });
      return;
    }
    if (parseScanFilename(file.name) === null) {
      setScan({ phase: 'error', message: CALIBRATION_ERRORS.not_an_image });
      return;
    }
    if (file.size > maxScanBytes) {
      setScan({ phase: 'error', message: `That scan is ${formatBytes(file.size)}. This server takes up to ${formatBytes(maxScanBytes)}. Save it as a compressed TIFF or a high-quality JPEG.` });
      return;
    }
    setScan({ phase: 'uploading', filename: file.name, percent: 0 });
    let last = 0;
    const result = await sendScan(file, { lpi: settings.value.lpi, angleDeg: settings.value.angleDeg }, ({ loaded, total }) => {
      const percent = Math.min(100, Math.floor((loaded / total) * 100));
      // Once the last byte is in storage the chart still has to be read: no number to show.
      if (percent === last) return;
      last = percent;
      setScan({ phase: 'uploading', filename: file.name, percent: percent >= 100 ? null : percent });
    });
    if (!result.ok) {
      setScan({ phase: 'error', message: result.message });
      return;
    }
    setScan({ phase: 'done', filename: file.name, reading: result.reading });
    const readable = readableFilms(result.reading);
    setUse(readable.length > 0 ? readable : filmsWithWedge(result.reading).slice(0, 1));
  }

  function save() {
    if (!candidate || candidateProblem || !measurementScreen) return;
    setMessage(null);
    setActing('save');
    startTransition(async () => {
      const result = await saveDotGainAction({ method, ...measurementScreen, points });
      if (result.ok) {
        setMessage({ tone: 'ok', text: 'Saved. Packs prepared from now on use this curve. Packs approved before keep their files.' });
        router.refresh();
      } else {
        setMessage({ tone: 'error', text: result.error });
      }
    });
  }

  function reset() {
    setMessage(null);
    setActing('reset');
    startTransition(async () => {
      const result = await resetDotGainAction();
      setConfirmingReset(false);
      if (result.ok) {
        setMessage({ tone: 'ok', text: 'Back to linear. Packs prepared from now on put the coverage on the film as it is. Packs approved before keep their files.' });
        router.refresh();
      } else {
        setMessage({ tone: 'error', text: result.error });
      }
    });
  }

  const wantedToFilm = curves ? toneRows(curves) : [];
  const unitInfo = READING_UNITS.find((u) => u.id === measured.unit) ?? READING_UNITS[0];
  const gainAt50 = curves ? whole(curves.gain(0.5) - 0.5) : null;

  const plotA: PlotLine[] = curves
    ? [
        { id: 'linear', label: 'No dot gain', fn: (x) => x, style: 'dotted' },
        ...(savedCurves ? [{ id: 'saved', label: 'Saved now', fn: savedCurves.gain, style: 'faint' } as PlotLine] : []),
        { id: 'new', label: 'This measurement', fn: curves.gain, style: 'main' },
      ]
    : [];
  const plotB: PlotLine[] = curves
    ? [
        { id: 'linear', label: 'Linear film', fn: (x) => x, style: 'dotted' },
        ...(savedCurves ? [{ id: 'saved', label: 'Saved now', fn: savedCurves.compensate, style: 'faint' } as PlotLine] : []),
        { id: 'new', label: 'With this measurement', fn: curves.compensate, style: 'main' },
      ]
    : [];

  return (
    <div className="cal">
      <fieldset className="cal-block">
        <legend className="mf-label">In force now</legend>
        {current ? (
          <>
            <p>
              Calibrated{currentLabel ? ` on ${currentLabel}` : ''}, {METHOD_WORDS[current.method]}, at {current.lpi} lpi, {current.angleDeg}° and mesh {current.mesh}.
              {savedCurves ? ` A 50% tint on the film prints as ${whole(savedCurves.gain(0.5))}%.` : ''}
            </p>
            {savedCurves ? (
              <div className="pp-scroll">
                <table className="cal-table">
                  <caption className="sr-only">What the engine puts on the film for a wanted tone, with the calibration in force</caption>
                  <thead>
                    <tr>
                      <th scope="row">You want, printed</th>
                      {TABLE_TONES.map((t) => (
                        <th key={t} scope="col" className="cal-num">
                          {t}%
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">The film gets</th>
                      {toneRows(savedCurves).map((r) => (
                        <td key={r.tone} className="cal-num">
                          {r.film}%
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="pp-dim">The saved readings can’t be fitted, so films are made linear until a new calibration is saved.</p>
            )}
            {canManage ? (
              <div className="pp-actions">
                {confirmingReset ? (
                  <>
                    <span className="pp-soft">Put linear coverage back on the film?</span>
                    <button type="button" className="pp-btn pp-btn-strong" disabled={pending} onClick={reset}>
                      {pending && acting === 'reset' ? 'Resetting…' : 'Reset to linear'}
                    </button>
                    <button type="button" className="pp-btn" disabled={pending} onClick={() => setConfirmingReset(false)}>
                      Keep it
                    </button>
                  </>
                ) : (
                  <button type="button" className="pp-btn" disabled={pending} onClick={() => setConfirmingReset(true)}>
                    Reset to linear
                  </button>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <p>Not calibrated yet. Films are made with linear coverage, so a 50% tint on the film prints heavier than 50% on the shirt.</p>
        )}
        {current && (current.lpi !== jobScreen.lpi || current.angleDeg !== jobScreen.angleDeg || current.mesh !== jobScreen.mesh) ? (
          <p className="pp-soft">
            It was measured at {current.lpi} lpi, {current.angleDeg}° and mesh {current.mesh}; jobs are made at {jobScreen.lpi} lpi, {jobScreen.angleDeg}° and mesh {jobScreen.mesh} unless a recipe says otherwise. Dot gain changes with the screen, so
            measure at the screen you print jobs with.
          </p>
        ) : null}
        <p className="pp-dim">Packs approved before a change keep their files. New packs and re-runs use the new curve.</p>
      </fieldset>

      <fieldset className="cal-block">
        <legend className="mf-label">1. Print the test chart</legend>
        <p className="pp-dim">
          Make the chart at the screen you print jobs with. It carries a wedge of 0 to 100% for each film, a bare garment patch and a solid patch to measure against, and corner squares for the scan reader. It is made at {screen.ppi} ppi with
          the registration targets and label strip of a production film.
        </p>
        <div className="cal-fields">
          <div className="pp-fieldwrap">
            <label htmlFor={`${uid}-lpi`}>Lines per inch</label>
            <input id={`${uid}-lpi`} className="pp-field cal-num-input" type="number" inputMode="decimal" step="1" value={lpi} autoComplete="off" onChange={(e) => setLpi(e.target.value)} />
          </div>
          <div className="pp-fieldwrap">
            <label htmlFor={`${uid}-angle`}>Angle (degrees)</label>
            <input id={`${uid}-angle`} className="pp-field cal-num-input" type="number" inputMode="decimal" step="0.5" value={angleDeg} autoComplete="off" onChange={(e) => setAngleDeg(e.target.value)} />
          </div>
          <div className="pp-fieldwrap">
            <label htmlFor={`${uid}-mesh`}>Mesh</label>
            <input id={`${uid}-mesh`} className="pp-field cal-num-input" type="number" inputMode="numeric" step="1" value={mesh} autoComplete="off" onChange={(e) => setMesh(e.target.value)} />
          </div>
        </div>
        <fieldset className="cal-films">
          <legend className="pp-dim">Films to make</legend>
          {INK_KINDS.map((kind) => (
            <label key={kind} className="cal-check">
              <input type="checkbox" checked={films.includes(kind)} onChange={() => toggleFilm(kind)} />
              <span>
                {INK_KIND_LABELS[kind]}
                <span className="isy-hint">{FILM_HINTS[kind]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {!settings.ok ? (
          <p role="alert" className="pp-error">
            {settings.error}
          </p>
        ) : null}
        <div className="pp-actions">
          {(['psd', 'pdf'] as const).map((format) => {
            const link = href(format);
            const label = format === 'psd' ? 'Download films (PSD)' : 'Download instructions (PDF)';
            return link ? (
              <a key={format} className={cn('pp-btn', format === 'psd' && 'pp-btn-strong')} href={link} download>
                {label}
              </a>
            ) : (
              <button key={format} type="button" className="pp-btn" disabled>
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {canManage ? (
        <>
          <fieldset className="cal-block">
            <legend className="mf-label">2. Read the printed chart</legend>
            <div className="cal-methods" role="radiogroup" aria-label="How the chart is read">
              {METHODS.map((m) => (
                <label key={m.id} className="cal-method" data-checked={method === m.id}>
                  <input
                    type="radio"
                    name={`${uid}-method`}
                    value={m.id}
                    checked={method === m.id}
                    onChange={() => {
                      setMethod(m.id);
                      setMessage(null);
                    }}
                  />
                  <span>{m.label}</span>
                </label>
              ))}
            </div>
            <p className="pp-dim">{METHODS.find((m) => m.id === method)?.hint}</p>

            {method === 'scan' ? (
              <div className="cal-scan">
                <p className="pp-dim">
                  Lay the garment flat on the glass, printed side down, with the four large corner squares in the scan. 600 dpi, colour, with automatic levels and sharpening off and the gamma at the scanner’s default (about 2.2, not linear). TIFF, PNG or JPEG, up to {formatBytes(maxScanBytes)}. Enter the screen above as it was printed.
                </p>
                <div className="pp-actions">
                  <label className={cn('pp-btn pp-btn-strong', (scan.phase === 'uploading' || !settings.ok) && 'cal-disabled')} aria-disabled={scan.phase === 'uploading' || !settings.ok}>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".png,.jpg,.jpeg,.tif,.tiff,image/png,image/jpeg,image/tiff"
                      disabled={scan.phase === 'uploading' || !settings.ok}
                      onChange={onFile}
                    />
                    {scan.phase === 'done' ? 'Read another scan' : 'Choose a scan'}
                  </label>
                </div>
                {scan.phase === 'uploading' ? (
                  <div className="pp-status">
                    <span aria-hidden="true">{scan.percent === null ? `Reading the chart in ${scan.filename}…` : `Uploading ${scan.filename}: ${scan.percent}%`}</span>
                    <span className="sr-only" role="status">
                      {scan.percent === null ? 'Reading the chart.' : `Uploading, ${Math.floor(scan.percent / 25) * 25} percent.`}
                    </span>
                    <progress className="pp-progress" max={100} value={scan.percent ?? undefined} aria-label="Upload progress" />
                  </div>
                ) : null}
                {scan.phase === 'error' ? (
                  <p role="alert" className="pp-error">
                    {scan.message}
                  </p>
                ) : null}
                {scan.phase === 'done' ? <ScanSummary reading={scan.reading} filename={scan.filename} use={use} onUse={(next) => setUse(next)} /> : null}
              </div>
            ) : (
              <div className="cal-typed">
                {method === 'spectro' ? (
                  <div className="cal-fields">
                    <div className="pp-fieldwrap">
                      <label htmlFor={`${uid}-unit`}>What the instrument shows</label>
                      <select
                        id={`${uid}-unit`}
                        className="pp-field cal-select"
                        value={measured.unit}
                        onChange={(e) => {
                          const unit = e.target.value;
                          if (isReadingUnit(unit)) setMeasured((m) => ({ ...m, unit: unit as ReadingUnit }));
                        }}
                      >
                        {READING_UNITS.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {measured.unit !== 'dot_area' ? (
                      <>
                        <div className="pp-fieldwrap">
                          <label htmlFor={`${uid}-garment`}>Bare garment ({unitInfo.unit})</label>
                          <input id={`${uid}-garment`} className="pp-field cal-num-input" inputMode="decimal" value={measured.garment} autoComplete="off" onChange={(e) => setMeasured((m) => ({ ...m, garment: e.target.value }))} />
                        </div>
                        <div className="pp-fieldwrap">
                          <label htmlFor={`${uid}-solid`}>Solid ink ({unitInfo.unit})</label>
                          <input id={`${uid}-solid`} className="pp-field cal-num-input" inputMode="decimal" value={measured.solid} autoComplete="off" onChange={(e) => setMeasured((m) => ({ ...m, solid: e.target.value }))} />
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <p className="pp-dim">
                  {method === 'spectro' ? unitInfo.hint : 'Type the dot area you measured at each step: the percentage of the patch the ink covers.'} Leave a box empty for a step you didn’t measure; ten or more steps make a good curve, and
                  three is the least that can be saved.
                </p>
                <div className="cal-entry">
                  {ENTRY_STEPS.map((step) => (
                    <div key={step} className="cal-cell">
                      <label htmlFor={`${uid}-step-${step}`}>{step}% on the film</label>
                      <input
                        id={`${uid}-step-${step}`}
                        className="pp-field cal-num-input"
                        inputMode="decimal"
                        value={entries.values[String(step)] ?? ''}
                        autoComplete="off"
                        placeholder={method === 'manual' || measured.unit === 'dot_area' ? '%' : unitInfo.unit}
                        onChange={(e) => setEntry(step, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                {problems.length > 0 ? (
                  <ul className="cal-problems" role="alert">
                    {problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </fieldset>

          <fieldset className="cal-block">
            <legend className="mf-label">3. Check the curve</legend>
            {curves ? (
              <>
                <p>
                  {gainAt50 !== null && gainAt50 >= 0 ? `A 50% tint on the film prints as ${whole(curves.gain(0.5))}%: ${gainAt50} points of dot gain.` : `A 50% tint on the film prints as ${whole(curves.gain(0.5))}%.`} To print 50%, the engine will put{' '}
                  {whole(curves.compensate(0.5))}% on the film.
                  {method === 'scan' && use.length > 0 ? ` From ${filmNames(use).toLowerCase()}.` : ''}
                </p>
                <div className="cal-plots">
                  <CurvePlot
                    title="What the press does"
                    description={`Printed coverage against film coverage. At 50% on the film the press prints ${whole(curves.gain(0.5))}%.`}
                    xLabel="Coverage on the film (%)"
                    yLabel="Coverage printed (%)"
                    lines={plotA}
                    readings={points}
                  />
                  <CurvePlot
                    title="What the engine puts on the film"
                    description={`Film coverage against the tone wanted. To print 50% the engine puts ${whole(curves.compensate(0.5))}% on the film.`}
                    xLabel="Tone you want (%)"
                    yLabel="Coverage on the film (%)"
                    lines={plotB}
                  />
                </div>
                <div className="pp-scroll">
                  <table className="cal-table">
                    <caption className="sr-only">The tone wanted and the coverage the engine puts on the film</caption>
                    <thead>
                      <tr>
                        <th scope="row">You want, printed</th>
                        {wantedToFilm.map((r) => (
                          <th key={r.tone} scope="col" className="cal-num">
                            {r.tone}%
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th scope="row">The film gets</th>
                        {wantedToFilm.map((r) => (
                          <td key={r.tone} className="cal-num">
                            {r.film}%
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {curves.moved.count > 0 ? (
                  <p className="pp-dim">
                    {curves.moved.count} reading{curves.moved.count > 1 ? 's' : ''} fell as the film coverage rose (by up to {percentText(curves.moved.max)} points); the curve evens {curves.moved.count > 1 ? 'them' : 'it'} out.
                  </p>
                ) : null}
                {note ? <p className="pp-soft">{note}</p> : null}
              </>
            ) : (
              <p className="pp-dim">{method === 'scan' ? 'Read a scan to see the curve.' : 'Type some readings to see the curve.'}</p>
            )}
            {candidateProblem ? (
              <p role="alert" className="pp-error">
                {candidateProblem}
              </p>
            ) : null}
          </fieldset>

          <fieldset className="cal-block">
            <legend className="mf-label">4. Save</legend>
            <p className="pp-dim">
              Saving adds a new version of the ink system with this calibration. Packs approved before keep their files. Packs prepared from now on, and packs run again, use the new curve.
            </p>
            <div className="pp-actions">
              <button type="button" className="pp-btn pp-btn-primary" disabled={pending || !candidate || candidateProblem !== null} onClick={save}>
                {pending && acting === 'save' ? 'Saving…' : current ? 'Replace the calibration' : 'Save the calibration'}
              </button>
            </div>
            {message ? (
              <p role={message.tone === 'error' ? 'alert' : 'status'} className={message.tone === 'error' ? 'pp-error' : 'pp-soft'}>
                {message.text}
              </p>
            ) : null}
          </fieldset>
        </>
      ) : (
        <p className="pp-soft">You can read this page and download the chart. Reading a printed chart and saving a calibration needs Manage access to Pre-press.</p>
      )}
    </div>
  );
}

const STATUS_WORDS: Record<ScanReading['films'][number]['status'], string> = { ok: 'Read', low_contrast: 'Hardly shows', not_printed: 'Not printed' };

/** What the reader found in a scan: the geometry, how sure it is, each film, and its warnings. */
function ScanSummary({ reading, filename, use, onUse }: { reading: ScanReading; filename: string; use: InkKind[]; onUse: (next: InkKind[]) => void }) {
  const { geometry } = reading;
  const confidence = { good: 'The scan reads cleanly.', check: 'The scan reads, but look at the notes below before saving.', poor: 'This scan can’t be used as it is.' }[reading.confidence];
  const toggle = (kind: InkKind) => onUse(INK_KINDS.filter((k) => (k === kind ? !use.includes(k) : use.includes(k))));
  return (
    <div className="cal-result">
      <p>
        <span className="cal-file">{filename}</span> · read at {reading.lpi} lpi, {reading.angleDeg}° · {Math.round(geometry.dpi)} dpi, turned {Math.abs(geometry.rotationDeg) < 0.05 ? '0' : geometry.rotationDeg.toFixed(1)}°, {geometry.marksFound} of 8 marks found
        {geometry.checkErrorMm !== null ? `, edge marks ${geometry.checkErrorMm.toFixed(1)} mm from where the corners put them` : ''}.
      </p>
      <p className={reading.confidence === 'poor' ? 'pp-error' : 'pp-soft'}>{confidence}</p>
      <div className="pp-scroll">
        <table className="cal-table">
          <caption className="sr-only">The films read from the scan, and which go into the curve</caption>
          <thead>
            <tr>
              <th scope="col">Film</th>
              <th scope="col">Result</th>
              <th scope="col" className="cal-num">
                50% prints as
              </th>
              <th scope="col">In the curve</th>
            </tr>
          </thead>
          <tbody>
            {INK_KINDS.map((kind) => {
              const film = reading.films.find((f) => f.kind === kind);
              if (!film) return null;
              const has = film.points.length > 0;
              const at50 = film.points.find((p) => Math.abs(p.input - 0.5) < 1e-9);
              return (
                <tr key={kind}>
                  <th scope="row">{INK_KIND_LABELS[kind]}</th>
                  <td>{STATUS_WORDS[film.status]}</td>
                  <td className="cal-num">{at50 ? `${whole(at50.printed)}%` : '–'}</td>
                  <td>
                    {has ? (
                      <label className="cal-check">
                        <input type="checkbox" checked={use.includes(kind)} onChange={() => toggle(kind)} />
                        <span className="sr-only">Use {INK_KIND_LABELS[kind].toLowerCase()} in the curve</span>
                        <span aria-hidden="true">Use</span>
                      </label>
                    ) : (
                      <span className="pp-dim">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {reading.warnings.filter((w) => w.severity !== 'info' || w.code !== 'not_printed').length > 0 ? (
        <ul className="cal-problems">
          {reading.warnings
            .filter((w) => w.severity !== 'info' || w.code !== 'not_printed')
            .map((w, i) => (
              <li key={`${w.code}-${w.film ?? ''}-${i}`} data-severity={w.severity}>
                {w.message}
              </li>
            ))}
        </ul>
      ) : null}
      <details className="cal-details">
        <summary>Show every reading</summary>
        <div className="pp-scroll">
          <table className="cal-table">
            <caption className="sr-only">Printed coverage read at each step of each film</caption>
            <thead>
              <tr>
                <th scope="col">On the film</th>
                {reading.films
                  .filter((f) => f.points.length > 0)
                  .map((f) => (
                    <th key={f.kind} scope="col" className="cal-num">
                      {INK_KIND_LABELS[f.kind]}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 21 }, (_, i) => (
                <tr key={i}>
                  <th scope="row">{i * 5}%</th>
                  {reading.films
                    .filter((f) => f.points.length > 0)
                    .map((f) => (
                      <td key={f.kind} className="cal-num">
                        {percentText(f.points[i].printed)}%
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
