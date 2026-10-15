'use client';

import { Fragment, useId, useState } from 'react';
import type { PackFilmView, PackGarmentProof } from '@/lib/services/prepress';
import { filmsSharedNote } from './format';
import { ChangeInk } from './ChangeInk';
import { PantoneEntry } from './PantoneEntry';
import { PrintImage } from './PrintImage';

/** The screen pack's working area: the films in press order, the selected film
 * with its numbers, the proof drawn from these films on each garment colour, and
 * the inks table. They share one selection, so they live in one component.
 * Each film carries its own ruling, angle, dot shape and ppi (the recipe the
 * pack was built with, or the corrected PSD's resolution). */

/** The film the page opens on: the first with a true-size crop to look at, else the first. */
function defaultFilm(films: PackFilmView[]): number {
  const withCrop = films.findIndex((film) => film.cropUrl);
  return withCrop === -1 ? 0 : withCrop;
}

function halftoneLine(film: PackFilmView): string {
  return `${film.lpi} lpi · ${film.angleDeg}° · ${film.dotShape === 'ellipse' ? 'elliptical' : 'round'} dot · ${film.ppi} ppi`;
}

export function ScreenWorkbench({
  packId,
  films,
  proofs,
  canWork,
}: {
  packId: string;
  films: PackFilmView[];
  proofs: PackGarmentProof[];
  canWork: boolean;
}) {
  const uid = useId();
  // null: nothing picked yet, so the default shows. Clamped, because a re-run can leave fewer films.
  const [picked, setPicked] = useState<number | null>(null);
  const [garmentCode, setGarmentCode] = useState<string | null>(null);
  const [changing, setChanging] = useState<number | null>(null);

  if (films.length === 0) {
    return <p className="pp-dim">This pack has no films yet.</p>;
  }

  const selected = Math.min(picked ?? defaultFilm(films), films.length - 1);
  const film = films[selected];
  const garment = proofs.find((proof) => proof.garmentCode === garmentCode) ?? proofs[0];
  const sharedNote = filmsSharedNote(
    proofs.map((proof) => proof.garmentName),
    films.length,
  );
  const columns = canWork ? 8 : 7;

  return (
    <>
      <section aria-labelledby={`${uid}-films`} className="pp-section">
        <div className="pp-sechead">
          <h2 id={`${uid}-films`} className="mf-label">
            Films in press order
          </h2>
          {sharedNote ? <span className="pp-dim">{sharedNote}</span> : null}
        </div>
        <div className="pp-films">
          {films.map((entry, index) => (
            <button
              key={entry.plateIndex}
              type="button"
              className="pp-film"
              aria-pressed={index === selected}
              aria-label={`Film ${entry.n} of ${entry.total}: ${entry.label}`}
              onClick={() => setPicked(index)}
            >
              <PrintImage src={entry.previewUrl} alt="" />
              <span className="pp-film-pos">
                {entry.n}/{entry.total}
              </span>
              <span className="pp-film-name">
                <span aria-hidden="true" className="pp-sw" style={{ background: entry.hex }} />
                {entry.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Selected film and proof" className="pp-split">
        <div className="pp-col">
          <h2 className="mf-label">
            Film {film.n} of {film.total}
          </h2>
          <PrintImage className="pp-film-big" src={film.previewUrl} alt={`Film ${film.n} of ${film.total}: ${film.label}`} />
          <dl className="pp-dl">
            <dt>Ink</dt>
            <dd>{film.label}</dd>
            <dt>Client sees</dt>
            <dd>{film.clientName}</dd>
            <dt>Base</dt>
            <dd>{film.base}</dd>
            <dt>Art colour</dt>
            <dd className="pp-mono">{film.hex}</dd>
            <dt>Coverage</dt>
            <dd>{film.coverage} of the print area</dd>
            <dt>Halftone</dt>
            <dd>{halftoneLine(film)}</dd>
            <dt>Mesh</dt>
            <dd>{film.mesh} (suggested)</dd>
          </dl>
          {film.cropUrl ? (
            <figure className="pp-crop">
              <PrintImage src={film.cropUrl} alt={`True-size detail of film ${film.n} showing halftone dots`} />
              <figcaption className="pp-cap">True size · {film.ppi} ppi · 1 inch</figcaption>
            </figure>
          ) : null}
        </div>

        <div className="pp-col">
          <div className="pp-sechead">
            <h2 className="mf-label">Proof from these films</h2>
            {proofs.length > 1 ? (
              <div className="pp-chips" role="group" aria-label="Garment colour">
                {proofs.map((proof) => (
                  <button
                    key={proof.garmentCode}
                    type="button"
                    className="pp-chip"
                    aria-pressed={proof.garmentCode === garment?.garmentCode}
                    onClick={() => setGarmentCode(proof.garmentCode)}
                  >
                    <span aria-hidden="true" className="pp-sw" style={{ background: proof.hex }} />
                    {proof.garmentName}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {garment ? (
            <div className="pp-plate">
              <PrintImage src={garment.url} alt={`Screen print proof on ${garment.garmentName}, drawn from the films`} />
            </div>
          ) : (
            <p className="pp-dim">There is no proof for this pack yet.</p>
          )}
        </div>
      </section>

      <section aria-labelledby={`${uid}-inks`} className="pp-section pp-section-tight">
        <h2 id={`${uid}-inks`} className="mf-label">
          Inks
        </h2>
        <div className="pp-scroll" role="region" aria-label="Inks table" tabIndex={0}>
          <table className="pp-table pp-table-inks">
            <caption className="sr-only">Inks in press order</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Ink · MagnaMix</th>
                <th scope="col">Client sees</th>
                <th scope="col">Art colour</th>
                <th scope="col">Base</th>
                <th scope="col">Coverage</th>
                <th scope="col">Mesh</th>
                {canWork ? (
                  <th scope="col">
                    <span className="sr-only">Change</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {films.map((entry) => (
                <Fragment key={entry.plateIndex}>
                  <tr>
                    <td className="pp-mono pp-dim">{entry.n}</td>
                    <td>
                      <span className="pp-inkname">
                        <span aria-hidden="true" className="pp-sw pp-sw-lg" style={{ background: entry.hex }} />
                        {entry.pantone ?? entry.label}
                      </span>
                      {entry.needsPantone ? <PantoneEntry packId={packId} film={entry} canWork={canWork} /> : null}
                    </td>
                    <td>{entry.clientName}</td>
                    <td className="pp-mono">{entry.hex}</td>
                    <td>{entry.base}</td>
                    <td className="pp-mono">{entry.coverage}</td>
                    <td className="pp-mono">{entry.mesh}</td>
                    {canWork ? (
                      <td>
                        <button
                          type="button"
                          className="pp-btn pp-btn-xs"
                          aria-expanded={changing === entry.plateIndex}
                          aria-label={`Change ink ${entry.n}: ${entry.label}`}
                          onClick={() => setChanging(changing === entry.plateIndex ? null : entry.plateIndex)}
                        >
                          Change ink
                        </button>
                      </td>
                    ) : null}
                  </tr>
                  {canWork && changing === entry.plateIndex ? (
                    <tr className="pp-change">
                      <td colSpan={columns}>
                        <ChangeInk packId={packId} film={entry} onClose={() => setChanging(null)} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
