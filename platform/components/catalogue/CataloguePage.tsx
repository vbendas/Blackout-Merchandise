'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { MAX_PICK, pickSentence, type PickColour } from '@/lib/agent/pick';
import type { CatalogueCategoryCount, CatalogueColour, CatalogueIndex, CatalogueItem } from '@/lib/catalog/catalogue-index';
import { PageTopBar } from '@/components/studio/PageTopBar';
import { useOptionalStudioSidebar } from '@/components/studio/StudioSidebarProvider';
import { useCatalogue } from './CatalogueProvider';
import { loadCatalogueIndex, peekCatalogueIndex } from './catalogue-client';
import { toChatPick } from './catalogue-pick';
import {
  ALL,
  PAGE_SIZE,
  activeFacetCount,
  applyFilters,
  facetsOf,
  hasActiveFilters,
  inCategory,
  makeProductMessage,
  reconcileFilters,
  type CatalogueFilters,
} from './catalogue-state';
import { sessionHref } from './catalogue-url';
import { CatalogueDrawer } from './CatalogueDetail';
import { CatalogueFilterRow } from './CatalogueFilterRow';
import { CataloguePickTray } from './CataloguePickTray';
import { CatalogueTabs } from './CatalogueTabs';
import { CatalogueTile, CatalogueTileSkeleton } from './CatalogueTile';
import { useCatalogueUrl } from './useCatalogueUrl';
import './catalogue.css';

const NO_ITEMS: readonly CatalogueItem[] = [];
const NO_COLOURS: readonly PickColour[] = [];

/** How long a note under the page ("Your pick holds up to 12 blanks.") stays. */
const TOAST_MS = 3200;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** What can take focus inside `container` right now (not inert, not hidden). */
function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.getClientRects().length > 0 && !element.closest('[inert]'),
  );
}

/** The element that scrolls the page: the Studio's main column, not the window. */
function scrollParentOf(element: HTMLElement | null): HTMLElement | null {
  for (let node = element?.parentElement ?? null; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return null;
}

type IndexState = { status: 'loading' } | { status: 'ready'; index: CatalogueIndex } | { status: 'error' };

/** The index, fetched once for the page load (catalogue-client.ts keeps it), with a way to ask again. */
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

const pickColourOf = (colour: CatalogueColour): PickColour => ({ code: colour.code, name: colour.name, hex: colour.hex });

export interface CataloguePageProps {
  /** how many blanks there are, so the header and the tabs read right on the first paint */
  total: number;
  categories: CatalogueCategoryCount[];
}

/** The catalogue, a page of the Studio at /studio/catalogue, across the whole
 * main area, top to bottom: the Studio's top bar (title, count, the way back to
 * the chat, the search), the design banner when the page was opened for a
 * design, the category tabs, a row of filter dropdowns with the sort, the blanks
 * 12 at a time, the artist's pick in a tray at the bottom and, over the page
 * (not the sidebar), a drawer with one blank's detail. Its state lives in the
 * address (useCatalogueUrl.ts, catalogue-url.ts) so Back, a refresh and a shared
 * link all land where the artist was. */
export function CataloguePage({ total, categories }: CataloguePageProps) {
  const catalogue = useCatalogue();
  const studio = useOptionalStudioSidebar();
  const nav = useCatalogueUrl();
  const { url } = nav;
  const { from, design } = url;

  const [load, retryLoad] = useCatalogueIndex();
  const index = load.status === 'ready' ? load.index : null;
  const items = index?.items ?? NO_ITEMS;

  // What the address asks for, narrowed to what the category offers (a filter
  // it lacks is ignored, not left applied out of sight).
  const categoryItems = useMemo(() => inCategory(items, url.filters.category), [items, url.filters.category]);
  const facets = useMemo(() => facetsOf(categoryItems), [categoryItems]);
  const filters = useMemo(() => (index ? reconcileFilters(url.filters, facets) : url.filters), [index, url.filters, facets]);
  const results = useMemo(() => applyFilters(categoryItems, filters), [categoryItems, filters]);
  const filtered = hasActiveFilters(filters);

  // 25 at a time (5 full rows on a 14" laptop); a change of category, filter, search or sort starts again.
  const [visible, setVisible] = useState(PAGE_SIZE);
  const filtersKey = [filters.category, filters.fit, filters.audience, filters.weight, filters.colour, filters.q, filters.sort].join('|');
  const [pagedFor, setPagedFor] = useState(filtersKey);
  if (filtersKey !== pagedFor) {
    setPagedFor(filtersKey);
    setVisible(PAGE_SIZE);
  }
  const shown = results.slice(0, visible);

  const pageRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const change = (patch: Partial<CatalogueFilters>) => nav.commit({ filters: patch }, 'replace');
  const chooseCategory = (category: string) => {
    if (category === filters.category) return;
    // A new category is a new place: it gets a history entry, and starts at the top.
    nav.commit({ filters: reconcileFilters({ ...url.filters, category }, facetsOf(inCategory(items, category))) }, 'push');
    const scroller = scrollParentOf(pageRef.current);
    if (scroller) scroller.scrollTop = 0;
  };
  /** The row's "Clear filters": the dropdowns, not what is typed in the search. */
  const clearFacets = () => nav.commit({ filters: { fit: null, audience: null, weight: null, colour: null } }, 'replace');
  /** The empty state's: the search too, since it may be what matched nothing. */
  const clearFilters = () => {
    nav.setQuery('');
    clearFacets();
  };

  // "Show 25 more": focus moves to the first new tile, so keyboard users carry on into it.
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

  // ---- the pick ------------------------------------------------------------

  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = (text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), TOAST_MS);
  };

  const pickedColours = (code: string | null): readonly PickColour[] =>
    (code && catalogue.pick.find((entry) => entry.code === code)?.colours) || NO_COLOURS;
  const addColour = (item: CatalogueItem, colour: CatalogueColour) => {
    const added = catalogue.addToPick({ code: item.code, name: item.name, image: item.front }, pickColourOf(colour));
    if (!added) showToast(`Your pick holds up to ${MAX_PICK} blanks.`);
  };
  /** The tile's corner toggle: the blank in the colour being filtered for (else
   * its base colour), or out of the pick whole. */
  const togglePick = (item: CatalogueItem) => {
    if (pickedColours(item.code).length > 0) catalogue.removeFromPick(item.code);
    else addColour(item, item.colours.find((c) => c.code === filters.colour) ?? item.colours[0]);
  };
  const toggleColour = (item: CatalogueItem, colour: CatalogueColour) => {
    if (pickedColours(item.code).some((c) => c.code === colour.code)) catalogue.removeFromPick(item.code, colour.code);
    else addColour(item, colour);
  };

  // ---- back to the chat ------------------------------------------------------
  // The chat is not on this page. askStudio goes back to the session the artist
  // came from (?from=), or starts a new one, and sends the message there once
  // that session has loaded (StudioSidebarProvider.tsx, ChatShell.tsx).

  const handOffOne = (blankName: string, colourName: string) => {
    const text = design ? `Use design ${design.id} on the ${blankName} in ${colourName}` : makeProductMessage(blankName, colourName);
    studio?.askStudio(text, from ?? undefined);
  };
  const handOffPick = (intent: 'design' | 'run') => {
    if (catalogue.pick.length === 0) return;
    const chatPick = toChatPick(catalogue.pick, intent, design ?? undefined);
    studio?.askStudio(pickSentence(chatPick), from ?? undefined, { pick: chatPick });
  };

  // ---- the detail drawer -------------------------------------------------------

  const blank = url.blank;
  const [shownCode, setShownCode] = useState<string | null>(blank);
  if (blank !== null && blank !== shownCode) setShownCode(blank);
  const detailItem = shownCode ? (items.find((item) => item.code === shownCode) ?? null) : null;
  // A blank the catalogue does not have is ignored (and taken out of the address).
  const unknownBlank = blank !== null && index !== null && !items.some((item) => item.code === blank);
  const drawerOpen = blank !== null && !unknownBlank;
  const { commit } = nav;
  useEffect(() => {
    if (unknownBlank) commit({ blank: null }, 'replace');
  }, [unknownBlank, commit]);
  const detailIndex = shownCode ? results.findIndex((item) => item.code === shownCode) : -1;

  // Focus goes into the drawer when it opens and back to the blank's tile when
  // it closes (to the page itself when that tile is not on it).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (drawerOpen) {
      drawerRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (wasOpen.current) {
      const tile = resultsRef.current?.querySelector<HTMLElement>(`[data-code="${shownCode}"]`);
      (tile ?? pageRef.current)?.focus();
    }
    wasOpen.current = drawerOpen;
  }, [drawerOpen, shownCode]);

  // Escape closes the drawer; Tab stays inside it. The page itself has no trap.
  const { closeBlank } = nav;
  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeBlank();
        return;
      }
      if (event.key !== 'Tab') return;
      const container = drawerRef.current;
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
  }, [drawerOpen, closeBlank]);

  const count = index?.items.length ?? total;
  const tabCategories = index?.categories ?? categories;
  const title = filters.category === ALL ? 'All blanks' : filters.category;
  const matchCount = results.length;
  const summary = filtered ? `${matchCount} ${matchCount === 1 ? 'match' : 'matches'}` : `Showing ${Math.min(visible, matchCount)} of ${matchCount}`;
  const position = detailIndex >= 0 ? `${detailIndex + 1} of ${matchCount}` : null;
  const backToChat = from ? (
    <Link href={sessionHref(from)} className="cat-backlink">
      <ChevronLeft className="mf-icon cat-ic" aria-hidden />
      Back to the chat
    </Link>
  ) : null;
  const search = (placement: 'bar' | 'row') => (
    <label className="cat-search" data-placement={placement}>
      <Search className="mf-icon cat-ic" aria-hidden />
      <input
        type="search"
        value={url.filters.q}
        onChange={(event) => nav.setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          nav.flushQueryNow();
          // On a phone, Enter puts the keyboard away so the results show.
          if (window.matchMedia('(pointer: coarse)').matches) event.currentTarget.blur();
        }}
        placeholder="Search: heavy, zip, boxy"
        aria-label="Search the catalogue"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  );

  return (
    <>
      <main ref={pageRef} className="cat-page" tabIndex={-1} inert={drawerOpen}>
        {/* The Studio's top bar, like the chat's. The search sits in it while the
            page is 768px wide or more; narrower, the bar has no room and the
            search takes a row below it (see the @container query in catalogue.css). */}
        <PageTopBar title="Catalogue" lead={backToChat} meta={`${count} blanks`}>
          <div className="cat-barsearch">{search('bar')}</div>
        </PageTopBar>

        {design ? (
          <div className="cat-dbanner">
            <p>
              Picking garments for <b>{design.name}</b>. Everything you pick gets this design.
            </p>
          </div>
        ) : null}

        <div className="cat-phonerow">{search('row')}</div>

        <CatalogueTabs categories={tabCategories} total={count} active={filters.category} onSelect={chooseCategory}>
          {/* The dropdowns offer what the index holds, so they wait for it (the
              placeholder keeps the row's height, and the grid below does not jump). */}
          {index ? (
            <CatalogueFilterRow filters={filters} facets={facets} onChange={change} onClear={clearFacets} frozen={drawerOpen} />
          ) : (
            <div className="cat-filterbar" data-wait aria-hidden />
          )}

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
                  <h2 className="sr-only">{title}</h2>
                  <span className="cat-label cat-dim" aria-hidden>
                    &nbsp;
                  </span>
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
                  <h2 className="sr-only">{title}</h2>
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
                        <CatalogueTile key={item.code} item={item} picked={pickedColours(item.code)} onOpen={nav.openBlank} onTogglePick={togglePick} />
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
        </CatalogueTabs>

        {/* The tray ends the page, so it is as wide as the results, and stays at
            the bottom of the screen while the grid scrolls under it. */}
        {catalogue.pick.length > 0 ? (
          <CataloguePickTray
            pick={catalogue.pick}
            design={design}
            onRemove={(code) => catalogue.removeFromPick(code)}
            onClear={catalogue.clearPick}
            onUse={handOffPick}
          />
        ) : null}
      </main>

      <CatalogueDrawer
        drawerRef={drawerRef}
        open={drawerOpen}
        code={index !== null && detailItem === null ? null : shownCode}
        item={detailItem}
        position={position}
        startColour={filters.colour}
        pickColours={pickedColours(shownCode)}
        onTogglePick={(colour) => detailItem && toggleColour(detailItem, colour)}
        onBack={nav.closeBlank}
        onUseOne={handOffOne}
      />

      <div className="cat-toast" role="status" data-on={toast !== ''} data-tray={catalogue.pick.length > 0}>
        {toast}
      </div>
    </>
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
