'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PRODUCTS, type Product } from '@/lib/products';
import { ProductModal } from '@/components/ProductModal';
import { FilterDrawer } from '@/components/catalog/FilterDrawer';
import { colourName } from '@/lib/colour-names';
import { colourMatchingQuery, fitFor, matchesSearch, typeFor } from '@/lib/catalog-filters';
import { useFavourites } from '@/lib/favourites';
import { fitKey, typeKey, useT } from '@/lib/i18n';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { CATALOG_STATS, isGots, isHeavy } from '@/lib/catalog-stats';
import {
  BASE_COLOUR,
  BASE_SWATCH,
  COLOUR_ORDER,
  COLOUR_SWATCHES,
  VARIANTS,
  VARIANT_BACKS,
  variantBackSrc,
  variantSrc,
} from '@/lib/variants';

const TYPE_ORDER = ['T-shirts', 'Sweats & Hoodies', 'Jackets', 'Polos', 'Shirts', 'Bottoms', 'Bags & Accessories', 'Kids & Baby'];
const HAIRLINE = '1px solid var(--hairline)';
const MONO: CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};
const FIT_ORDER = ['Medium', 'Relaxed', 'Fitted', 'Oversized'];

const TYPES = TYPE_ORDER.filter((t) => PRODUCTS.some((p) => typeFor(p.code) === t));
const FITS = FIT_ORDER.filter((f) => PRODUCTS.some((p) => fitFor(p.code) === f));
const COLOURS = [BASE_COLOUR, ...COLOUR_ORDER];

// Static per-type counts (independent of the active filters) for the
// sidebar's Type list — computed once at module load, same pattern as
// CATALOG_STATS.
const TYPE_COUNTS: Record<string, number> = Object.fromEntries(
  TYPES.map((ty) => [ty, PRODUCTS.filter((p) => typeFor(p.code) === ty).length]),
);

// The two editorial campaign photos (after row 1 and further down the
// grid) — existing gallery contact-sheet shots, chosen for a tattooed,
// heavyweight-tee look that matches the vintage catalog's "built for the
// merch table" tone.
const EDITORIAL_PHOTOS = { cloth: '/gallery/2a.png', studio: '/gallery/9a.png' } as const;

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

type Cell =
  | { kind: 'note'; key: string }
  | { kind: 'editorial'; variant: 'cloth' | 'studio'; key: string }
  | { kind: 'band'; key: string }
  | { kind: 'product'; product: Product; key: string };

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
  const [heavy, setHeavy] = useState(false);
  const [gots, setGots] = useState(false);
  const [query, setQuery] = useState('');
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [filtersTouched, setFiltersTouched] = useState(false);
  const [mode, setMode] = useState<'grid' | 'index'>('grid');
  const [urlReady, setUrlReady] = useState(false);
  // The filter drawer replaces the old sidebar + mobile bottom sheet at
  // every breakpoint (see components/catalog/FilterDrawer.tsx, which
  // owns its own focus trap / Esc / scroll lock).
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The toolbar's search starts as a plain mono "Search" trigger and
  // expands into an underline input on click (or on mount, if the URL
  // already carries a query).
  const [searchOpen, setSearchOpen] = useState(false);

  const { codes: favouriteCodes, has: hasFavourite, toggle: toggleFavourite } = useFavourites();

  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Click an already-active value again to clear it back to "all" — the
  // sidebar's own reset gesture, per control, without a dedicated
  // "clear" affordance on every section.
  function toggleValue(current: string | null, value: string, setter: (v: string | null) => void) {
    setFiltersTouched(true);
    setter(current === value ? null : value);
  }

  function setExplicit(setter: (v: string | null) => void, value: string | null) {
    setFiltersTouched(true);
    setter(value);
  }

  function clearAll() {
    setFiltersTouched(true);
    setType(null);
    setFit(null);
    setColour(null);
    setHeavy(false);
    setGots(false);
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
    if (heavy && !isHeavy(p.code)) return false;
    if (gots && !isGots(p.code)) return false;
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
  const filtersActive = Boolean(type || fit || colour || query.trim() || favouritesOnly || heavy || gots);
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
  // heavy=1/gots=1 for the cloth toggles, view=index for the index
  // table, product opens the matching modal.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let touched = false;

    const ty = params.get('type');
    if (ty && TYPES.includes(ty)) {
      setType(ty);
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
    if (params.get('heavy') === '1') {
      setHeavy(true);
      touched = true;
    }
    if (params.get('gots') === '1') {
      setGots(true);
      touched = true;
    }
    const q = params.get('q');
    if (q) {
      setQuery(q);
      setSearchOpen(true);
      touched = true;
    }
    if (params.get('saved') === '1') {
      setFavouritesOnly(true);
      touched = true;
    }
    if (params.get('view') === 'index') {
      setMode('index');
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
    if (heavy) params.set('heavy', '1');
    if (gots) params.set('gots', '1');
    if (query) params.set('q', query);
    if (favouritesOnly) params.set('saved', '1');
    if (mode === 'index') params.set('view', 'index');
    if (open) params.set('product', open.code);
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(null, '', url);
  }, [type, fit, colour, heavy, gots, query, favouritesOnly, mode, open, urlReady]);

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

  function typeLabelFor(code: string): string {
    const ty = typeFor(code);
    const key = typeKey(ty);
    return key ? t(key) : ty;
  }

  function fitLabelFor(code: string): string | null {
    const f = fitFor(code);
    if (!f) return null;
    const key = fitKey(f);
    return key ? t(key) : f;
  }

  // Vintage catalog rule: lead with the base black colourway (no
  // light-colourway default here — that preference is for the dark home
  // teaser only), unless an explicit colour or a colour-matching search
  // narrows the set.
  function renderProductCard(product: Product, i: number) {
    const name = PRODUCT_DETAILS[product.code]?.name ?? product.name;
    const details = PRODUCT_DETAILS[product.code];
    const cardColour = showVariant ? (effectiveColour as string) : null;
    const frontSrc = cardColour ? variantSrc(product.code, cardColour) : product.src;
    const backSrc = cardColour
      ? VARIANT_BACKS[product.code]?.includes(cardColour)
        ? variantBackSrc(product.code, cardColour)
        : null
      : (product.back ?? null);
    const loaded = loadedSrcs.has(frontSrc);
    const saved = hasFavourite(product.code);
    const gsm = details?.weightGsm ?? 0;
    const metaParts = [typeLabelFor(product.code), fitLabelFor(product.code)].filter(Boolean) as string[];
    const swatchCodes = [BASE_COLOUR, ...(VARIANTS[product.code] ?? [])].slice(0, 4);
    const totalColours = 1 + (VARIANTS[product.code]?.length ?? 0);
    const moreColours = Math.max(totalColours - 4, 0);
    const badgeParts = [isHeavy(product.code) && t('catalog.badge.heavy'), isGots(product.code) && t('catalog.badge.gots')].filter(
      Boolean,
    ) as string[];

    return (
      <div
        key={product.code}
        className="catalog-card"
        style={filtersTouched ? undefined : ({ '--i': i % 3 } as CSSProperties)}
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
        {/* Packshots float on the paper ground — no tile fill until
            hover, when the field turns to --raised (a bone/parchment
            wash) and the garment nudges up in scale. */}
        <div className="catalog-card-media">
          {badgeParts.length > 0 && (
            <span
              aria-hidden
              style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2, ...MONO, fontSize: '12px' }}
            >
              {badgeParts.join(' · ')}
            </span>
          )}
          <div className="catalog-card-frame" data-loaded={loaded || undefined}>
            <Image
              src={frontSrc}
              alt={`${product.code} — ${t('modal.photo.front')}`}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              loading={i < 3 ? 'eager' : undefined}
              fetchPriority={i < 3 ? 'high' : undefined}
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
                sizes="(max-width: 768px) 50vw, 33vw"
                className="catalog-card-img flip-back"
              />
            )}
          </div>
          <a
            href={`/waitlist?product=${product.code}`}
            className="catalog-card-cta"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{t('catalog.card.start')}</span>
            <span aria-hidden>→</span>
          </a>
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
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase', minWidth: 0 }}>
            {name}
          </span>
          {gsm > 0 && <span style={{ ...MONO, whiteSpace: 'nowrap', flexShrink: 0 }}>{gsm} gsm</span>}
        </div>
        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <span className="mf-dim" style={MONO}>
            {metaParts.join(' · ')}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {swatchCodes.map((c) => (
              <span
                key={c}
                aria-hidden
                style={{ width: '8px', height: '8px', background: swatchFor(c), border: '1px solid rgba(26,23,20,.14)' }}
              />
            ))}
            {moreColours > 0 && (
              <span className="mf-dim" style={{ ...MONO, marginLeft: '2px' }}>
                +{moreColours}
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  function renderIndexRow(product: Product) {
    const name = PRODUCT_DETAILS[product.code]?.name ?? product.name;
    const details = PRODUCT_DETAILS[product.code];
    const gsm = details?.weightGsm ?? 0;
    const metaParts = [typeLabelFor(product.code), fitLabelFor(product.code)].filter(Boolean) as string[];
    const totalColours = 1 + (VARIANTS[product.code]?.length ?? 0);
    const cert = details?.certifications && details.certifications.length > 0 ? details.certifications.join(' · ') : '—';

    return (
      <button
        key={product.code}
        type="button"
        className="catalog-index-row"
        onClick={() => openProductByCode(product.code)}
        style={{
          display: 'grid',
          gridTemplateColumns: '56px 2fr 1.4fr 1fr 1fr 1fr',
          alignItems: 'center',
          width: '100%',
          height: '64px',
          border: 'none',
          borderBottom: HAIRLINE,
          background: 'none',
          padding: 0,
          font: 'inherit',
          color: 'var(--signal)',
          textAlign: 'left',
        }}
      >
        <span style={{ position: 'relative', width: '40px', height: '48px', flexShrink: 0 }}>
          <Image src={product.src} alt="" fill sizes="40px" className="object-contain" />
        </span>
        <span
          style={{
            fontSize: '15px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: '12px',
          }}
        >
          {name}
        </span>
        <span className="mf-dim" style={{ ...MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
          {metaParts.join(' · ')}
        </span>
        <span style={MONO}>{gsm > 0 ? `${gsm} gsm` : '—'}</span>
        <span className="mf-dim" style={{ ...MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
          {cert}
        </span>
        <span className="mf-dim" style={MONO}>
          {totalColours}
        </span>
      </button>
    );
  }

  function noteTile() {
    return (
      <div
        key="note"
        // Full width and landscape on phones (a 2-column grid would squeeze
        // the headline into a narrow column); portrait tile from md up.
        className="aspect-[16/10] md:aspect-[4/5]"
        style={{
          background: 'var(--well)',
          color: 'var(--bone)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ ...MONO, opacity: 0.7 }}>{t('catalog.note.kicker')}</span>
        <span
          style={{
            fontFamily: 'var(--font-display), sans-serif',
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}
        >
          {t('catalog.note.title')}
        </span>
        <span style={{ ...MONO, opacity: 0.7, lineHeight: 1.7 }}>{t('catalog.note.foot')}</span>
      </div>
    );
  }

  function editorialTile(variant: 'cloth' | 'studio') {
    const kicker = variant === 'cloth' ? t('catalog.editorial.cloth.kicker') : t('catalog.editorial.studio.kicker');
    const title = variant === 'cloth' ? t('catalog.editorial.cloth.title') : t('catalog.editorial.studio.title');
    return (
      <div key={`editorial-${variant}`} className="col-span-2 relative overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
        <Image
          src={EDITORIAL_PHOTOS[variant]}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 66vw"
          className="object-cover"
          loading={variant === 'cloth' ? 'eager' : undefined}
          fetchPriority={variant === 'cloth' ? 'high' : undefined}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '28px',
            background: 'linear-gradient(to top, rgba(0,0,0,.6), rgba(0,0,0,0) 55%)',
            color: 'var(--bone)',
          }}
        >
          <span style={{ ...MONO, opacity: 0.8 }}>{kicker}</span>
          <span
            style={{
              fontFamily: 'var(--font-display), sans-serif',
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              marginTop: '8px',
              whiteSpace: 'pre-line',
            }}
          >
            {title}
          </span>
        </div>
      </div>
    );
  }

  function bandTile() {
    return (
      <div
        key="band"
        className="col-span-full flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
        style={{ background: 'var(--well)', color: 'var(--bone)', padding: '32px 28px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ ...MONO, opacity: 0.7 }}>{t('catalog.band.label')}</span>
          <span
            style={{
              fontFamily: 'var(--font-display), sans-serif',
              fontSize: 'clamp(1.375rem, 2.6vw, 1.75rem)',
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              maxWidth: '560px',
            }}
          >
            {t('catalog.band.title')}
          </span>
          <span style={{ fontSize: '15px', lineHeight: 1.55, opacity: 0.78, maxWidth: '560px' }}>
            {t('catalog.band.body')}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
          <a
            href="/waitlist"
            style={{
              height: '48px',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bone)',
              color: 'var(--well)',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            {t('catalog.band.cta')}
          </a>
          <Link
            href="/#paths"
            style={{
              height: '48px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '13px',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              color: 'var(--bone)',
              opacity: 0.85,
            }}
          >
            {t('catalog.band.bulk')}
          </Link>
        </div>
      </div>
    );
  }

  // Sequence tuned for the 4-column desktop grid: note+3 products fills
  // row 1 exactly, cloth(2)+2 products fills row 2, 4 products fill row
  // 3, band spans the full row, 2 products+studio(2) fill the last
  // editorial row. grid-flow-dense (below) backfills any gaps this
  // leaves at 3 or 2 columns.
  const showEditorial = !filtersActive && displayed.length >= 11;
  const cells: Cell[] = showEditorial
    ? [
        { kind: 'note', key: 'note' },
        { kind: 'product', product: displayed[0], key: displayed[0].code },
        { kind: 'product', product: displayed[1], key: displayed[1].code },
        { kind: 'product', product: displayed[2], key: displayed[2].code },
        { kind: 'editorial', variant: 'cloth', key: 'editorial-cloth' },
        { kind: 'product', product: displayed[3], key: displayed[3].code },
        { kind: 'product', product: displayed[4], key: displayed[4].code },
        { kind: 'product', product: displayed[5], key: displayed[5].code },
        { kind: 'product', product: displayed[6], key: displayed[6].code },
        { kind: 'product', product: displayed[7], key: displayed[7].code },
        { kind: 'product', product: displayed[8], key: displayed[8].code },
        { kind: 'band', key: 'band' },
        { kind: 'product', product: displayed[9], key: displayed[9].code },
        { kind: 'product', product: displayed[10], key: displayed[10].code },
        { kind: 'editorial', variant: 'studio', key: 'editorial-studio' },
        ...displayed.slice(11).map((p) => ({ kind: 'product' as const, product: p, key: p.code })),
      ]
    : displayed.map((p) => ({ kind: 'product' as const, product: p, key: p.code }));

  // Active-filter chips for the toolbar — one per drawer-controlled
  // filter (type/colour/fit/cloth toggles), each removable on its own.
  // Search and the favourites toggle keep their own controls instead of
  // a chip.
  const chipRemoveStyle: CSSProperties = {
    ...MONO,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'var(--signal)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    opacity: 0.82,
    whiteSpace: 'nowrap',
  };

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (type) {
    const key = typeKey(type);
    chips.push({ key: 'type', label: key ? t(key) : type, onRemove: () => setExplicit(setType, null) });
  }
  if (colour) {
    chips.push({ key: 'colour', label: colourName(colour), onRemove: () => setExplicit(setColour, null) });
  }
  if (fit) {
    const key = fitKey(fit);
    chips.push({ key: 'fit', label: key ? t(key) : fit, onRemove: () => setExplicit(setFit, null) });
  }
  if (heavy) {
    chips.push({
      key: 'heavy',
      label: t('catalog.toggle.heavy'),
      onRemove: () => {
        setFiltersTouched(true);
        setHeavy(false);
      },
    });
  }
  if (gots) {
    chips.push({
      key: 'gots',
      label: t('catalog.toggle.gots'),
      onRemove: () => {
        setFiltersTouched(true);
        setGots(false);
      },
    });
  }

  return (
    <>
      {/* Intro band: giant header, copy line, computed stats. */}
      <section
        style={{
          paddingLeft: 'var(--gutter)',
          paddingRight: 'var(--gutter)',
          paddingTop: 'clamp(28px, 5vw, 48px)',
          paddingBottom: '8px',
        }}
      >
        <div className="flex flex-wrap items-start gap-4">
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display), sans-serif',
              fontWeight: 600,
              fontSize: 'clamp(3.25rem, 11vw, 9.5rem)',
              lineHeight: 0.85,
              letterSpacing: '-0.03em',
            }}
          >
            {t('catalog.intro.title')}
          </h1>
          <span style={{ ...MONO, marginTop: '10px' }}>({CATALOG_STATS.total})</span>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <span className="md:col-span-3" style={{ ...MONO, opacity: 0.62 }}>
            {t('catalog.intro.label')} · {t('home.hero.fact.printed')}
          </span>
          <p className="md:col-span-5" style={{ margin: 0, fontSize: '17px', lineHeight: 1.5 }}>
            {t('catalog.intro.body', { n: CATALOG_STATS.total, gsm: CATALOG_STATS.heaviestGsm })}
          </p>
          <div className="md:col-span-4 flex flex-wrap gap-5 md:justify-end" style={{ ...MONO, opacity: 0.62 }}>
            <span>
              <b style={{ color: 'var(--signal)', fontWeight: 500 }}>{CATALOG_STATS.gots}</b> {t('catalog.stat.gots')}
            </span>
            <span>
              <b style={{ color: 'var(--signal)', fontWeight: 500 }}>{CATALOG_STATS.heavy}</b> {t('catalog.stat.heavy')}
            </span>
            <span>
              <b style={{ color: 'var(--signal)', fontWeight: 500 }}>{CATALOG_STATS.methods}</b> {t('catalog.stat.methods')}
            </span>
          </div>
        </div>
      </section>

      <section className="pt-8 pb-16" style={{ paddingLeft: 'var(--gutter)', paddingRight: 'var(--gutter)' }}>
        {/* Quiet toolbar: count + removable filter chips on the left,
            search / Filter / Grid-Index on the right. Not sticky — a
            single hairline-bound row, no boxes or pills. */}
        <div
          className="mb-7 flex flex-wrap items-center justify-between"
          style={{ borderTop: HAIRLINE, borderBottom: HAIRLINE, padding: '16px 0', gap: '14px 28px' }}
        >
          <div className="flex flex-wrap items-center" style={{ gap: '20px' }}>
            <span aria-live="polite" className="mf-dim" style={MONO}>
              {t.tPlural('catalog.count', displayed.length)}
            </span>
            {chips.map((chip) => (
              <button key={chip.key} type="button" style={chipRemoveStyle} onClick={chip.onRemove}>
                <span>{chip.label}</span>
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center" style={{ gap: '22px' }}>
            {(favouriteCodes.length > 0 || favouritesOnly) && (
              <button
                type="button"
                aria-pressed={favouritesOnly}
                style={{ ...MONO, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--signal)', fontWeight: favouritesOnly ? 700 : 400 }}
                onClick={() => {
                  setFiltersTouched(true);
                  setFavouritesOnly((v) => !v);
                }}
              >
                {favouriteCodes.length > 0 ? t('common.savedCount', { n: favouriteCodes.length }) : t('common.saved')}
              </button>
            )}

            <label htmlFor="catalog-search" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden' }}>
              {t('catalog.searchAriaLabel')}
            </label>
            {searchOpen ? (
              <input
                ref={searchInputRef}
                id="catalog-search"
                type="text"
                value={query}
                onChange={(e) => {
                  setFiltersTouched(true);
                  setQuery(e.target.value);
                }}
                onBlur={() => {
                  if (!query.trim()) setSearchOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                    e.currentTarget.blur();
                  }
                }}
                placeholder={t('catalog.searchPlaceholder')}
                style={{ ...MONO, background: 'none', border: 'none', borderBottom: HAIRLINE, padding: '4px 0', width: '140px', color: 'var(--signal)' }}
              />
            ) : (
              <button
                type="button"
                id="catalog-search"
                onClick={() => setSearchOpen(true)}
                style={{ ...MONO, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--signal)' }}
              >
                {t('catalog.searchPlaceholder')}
              </button>
            )}

            <button
              ref={filterButtonRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              style={{ ...MONO, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--signal)' }}
            >
              {chips.length > 0 ? `${t('catalog.filters.button')} (${chips.length})` : t('catalog.filters.button')}
            </button>

            <span aria-hidden style={{ width: '1px', height: '14px', background: 'var(--hairline)' }} />

            <div role="group" aria-label={t('catalog.tabs.ariaLabel')} style={{ display: 'flex', gap: '16px' }}>
              <button
                type="button"
                aria-pressed={mode === 'grid'}
                onClick={() => setMode('grid')}
                style={{ ...MONO, background: 'none', border: 'none', padding: 0, height: '30px', cursor: 'pointer', color: mode === 'grid' ? 'var(--signal)' : 'var(--muted)', borderBottom: mode === 'grid' ? '1px solid var(--signal)' : '1px solid transparent' }}
              >
                {t('catalog.view.grid')}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'index'}
                onClick={() => setMode('index')}
                style={{ ...MONO, background: 'none', border: 'none', padding: 0, height: '30px', cursor: 'pointer', color: mode === 'index' ? 'var(--signal)' : 'var(--muted)', borderBottom: mode === 'index' ? '1px solid var(--signal)' : '1px solid transparent' }}
              >
                {t('catalog.view.index')}
              </button>
            </div>
          </div>
        </div>

        {displayed.length === 0 && (
          <p className="mf-dim" style={{ fontSize: '14px' }}>
            {favouritesOnly ? t('catalog.noSavedBlanks') : t('catalog.empty')}
          </p>
        )}

        {mode === 'grid' ? (
          <div
            ref={rootRef}
            data-armed={armed || undefined}
            data-filters-touched={filtersTouched || undefined}
            className="grid grid-flow-dense grid-cols-2 gap-x-2 gap-y-7 md:grid-cols-3 xl:grid-cols-4 md:gap-x-3 md:gap-y-11"
          >
            {cells.map((cell, i) => {
              if (cell.kind === 'note') return <div key={cell.key} className="col-span-2 md:col-span-1">{noteTile()}</div>;
              if (cell.kind === 'editorial') return editorialTile(cell.variant);
              if (cell.kind === 'band') return bandTile();
              return renderProductCard(cell.product, i);
            })}
          </div>
        ) : (
          displayed.length > 0 && (
            // Horizontally scrollable below the six-column breakpoint —
            // the fixed column template otherwise squeezes "Sweats &
            // Hoodies" and the certification list into an unreadable
            // wrap on narrow viewports.
            <div style={{ borderTop: '1px solid var(--signal)', overflowX: 'auto' }}>
              <div style={{ minWidth: '640px' }}>
                <div
                  className="mf-dim"
                  style={{ ...MONO, display: 'grid', gridTemplateColumns: '56px 2fr 1.4fr 1fr 1fr 1fr', alignItems: 'center', height: '40px', borderBottom: HAIRLINE }}
                >
                  <span aria-hidden />
                  <span>{t('catalog.index.name')}</span>
                  <span>{t('catalog.index.type')}</span>
                  <span>{t('catalog.index.weight')}</span>
                  <span>{t('catalog.index.cert')}</span>
                  <span>{t('catalog.index.colours')}</span>
                </div>
                {displayed.map((p) => renderIndexRow(p))}
              </div>
            </div>
          )
        )}
      </section>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        triggerRef={filterButtonRef}
        types={TYPES}
        typeCounts={TYPE_COUNTS}
        totalCount={CATALOG_STATS.total}
        type={type}
        onSelectAllTypes={() => setExplicit(setType, null)}
        onToggleType={(ty) => toggleValue(type, ty, setType)}
        heavy={heavy}
        heavyCount={CATALOG_STATS.heavy}
        onToggleHeavy={() => {
          setFiltersTouched(true);
          setHeavy((v) => !v);
        }}
        gots={gots}
        gotsCount={CATALOG_STATS.gots}
        onToggleGots={() => {
          setFiltersTouched(true);
          setGots((v) => !v);
        }}
        colours={COLOURS}
        colour={colour}
        onToggleColour={(c) => toggleValue(colour, c, setColour)}
        swatchFor={swatchFor}
        colourName={colourName}
        fits={FITS}
        fit={fit}
        onSelectAllFits={() => setExplicit(setFit, null)}
        onToggleFit={(f) => toggleValue(fit, f, setFit)}
        resultCount={filtered.length}
        onClearAll={clearAll}
      />

      {open && (
        <ProductModal
          key={open.code}
          product={open}
          initialColour={effectiveColour ?? undefined}
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
