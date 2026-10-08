'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PRODUCTS, type Product } from '@/lib/products';
import { PRODUCT_DETAILS, printTechniquesFor } from '@/lib/product-details';
import { PRINT_AREAS } from '@/lib/print-areas';
import { colourName } from '@/lib/colour-names';
import { PRODUCT_VIDEOS } from '@/lib/product-videos';
import { SIZE_GUIDES, type SizeGuide } from '@/lib/size-guides';
import { useFavourites } from '@/lib/favourites';
import { typeFor } from '@/lib/catalog-filters';
import { techniqueKey, useT } from '@/lib/i18n';
import {
  BASE_COLOUR,
  BASE_SWATCH,
  COLOUR_SWATCHES,
  VARIANTS,
  VARIANT_BACKS,
  variantBackSrc,
  variantSrc,
} from '@/lib/variants';

const HAIRLINE = '1px solid var(--hairline)';

interface Thumb {
  src: string;
  alt: string;
  /** an mp4 loop instead of a photo */
  video?: boolean;
}

interface SpecRow {
  /** stable, untranslated identifier — never rendered, used to key rows and pick out the Sizes row */
  id: string;
  label: string;
  value: ReactNode;
  /** folded under the mobile 'Details' toggle; always shown on md and up */
  collapsible?: boolean;
}

function SizeGuideTable({ guide }: { guide: SizeGuide }) {
  const t = useT();
  const [entered, setEntered] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (entered) return;
    const rafId = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cell: React.CSSProperties = {
    border: HAIRLINE,
    padding: '6px 10px',
    fontSize: '12px',
    fontVariantNumeric: 'tabular-nums',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      className="overflow-x-auto"
      style={{
        marginTop: '10px',
        opacity: entered ? 1 : 0,
        transform: entered ? 'none' : 'translateY(6px)',
        transition: 'opacity 300ms ease, transform 300ms ease',
      }}
    >
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={cell}>{t('common.size')}</th>
            {guide.columns.map((column) => (
              <th key={column} style={cell}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {guide.rows.map((row) => (
            <tr key={row.size}>
              <td style={cell}>{row.size}</td>
              {row.values.map((value, i) => (
                <td key={i} style={cell}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="opacity-[.62]" style={{ fontSize: '12px', marginTop: '6px' }}>
        {t('modal.measurementsIn', { unit: guide.unit })}
      </div>
    </div>
  );
}

function RelatedStrip({
  products,
  onOpenProduct,
}: {
  products: Product[];
  onOpenProduct: (code: string) => void;
}) {
  const t = useT();
  const stripRef = useRef<HTMLDivElement>(null);
  // Mouse drag to scroll the strip sideways (touch already swipes
  // natively). A small threshold keeps plain clicks opening products.
  const drag = useRef({ active: false, moved: false, startX: 0, startLeft: 0 });
  const [overflow, setOverflow] = useState({ left: false, right: false });

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const update = () =>
      setOverflow({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [products]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = stripRef.current;
    if (!el) return;
    drag.current = { active: true, moved: false, startX: e.clientX, startLeft: el.scrollLeft };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const el = stripRef.current;
    if (!d.active || !el) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) {
      d.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    el.scrollLeft = d.startLeft - dx;
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const el = stripRef.current;
    if (drag.current.moved && el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    drag.current.active = false;
  }

  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (!drag.current.moved) return;
    e.stopPropagation();
    e.preventDefault();
    drag.current.moved = false;
  }

  const fade = (side: 'left' | 'right') =>
    `linear-gradient(to ${side}, transparent, var(--raised))`;

  return (
    <div>
      <span
        style={{
          fontSize: '12px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'color-mix(in srgb, var(--signal) 55%, transparent)',
        }}
      >
        {t('common.related')}
      </span>
      <div className="relative" style={{ marginTop: '10px' }}>
        <div
          ref={stripRef}
          className="flex gap-3 overflow-x-auto"
          style={{
            paddingBottom: '4px',
            scrollbarWidth: 'none',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'pan-x pan-y',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
        >
          {products.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => onOpenProduct(p.code)}
              className="w-20 flex-shrink-0 md:w-24"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'inherit',
                textAlign: 'left',
              }}
            >
              <div className="relative aspect-square w-full" style={{ border: HAIRLINE, background: 'var(--surface)' }}>
                <div className="absolute inset-[9%]">
                  <Image
                    src={p.src}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-contain"
                    draggable={false}
                  />
                </div>
              </div>
              <div
                className="opacity-[.62]"
                style={{
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  marginTop: '6px',
                  lineHeight: 1.3,
                }}
              >
                {PRODUCT_DETAILS[p.code]?.name ?? p.name}
              </div>
            </button>
          ))}
        </div>
        {/* Edge fades signal that more blanks sit outside the panel. */}
        {(['left', 'right'] as const).map((side) => (
          <div
            key={side}
            aria-hidden
            className="pointer-events-none absolute inset-y-0"
            style={{
              [side]: 0,
              width: '48px',
              background: fade(side),
              opacity: overflow[side] ? 1 : 0,
              transition: 'opacity 300ms ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ProductModal({
  product,
  onClose,
  origin,
  onPrevProduct,
  onNextProduct,
  position,
  onOpenProduct,
  initialColour,
}: {
  product: Product;
  /** colourway to open on (the grid's filter or its light default); ignored if the blank lacks it */
  initialColour?: string;
  onClose: () => void;
  /** the clicked card's image-area rect, for a FLIP entrance from it */
  origin?: { x: number; y: number; width: number; height: number };
  /** move to the previous/next product in the catalog's displayed order */
  onPrevProduct?: () => void;
  onNextProduct?: () => void;
  /** this product's 0-based index and the total count in the displayed order */
  position?: { index: number; total: number };
  /** opens another product in this modal; the Related strip hides without it */
  onOpenProduct?: (code: string) => void;
}) {
  const t = useT();
  const details = PRODUCT_DETAILS[product.code];
  const name = details?.name ?? product.name;
  const techniques = printTechniquesFor(product.code);
  const sizeGuide = SIZE_GUIDES[product.code];
  const { has, toggle } = useFavourites();
  const saved = has(product.code);

  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);


  const related = onOpenProduct
    ? (() => {
        const family = typeFor(product.code);
        const prefix = product.code.slice(0, 4);
        const sameFamily = PRODUCTS.filter((p) => p.code !== product.code && typeFor(p.code) === family);
        const samePrefix = sameFamily.filter((p) => p.code.slice(0, 4) === prefix);
        const rest = sameFamily.filter((p) => p.code.slice(0, 4) !== prefix);
        return [...samePrefix, ...rest].slice(0, 6);
      })()
    : [];

  const thumbs: Thumb[] = [
    { src: product.src, alt: `${product.code} — ${t('modal.photo.front')}` },
    ...(product.back ? [{ src: product.back, alt: `${product.code} — ${t('modal.photo.back')}` }] : []),
    ...product.details.map((src, i) => ({ src, alt: `${product.code} — ${t('modal.photo.detail')} ${i + 1}` })),
    // Video loop last, base colourway only (the footage shows the black
    // garment).
    ...(PRODUCT_VIDEOS[product.code]
      ? [{ src: PRODUCT_VIDEOS[product.code], alt: `${product.code} — ${t('modal.photo.video')}`, video: true }]
      : []),
  ];

  const [selected, setSelected] = useState(0);
  // Colourways: base black plus the converted variants, if any.
  const colours = [BASE_COLOUR, ...(VARIANTS[product.code] ?? [])];
  const [colourSel, setColourSel] = useState(
    initialColour && colours.includes(initialColour) ? initialColour : BASE_COLOUR,
  );
  const showingVariant = colourSel !== BASE_COLOUR;

  // The whole photo set follows the selected colour: base shows
  // front/back/details, a variant shows its own front and back.
  const variantThumbs: Thumb[] = showingVariant
    ? [
        { src: variantSrc(product.code, colourSel), alt: `${product.code} — ${colourSel} ${t('modal.photo.front')}` },
        ...(VARIANT_BACKS[product.code]?.includes(colourSel)
          ? [{ src: variantBackSrc(product.code, colourSel), alt: `${product.code} — ${colourSel} ${t('modal.photo.back')}` }]
          : []),
      ]
    : [];
  const displayThumbs = showingVariant ? variantThumbs : thumbs;
  const main = displayThumbs[Math.min(selected, displayThumbs.length - 1)];
  const panelRef = useRef<HTMLDivElement>(null);

  // Photo navigation: arrows, arrow keys, and drag/swipe on the image.
  const nav = (delta: number) => {
    const len = displayThumbs.length;
    if (len < 2) return;
    setSelected((s) => (Math.min(s, len - 1) + delta + len) % len);
  };

  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  // Sources whose main image has fired onLoad — the img itself stays
  // invisible until then, so a slow-loading photo fades in instead of
  // popping (the wrapper's own view-fade-in handles the photo switch).
  const [loadedMain, setLoadedMain] = useState<Set<string>>(new Set());

  // Click-to-zoom on the main image: a true click (not a swipe) toggles
  // 2.2x zoom, centred on the click point. Photo nav or a colour change
  // resets it (see the effect below); a click while zoomed un-zooms.
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  useEffect(() => {
    setZoomed(false);
  }, [selected, colourSel]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Don't hijack the arrow buttons: capturing their pointer would
    // retarget the pointerup and swallow the click.
    if ((e.target as HTMLElement).closest('button')) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    if (!zoomed) e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null || zoomed) return;
    // While zoomed, drag/swipe navigation is disabled entirely — this
    // early return keeps panning gestures from switching photos.
    if (displayThumbs.length < 2) return;
    const dx = e.clientX - dragStart.current.x;
    setDragOffset(Math.max(-80, Math.min(80, dx)));
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    dragStart.current = null;
    setDragOffset(0);
    const isClick = Math.abs(dx) < 8 && Math.abs(dy) < 8;

    if (zoomed) {
      // Any true click while zoomed resets zoom; swipes stay inert.
      if (isClick) setZoomed(false);
      return;
    }

    if (isClick && !main.video) {
      const rect = e.currentTarget.getBoundingClientRect();
      setZoomOrigin({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
      setZoomed(true);
      return;
    }

    if (displayThumbs.length > 1 && Math.abs(dx) > 60) nav(dx < 0 ? 1 : -1);
  }
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FLIP entrance: when opened from a clicked card, the panel starts at
  // the card's image-area rect and settles into place. Mutated directly
  // on the DOM node (not via the style prop) so React's own re-renders
  // never fight this one-shot transition.
  useEffect(() => {
    if (!origin) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const panel = panelRef.current;
    if (!panel) return;

    const finalRect = panel.getBoundingClientRect();
    const scaleX = origin.width / finalRect.width;
    const scaleY = origin.height / finalRect.height;
    const dx = origin.x - finalRect.left;
    const dy = origin.y - finalRect.top;

    panel.style.transformOrigin = 'top left';
    panel.style.transition = 'none';
    panel.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
    panel.style.opacity = '0.4';

    const rafId = requestAnimationFrame(() => {
      // Force a style flush so the browser commits the initial
      // (untransitioned) transform before the transition is enabled —
      // otherwise both writes can coalesce into a single paint and the
      // panel would just appear at its final position with no motion.
      void panel.offsetWidth;
      panel.style.transition =
        'transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms cubic-bezier(0.22, 1, 0.36, 1)';
      panel.style.transform = 'none';
      panel.style.opacity = '1';
    });

    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const len = displayThumbs.length;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const forward = e.key === 'ArrowRight';
      // Shift+arrow always moves between products; plain arrows do too
      // when there's only one photo to cycle through. Otherwise plain
      // arrows keep cycling photos, as today.
      if (e.shiftKey || len < 2) {
        if (forward) onNextProduct?.();
        else onPrevProduct?.();
        return;
      }
      setSelected((s) => (Math.min(s, len - 1) + (forward ? 1 : -1) + len) % len);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [displayThumbs.length, onNextProduct, onPrevProduct]);

  const rows: SpecRow[] = [];
  if (colours.length > 1) {
    rows.push({
      id: 'colours',
      label: t('modal.colours'),
      value: (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end' }}>
          {colours.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={t('modal.colourAriaLabel', { name: colourName(c) })}
              aria-pressed={colourSel === c}
              title={colourName(c)}
              onClick={() => {
                setColourSel(c);
                setSelected(0);
              }}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                cursor: 'pointer',
                background: c === BASE_COLOUR ? BASE_SWATCH : (COLOUR_SWATCHES[c] ?? '#888'),
                border: HAIRLINE,
                outline: colourSel === c ? '1px solid var(--signal)' : 'none',
                outlineOffset: '3px',
                padding: 0,
              }}
            />
          ))}
        </span>
      ),
    });
  }
  if (details?.composition) rows.push({ id: 'composition', label: t('modal.composition'), value: details.composition });
  if (details?.weightGsm) rows.push({ id: 'weight', label: t('modal.weight'), value: `${details.weightGsm} g/m²` });
  if (details?.fit) rows.push({ id: 'fit', label: t('modal.fit'), value: details.fit });
  const printAreas = PRINT_AREAS[product.code];
  if (printAreas) {
    const parts: string[] = [];
    if (printAreas.front) parts.push(`${t('modal.printArea.front')} ${printAreas.front}`);
    if (printAreas.back) parts.push(`${t('modal.printArea.back')} ${printAreas.back}`);
    if (printAreas.sleeve) parts.push(`${t('modal.printArea.sleeve')} ${printAreas.sleeve}`);
    if (printAreas.other) parts.push(`${t('modal.printArea.other')} ${printAreas.other}`);
    if (parts.length > 0) rows.push({ id: 'printAreas', label: t('modal.printAreas'), value: parts.join(' · '), collapsible: true });
  }
  if (details?.sizes && details.sizes.length > 0) {
    rows.push({
      id: 'sizes',
      label: t('modal.sizes'),
      collapsible: true,
      value: (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'flex-end' }}>
            {details.sizes.map((size) => (
              <span
                key={size}
                style={{
                  border: HAIRLINE,
                  padding: '2px 8px',
                  fontSize: '12px',
                  lineHeight: 1.6,
                }}
              >
                {size}
              </span>
            ))}
          </span>
          {sizeGuide && (
            <button
              type="button"
              onClick={() => setSizeGuideOpen((v) => !v)}
              aria-expanded={sizeGuideOpen}
              style={{
                fontSize: '12px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--signal)',
              }}
              className="opacity-[.62]"
            >
              {t('modal.sizeGuide')}
            </button>
          )}
        </span>
      ),
    });
  }
  if (details?.certifications && details.certifications.length > 0) {
    rows.push({ id: 'certifications', label: t('modal.certifications'), value: details.certifications.join(' · '), collapsible: true });
  }
  rows.push({
    id: 'printTechniques',
    label: t('modal.printTechniques'),
    value: techniques.map((technique) => {
      const key = techniqueKey(technique);
      return key ? t(key) : technique;
    }).join(', '),
    collapsible: true,
  });

  const primaryRows = rows.filter((row) => !row.collapsible);
  const secondaryRows = rows.filter((row) => row.collapsible);
  const firstVisibleId = (primaryRows[0] ?? secondaryRows[0])?.id;
  const showSecondary = !isMobile || detailsOpen;
  const hasDetailsToggle = secondaryRows.length > 0 || (onOpenProduct !== undefined && related.length > 0);

  function specRow(row: SpecRow, isFirst: boolean) {
    return (
      <div
        key={row.id}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '12px 0',
          borderTop: isFirst ? 'none' : HAIRLINE,
        }}
      >
        <span
          style={{
            fontSize: '12px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'color-mix(in srgb, var(--signal) 55%, transparent)',
            whiteSpace: 'nowrap',
          }}
        >
          {row.label}
        </span>
        <span style={{ fontSize: '14px', textAlign: 'right' }}>{row.value}</span>
      </div>
    );
  }

  return (
    <div
      className="view-fade-in"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '16px 24px' : '24px',
        background: 'var(--scrim)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={name}
        tabIndex={-1}
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
        className="flex w-[94vw] flex-col md:w-[92vw] md:flex-row"
        style={{
          maxWidth: '1080px',
          maxHeight: isMobile ? 'calc(100dvh - 32px)' : '86vh',
          background: 'var(--raised)',
          border: HAIRLINE,
          overflowY: 'auto',
          outline: 'none',
          position: 'relative',
        }}
      >
        {/* 40px button box for a comfortable tap target; the 32px hairline
            square stays the visual size, centered inside it. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('modal.close')}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 1,
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'flex',
              width: '32px',
              height: '32px',
              alignItems: 'center',
              justifyContent: 'center',
              border: HAIRLINE,
              background: 'var(--paper)',
              color: 'var(--signal)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </span>
        </button>

        {/* Left: imagery */}
        <div className="md:w-[55%]" style={{ padding: '24px' }}>
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: '4 / 5', touchAction: 'pan-y', background: 'var(--surface)' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              key={`${selected}-${colourSel}`}
              className="view-fade-in relative h-full w-full"
              style={{
                transform: zoomed ? 'scale(2.2)' : `translateX(${dragOffset}px)`,
                transformOrigin: zoomed ? `${zoomOrigin.x}% ${zoomOrigin.y}%` : '50% 50%',
                transition: zoomed
                  ? 'transform 400ms ease'
                  : dragStart.current === null
                    ? 'transform 300ms ease'
                    : 'none',
                cursor: zoomed ? 'zoom-out' : 'zoom-in',
              }}
            >
              {main.video ? (
                <video
                  src={main.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-label={main.alt}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: loadedMain.has(main.src) ? 1 : 0,
                    transition: 'opacity 400ms ease',
                  }}
                  onLoadedData={() =>
                    setLoadedMain((prev) => (prev.has(main.src) ? prev : new Set(prev).add(main.src)))
                  }
                />
              ) : (
                <Image
                  src={main.src}
                  alt={main.alt}
                  fill
                  sizes="(max-width: 768px) 94vw, 55vw"
                  className="object-contain"
                  draggable={false}
                  style={{
                    opacity: loadedMain.has(main.src) ? 1 : 0,
                    transition: 'opacity 400ms ease',
                  }}
                  onLoad={() =>
                    setLoadedMain((prev) => (prev.has(main.src) ? prev : new Set(prev).add(main.src)))
                  }
                />
              )}
            </div>

            {displayThumbs.length > 1 && (
              <>
                {/* 40px button box for a comfortable tap target; the 32px
                    hairline square stays the visual size, centered inside
                    it and offset so it lands exactly where the plain 32px
                    box used to sit. */}
                <button
                  type="button"
                  aria-label={t('modal.previousPhoto')}
                  onClick={() => nav(-1)}
                  style={{
                    position: 'absolute',
                    left: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: 'flex',
                      width: '32px',
                      height: '32px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: HAIRLINE,
                      background: 'var(--paper)',
                      color: 'var(--signal)',
                    }}
                  >
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden>
                      <path d="M7 1L1.5 6L7 11" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t('modal.nextPhoto')}
                  onClick={() => nav(1)}
                  style={{
                    position: 'absolute',
                    right: '-4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: 'flex',
                      width: '32px',
                      height: '32px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: HAIRLINE,
                      background: 'var(--paper)',
                      color: 'var(--signal)',
                    }}
                  >
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden>
                      <path d="M1 1L6.5 6L1 11" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </span>
                </button>
              </>
            )}
          </div>

          {displayThumbs.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              {displayThumbs.map((thumb, i) => (
                <button
                  key={thumb.src}
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-label={thumb.alt}
                  aria-current={i === selected}
                  style={{
                    position: 'relative',
                    height: '72px',
                    aspectRatio: '4 / 5',
                    background: 'var(--surface)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    opacity: i === selected ? 1 : 0.5,
                    borderBottom: i === selected ? '2px solid var(--signal)' : '2px solid transparent',
                    transition: 'opacity 400ms ease, border-color 400ms ease',
                  }}
                >
                  {thumb.video ? (
                    <>
                      <video
                        src={thumb.src}
                        muted
                        playsInline
                        preload="metadata"
                        aria-hidden
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--signal)',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                          <path d="M3 1.5L12 7L3 12.5V1.5Z" />
                        </svg>
                      </span>
                    </>
                  ) : (
                    <Image src={thumb.src} alt="" fill sizes="60px" className="object-contain" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: info */}
        <div
          className="md:w-[45%]"
          style={{
            padding: '24px',
            paddingTop: '48px',
            display: 'flex',
            flexDirection: 'column',
            // 'safe': when the specs run taller than the panel, fall back to
            // top alignment instead of pushing the title above its edge.
            justifyContent: 'safe center',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div
                style={{
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'color-mix(in srgb, var(--signal) 55%, transparent)',
                  marginBottom: '8px',
                }}
              >
                {product.code}
                {position && (
                  <span className="opacity-[.62]" style={{ color: 'var(--signal)' }}>
                    {' '}
                    · {t('modal.position', { index: position.index + 1, total: position.total })}
                  </span>
                )}
              </div>
              <h2
                style={{
                  fontFamily: 'var(--font-display), sans-serif',
                  textTransform: 'uppercase',
                  fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                {name}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => toggle(product.code)}
              aria-pressed={saved}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                flexShrink: 0,
                color: 'var(--signal)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '1px solid currentColor',
                  background: saved ? 'currentColor' : 'none',
                }}
              />
              <span
                className="opacity-[.62]"
                style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {saved ? t('common.saved') : t('common.save')}
              </span>
            </button>
          </div>

          {details?.description && (
            <p
              style={{
                fontSize: '15px',
                lineHeight: 1.6,
                color: 'color-mix(in srgb, var(--signal) 75%, transparent)',
                margin: 0,
              }}
            >
              {details.description}
            </p>
          )}

          <div>
            {primaryRows.map((row) => specRow(row, row.id === firstVisibleId))}

            {isMobile && hasDetailsToggle && (
              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  border: 'none',
                  borderTop: HAIRLINE,
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--signal)',
                }}
              >
                {t('common.details')}
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  aria-hidden
                  style={{
                    transform: detailsOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 300ms ease',
                  }}
                >
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </button>
            )}

            {showSecondary && (
              <>
                {secondaryRows.map((row) =>
                  row.id === 'sizes' ? (
                    <div key={row.id}>
                      {specRow(row, row.id === firstVisibleId)}
                      {sizeGuide && sizeGuideOpen && <SizeGuideTable guide={sizeGuide} />}
                    </div>
                  ) : (
                    specRow(row, row.id === firstVisibleId)
                  ),
                )}

                {onOpenProduct && related.length > 0 && (
                  <div
                    style={{
                      marginTop: '4px',
                      paddingTop: '12px',
                      borderTop: secondaryRows.length > 0 ? HAIRLINE : 'none',
                    }}
                  >
                    <RelatedStrip products={related} onOpenProduct={onOpenProduct} />
                  </div>
                )}
              </>
            )}
          </div>

          {(onPrevProduct || onNextProduct) && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onPrevProduct}
                disabled={!onPrevProduct}
                style={{
                  flex: 1,
                  height: '40px',
                  border: HAIRLINE,
                  background: 'none',
                  cursor: onPrevProduct ? 'pointer' : 'default',
                  opacity: onPrevProduct ? 1 : 0.35,
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--signal)',
                }}
              >
                ← {t('modal.prev')}
              </button>
              <button
                type="button"
                onClick={onNextProduct}
                disabled={!onNextProduct}
                style={{
                  flex: 1,
                  height: '40px',
                  border: HAIRLINE,
                  background: 'none',
                  cursor: onNextProduct ? 'pointer' : 'default',
                  opacity: onNextProduct ? 1 : 0.35,
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--signal)',
                }}
              >
                {t('modal.next')} →
              </button>
            </div>
          )}

          <a
            href={`/waitlist?product=${product.code}&colour=${colourSel}`}
            className="block w-full text-center transition-colors duration-500 hover:bg-[color-mix(in_srgb,var(--signal)_8%,transparent)]"
            style={{
              textTransform: 'uppercase',
              fontSize: '13px',
              letterSpacing: '0.08em',
              padding: '14px',
              border: HAIRLINE,
            }}
          >
            {t('modal.startProject')}
          </a>
        </div>
      </div>
    </div>
  );
}
