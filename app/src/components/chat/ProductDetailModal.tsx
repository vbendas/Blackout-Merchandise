'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Package, Palette, Ruler, ShoppingBag, Sparkles, X, Weight } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ProductDetailModalProps {
  product: {
    id: string;
    name: string;
    description?: string;
    brand?: string;
    material?: string;
    weightG?: number;
    baseCostEur: number;
    suggestedRetailEur?: number;
    imageUrl?: string;
    status?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToQuote?: (productId: string) => void;
  onStartDesign?: (productId: string) => void;
}

/**
 * Product detail modal for chat product cards
 * Opens when clicking a product card to show comprehensive info
 */
export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToQuote,
  onStartDesign,
}: ProductDetailModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatPrice = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return `€${amount.toFixed(2)}`;
  };

  const isActive = product?.status?.toLowerCase() === 'active';

  return (
    <AnimatePresence>
      {isOpen && product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Product Image */}
            <div className="relative w-full aspect-[4/3] bg-zinc-950">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover rounded-t-xl"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-zinc-700" />
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Status Badge */}
              {product.status && (
                <div
                  className={cn(
                    'absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm',
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                  )}
                >
                  {isActive ? 'Active' : product.status}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Product Name */}
              <div>
                <h2 className="text-lg font-bold text-white">{product.name}</h2>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {product.brand && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                    <Package className="w-3 h-3" />
                    {product.brand}
                  </span>
                )}
                {product.material && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                    <Palette className="w-3 h-3" />
                    {product.material}
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-zinc-400 leading-relaxed">{product.description}</p>
              )}

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Weight */}
                {product.weightG !== undefined && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800">
                      <Weight className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Weight</p>
                      <p className="text-sm font-medium text-white">{product.weightG}g</p>
                    </div>
                  </div>
                )}

                {/* Material */}
                {product.material && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800">
                      <Ruler className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Material</p>
                      <p className="text-sm font-medium text-white">{product.material}</p>
                    </div>
                  </div>
                )}

                {/* Base Cost */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800">
                    <Package className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Base Cost</p>
                    <p className="text-sm font-medium text-white">{formatPrice(product.baseCostEur)}</p>
                  </div>
                </div>

                {/* Suggested Retail */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800">
                    <ShoppingBag className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Suggested Retail</p>
                    <p className="text-sm font-medium text-emerald-400">
                      {formatPrice(product.suggestedRetailEur)}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => onAddToQuote?.(product.id)}
                  className="flex-1 gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                  size="lg"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Add to Quote
                </Button>
                <Button
                  onClick={() => onStartDesign?.(product.id)}
                  className="flex-1 gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                  size="lg"
                  variant="secondary"
                >
                  <Sparkles className="w-4 h-4" />
                  Start Design
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
