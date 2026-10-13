'use client';

import type { CartLine } from '@/lib/storefront/cart';
import { formatCents } from '@/lib/storefront/present';
import { Hairline } from '@/components/ui/Hairline';

export function CartLineRow({
  line,
  onQtyChange,
  onRemove,
}: {
  line: CartLine;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-4 py-5">
        <div className="sf-plate mf-plate w-[72px] shrink-0">
          {line.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={line.imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="sf-plate-empty text-[10px]">No image</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{line.name}</div>
          <div className="mf-dim mt-1 text-xs">
            {line.colourName} · {line.size}
          </div>

          <div className="sf-stepper mt-3">
            <button type="button" onClick={() => onQtyChange(line.qty - 1)} aria-label={`Decrease quantity of ${line.name}`}>
              −
            </button>
            <output aria-live="polite">{line.qty}</output>
            <button type="button" onClick={() => onQtyChange(line.qty + 1)} aria-label={`Increase quantity of ${line.name}`}>
              +
            </button>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          <span className="text-sm tabular-nums">{formatCents(line.priceCents * line.qty)}</span>
          <button type="button" className="mf-ulink inline-flex min-h-11 cursor-pointer items-center hover:opacity-80" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      <Hairline />
    </div>
  );
}
