'use client';

import type { CartLine } from '@/lib/storefront/cart';
import { Hairline } from '@/components/ui/Hairline';

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

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
        <div className="hairline h-20 w-20 shrink-0 overflow-hidden">
          {line.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={line.imageUrl} alt={`${line.name} — ${line.colourName}`} className="h-full w-full object-cover" />
          ) : (
            <div className="mf-dim flex h-full w-full items-center justify-center text-[10px]">No image</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{line.name}</div>
          <div className="mf-dim mt-1 text-xs">
            {line.colourName} · {line.size}
          </div>

          <div className="hairline mt-3 inline-flex items-center">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center text-sm"
              onClick={() => onQtyChange(line.qty - 1)}
              aria-label={`Decrease quantity of ${line.name}`}
            >
              −
            </button>
            <span className="w-8 text-center text-xs" aria-live="polite">
              {line.qty}
            </span>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center text-sm"
              onClick={() => onQtyChange(line.qty + 1)}
              aria-label={`Increase quantity of ${line.name}`}
            >
              +
            </button>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          <span className="text-sm">{formatCents(line.priceCents * line.qty)}</span>
          <button type="button" className="label mf-dim min-h-11 hover:opacity-80" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      <Hairline />
    </div>
  );
}
