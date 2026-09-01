'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Product } from '@/lib/products';
import { PRODUCT_DETAILS, printTechniquesFor } from '@/lib/product-details';

const HAIRLINE = '1px solid color-mix(in srgb, var(--signal) 22%, transparent)';

interface Thumb {
  src: string;
  alt: string;
}

interface SpecRow {
  label: string;
  value: ReactNode;
}

export function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const details = PRODUCT_DETAILS[product.code];
  const name = details?.name ?? product.name;
  const techniques = printTechniquesFor(product.code);

  const thumbs: Thumb[] = [
    { src: product.src, alt: `${product.code} — front` },
    ...(product.back ? [{ src: product.back, alt: `${product.code} — back` }] : []),
    ...product.details.map((src, i) => ({ src, alt: `${product.code} — detail ${i + 1}` })),
  ];

  const [selected, setSelected] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
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

  const rows: SpecRow[] = [];
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
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 1,
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: HAIRLINE,
            background: 'var(--paper)',
            color: 'var(--signal)',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>

        {/* Left: imagery */}
        <div className="md:w-[55%]" style={{ padding: '24px' }}>
          <div key={selected} className="view-fade-in relative w-full" style={{ aspectRatio: '4 / 5' }}>
            <Image
              src={thumbs[selected].src}
              alt={thumbs[selected].alt}
              fill
              sizes="(max-width: 768px) 94vw, 55vw"
              className="object-contain"
            />
          </div>

          {thumbs.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              {thumbs.map((thumb, i) => (
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
                  <Image src={thumb.src} alt="" fill sizes="60px" className="object-contain" />
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
        </div>
      </div>
    </div>
  );
}
