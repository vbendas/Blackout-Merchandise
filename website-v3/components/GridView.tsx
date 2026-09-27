'use client';

import Image from 'next/image';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PRODUCTS, type Product } from '@/lib/products';
import { ProductModal } from '@/components/ProductModal';
import { colourName } from '@/lib/colour-names';
import { colourMatchingQuery, fitFor, matchesSearch, typeFor } from '@/lib/catalog-filters';
import { useFavourites } from '@/lib/favourites';
import { fitKey, typeKey, useT } from '@/lib/i18n';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import {
  BASE_COLOUR,
  BASE_SWATCH,
  COLOUR_ORDER,
  COLOUR_SWATCHES,
  VARIANTS,
  VARIANT_BACKS,
  variantBackSrc,
  variantSrc,
  displayColourFor,
} from '@/lib/variants';

const TYPE_ORDER = ['T-shirts', 'Sweats & Hoodies', 'Jackets', 'Polos', 'Shirts', 'Bottoms', 'Bags & Accessories', 'Kids & Baby'];
const HAIRLINE = '1px solid var(--hairline)';
const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};
const FIT_ORDER = ['Medium', 'Relaxed', 'Fitted', 'Oversized'];

const TYPES = TYPE_ORDER.filter((t) => PRODUCTS.some((p) => typeFor(p.code) === t));
const FITS = FIT_ORDER.filter((f) => PRODUCTS.some((p) => fitFor(p.code) === f));
const COLOURS = [BASE_COLOUR, ...COLOUR_ORDER];

function swatchFor(colour: string): string {
  return colour === BASE_COLOUR ? BASE_SWATCH : (COLOUR_SWATCHES[colour] ?? '#888');
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Deterministic display order once any filter/search is active: grouped
// by type in TYPE_ORDER's sequence, then alphabetically by the supplier
// name (falling back to the catalog name), then by code.
function compareDeterministic(a: Product, b: Product): number {
  const typeDelta = TYPE_ORDER.indexOf(typeFor(a.code)) - TYPE_ORDER.indexOf(typeFor(b.code));
  if (typeDelta !== 0) return typeDelta;
  const nameA = PRODUCT_DETAILS[a.code]?.name ?? a.name;
  const nameB = PRODUCT_DETAILS[b.code]?.name ?? b.name;
  if (nameA !== nameB) return nameA.localeCompare(nameB);
  return a.code.localeCompare(b.code);
}

export function GridView() {
  const t = useT();
  // Server-render in source order (deterministic, no hydration
  // mismatch), then shuffle after mount so every visit gets a fresh
  // arrangement of the catalog.
  const [products, setProducts] = useState<readonly Product[]>(PRODUCTS);
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState<Product | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number; width: number; height: number } | undefined>(
    undefined,
  );
  // Sources whose front image has fired onLoad — the image wrapper stays
  // invisible until then, so garments fade in instead of popping.
  const [loadedSrcs, setLoadedSrcs] = useState<Set<string>>(new Set());
  const [type, setType] = useState<string | null>(null);
  const [fit, setFit] = useState<string | null>(null);
  const [colour, setColour] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [filtersTouched, setFiltersTouched] = useState(false);
  const [openMenu, setOpenMenu] = useState<'type' | 'fit' | 'colour' | null>(null);
  const [urlReady, setUrlReady] = useState(false);

  const { codes: favouriteCodes, has: hasFavourite, toggle: toggleFavourite } = useFavourites();

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openMenu]);

  // The Colour panel is a fixed-width swatch grid anchored left:0 to its
  // trigger. On narrow screens a long Type/Fit selection can push that
  // trigger far enough right that the panel — left where it is — runs
  // past the viewport edge (a filter combination easy to hit, not an
  // edge case). Clamp it back on-screen after layout, before paint.
  const colourTriggerRef = useRef<HTMLDivElement>(null);
  const colourPanelRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (openMenu !== 'colour') return;
    const trigger = colourTriggerRef.current;
    const panel = colourPanelRef.current;
    if (!trigger || !panel) return;
    const reposition = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const gutter =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 24;
      const overflow = triggerRect.left + panel.offsetWidth - (window.innerWidth - gutter);
      panel.style.left = overflow > 0 ? `${-overflow}px` : '0px';
    };
    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [openMenu]);

  function pick(setter: (v: string | null) => void, value: string | null) {
    setFiltersTouched(true);
    setter(value);
    setOpenMenu(null);
  }

  function clearAll() {
    setFiltersTouched(true);
    setType(null);
    setFit(null);
    setColour(null);
    setQuery('');
    setFavouritesOnly(false);
  }

  const rootRef = useRef<HTMLDivElement>(null);

  // Opens the modal and captures the clicked card's image-area rect so
  // the modal can FLIP-animate outward from it. The image area is the
  // card's first child (the aspect-ratio div).
  function openProduct(product: Product, card: HTMLElement) {
    const imageArea = card.firstElementChild as HTMLElement | null;
    if (imageArea) {
      const rect = imageArea.getBoundingClientRect();
      setOrigin({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    } else {
      setOrigin(undefined);
    }
    setOpen(product);
  }

  function openProductByCode(code: string) {
    const found = PRODUCTS.find((p) => p.code === code);
    if (!found) return;
    setOrigin(undefined);
    setOpen(found);
  }

  // A colour name typed into search (min 3 chars, no explicit colour
  // picked) drives filtering/display the same way an explicit colour
  // filter does — a query like 'black' shows every blank available in
  // black, in black.
  const effectiveColour = useMemo(() => colour ?? colourMatchingQuery(query), [colour, query]);

  const showVariant = effectiveColour !== null && effectiveColour !== BASE_COLOUR;
  const filtered = products.filter((p) => {
    if (type && typeFor(p.code) !== type) return false;
    if (fit && fitFor(p.code) !== fit) return false;
    if (favouritesOnly && !hasFavourite(p.code)) return false;
    if (effectiveColour === null) return matchesSearch(p.code, query);
    // Every blank exists in the base colour; only variants need checking.
    const inColour =
      effectiveColour === BASE_COLOUR || (VARIANTS[p.code]?.includes(effectiveColour) ?? false);
    // An explicit colour filter narrows the set (AND with any text
    // query); a colour inferred from the query itself is an OR — the
    // query still matches products by name/code on its own.
    return colour ? inColour && matchesSearch(p.code, query) : inColour || matchesSearch(p.code, query);
  });
  // The shuffle stays for the untouched landing state; the moment a
  // filter, colour, favourite toggle or search query narrows the set,
  // switch to a stable grouped order so results don't jump around as
  // filters change.
  const filtersActive = Boolean(type || fit || colour || query.trim() || favouritesOnly);
  const displayed = filtersActive ? [...filtered].sort(compareDeterministic) : filtered;

  const openIndex = open ? displayed.findIndex((p) => p.code === open.code) : -1;
  const hasProductNav = openIndex !== -1 && displayed.length > 1;

  // Prev/Next inside the modal: move within the currently displayed
  // (filtered, ordered) list, wrapping at the ends. No FLIP origin on
  // these — only the initial card click animates outward.
  function goToProduct(delta: number) {
    if (openIndex === -1 || displayed.length === 0) return;
    const next = displayed[(openIndex + delta + displayed.length) % displayed.length];
    setOrigin(undefined);
    setOpen(next);
  }

  useEffect(() => {
    setProducts(shuffle(PRODUCTS));
    setArmed(true);
  }, []);

  // URL state, read once on mount: type/fit only when the value is one
  // of the available options, colour only when it's the base colour or
  // a known variant, q verbatim, saved=1 for the favourites filter,
  // product opens the matching modal.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let touched = false;

    const t = params.get('type');
    if (t && TYPES.includes(t)) {
      setType(t);
      touched = true;
    }
    const f = params.get('fit');
    if (f && FITS.includes(f)) {
      setFit(f);
      touched = true;
    }
    const c = params.get('colour');
    if (c && (c === BASE_COLOUR || COLOUR_ORDER.includes(c))) {
      setColour(c);
      touched = true;
    }
    const q = params.get('q');
    if (q) {
      setQuery(q);
      touched = true;
    }
    if (params.get('saved') === '1') {
      setFavouritesOnly(true);
      touched = true;
    }
    const productCode = params.get('product');
    if (productCode) {
      const found = PRODUCTS.find((p) => p.code === productCode);
      if (found) setOpen(found);
    }

    if (touched) setFiltersTouched(true);
    setUrlReady(true);
  }, []);

  // Keep the URL in sync with filter/search/modal state, without
  // triggering a navigation or re-render (replaceState only). Gated on
  // urlReady so the initial read above always wins over this effect's
  // first pass.
  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (fit) params.set('fit', fit);
    if (colour) params.set('colour', colour);
    if (query) params.set('q', query);
    if (favouritesOnly) params.set('saved', '1');
    if (open) params.set('product', open.code);
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(null, '', url);
  }, [type, fit, colour, query, favouritesOnly, open, urlReady]);

  // Entrance stagger: each card rises in as it enters the viewport,
  // once. The 'in' class survives React re-renders because className
  // props never change after arming.
  useEffect(() => {
    if (!armed || !rootRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('catalog-card-in');
            // The inline stagger var has done its job once the card is
            // in; clearing it lets the stylesheet's hover-spotlight
            // transition-delay take over (an inline override would beat
            // it).
            (entry.target as HTMLElement).style.removeProperty('--i');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
    );
    rootRef.current.querySelectorAll('.catalog-card').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [armed, products]);

  const trigger: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...MONO,
    background: 'none',
    border: 'none',
    padding: '6px 0',
    cursor: 'pointer',
    color: 'var(--signal)',
  };

  const panel: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    left: 0,
    zIndex: 30,
    background: 'var(--raised)',
    border: HAIRLINE,
    padding: '10px 0',
    minWidth: '200px',
  };

  const option = (active: boolean): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    ...MONO,
    letterSpacing: '0.06em',
    background: 'none',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    color: 'var(--signal)',
    opacity: active ? 1 : 0.6,
    fontWeight: active ? 700 : 400,
  });

  const caret = (open: boolean) => (
    <svg
      width="9"
      height="6"
      viewBox="0 0 9 6"
      fill="none"
      aria-hidden
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 300ms ease' }}
    >
      <path d="M1 1L4.5 5L8 1" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );

  return (
    <>
      {openMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setOpenMenu(null)} />
      )}

      <div
        className="mb-12 flex flex-wrap items-center gap-x-10 gap-y-2"
        style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)' }}
      >
        {[
          { key: 'type' as const, labelKey: 'catalog.filter.type' as const, options: TYPES, active: type, set: setType, keyFor: typeKey },
          { key: 'fit' as const, labelKey: 'catalog.filter.fit' as const, options: FITS, active: fit, set: setFit, keyFor: fitKey },
        ].map((menu) => {
          const activeKey = menu.active ? menu.keyFor(menu.active) : undefined;
          const activeLabel = menu.active ? (activeKey ? t(activeKey) : menu.active) : t('catalog.all');
          return (
            <div key={menu.key} style={{ position: 'relative', zIndex: openMenu === menu.key ? 30 : undefined }}>
              <button
                type="button"
                aria-expanded={openMenu === menu.key}
                style={trigger}
                onClick={() => setOpenMenu(openMenu === menu.key ? null : menu.key)}
              >
                <span className="mf-dim">{t(menu.labelKey)}</span>
                <span style={{ fontWeight: 700 }}>{activeLabel}</span>
                {caret(openMenu === menu.key)}
              </button>
              {openMenu === menu.key && (
                <div style={panel} className="view-fade-in" role="menu">
                  <button type="button" role="menuitem" style={option(menu.active === null)} onClick={() => pick(menu.set, null)}>
                    {t('catalog.all')}
                  </button>
                  {menu.options.map((opt) => {
                    const optKey = menu.keyFor(opt);
                    return (
                      <button key={opt} type="button" role="menuitem" style={option(menu.active === opt)} onClick={() => pick(menu.set, opt)}>
                        {optKey ? t(optKey) : opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div
          ref={colourTriggerRef}
          style={{ position: 'relative', zIndex: openMenu === 'colour' ? 30 : undefined }}
        >
          <button
            type="button"
            aria-expanded={openMenu === 'colour'}
            style={trigger}
            onClick={() => setOpenMenu(openMenu === 'colour' ? null : 'colour')}
          >
            <span className="mf-dim">{t('catalog.filter.colour')}</span>
            {colour ? (
              <span
                aria-hidden
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: swatchFor(colour),
                  border: '1px solid color-mix(in srgb, var(--signal) 30%, transparent)',
                }}
              />
            ) : (
              <span style={{ fontWeight: 700 }}>{t('catalog.all')}</span>
            )}
            {caret(openMenu === 'colour')}
          </button>
          {openMenu === 'colour' && (
            <div
              ref={colourPanelRef}
              style={{ ...panel, padding: '14px 16px', minWidth: '0' }}
              className="view-fade-in"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                style={{ ...option(colour === null), padding: '0 0 12px 0' }}
                onClick={() => pick(setColour, null)}
              >
                {t('catalog.allColours')}
              </button>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 22px)',
                  gap: '10px',
                }}
              >
                {COLOURS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="menuitem"
                    aria-label={t('catalog.colourAriaLabel', { name: colourName(c) })}
                    aria-pressed={colour === c}
                    title={t('catalog.colourAriaLabel', { name: colourName(c) })}
                    onClick={() => pick(setColour, c)}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      background: swatchFor(c),
                      border: '1px solid color-mix(in srgb, var(--signal) 30%, transparent)',
                      outline: colour === c ? '1px solid var(--signal)' : 'none',
                      outlineOffset: '2px',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {(favouriteCodes.length > 0 || favouritesOnly) && (
          <button
            type="button"
            aria-pressed={favouritesOnly}
            style={trigger}
            onClick={() => {
              setFiltersTouched(true);
              setFavouritesOnly((v) => !v);
            }}
          >
            <span style={{ fontWeight: favouritesOnly ? 700 : 400 }}>
              {favouriteCodes.length > 0 ? t('common.savedCount', { n: favouriteCodes.length }) : t('common.saved')}
            </span>
          </button>
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setFiltersTouched(true);
            setQuery(e.target.value);
          }}
          placeholder={t('catalog.searchPlaceholder')}
          aria-label={t('catalog.searchAriaLabel')}
          style={{
            ...MONO,
            background: 'none',
            border: 'none',
            borderBottom: HAIRLINE,
            padding: '6px 0',
            width: '160px',
            color: 'var(--signal)',
            outline: 'none',
          }}
        />

        <span aria-live="polite" className="mf-dim" style={MONO}>
          {t.tPlural('catalog.count', displayed.length)}
        </span>

        {filtersActive && (
          <button type="button" style={trigger} onClick={clearAll} aria-label={t('common.clearAllAriaLabel')}>
            <span>{t('common.clearAll')}</span>
            <span aria-hidden>×</span>
          </button>
        )}
      </div>

      {displayed.length === 0 && (
        <p
          className="mf-dim"
          style={{
            paddingLeft: 'var(--gutter)',
            paddingRight: 'var(--gutter)',
            fontSize: '14px',
          }}
        >
          {favouritesOnly ? t('catalog.noSavedBlanks') : t('catalog.empty')}
        </p>
      )}

      <div
        ref={rootRef}
        data-armed={armed || undefined}
        data-filters-touched={filtersTouched || undefined}
        className="catalog-grid grid grid-cols-2 gap-x-6 gap-y-16 md:grid-cols-3 lg:grid-cols-4"
        style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)' }}
      >
        {displayed.map((product, i) => {
          const name = PRODUCT_DETAILS[product.code]?.name ?? product.name;
          // No colour filter: lead with a light colourway where one exists.
          const cardColour = showVariant ? (effectiveColour as string) : effectiveColour === null ? displayColourFor(product.code) : null;
          const frontSrc = cardColour ? variantSrc(product.code, cardColour) : product.src;
          const backSrc = cardColour
            ? VARIANT_BACKS[product.code]?.includes(cardColour)
              ? variantBackSrc(product.code, cardColour)
              : null
            : (product.back ?? null);
          const loaded = loadedSrcs.has(frontSrc);
          const saved = hasFavourite(product.code);

          return (
            <div
              key={product.code}
              className="catalog-card"
              style={filtersTouched ? undefined : ({ '--i': i % 4 } as React.CSSProperties)}
              role="button"
              tabIndex={0}
              aria-label={`${product.code} — ${t('catalog.cardDetails')}`}
              onClick={(e) => openProduct(product, e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openProduct(product, e.currentTarget);
                }
              }}
            >
              {/* Inset so the garment never touches its cell — the tile
                  sits on --surface (lighter than the page ground) so a
                  black garment still reads against it. */}
              <div className="catalog-card-media" style={{ background: 'var(--surface)' }}>
                <div className="catalog-card-frame" data-loaded={loaded || undefined}>
                  <Image
                    src={frontSrc}
                    alt={`${product.code} — ${t('modal.photo.front')}`}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    // First row (widest breakpoint is 4-up) is above the
                    // fold at every viewport width, and which product
                    // lands there changes with the breakpoint — exactly
                    // the case Next 16's docs say to use loading="eager"
                    // + fetchPriority="high" for instead of the
                    // deprecated `priority`/`preload` props (those assume
                    // one fixed LCP candidate, added to <head> up front).
                    loading={i < 4 ? 'eager' : undefined}
                    fetchPriority={i < 4 ? 'high' : undefined}
                    className={backSrc ? 'catalog-card-img flip-front' : 'catalog-card-img'}
                    onLoad={() =>
                      setLoadedSrcs((prev) => (prev.has(frontSrc) ? prev : new Set(prev).add(frontSrc)))
                    }
                  />
                  {backSrc && (
                    <Image
                      src={backSrc}
                      alt=""
                      aria-hidden
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="catalog-card-img flip-back"
                    />
                  )}
                </div>
              </div>
              <button
                type="button"
                className="catalog-card-save"
                aria-pressed={saved}
                aria-label={saved ? t('common.saved') : t('common.save')}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavourite(product.code);
                }}
              />
              <div className="catalog-card-caption">
                <span className="font-bold">{name}</span>
                <span className="catalog-card-caption-mask">
                  <span className="catalog-card-caption-reveal mf-dim">{product.code}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {open && (
        <ProductModal
          key={open.code}
          product={open}
          initialColour={
            effectiveColour !== null ? effectiveColour : (displayColourFor(open.code) ?? undefined)
          }
          onClose={() => {
            setOpen(null);
            setOrigin(undefined);
          }}
          origin={origin}
          onPrevProduct={hasProductNav ? () => goToProduct(-1) : undefined}
          onNextProduct={hasProductNav ? () => goToProduct(1) : undefined}
          position={openIndex !== -1 ? { index: openIndex, total: displayed.length } : undefined}
          onOpenProduct={openProductByCode}
        />
      )}
    </>
  );
}
