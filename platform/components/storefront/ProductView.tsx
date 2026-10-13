'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicProductDetail } from '@/lib/storefront/read-model';
import { useCart } from '@/components/storefront/CartProvider';
import { formatPrice } from '@/lib/storefront/present';

// How long the button keeps saying "Added to cart".
const ADDED_MS = 2000;

interface SpecRow {
  label: string;
  value: string | null;
  /** a quieter line under the value */
  note?: string | null;
}

export function ProductView({ slug, product }: { slug: string; product: PublicProductDetail }) {
  const { add, count } = useCart();
  const [colourCode, setColourCode] = useState(product.colours[0]?.code ?? '');
  const [size, setSize] = useState(product.sizes[0] ?? '');
  const [qty, setQty] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    },
    [],
  );

  const colour = product.colours.find((c) => c.code === colourCode) ?? product.colours[0];

  const specs = useMemo(() => {
    const { garment } = product;
    const rows: SpecRow[] = [
      { label: 'Garment', value: garment.name, note: garment.facts },
      { label: 'Composition', value: garment.composition },
      { label: 'Weight', value: garment.weightGsm ? `${garment.weightGsm} gsm` : null },
      { label: 'Print', value: product.printServiceName },
      { label: 'Fit', value: garment.fit },
    ];
    return rows.filter((row) => Boolean(row.value));
  }, [product]);

  function handleAdd() {
    if (!colour || !size) return;
    add({
      productId: product.id,
      colourCode: colour.code,
      size,
      qty,
      name: product.name,
      colourName: colour.name,
      imageUrl: colour.mockupUrl,
      priceCents: product.retailPriceCents ?? 0,
    });
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), ADDED_MS);
  }

  const canAdd = Boolean(colour) && Boolean(size) && product.retailPriceCents != null;
  const addLabel = added ? 'Added to cart' : 'Add to cart';

  return (
    <div className="pt-8">
      <Link href={`/${slug}`} className="mf-label mf-dim mb-6 inline-block hover:opacity-80">
        ← Back to shop
      </Link>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
        {/* Gallery */}
        <div>
          <div className="sf-plate mf-plate">
            {colour?.mockupUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={colour.mockupUrl} alt={`${product.name}, ${colour.name}`} fetchPriority="high" />
            ) : (
              <span className="sf-plate-empty">No image</span>
            )}
          </div>

          {colour?.backMockupUrl && (
            <div className="sf-plate mf-plate mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={colour.backMockupUrl} alt={`${product.name}, ${colour.name}, back`} loading="lazy" />
            </div>
          )}

          {product.colours.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {product.colours.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className="sf-plate sf-thumb mf-plate"
                  onClick={() => setColourCode(c.code)}
                  aria-label={c.name}
                  aria-pressed={c.code === colourCode}
                >
                  {c.mockupUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.mockupUrl} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true" className="absolute inset-0" style={{ background: c.hex }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="mf-display text-[28px] leading-tight md:text-[32px]">{product.name}</h1>
          <p className="mt-2 text-lg tabular-nums">{formatPrice(product.retailPriceCents)}</p>

          {product.description && <p className="mf-dim mt-4 text-sm leading-relaxed">{product.description}</p>}

          {/* Colour swatches */}
          {product.colours.length > 0 && (
            <div className="mt-8">
              <span className="mf-label mf-dim">Colour: {colour?.name}</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {product.colours.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    className="sf-swatch-btn"
                    onClick={() => setColourCode(c.code)}
                    aria-pressed={c.code === colourCode}
                    aria-label={c.name}
                    title={c.name}
                  >
                    <span aria-hidden="true" className="sf-swatch" style={{ background: c.hex }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <span className="mf-label mf-dim">Size</span>
                {product.sizeGuide && (
                  <button
                    type="button"
                    className="mf-ulink inline-flex min-h-11 cursor-pointer items-center"
                    onClick={() => setGuideOpen((v) => !v)}
                    aria-expanded={guideOpen}
                  >
                    {guideOpen ? 'Hide size guide' : 'Size guide'}
                  </button>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="mf-pill sf-opt"
                    onClick={() => setSize(s)}
                    aria-pressed={s === size}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {guideOpen && product.sizeGuide && (
                <div className="mt-4 overflow-x-auto">
                  <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                      <tr>
                        <th className="hairline p-2 text-left text-xs font-semibold">Size</th>
                        {product.sizeGuide.columns.map((col) => (
                          <th key={col} className="hairline p-2 text-left text-xs font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {product.sizeGuide.rows.map((row) => (
                        <tr key={row.size}>
                          <td className="hairline p-2 text-xs">{row.size}</td>
                          {row.values.map((v, i) => (
                            <td key={i} className="hairline p-2 text-xs">
                              {v}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mf-dim mt-2 text-xs">Measurements in {product.sizeGuide.unit}.</p>
                </div>
              )}
            </div>
          )}

          {/* Quantity */}
          <div className="mt-8">
            <span className="mf-label mf-dim">Quantity</span>
            <div className="sf-stepper mt-2 flex w-fit">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <output aria-live="polite">{qty}</output>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                disabled={qty >= 20}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to cart (desktop) */}
          <button
            type="button"
            className="mf-pill sf-cta mt-10 hidden w-full md:flex"
            onClick={handleAdd}
            disabled={!canAdd}
          >
            {addLabel}
          </button>

          {/* Announces the add to screen readers; the header count updates with it. */}
          <p role="status" aria-live="polite" className="sr-only">
            {added ? `Added to cart. ${count} ${count === 1 ? 'item' : 'items'} in your cart.` : ''}
          </p>

          {specs.length > 0 && (
            <dl className="sf-specs mt-10">
              {specs.map((s) => (
                <div key={s.label} className="sf-spec">
                  <dt>{s.label}</dt>
                  <dd>
                    {s.value}
                    {s.note && <span className="sf-spec-note">{s.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {product.garment.certifications.length > 0 && (
            <p className="mf-dim mt-4 text-xs">{product.garment.certifications.join(' · ')}</p>
          )}

          <p className="mf-label mf-dim mt-6">Printed to order in Barcelona · ships in 8 working days</p>
        </div>
      </div>

      {/* Phone add-to-cart bar */}
      <div className="sf-bar md:hidden">
        <span className="text-[15px] font-semibold tabular-nums">{formatPrice(product.retailPriceCents)}</span>
        <button type="button" className="mf-pill sf-cta flex-1" onClick={handleAdd} disabled={!canAdd}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}
