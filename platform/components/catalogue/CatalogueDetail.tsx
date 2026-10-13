'use client';

import { useEffect, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import Image from 'next/image';
import { Check, ChevronLeft, Plus } from 'lucide-react';
import type { PickColour } from '@/lib/agent/pick';
import type { CatalogueColour, CatalogueDetail, CatalogueItem } from '@/lib/catalog/catalogue-index';
import { formatMoney } from '@/components/cards/CardKit';
import { loadCatalogueDetail, peekCatalogueDetail } from './catalogue-client';
import { fitPhrase, printPhrase, sizeLabel } from './catalogue-state';

/** Colours shown before "+N more": two rows of the most common ones. */
const SWATCH_LIMIT = 24;

// The drawer is 560px wide minus 20px padding each side; full width on phones.
const PLATE_SIZES = '(max-width: 767px) 100vw, 520px';

const swatchColour = (hex: string) => ({ '--c': hex }) as CSSProperties;

export interface CatalogueDrawerProps {
  /** the drawer itself, for the page's focus trap */
  drawerRef: Ref<HTMLElement>;
  open: boolean;
  /** the blank on show; kept after closing so the drawer slides out with its content.
   * A code the catalogue does not have is passed as null: it is ignored. */
  code: string | null;
  /** that blank's entry in the index; null until the index has loaded */
  item: CatalogueItem | null;
  /** '3 of 36' when the blank is in the list on the page */
  position: string | null;
  /** the colour to start on, such as the colour filter in use */
  startColour: string | null;
  /** this blank's colours that are in the artist's pick */
  pickColours: readonly PickColour[];
  /** the primary action: puts the colour on show in the pick, or takes it out */
  onTogglePick: (colour: CatalogueColour) => void;
  /** the back arrow, the dim layer */
  onBack: () => void;
  /** "Use just this one": the blank and the colour on show, for one product */
  onUseOne: (blankName: string, colourName: string) => void;
}

/** The slide-in drawer for one blank, over the catalogue page and not the
 * sidebar, with its own dim layer: big photo with Front/Back, every colour
 * (a dot marks the ones in the pick), the specs, and the two ways on, adding
 * the colour to the pick or using just this blank. Always in the page, hidden
 * until a blank is open. */
export function CatalogueDrawer({
  drawerRef,
  open,
  code,
  item,
  position,
  startColour,
  pickColours,
  onTogglePick,
  onBack,
  onUseOne,
}: CatalogueDrawerProps) {
  return (
    <div className="cat-drawer" data-open={open} inert={!open}>
      <div className="cat-veil" aria-hidden onClick={onBack} />
      <aside ref={drawerRef} className="cat-detail" role="dialog" aria-modal="true" aria-label={item?.name ?? 'Blank'} tabIndex={-1}>
        <div className="cat-dtop">
          <button type="button" className="mf-chip" data-autofocus onClick={onBack}>
            <ChevronLeft className="mf-icon cat-ic" aria-hidden />
            Catalogue
          </button>
          {position ? <span className="cat-label cat-dim">{position}</span> : null}
        </div>
        {code && item ? (
          <DetailBody key={code} item={item} startColour={startColour} pickColours={pickColours} onTogglePick={onTogglePick} onUseOne={onUseOne} />
        ) : code ? (
          <DetailSkeleton />
        ) : null}
      </aside>
    </div>
  );
}

type View = 'front' | 'back';

interface DetailBodyProps {
  item: CatalogueItem;
  startColour: string | null;
  pickColours: readonly PickColour[];
  onTogglePick: (colour: CatalogueColour) => void;
  onUseOne: (blankName: string, colourName: string) => void;
}

function DetailBody({ item, startColour, pickColours, onTogglePick, onUseOne }: DetailBodyProps) {
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

  const picked = pickColours.some((c) => c.code === current.code);

  // Blanks with more than two rows of colours show the first rows and a
  // "+N more"; a colour past them (picked by a filter) must not hide in it.
  const hidden = item.colours.length - SWATCH_LIMIT;
  const expanded = hidden <= 0 || showAll || item.colours.findIndex((c) => c.code === colour) >= SWATCH_LIMIT;
  const swatches = expanded ? item.colours : item.colours.slice(0, SWATCH_LIMIT);

  return (
    <>
      <div className="cat-dbody">
        <div className="cat-dplate mf-plate">
          <Image src={src} alt={`${item.name}, ${current.name}, ${shownView}`} fill sizes={PLATE_SIZES} loading="eager" />
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
            {swatches.map((c) => {
              const inPick = pickColours.some((p) => p.code === c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  className="cat-sw"
                  style={swatchColour(c.hex)}
                  data-inpick={inPick}
                  aria-pressed={c.code === colour}
                  aria-label={inPick ? `${c.name}, in your pick` : c.name}
                  title={c.name}
                  onClick={() => setColour(c.code)}
                />
              );
            })}
            {expanded ? null : (
              <button type="button" className="cat-more-colours" onClick={() => setShowAll(true)}>
                + {hidden} more
              </button>
            )}
          </div>
          <span className="cat-inpick">
            {pickColours.length > 0 ? `In your pick: ${pickColours.map((c) => c.name).join(', ')}` : 'Not in your pick yet'}
          </span>
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
        <button type="button" className="mf-pill mf-pill-primary" aria-pressed={picked} onClick={() => onTogglePick(current)}>
          {picked ? <Check className="mf-icon cat-ic" aria-hidden /> : <Plus className="mf-icon cat-ic" aria-hidden />}
          {picked ? `${current.name} in your pick` : `Add ${current.name} to your pick`}
        </button>
        <button type="button" className="mf-pill" onClick={() => onUseOne(item.name, current.name)}>
          Use just this one
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
