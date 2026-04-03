'use client';

import { ArrowRight, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../ui/button';

export interface ProductCardInlineProps {
  productId: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl: string;
  baseCost?: number; // In cents
  suggestedRetail?: number; // In cents
  colors?: Array<{ name: string; hex: string }>;
  specs?: Record<string, string>;
  onSelectProduct?: (productId: string) => void;
  onOpenDetail?: (productId: string) => void;
}

/**
 * Inline product card displayed in chat messages
 * Compact card showing product info with action buttons
 * Part of Phase 3.5.2
 */
export function ProductCardInline({
  productId,
  name,
  brand,
  category,
  imageUrl,
  baseCost,
  suggestedRetail,
  colors,
  specs,
  onSelectProduct,
  onOpenDetail,
}: ProductCardInlineProps) {
  const formatPrice = (cents?: number) => {
    if (!cents) return 'N/A';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden hover:border-zinc-700 transition-colors">
      {/* Image Section */}
      <div className="relative h-48 w-full bg-zinc-900">
        <Image src={imageUrl} alt={name} fill className="object-cover" priority={false} />
        {category && (
          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-white text-xs font-medium px-2 py-1 rounded">
            {category}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div>
          {brand && <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{brand}</p>}
          <h3 className="text-sm font-semibold text-white line-clamp-2">{name}</h3>
        </div>

        {/* Pricing */}
        {(baseCost || suggestedRetail) && (
          <div className="flex items-center gap-3 text-xs">
            {baseCost && (
              <div>
                <p className="text-zinc-500">Cost</p>
                <p className="font-mono text-zinc-300">{formatPrice(baseCost)}</p>
              </div>
            )}
            {suggestedRetail && (
              <div>
                <p className="text-zinc-500">Retail</p>
                <p className="font-mono font-semibold text-white">{formatPrice(suggestedRetail)}</p>
              </div>
            )}
          </div>
        )}

        {/* Colors */}
        {colors && colors.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400">Colors</p>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <div key={color.name} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-zinc-600 flex-shrink-0"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                  <span className="text-xs text-zinc-400">{color.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Specs */}
        {specs && Object.keys(specs).length > 0 && (
          <div className="space-y-1 pt-2 border-t border-zinc-800">
            {Object.entries(specs)
              .slice(0, 2)
              .map(([key, value]) => (
                <div key={key} className="text-xs">
                  <span className="text-zinc-500">{key}:</span>
                  <span className="text-zinc-300 ml-1">{value}</span>
                </div>
              ))}
            {Object.keys(specs).length > 2 && (
              <p className="text-xs text-zinc-500 italic">+{Object.keys(specs).length - 2} more specs</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSelectProduct?.(productId)} size="sm" className="flex-1 gap-1.5" variant="default">
            <ShoppingBag className="w-3.5 h-3.5" />
            Select
          </Button>
          <Button onClick={() => onOpenDetail?.(productId)} size="sm" variant="outline" className="flex-1 gap-1.5">
            Details
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
