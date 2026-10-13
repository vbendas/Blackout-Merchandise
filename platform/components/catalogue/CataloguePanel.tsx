'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { CatalogueIndex, CatalogueItem } from '@/lib/catalog/catalogue-index';
import { useOptionalStudioSidebar } from '@/components/studio/StudioSidebarProvider';
import { useCatalogue, type CatalogueOpenOptions } from './CatalogueProvider';
import { loadCatalogueIndex, peekCatalogueIndex } from './catalogue-client';
import {
  ALL,
  CATEGORY_NAMES,
  INITIAL_FILTERS,
  PAGE_SIZE,
  activeFacetCount,
  applyFilters,
  categoryFromName,
  facetsOf,
  hasActiveFilters,
  inCategory,
  reconcileFilters,
  type CatalogueFilters,
} from './catalogue-state';
import { CatalogueDetailPanel } from './CatalogueDetail';
import { CatalogueFilterRow } from './CatalogueFilterRow';
import { CatalogueTile, CatalogueTileSkeleton } from './CatalogueTile';
import './catalogue.css';

const NO_ITEMS: readonly CatalogueItem[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** What can take focus inside `container` right now (not inert, not hidden). */
function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getClientRects().length > 0 && !element.closest('[inert]'),
  );
}

type IndexState = { status: 'loading' } | { status: 'ready'; index: CatalogueIndex } | { status: 'error' };

/** The index, fetched once for the page (catalogue-client.ts keeps it), with a way to ask again. */
function useCatalogueIndex(): [IndexState, () => void] {
  const [state, setState] = useState<IndexState>(() => {
    const kept = peekCatalogueIndex();
    return kept ? { status: 'ready', index: kept } : { status: 'loading' };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadCatalogueIndex().then(
      (index) => {
        if (!cancelled) setState({ status: 'ready', index });
      },
      () => {
        if (!cancelled) setState({ status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  return [state, retry];
}

/** The catalogue: a panel over the Studio listing every blank, 12 at a time,
 * with a category rail, filters, search and a detail panel per blank.
 * CatalogueProvider renders it (its `panel`); nothing is in the page until
 * the first open(), after which it stays, hidden, so the list, the filters and
 * the fetched index are all there at once the next time. */
export function CataloguePanel() {
  const { isOpen } = useCatalogue();
  const [everOpened, setEverOpened] = useState(false);
  if (isOpen && !everOpened) setEverOpened(true);
  return everOpened ? <CatalogueOverlay /> : null;
}

interface DetailState {
  code: string;
  /** the colour filter in use when it was opened from the list */
  colour: string | null;
  fromList: boolean;
}

function CatalogueOverlay() {
  const { isOpen: open, options, close, sendToChat } = useCatalogue();
  const studio = useOptionalStudioSidebar();
  const titleId = useId();
  const filtersId = useId();

  const [load, retryLoad] = useCatalogueIndex();
  const index = load.status === 'ready' ? load.index : null;
  const items = index?.items ?? NO_ITEMS;

  const [filters, setFilters] = useState<CatalogueFilters>(INITIAL_FILTERS);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Every open() starts from what it asked for: a category, a search, or one
  // blank's detail. (Derived while rendering, so nothing flashes the old view.)
  const [applied, setApplied] = useState<CatalogueOpenOptions | null>(null);
  if (open && applied !== options) {
    setApplied(options);
    setFilters({ ...INITIAL_FILTERS, category: categoryFromName(options.category), q: options.q?.trim() ?? '' });
    setVisible(PAGE_SIZE);
    setFiltersOpen(false);
    const code = options.code?.trim().toUpperCase();
    setDetail(code ? { code, colour: null, fromList: false } : null);
    setDetailOpen(Boolean(code));
  } else if (!open && applied !== null) {
    setApplied(null);
  }

  const categoryItems = useMemo(() => inCategory(items, filters.category), [items, filters.category]);
  const facets = useMemo(() => facetsOf(categoryItems), [categoryItems]);
  const results = useMemo(() => applyFilters(categoryItems, filters), [categoryItems, filters]);
  const filtered = hasActiveFilters(filters);
  const shown = results.slice(0, visible);

  const frameRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const resetView = () => {
    setVisible(PAGE_SIZE);
    if (resultsRef.current) resultsRef.current.scrollTop = 0;
  };
  const change = (patch: Partial<CatalogueFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    resetView();
  };
  const chooseCategory = (category: string) => {
    // Filters the new category does not offer are dropped, not left applied out of sight.
    setFilters((current) => reconcileFilters({ ...current, category }, facetsOf(inCategory(items, category))));
    resetView();
  };
  const clearFilters = () => change({ fit: null, audience: null, weight: null, colour: null, q: '' });

  // "Show 12 more": focus moves to the first new tile, so keyboard users carry on into it.
  const focusTile = useRef<number | null>(null);
  const showMore = () => {
    focusTile.current = shown.length;
    setVisible((count) => count + PAGE_SIZE);
  };
  useEffect(() => {
    if (focusTile.current === null) return;
    const tile = resultsRef.current?.querySelectorAll<HTMLElement>('.cat-tile[data-code]')[focusTile.current];
    focusTile.current = null;
    tile?.focus();
  }, [visible]);

  const openDetail = (code: string) => {
    setDetail({ code, colour: filters.colour, fromList: true });
    setDetailOpen(true);
  };

  // "Use this blank" and "Quote a run" go to the conversation the artist is in;
  // pages without one (Settings, Billing) start a fresh session with it.
  const send = (text: string) => {
    if (!sendToChat(text)) studio?.askStudio(text);
    close();
  };

  // While open the Studio behind is inert (no focus, no taps, hidden from
  // screen readers) and the page does not scroll; on close focus goes back to
  // whatever opened the catalogue.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const shell = document.querySelector<HTMLElement>('.mf-shell');
    if (shell) shell.inert = true;
    const { documentElement: html, body } = document;
    const overflow = { html: html.style.overflow, body: body.style.overflow };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = overflow.html;
      body.style.overflow = overflow.body;
      if (shell) shell.inert = false;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  // Where focus sits: the search on desktop (phones would raise the keyboard)
  // or the panel itself on open, the detail's back button when it opens, and
  // the tile it came from when it closes.
  const detailWasOpen = useRef(false);
  useEffect(() => {
    if (!open) {
      detailWasOpen.current = false;
      return;
    }
    if (detailOpen) {
      detailRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (detailWasOpen.current && detail) {
      const tile = resultsRef.current?.querySelector<HTMLElement>(`[data-code="${detail.code}"]`);
      (tile ?? frameRef.current)?.focus();
    } else {
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      (finePointer ? searchRef.current : frameRef.current)?.focus();
    }
    detailWasOpen.current = detailOpen;
  }, [open, detailOpen, detail]);

  // Escape closes the detail first, then the catalogue; Tab stays inside
  // whichever is on top.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (detailOpen) setDetailOpen(false);
        else close();
        return;
      }
      if (event.key !== 'Tab') return;
      const container = detailOpen ? detailRef.current : frameRef.current;
      if (!container) return;
      const controls = focusableIn(container);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) {
        event.preventDefault();
        container.focus();
        return;
      }
      const active = document.activeElement;
      const inside = active instanceof Node && container.contains(active) && active !== container;
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, detailOpen, close]);

  // The dimmed Studio around the catalogue closes it, but only when the press
  // and the release both landed on the dim itself: a drag that starts inside
  // the catalogue (selecting text) and ends outside it still produces a click
  // on this element, and must not close anything.
  const pressedOnScrim = useRef(false);
  const onScrimPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pressedOnScrim.current = event.target === event.currentTarget;
  };
  const onScrimPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) pressedOnScrim.current = false;
  };
  const onScrimClick = (event: MouseEvent<HTMLDivElement>) => {
    const clean = pressedOnScrim.current && event.target === event.currentTarget;
    pressedOnScrim.current = false;
    if (clean) close();
  };

  const total = index?.items.length ?? null;
  const title = filters.category === ALL ? 'All blanks' : filters.category;
  const matchCount = results.length;
  const summary = filtered
    ? `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}`
    : `Showing ${Math.min(visible, matchCount)} of ${matchCount}`;
  const facetCount = activeFacetCount(filters);

  const detailItem = detail ? (items.find((item) => item.code === detail.code) ?? null) : null;
  const detailIndex = detail?.fromList ? results.findIndex((item) => item.code === detail.code) : -1;
  const position = detailIndex >= 0 ? `${detailIndex + 1} of ${matchCount}` : null;

  const rail = index?.categories ?? CATEGORY_NAMES.map((name) => ({ name, count: null }));

  return (
    <div
      className="cat-root"
      data-open={open}
      data-filters={filtersOpen ? 'open' : 'closed'}
      onPointerDown={onScrimPointerDown}
      onPointerUp={onScrimPointerUp}
      onClick={onScrimClick}
    >
      <div className="cat-stage">
        <div
          ref={frameRef}
          className="cat-frame"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          inert={detailOpen || !open}
        >
          <header className="cat-top">
            <div className="cat-title">
              <h2 id={titleId}>Catalogue</h2>{' '}
              <span className="cat-label cat-dim">{total === null ? '' : `${total} blanks`}</span>
            </div>
            <label className="cat-search">
              <Search className="mf-icon cat-ic" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={filters.q}
                onChange={(event) => change({ q: event.target.value })}
                onKeyDown={(event) => {
                  // On a phone, Enter puts the keyboard away so the results show.
                  if (event.key === 'Enter' && window.matchMedia('(pointer: coarse)').matches) event.currentTarget.blur();
                }}
                placeholder="Search: heavy, zip, boxy"
                aria-label="Search the catalogue"
                enterKeyHint="search"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button
              type="button"
              className="mf-chip cat-fbtn"
              aria-expanded={filtersOpen}
              aria-controls={filtersId}
              onClick={() => setFiltersOpen((current) => !current)}
            >
              <SlidersHorizontal className="mf-icon cat-ic" aria-hidden />
              Filters{facetCount > 0 ? ` · ${facetCount}` : ''}
            </button>
            <button type="button" className="cat-x" aria-label="Close the catalogue" onClick={close}>
              <X className="mf-icon cat-ic" aria-hidden />
            </button>
          </header>

          <div className="cat-body">
            <nav className="cat-rail" aria-label="Categories">
              <button type="button" aria-pressed={filters.category === ALL} onClick={() => chooseCategory(ALL)}>
                <span>All</span>{' '}
                <span className="cat-n">{total ?? ''}</span>
              </button>
              <div className="cat-sep" aria-hidden />
              {rail.map((category) => (
                <button key={category.name} type="button" aria-pressed={filters.category === category.name} onClick={() => chooseCategory(category.name)}>
                  <span>{category.name}</span>{' '}
                  <span className="cat-n">{category.count ?? ''}</span>
                </button>
              ))}
              <span className="cat-rail-end" aria-hidden />
            </nav>

            <div className="cat-main">
              <CatalogueFilterRow id={filtersId} filters={filters} facets={facets} onChange={change} />

              <div ref={resultsRef} className="cat-results" aria-busy={load.status === 'loading'}>
                {load.status === 'error' ? (
                  <div className="cat-empty" role="alert">
                    <p>The catalogue could not load just now.</p>
                    <button type="button" className="mf-pill" onClick={retryLoad}>
                      Try again
                    </button>
                  </div>
                ) : load.status === 'loading' ? (
                  <>
                    <div className="cat-rhead">
                      <h3>{title}</h3>
                    </div>
                    <ul className="cat-grid" role="list" aria-hidden>
                      {Array.from({ length: PAGE_SIZE }, (_, i) => (
                        <CatalogueTileSkeleton key={i} />
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="cat-rhead">
                      <h3>{title}</h3>
                      <span className="cat-label cat-dim" role="status">
                        {summary}
                      </span>
                    </div>
                    {matchCount === 0 ? (
                      <EmptyResults
                        filters={filters}
                        elsewhere={filters.category === ALL ? 0 : applyFilters(items, filters).length}
                        onClear={clearFilters}
                        onLookEverywhere={() => chooseCategory(ALL)}
                      />
                    ) : (
                      <>
                        <ul className="cat-grid" role="list">
                          {shown.map((item) => (
                            <CatalogueTile key={item.code} item={item} onOpen={openDetail} />
                          ))}
                        </ul>
                        {shown.length < matchCount ? (
                          <div className="cat-more">
                            <button type="button" className="mf-pill" onClick={showMore}>
                              Show {Math.min(PAGE_SIZE, matchCount - shown.length)} more
                            </button>
                            {filtered ? (
                              <span className="cat-label cat-dim">
                                {shown.length} of {matchCount} shown
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="cat-scrim" data-on={detailOpen} aria-hidden onClick={() => setDetailOpen(false)} />

        <CatalogueDetailPanel
          asideRef={detailRef}
          open={detailOpen && open}
          code={detail?.code ?? null}
          item={detailItem}
          missing={detail !== null && index !== null && detailItem === null}
          position={position}
          startColour={detail?.colour ?? null}
          onBack={() => setDetailOpen(false)}
          onSend={send}
        />
      </div>
    </div>
  );
}

function EmptyResults({
  filters,
  elsewhere,
  onClear,
  onLookEverywhere,
}: {
  filters: CatalogueFilters;
  /** matches the same filters would have in every category */
  elsewhere: number;
  onClear: () => void;
  onLookEverywhere: () => void;
}) {
  const query = filters.q.trim();
  return (
    <div className="cat-empty">
      <p>{query && activeFacetCount(filters) === 0 ? <>Nothing matches &ldquo;{query}&rdquo;.</> : 'Nothing matches these filters.'}</p>
      <div className="cat-empty-actions">
        <button type="button" className="mf-pill" onClick={onClear}>
          Clear filters
        </button>
        {elsewhere > 0 ? (
          <button type="button" className="mf-pill" onClick={onLookEverywhere}>
            Look in all categories
          </button>
        ) : null}
      </div>
    </div>
  );
}
