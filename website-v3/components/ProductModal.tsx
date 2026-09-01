'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Product } from '@/lib/products';
import { PRODUCT_DETAILS, printTechniquesFor } from '@/lib/product-details';
import { colourName } from '@/lib/colour-names';
import { PRODUCT_VIDEOS } from '@/lib/product-videos';
import {
  BASE_COLOUR,
  BASE_SWATCH,
  COLOUR_SWATCHES,
  VARIANTS,
  VARIANT_BACKS,
  isLightColour,
  variantBackSrc,
  variantSrc,
} from '@/lib/variants';

const HAIRLINE = '1px solid color-mix(in srgb, var(--signal) 22%, transparent)';

interface Thumb {
  src: string;
  alt: string;
  /** an mp4 loop instead of a photo */
  video?: boolean;
}

interface SpecRow {
  label: string;
  value: ReactNode;
}

export function ProductModal({
  product,
  onClose,
  restoreColour = null,
  origin,
}: {
  product: Product;
  onClose: () => void;
  /** the catalog's active colour filter — theme returns to it on close */
  restoreColour?: string | null;
  /** the clicked card's image-area rect, for a FLIP entrance from it */
  origin?: { x: number; y: number; width: number; height: number };
}) {
  const details = PRODUCT_DETAILS[product.code];
  const name = details?.name ?? product.name;
  const techniques = printTechniquesFor(product.code);

  const thumbs: Thumb[] = [
    { src: product.src, alt: `${product.code} — front` },
    ...(product.back ? [{ src: product.back, alt: `${product.code} — back` }] : []),
    ...product.details.map((src, i) => ({ src, alt: `${product.code} — detail ${i + 1}` })),
    // Video loop last, base colourway only (the footage shows the black
    // garment).
    ...(PRODUCT_VIDEOS[product.code]
      ? [{ src: PRODUCT_VIDEOS[product.code], alt: `${product.code} — video`, video: true }]
      : []),
  ];

  const [selected, setSelected] = useState(0);
  // Colourways: base black plus the converted variants, if any.
  const colours = [BASE_COLOUR, ...(VARIANTS[product.code] ?? [])];
  const [colourSel, setColourSel] = useState(BASE_COLOUR);
  const showingVariant = colourSel !== BASE_COLOUR;

  // The whole photo set follows the selected colour: base shows
  // front/back/details, a variant shows its own front and back.
  const variantThumbs: Thumb[] = showingVariant
    ? [
        { src: variantSrc(product.code, colourSel), alt: `${product.code} — ${colourSel} front` },
        ...(VARIANT_BACKS[product.code]?.includes(colourSel)
          ? [{ src: variantBackSrc(product.code, colourSel), alt: `${product.code} — ${colourSel} back` }]
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

  // Contrast: light garments vanish on the light Catalog ground, so the
  // selected colour drives the theme — light colour, soft charcoal page
  // (never the main page's harder near-black). On close the theme
  // returns to whatever the catalog's colour filter implies.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mode = isLightColour(colourSel) ? 'charcoal' : 'light';
    return () => {
      root.dataset.mode = restoreColour && isLightColour(restoreColour) ? 'charcoal' : 'light';
    };
  }, [colourSel, restoreColour]);

  useEffect(() => {
    const len = displayThumbs.length;
    if (len < 2) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setSelected((s) => (Math.min(s, len - 1) + 1) % len);
      if (e.key === 'ArrowLeft') setSelected((s) => (Math.min(s, len - 1) - 1 + len) % len);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [displayThumbs.length]);

  const rows: SpecRow[] = [];
  if (colours.length > 1) {
    rows.push({
      label: 'Colours',
      value: (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end' }}>
          {colours.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${colourName(c)}`}
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
  if (details?.composition) rows.push({ label: 'Composition', value: details.composition });
  if (details?.weightGsm) rows.push({ label: 'Weight', value: `${details.weightGsm} g/m²` });
  if (details?.fit) rows.push({ label: 'Fit', value: details.fit });
  if (details?.sizes && details.sizes.length > 0) {
    rows.push({
      label: 'Sizes',
      value: (
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
      ),
    });
  }
  if (details?.certifications && details.certifications.length > 0) {
    rows.push({ label: 'Certifications', value: details.certifications.join(' · ') });
  }
  rows.push({ label: 'Print techniques', value: techniques.join(', ') });

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
        padding: '24px',
        background: 'color-mix(in srgb, var(--paper) 82%, transparent)',
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
          maxHeight: '86vh',
          background: 'var(--paper)',
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
          aria-label="Close"
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
            style={{ aspectRatio: '4 / 5', touchAction: 'pan-y' }}
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
                  aria-label="Previous photo"
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
                  aria-label="Next photo"
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
                    background: 'transparent',
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
            justifyContent: 'center',
            gap: '16px',
          }}
        >
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
            {rows.map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '12px 0',
                  borderTop: i === 0 ? 'none' : HAIRLINE,
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
            ))}
          </div>

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
            Start a project with this blank
          </a>
        </div>
      </div>
    </div>
  );
}
