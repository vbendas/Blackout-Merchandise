'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Sparkles, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DesignProcessModal } from '@/components/catalog/DesignProcessModal';
import { Button } from '@/components/ui/button';
import { useDesignWorkflow } from '@/lib/DesignWorkflowContext';
import { useProductList } from '@/lib/ProductListContext';

interface ProductListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDesign: () => void;
}

/**
 * Product List Panel (formerly QuoteCart)
 * Shows all products added to the customer's selection
 * Allows bulk design process initiation
 */
export function ProductListPanel({ isOpen, onClose, onStartDesign }: ProductListPanelProps) {
  const { items, clearList, removeFromList } = useProductList();
  const { startDesignProcess } = useDesignWorkflow();
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleStartDesign = () => {
    // Determine source based on items
    // If all items have source 'showroom', it's a showroom workflow
    const hasShowroomItems = items.some((item) => item.source === 'showroom');
    const hasIndividualItems = items.some((item) => item.source === 'individual');
    const source: 'individual' | 'showroom' = hasShowroomItems && !hasIndividualItems ? 'showroom' : 'individual';

    startDesignProcess(items, source);
    setIsDesignModalOpen(false);
    onClose();
    onStartDesign();
  };

  // Helper to format print areas
  const formatPrintAreas = (areas: string[]) => {
    return areas.map((area) => area.replace('_', ' ')).join(', ');
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-[99]"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed left-16 top-0 h-dvh w-96 bg-zinc-950 border-r border-zinc-800 z-[100] flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">My Selection</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-white transition-colors"
                  aria-label="Close product list"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
                    <ShoppingBag className="w-12 h-12 opacity-30 mb-3" />
                    <p className="text-sm">Your selection is empty</p>
                    <p className="text-xs mt-2">Browse the catalog and add products to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <motion.div
                        key={item.productId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-zinc-900 rounded-lg p-4 border border-zinc-800"
                      >
                        {/* Product Info */}
                        <div className="mb-3">
                          <h3 className="font-medium text-white text-sm">{item.productName}</h3>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {item.selectedColors.map((color) => (
                              <div key={color.name} className="flex items-center gap-1">
                                <div
                                  className="w-4 h-4 rounded-full border border-zinc-600"
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                />
                                <span className="text-xs text-zinc-400">{color.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Sizes & Print Areas */}
                        <div className="space-y-2 text-xs mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">Sizes:</span>
                            <span className="text-zinc-300">{item.selectedSizes.join(', ')}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">Print:</span>
                            <span className="text-zinc-300">{formatPrintAreas(item.selectedPrintAreas)}</span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeFromList(item.productId)}
                          className="flex items-center gap-1 text-zinc-500 hover:text-red-400 transition-colors text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t border-zinc-800 bg-zinc-900/50 px-4 py-4 space-y-4">
                  {/* Item Count */}
                  <div className="pb-4 border-b border-zinc-800">
                    <span className="text-sm text-zinc-400">
                      {items.length} product{items.length !== 1 ? 's' : ''} in your selection
                    </span>
                  </div>

                  {/* Start Design Process Button */}
                  <Button
                    onClick={() => setIsDesignModalOpen(true)}
                    className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-medium"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Design Process
                  </Button>

                  <Button
                    onClick={() => {
                      clearList();
                      onClose();
                    }}
                    variant="outline"
                    className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Selection
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Design Process Modal */}
      <DesignProcessModal
        isOpen={isDesignModalOpen}
        onClose={() => setIsDesignModalOpen(false)}
        onConfirm={handleStartDesign}
        onEdit={() => {
          // Close modal but keep panel open for editing
          setIsDesignModalOpen(false);
          // ProductListPanel stays open (isOpen still true)
        }}
        items={items}
        source={
          items.some((i) => i.source === 'showroom') && !items.some((i) => i.source === 'individual')
            ? 'showroom'
            : 'individual'
        }
      />
    </>
  );
}
