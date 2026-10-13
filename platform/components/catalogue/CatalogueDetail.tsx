'use client';

import { useEffect, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import Image from 'next/image';
import { ChevronLeft } from 'lucide-react';
import type { CatalogueDetail, CatalogueItem } from '@/lib/catalog/catalogue-index';
import { formatMoney } from '@/components/cards/CardKit';
import { loadCatalogueDetail, peekCatalogueDetail } from './catalogue-client';
import { fitPhrase, makeProductMessage, printPhrase, quoteRunMessage, sizeLabel } from './catalogue-state';

/** Colours shown before "+N more": two rows of the most common ones. */
const SWATCH_LIMIT = 24;

// The panel is 560px wide minus 20px padding each side; full width on phones.
const PLATE_SIZES = '(max-width: 759px) 100vw, 520px';

const swatchColour = (hex: string) => ({ '--c': hex }) as CSSProperties;

export interface CatalogueDetailPanelProps {
  asideRef: Ref<HTMLElement>;
  open: boolean;
  /** the blank on show; kept after closing so the panel slides out with its content */
  code: string | null;
  /** that blank's entry in the index; null until the index has loaded */
  item: CatalogueItem | null;
  /** the index has loaded and has no blank with this code */
  missing: boolean;
  /** '3 of 36' when it was opened from the list */
  position: string | null;
  /** the colour to start on, such as the colour filter in use */
  startColour: string | null;
  onBack: () => void;
  /** "Use this blank" and "Quote a run" hand their message over here */
  onSend: (text: string) => void;
}

/** The slide-in panel for one blank: big photo with Front/Back, every colour,
 * the specs and the two ways on. Always in the page once the catalogue has
 * opened, hidden until a blank is chosen. */
export function CatalogueDetailPanel({ asideRef, open, code, item, missing, position, startColour, onBack, onSend }: CatalogueDetailPanelProps) {
  return (
    <aside
      ref={asideRef}
      className="cat-detail"
      role="dialog"
      aria-modal="true"
      aria-label={item?.name ?? 'Blank'}
      tabIndex={-1}
      data-open={open}
      inert={!open}
    >
      <div className="cat-dtop">
        <button type="button" className="mf-chip" data-autofocus onClick={onBack}>
          <ChevronLeft className="mf-icon cat-ic" aria-hidden />
          Catalogue
        </button>
        {position ? <span className="cat-label cat-dim">{position}</span> : null}
      </div>
      {code && item ? (
        <DetailBody key={code} item={item} startColour={startColour} onSend={onSend} />
      ) : code && missing ? (
        <div className="cat-dbody">
          <p className="cat-dnote">That blank is no longer in the catalogue.</p>
        </div>
      ) : code ? (
        <DetailSkeleton />
      ) : null}
    </aside>
  );
}

type View = 'front' | 'back';

function DetailBody({ item, startColour, onSend }: { item: CatalogueItem; startColour: string | null; onSend: (text: string) => void }) {
  const base = item.colours[0];
  const [detail, setDetail] = useState<CatalogueDetail | undefined>(() => peekCatalogueDetail(item.code));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [colour, setColour] = useState(() => (startColour && item.colours.some((c) => c.code === startColour) ? startColour : base.code));
  const [view, setView] = useState<View>('front');
  const [showAll, setShowAll] = useState(false);

  // A detail already kept comes back at once (and sets what is already there).
  useEffect(() => {
    let cancelled = false;
    loadCatalogueDetail(item.code).then(
      (value) => {
        if (!cancelled) setDetail(value);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [item.code, attempt]);

  function retry() {
    setFailed(false);
    setAttempt((n) => n + 1);
  }

  // The index knows the base photos; the other colours' come with the detail.
  const entry = detail?.colours.find((c) => c.code === colour);
  const front = entry?.front ?? item.front;
  const back = entry ? entry.back : colour === base.code ? item.back : null;
  const shownView: View = view === 'back' && back ? 'back' : 'front';
  const src = shownView === 'back' && back ? back : front;
  const current = item.colours.find((c) => c.code === colour) ?? base;

  // Blanks with more than two rows of colours show the first rows and a
  // "+N more"; a colour past them (picked by a filter) must not hide in it.
  const hidden = item.colours.length - SWATCH_LIMIT;
  const expanded = hidden <= 0 || showAll || item.colours.findIndex((c) => c.code === colour) >= SWATCH_LIMIT;
  const swatches = expanded ? item.colours : item.colours.slice(0, SWATCH_LIMIT);

  return (
    <>
      <div className="cat-dbody">
        <div className="cat-dplate mf-plate">
          <Image className="cat-dimg" src={src} alt={`${item.name}, ${current.name}, ${shownView}`} fill sizes={PLATE_SIZES} loading="eager" />
          {back ? (
            <div className="cat-views" role="group" aria-label="View">
              <button type="button" aria-pressed={shownView === 'front'} onClick={() => setView('front')}>
                Front
              </button>
              <button type="button" aria-pressed={shownView === 'back'} onClick={() => setView('back')}>
                Back
              </button>
            </div>
          ) : null}
        </div>

        <div className="cat-dhead">
          <span className="cat-label cat-dim">{item.category}</span>
          <h2 className="cat-dname">{item.name}</h2>
          {detail ? (
            detail.description ? <p>{detail.description}</p> : null
          ) : failed ? null : (
            <span className="cat-sk mf-skel" style={{ width: '84%', height: 16 }} />
          )}
        </div>

        <div className="cat-colours">
          <span className="cat-label cat-dim">Colour · {current.name}</span>
          <div className="cat-swrow" role="group" aria-label="Colour">
            {swatches.map((c) => (
              <button
                key={c.code}
                type="button"
                className="cat-sw"
                style={swatchColour(c.hex)}
                aria-pressed={c.code === colour}
                aria-label={c.name}
                title={c.name}
                onClick={() => setColour(c.code)}
              />
            ))}
            {expanded ? null : (
              <button type="button" className="cat-more-colours" onClick={() => setShowAll(true)}>
                + {hidden} more
              </button>
            )}
          </div>
        </div>

        {detail ? (
          <Specs detail={detail} />
        ) : failed ? (
          <div className="cat-dnote" role="alert">
            <p>The details did not load.</p>
            <button type="button" className="mf-pill" onClick={retry}>
              Try again
            </button>
          </div>
        ) : (
          <SpecSkeleton />
        )}
      </div>

      <div className="cat-dacts">
        <button type="button" className="mf-pill mf-pill-primary" onClick={() => onSend(makeProductMessage(item.name, current.name))}>
          Use this blank
        </button>
        <button type="button" className="mf-pill" onClick={() => onSend(quoteRunMessage(item.name, current.name))}>
          Quote a run
        </button>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Spec rows: only the ones the sheet has something for. */
function Specs({ detail }: { detail: CatalogueDetail }) {
  const weightFit = [detail.weightGsm ? `${detail.weightGsm} g` : null, detail.fit ? fitPhrase(detail.fit) : null].filter(Boolean).join(' · ');
  const guide = detail.sizeGuide;
  return (
    <dl className="cat-spec">
      {detail.composition ? <Row label="Fabric">{detail.composition}</Row> : null}
      {weightFit ? <Row label="Weight · fit">{weightFit}</Row> : null}
      {detail.sizeRange || guide ? (
        <Row label="Sizes">
          {detail.sizeRange}
          {guide && guide.rows.length > 0 ? (
            <details className="cat-sg">
              <summary>Size guide, {guide.unit}</summary>
              <div className="cat-sgwrap">
                <table className="cat-sgtable">
                  <thead>
                    <tr>
                      <th scope="col">Size</th>
                      {guide.columns.map((column) => (
                        <th key={column} scope="col">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guide.rows.map((row) => (
                      <tr key={row.size}>
                        <th scope="row">{sizeLabel(row.size)}</th>
                        {row.values.map((value, i) => (
                          <td key={i}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}
        </Row>
      ) : null}
      <Row label="Print">{printPhrase(detail.printTechniques)}</Row>
      {detail.certifications.length > 0 ? <Row label="Certified">{detail.certifications.join(', ')}</Row> : null}
      {detail.fromPriceCents !== null ? <Row label="Base cost">from {formatMoney(detail.fromPriceCents)} a piece, before your price</Row> : null}
    </dl>
  );
}

function SpecSkeleton() {
  return (
    <div className="cat-spec-skel" aria-hidden>
      {[72, 56, 64, 48, 60].map((width, i) => (
        <span key={i} className="cat-sk mf-skel" style={{ width: `${width}%`, height: 14 }} />
      ))}
    </div>
  );
}

/** The panel while the index is still loading (opened straight onto a blank). */
function DetailSkeleton() {
  return (
    <div className="cat-dbody" aria-hidden>
      <div className="cat-dplate mf-skel" />
      <span className="cat-sk mf-skel" style={{ width: '46%', height: 28 }} />
      <SpecSkeleton />
    </div>
  );
}
