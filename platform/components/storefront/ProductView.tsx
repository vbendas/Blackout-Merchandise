'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PublicProductDetail } from '@/lib/storefront/read-model';
import { useCart } from '@/components/storefront/CartProvider';
import { Hairline } from '@/components/ui/Hairline';

function formatCents(cents: number | null): string {
  return cents == null ? '—' : `€${(cents / 100).toFixed(2)}`;
}

export function ProductView({ slug, product }: { slug: string; product: PublicProductDetail }) {
  const { add } = useCart();
  const [colourCode, setColourCode] = useState(product.colours[0]?.code ?? '');
  const [size, setSize] = useState(product.sizes[0] ?? '');
  const [qty, setQty] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const colour = product.colours.find((c) => c.code === colourCode) ?? product.colours[0];

  const specs = useMemo(
    () =>
      [
        { label: 'Garment', value: product.blank.supplierName ?? product.blank.name },
        { label: 'Composition', value: product.blank.composition },
        { label: 'Weight', value: product.blank.weightGsm ? `${product.blank.weightGsm} gsm` : null },
        { label: 'Print', value: product.printServiceName },
        product.blank.fit ? { label: 'Fit', value: product.blank.fit } : null,
      ].filter((s): s is { label: string; value: string } => Boolean(s?.value)),
    [product],
  );

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
    setTimeout(() => setAdded(false), 1600);
  }

  const canAdd = Boolean(colour) && Boolean(size) && product.retailPriceCents != null;

  return (
    <div className="pb-28 md:pb-0" style={{ paddingInline: 'var(--gutter)' }}>
      <Link href={`/${slug}`} className="label mf-dim mb-6 inline-block hover:opacity-80">
        ← Back to shop
      </Link>
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
        {/* Gallery */}
        <div>
          <div className="hairline relative aspect-square w-full overflow-hidden">
            <div className="absolute inset-[9%]">
              {colour?.mockupUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={colour.mockupUrl}
                  alt={`${product.name} — ${colour.name}`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="mf-dim flex h-full w-full items-center justify-center text-xs">No image</div>
              )}
            </div>
          </div>

          {colour?.backMockupUrl && (
            <div className="hairline relative mt-4 aspect-square w-full overflow-hidden">
              <div className="absolute inset-[9%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={colour.backMockupUrl}
                  alt={`${product.name} — ${colour.name}, back`}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          )}

          {product.colours.length > 1 && (
            <div className="mt-4 flex gap-3">
              {product.colours.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className="hairline flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden focus:outline-none"
                  style={{ outline: c.code === colourCode ? '2px solid var(--accent)' : undefined, outlineOffset: '2px' }}
                  onClick={() => setColourCode(c.code)}
                  aria-label={c.name}
                  aria-pressed={c.code === colourCode}
                >
                  {c.mockupUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.mockupUrl} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden className="h-6 w-6 rounded-full" style={{ background: c.hex }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="font-display text-2xl">{product.name}</h1>
          <p className="mt-2 text-lg">{formatCents(product.retailPriceCents)}</p>

          {product.description && <p className="mf-dim mt-4 text-sm leading-relaxed">{product.description}</p>}

          {/* Colour swatches */}
          {product.colours.length > 0 && (
            <div className="mt-8">
              <span className="label mf-dim">Colour — {colour?.name}</span>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.colours.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    className="flex min-h-11 items-center gap-2 rounded-full px-1 focus:outline-none"
                    onClick={() => setColourCode(c.code)}
                    aria-pressed={c.code === colourCode}
                    aria-label={c.name}
                  >
                    <span
                      aria-hidden
                      className="h-6 w-6 rounded-full"
                      style={{
                        background: c.hex,
                        border: '1px solid color-mix(in srgb, var(--signal) 30%, transparent)',
                        outline: c.code === colourCode ? '2px solid var(--accent)' : undefined,
                        outlineOffset: '2px',
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <span className="label mf-dim">Size</span>
                {product.sizeGuide && (
                  <button type="button" className="label hover:opacity-80" onClick={() => setGuideOpen((v) => !v)}>
                    {guideOpen ? 'Hide guide' : 'Size guide'}
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="hairline label flex min-h-11 min-w-11 items-center justify-center px-3"
                    style={
                      s === size
                        ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                        : undefined
                    }
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
                        <th className="hairline p-2 text-left text-xs">Size</th>
                        {product.sizeGuide.columns.map((col) => (
                          <th key={col} className="hairline p-2 text-left text-xs">
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
            <span className="label mf-dim">Quantity</span>
            <div className="hairline mt-3 inline-flex items-center">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center text-lg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 text-center text-sm" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center text-lg"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to cart (desktop) */}
          <button
            type="button"
            className="mt-10 hidden min-h-11 w-full items-center justify-center rounded-full py-3 text-sm font-bold md:flex"
            style={{ background: 'var(--accent)', color: '#fff', opacity: canAdd ? 1 : 0.5 }}
            onClick={handleAdd}
            disabled={!canAdd}
          >
            {added ? 'Added' : 'Add to cart'}
          </button>

          {specs.length > 0 && (
            <dl className="mt-10 space-y-2">
              {specs.map((s) => (
                <div key={s.label} className="flex justify-between text-sm">
                  <dt className="mf-dim">{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {product.blank.certifications.length > 0 && (
            <p className="mf-dim mt-4 text-xs">{product.blank.certifications.join(' · ')}</p>
          )}

          <p className="label mf-dim mt-6">Printed to order in Barcelona · ships in 8 working days</p>
        </div>
      </div>

      {/* Sticky mobile add-to-cart bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 md:hidden" style={{ background: 'var(--paper)' }}>
        <Hairline />
        <div className="flex items-center justify-between gap-4 p-4">
          <span className="text-sm font-bold">{formatCents(product.retailPriceCents)}</span>
          <button
            type="button"
            className="flex min-h-11 flex-1 items-center justify-center rounded-full py-3 text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#fff', opacity: canAdd ? 1 : 0.5 }}
            onClick={handleAdd}
            disabled={!canAdd}
          >
            {added ? 'Added' : 'Add to cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
