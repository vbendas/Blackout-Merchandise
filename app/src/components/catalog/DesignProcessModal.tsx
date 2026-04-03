'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProductListItem } from '@/lib/ProductListContext';

interface DesignProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  items: ProductListItem[];
  source: 'individual' | 'showroom';
}

/**
 * Design Process Modal
 * Shows summary of selected products before transitioning to Francisca's merch studio
 */
export function DesignProcessModal({ isOpen, onClose, onConfirm, onEdit, items, source }: DesignProcessModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-w-lg bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Ready to Design</h2>
                    <p className="text-sm text-zinc-400">
                      {items.length} product{items.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Showroom note */}
                {source === 'showroom' && (
                  <div className="mb-4 p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                    <p className="text-sm text-violet-300">
                      Same design will be applied across all {items.length} products
                    </p>
                  </div>
                )}

                {/* Product List - Detailed */}
                <div className="space-y-3 max-h-80 overflow-y-auto mb-6">
                  {items.map((item, index) => (
                    <div key={item.productId} className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                      {/* Product Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-400">
                            {index + 1}
                          </div>
                          <h3 className="font-semibold text-white">{item.productName}</h3>
                        </div>
                        {item.category && (
                          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">{item.category}</span>
                        )}
                      </div>

                      {/* Colors */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-500 min-w-20">Colors:</span>
                          <div className="flex flex-wrap gap-2">
                            {item.selectedColors.map((color) => (
                              <div key={color.name} className="flex items-center gap-1.5">
                                <div
                                  className="w-4 h-4 rounded-full border border-zinc-600"
                                  style={{ backgroundColor: color.hex }}
                                />
                                <span className="text-zinc-300">{color.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Sizes */}
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-500 min-w-20">Sizes:</span>
                          <span className="text-zinc-300">{item.selectedSizes.join(', ')}</span>
                        </div>

                        {/* Print Areas */}
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-500 min-w-20">Print Areas:</span>
                          <span className="text-zinc-300">
                            {item.selectedPrintAreas.map((a) => a.replace('_', ' ')).join(', ')}
                          </span>
                        </div>

                        {/* Pricing */}
                        <div className="pt-2 mt-2 border-t border-zinc-800/50 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <span className="text-zinc-500">Base Cost:</span>
                              <span className="text-zinc-300 ml-1">€{(item.baseCost / 100).toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Retail:</span>
                              <span className="text-zinc-300 ml-1">€{(item.suggestedRetail / 100).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="text-xs">
                            <span className="text-emerald-400 font-semibold">
                              +€{((item.suggestedRetail - item.baseCost) / 100).toFixed(2)}
                            </span>
                            <span className="text-zinc-500 ml-1">profit/unit</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div className="mb-6">
                  <p className="text-sm text-zinc-400 text-center">
                    Francisca will guide you through creating designs for each product
                    {source === 'showroom' && ' with the same design applied across all items'}.
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button
                    onClick={onConfirm}
                    className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-medium"
                    size="lg"
                  >
                    Continue to MerchStudio
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={onEdit}
                      variant="outline"
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      Edit Selection
                    </Button>
                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
