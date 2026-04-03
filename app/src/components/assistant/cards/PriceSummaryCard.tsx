'use client';

interface PriceSummaryCardProps {
  basePrice: number;
  placementPrice: number;
  colorPrice: number;
  total: number;
  breakdown: string[];
}

export function PriceSummaryCard({ basePrice, placementPrice, colorPrice, total, breakdown }: PriceSummaryCardProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="w-full rounded-xl border border-white/10 bg-zinc-800/50 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          role="img"
          aria-label="Price"
        >
          <title>Price</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-white">Order Summary</h3>
      </div>

      {/* Line items */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Base product</span>
          <span className="text-zinc-300">{formatCurrency(basePrice)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Print placement</span>
          <span className="text-zinc-300">{formatCurrency(placementPrice)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Color printing</span>
          <span className="text-zinc-300">{formatCurrency(colorPrice)}</span>
        </div>
      </div>

      {/* Breakdown notes */}
      {breakdown.length > 0 && (
        <div className="mb-4 pt-3 border-t border-white/10">
          <ul className="space-y-1">
            {breakdown.map((item, index) => (
              <li key={index} className="text-xs text-zinc-500 flex items-start gap-2">
                <span className="text-zinc-600">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-white/10 my-3" />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-white">Total</span>
        <span className="text-lg font-bold text-white">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
