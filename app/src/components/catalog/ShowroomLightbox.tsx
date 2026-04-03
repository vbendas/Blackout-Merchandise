'use client';

import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Info, Layers, ShoppingBag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ProductAddedToast } from '@/components/animations/ProductAddedToast';
import { Button } from '@/components/ui/button';
import { useProductList } from '@/lib/ProductListContext';
import { useShowroom } from '@/lib/ShowroomContext';
import { cn } from '@/lib/utils';
import { MobileImageViewer } from './MobileImageViewer';
import { RetailPriceWarningModal } from './RetailPriceWarningModal';

/**
 * Showroom Lightbox - Magazine-style Product Slideshow
 * Allows bulk selection of multiple products with different configurations
 */

interface ShowroomLightboxProps {
  onStartDesign?: () => void;
}

export function ShowroomLightbox({ onStartDesign }: ShowroomLightboxProps) {
  const {
    isOpen,
    products,
    currentIndex,
    closeShowroom,
    nextProduct,
    prevProduct,
    getCurrentProduct,
    getPrintAreasForProduct,
  } = useShowroom();

  const { items, addToList } = useProductList();

  const currentProduct = getCurrentProduct();
  const [selectedColors, setSelectedColors] = useState<{ name: string; hex: string }[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedPrintAreas, setSelectedPrintAreas] = useState<string[]>([]);
  const [draftConfigs, setDraftConfigs] = useState<
    Map<string, { colors: { name: string; hex: string }[]; sizes: string[]; printAreas: string[] }>
  >(new Map());
  const [customRetailPrices, setCustomRetailPrices] = useState<Map<string, number>>(new Map());
  const [showRetailTooltip, setShowRetailTooltip] = useState(false);
  const [showPriceWarning, setShowPriceWarning] = useState(false);

  const [isMobileViewerOpen, setIsMobileViewerOpen] = useState(false);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const mobileImageRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [isScrolledTop, setIsScrolledTop] = useState(true);
  const [isScrolledBottom, setIsScrolledBottom] = useState(false);

  // Save current config to draft when navigating away
  const saveCurrentDraft = () => {
    if (currentProduct) {
      setDraftConfigs((prev) =>
        new Map(prev).set(currentProduct.id, {
          colors: selectedColors,
          sizes: selectedSizes,
          printAreas: selectedPrintAreas,
        })
      );
    }
  };

  // Reset selections when product changes
  useEffect(() => {
    if (currentProduct) {
      // Save previous product's draft before switching
      saveCurrentDraft();

      // Check priority: draft config > global list items > defaults
      const draft = draftConfigs.get(currentProduct.id);
      const existing = items.find((p) => p.productId === currentProduct.id);

      if (draft) {
        setSelectedColors(draft.colors);
        setSelectedSizes(draft.sizes);
        setSelectedPrintAreas(draft.printAreas);
      } else if (existing) {
        setSelectedColors(existing.selectedColors);
        setSelectedSizes(existing.selectedSizes);
        setSelectedPrintAreas(existing.selectedPrintAreas);
      } else {
        // Initialize with defaults: Black color (or first), all sizes, front+back
        const blackColor = currentProduct.colors?.find((c) => c.name.toLowerCase() === 'black');
        setSelectedColors(blackColor ? [blackColor] : currentProduct.colors?.[0] ? [currentProduct.colors[0]] : []);

        const standardSizes = ['S', 'M', 'L', 'XL', 'XXL'];
        const availableSizes = currentProduct.sizes?.map((s) => s.size) || [];
        setSelectedSizes(standardSizes.filter((size) => availableSizes.includes(size)));

        setSelectedPrintAreas(['front', 'back']);
      }
    }
  }, [currentProduct, items]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case 'Escape':
          closeShowroom();
          break;
        case 'ArrowRight':
          nextProduct();
          break;
        case 'ArrowLeft':
          prevProduct();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeShowroom, nextProduct, prevProduct]);

  const handleSizeToggle = (size: string) => {
    setSelectedSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  };

  const handleColorToggle = (color: { name: string; hex: string }) => {
    setSelectedColors((prev) =>
      prev.find((c) => c.name === color.name) ? prev.filter((c) => c.name !== color.name) : [...prev, color]
    );
  };

  const handlePrintAreaToggle = (areaId: string) => {
    setSelectedPrintAreas((prev) => (prev.includes(areaId) ? prev.filter((a) => a !== areaId) : [...prev, areaId]));
  };

  // Calculate base cost with sleeve surcharges
  const calculateBaseCost = (product: typeof currentProduct) => {
    if (!product) return 0;
    let cost = product.baseCost || 500;
    const sleeveCount = selectedPrintAreas.filter((area) => area === 'left_sleeve' || area === 'right_sleeve').length;
    cost += sleeveCount * 150; // €1.50 per sleeve
    return cost;
  };

  // Check if retail price is below base cost
  useEffect(() => {
    if (currentProduct) {
      const baseCost = calculateBaseCost(currentProduct);
      const retailPrice = customRetailPrices.get(currentProduct.id) || currentProduct.suggestedRetail || 2499;
      if (retailPrice < baseCost) {
        setShowPriceWarning(true);
      }
    }
  }, [selectedPrintAreas, currentProduct, customRetailPrices]);

  const handleAddToSelection = () => {
    if (!currentProduct || selectedColors.length === 0 || selectedSizes.length === 0) return;

    // Check if retail price is below base cost
    const baseCost = calculateBaseCost(currentProduct);
    const retailPrice = customRetailPrices.get(currentProduct.id) || currentProduct.suggestedRetail || 2499;
    if (retailPrice < baseCost) {
      setShowPriceWarning(true);
      return;
    }

    // Add directly to the global product list
    addToList({
      productId: currentProduct.id,
      productName: currentProduct.name,
      category: currentProduct.category,
      selectedColors,
      selectedSizes,
      selectedPrintAreas,
      baseCost: baseCost,
      suggestedRetail: retailPrice,
      addedAt: new Date(),
      source: 'showroom',
    });

    // Show toast notification
    setShowAddedToast(true);
  };

  const isCurrentProductSelected = items.some((p) => p.productId === currentProduct?.id);

  const printAreas = currentProduct ? getPrintAreasForProduct(currentProduct.category) : [];

  if (!isOpen || !currentProduct) return null;

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
              className="fixed inset-0 md:left-16 z-[70] bg-zinc-950"
              style={{ bottom: '104px' }}
              onClick={closeShowroom}
            />

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 md:left-16 z-[70] flex items-center justify-center p-1 md:p-3"
              style={{ bottom: '114px' }}
              onClick={closeShowroom}
            >
              <div
                className="relative w-[90%] h-full max-h-[80vh] bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col mt-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Layers className="w-5 h-5" />
                      <span className="text-sm font-medium">Showroom Mode</span>
                    </div>
                    <div className="h-4 w-px bg-zinc-700" />
                    <div className="text-sm text-zinc-500">
                      {currentIndex + 1} <span className="text-zinc-600">/</span> {products.length}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={closeShowroom}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
                  {/* Top (Mobile) / Left (Desktop): Product Display */}
                  <div className="flex-1 flex flex-col md:flex-row min-h-0">
                    {/* Image Area */}
                    <div className="flex-1 h-[35vh] md:h-auto bg-zinc-900/50 relative flex items-center justify-center p-4 md:p-8 flex-shrink-0">
                      {/* Navigation Arrows */}
                      <button
                        onClick={prevProduct}
                        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors z-10"
                      >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                      </button>

                      <button
                        onClick={nextProduct}
                        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors z-10"
                      >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                      </button>

                      {/* Product Image */}
                      <div
                        ref={mobileImageRef}
                        className="relative max-w-lg max-h-full cursor-pointer md:cursor-default"
                        onClick={() => {
                          if (currentProduct.imageUrls?.[0]) {
                            setIsMobileViewerOpen(true);
                          }
                        }}
                      >
                        {currentProduct.imageUrls?.[0] ? (
                          <>
                            <img
                              src={currentProduct.imageUrls[0]}
                              alt={currentProduct.name}
                              className="max-w-full max-h-[30vh] md:max-h-[50vh] object-contain rounded-lg"
                            />
                            {/* Mobile tap hint */}
                            <div className="md:hidden absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white/80 pointer-events-none whitespace-nowrap">
                              Tap to expand
                            </div>
                          </>
                        ) : (
                          <div className="w-48 h-48 md:w-80 md:h-80 bg-zinc-800 rounded-lg flex items-center justify-center">
                            <Icon icon="lucide:image" className="w-12 h-12 md:w-16 md:h-16 text-zinc-600" />
                          </div>
                        )}

                        {/* Selected Indicator */}
                        <AnimatePresence>
                          {isCurrentProductSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="absolute top-2 right-2 md:top-4 md:right-4 w-8 h-8 md:w-10 md:h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg pointer-events-none"
                            >
                              <Check className="w-5 h-5 md:w-6 md:h-6 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Bottom (Mobile) / Right (Desktop): Product Details - Scrollable */}
                    <div className="relative w-full md:w-96 min-h-0 bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-800">
                      <div
                        ref={detailsRef}
                        className="h-full overflow-y-auto overscroll-y-contain p-6 scrollbar-hide-scrollbar"
                        onScroll={(e) => {
                          const target = e.target as HTMLDivElement;
                          const { scrollTop, scrollHeight, clientHeight } = target;
                          const isTop = scrollTop <= 5;
                          const isBottom = scrollTop + clientHeight >= scrollHeight - 10;

                          console.log('ShowroomLightbox scroll:', {
                            scrollTop,
                            scrollHeight,
                            clientHeight,
                            isTop,
                            isBottom,
                          });

                          setIsScrolledTop(isTop);
                          setIsScrolledBottom(isBottom);
                        }}
                      >
                        <div className="space-y-6 pb-24">
                          {/* Product Info */}
                          <div>
                            {currentProduct.brand && (
                              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                                {currentProduct.brand}
                              </p>
                            )}
                            <h2 className="text-2xl font-semibold text-white mb-2">{currentProduct.name}</h2>
                            {currentProduct.category && (
                              <span className="inline-block px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">
                                {currentProduct.category}
                              </span>
                            )}
                          </div>

                          {/* Pricing */}
                          <div className="grid grid-cols-3 gap-3 py-4 border-y border-zinc-800">
                            <div>
                              <p className="text-xs text-zinc-500 mb-2">Base Cost</p>
                              <p className="text-base font-mono font-semibold text-white">
                                €{(calculateBaseCost(currentProduct) / 100).toFixed(2)}
                              </p>
                              {selectedPrintAreas.some((area) => area === 'left_sleeve' || area === 'right_sleeve') && (
                                <p className="text-xs text-amber-400 mt-1">
                                  +€
                                  {(
                                    selectedPrintAreas.filter(
                                      (area) => area === 'left_sleeve' || area === 'right_sleeve'
                                    ).length * 1.5
                                  ).toFixed(2)}
                                </p>
                              )}
                            </div>
                            <div className="-ml-3">
                              <div
                                className="flex items-center gap-1 cursor-help mb-2"
                                onMouseEnter={() => setShowRetailTooltip(true)}
                                onMouseLeave={() => setShowRetailTooltip(false)}
                              >
                                <p className="text-xs text-zinc-500">Retail Price</p>
                                <Info className="w-3 h-3 text-zinc-500" />
                              </div>
                              {showRetailTooltip && (
                                <div className="absolute z-10 bg-zinc-800 text-zinc-200 text-xs p-2 rounded-lg max-w-[200px] shadow-lg border border-zinc-700">
                                  Suggested price: €{((currentProduct.suggestedRetail || 2499) / 100).toFixed(2)}. You
                                  can edit it to set your own selling price. Delete the value and type your own.
                                </div>
                              )}
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-base">
                                  €
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  defaultValue={(
                                    (customRetailPrices.get(currentProduct.id) ||
                                      currentProduct.suggestedRetail ||
                                      2499) / 100
                                  ).toFixed(2)}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow empty or partial input while typing
                                    if (val === '' || val === '€') {
                                      return;
                                    }
                                    // Remove euro sign if present
                                    const cleanVal = val.replace('€', '').trim();
                                    // Allow partial decimal input
                                    if (cleanVal === '' || cleanVal === '.' || /^\d*\.?\d*$/.test(cleanVal)) {
                                      const numVal = parseFloat(cleanVal);
                                      if (!isNaN(numVal) && numVal * 100 >= calculateBaseCost(currentProduct)) {
                                        setCustomRetailPrices((prev) =>
                                          new Map(prev).set(currentProduct.id, Math.round(numVal * 100))
                                        );
                                      }
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Format on blur
                                    const currentPrice =
                                      customRetailPrices.get(currentProduct.id) ||
                                      currentProduct.suggestedRetail ||
                                      2499;
                                    e.target.value = (currentPrice / 100).toFixed(2);
                                  }}
                                  onFocus={(e) => {
                                    // Select all on focus for easy editing
                                    e.target.select();
                                  }}
                                  className="w-24 pl-6 pr-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-base font-mono font-semibold text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-2">Profit per Unit</p>
                              <p className="text-base font-mono font-semibold text-emerald-400">
                                €
                                {(
                                  ((customRetailPrices.get(currentProduct.id) ||
                                    currentProduct.suggestedRetail ||
                                    2499) -
                                    calculateBaseCost(currentProduct)) /
                                  100
                                ).toFixed(2)}
                              </p>
                              <p className="text-[10px] text-zinc-500 mt-1">
                                {(
                                  (((customRetailPrices.get(currentProduct.id) ||
                                    currentProduct.suggestedRetail ||
                                    2499) -
                                    calculateBaseCost(currentProduct)) /
                                    calculateBaseCost(currentProduct)) *
                                  100
                                ).toFixed(0)}
                                % margin
                              </p>
                            </div>
                          </div>

                          {/* Colors - Multi-select */}
                          {currentProduct.colors && currentProduct.colors.length > 0 && (
                            <div>
                              <p className="text-sm text-zinc-400 mb-3">
                                Colors <span className="text-zinc-600">(select multiple)</span>:{' '}
                                <span className="text-white">{selectedColors.map((c) => c.name).join(', ')}</span>
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {currentProduct.colors.map((color) => (
                                  <button
                                    key={color.name}
                                    onClick={() => handleColorToggle(color)}
                                    className={cn(
                                      'w-10 h-10 rounded-full border-2 transition-all hover:scale-110 relative',
                                      selectedColors.find((c) => c.name === color.name)
                                        ? 'border-white ring-2 ring-white/50'
                                        : 'border-zinc-700 hover:border-zinc-500'
                                    )}
                                    style={{ backgroundColor: color.hex }}
                                    title={color.name}
                                  >
                                    {selectedColors.find((c) => c.name === color.name) && (
                                      <span className="absolute inset-0 flex items-center justify-center">
                                        <span
                                          className={cn(
                                            'w-5 h-5 rounded-full flex items-center justify-center',
                                            color.hex.toLowerCase() === '#ffffff' ||
                                              color.hex.toLowerCase() === '#fff' ||
                                              color.name.toLowerCase() === 'white'
                                              ? 'bg-zinc-800'
                                              : 'bg-white/20'
                                          )}
                                        >
                                          <Check
                                            className={cn(
                                              'w-3 h-3',
                                              color.hex.toLowerCase() === '#ffffff' ||
                                                color.hex.toLowerCase() === '#fff' ||
                                                color.name.toLowerCase() === 'white'
                                                ? 'text-white'
                                                : 'text-white'
                                            )}
                                          />
                                        </span>
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sizes - Multi-select */}
                          {currentProduct.sizes && currentProduct.sizes.length > 0 && (
                            <div>
                              <p className="text-sm text-zinc-400 mb-3">
                                Sizes <span className="text-zinc-600">(select multiple)</span>
                              </p>
                              <div className="grid grid-cols-5 gap-2">
                                {currentProduct.sizes.map((size) => (
                                  <button
                                    key={size.size}
                                    onClick={() => handleSizeToggle(size.size)}
                                    className={cn(
                                      'py-2 px-3 rounded-lg border text-sm font-medium transition-all',
                                      selectedSizes.includes(size.size)
                                        ? 'bg-white text-zinc-950 border-white'
                                        : 'bg-transparent text-zinc-300 border-zinc-700 hover:border-zinc-500'
                                    )}
                                  >
                                    {size.size}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Print Areas */}
                          <div>
                            <p className="text-sm text-zinc-400 mb-3">Print Areas</p>
                            <div className="flex flex-wrap gap-2">
                              {printAreas.map((area) => (
                                <button
                                  key={area.id}
                                  onClick={() => handlePrintAreaToggle(area.id)}
                                  className={cn(
                                    'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                                    selectedPrintAreas.includes(area.id)
                                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                      : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500'
                                  )}
                                >
                                  {area.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Product Description */}
                          {(currentProduct.specs ||
                            (currentProduct.sustainabilityBadges &&
                              currentProduct.sustainabilityBadges.length > 0)) && (
                            <div className="space-y-4">
                              {/* Specs */}
                              {currentProduct.specs && Object.keys(currentProduct.specs).length > 0 && (
                                <div>
                                  <p className="text-xs text-zinc-500 mb-2">Specifications</p>
                                  <div className="bg-zinc-900/50 rounded-lg p-4 space-y-2 text-sm">
                                    {Object.entries(currentProduct.specs).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-zinc-500 capitalize">{key}</span>
                                        <span className="text-zinc-200">{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Sustainability */}
                              {currentProduct.sustainabilityBadges &&
                                currentProduct.sustainabilityBadges.length > 0 && (
                                  <div>
                                    <p className="text-xs text-zinc-500 mb-2">Sustainability</p>
                                    <div className="flex flex-wrap gap-2">
                                      {currentProduct.sustainabilityBadges.map((badge: string) => (
                                        <span
                                          key={badge}
                                          className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs text-emerald-400"
                                        >
                                          {badge}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="space-y-3 pt-4">
                            <Button
                              onClick={handleAddToSelection}
                              disabled={selectedColors.length === 0 || selectedSizes.length === 0}
                              className={cn(
                                'w-full font-medium',
                                isCurrentProductSelected
                                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                  : 'bg-white text-zinc-950 hover:bg-zinc-100'
                              )}
                              size="lg"
                            >
                              {isCurrentProductSelected ? (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Update Selection
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="w-4 h-4 mr-2" />
                                  Add to Selection
                                </>
                              )}
                            </Button>

                            <Button
                              onClick={nextProduct}
                              variant="outline"
                              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                              size="lg"
                            >
                              Skip & Next
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                        {/* Top fade gradient - visible when not at top */}
                        {!isScrolledTop && (
                          <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-30">
                            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/30 to-transparent" />
                          </div>
                        )}
                        {/* Bottom fade gradient - visible when not at bottom */}
                        {!isScrolledBottom && (
                          <div className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none z-30">
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Retail Price Warning Modal */}
      {currentProduct && (
        <RetailPriceWarningModal
          isOpen={showPriceWarning}
          baseCost={calculateBaseCost(currentProduct)}
          currentRetailPrice={customRetailPrices.get(currentProduct.id) || currentProduct.suggestedRetail || 2499}
          onSetToMinimum={() => {
            if (currentProduct) {
              setCustomRetailPrices((prev) => new Map(prev).set(currentProduct.id, calculateBaseCost(currentProduct)));
            }
            setShowPriceWarning(false);
          }}
          onUpdateManually={() => {
            setShowPriceWarning(false);
          }}
        />
      )}

      {/* Mobile Full-Screen Image Viewer */}
      <MobileImageViewer
        images={currentProduct?.imageUrls || []}
        initialIndex={0}
        productName={currentProduct?.name || 'Product'}
        isOpen={isMobileViewerOpen}
        onClose={() => setIsMobileViewerOpen(false)}
        thumbnailRef={mobileImageRef}
      />

      {/* Product Added Toast */}
      <ProductAddedToast
        show={showAddedToast}
        productName={currentProduct?.name || 'Product'}
        onComplete={() => setShowAddedToast(false)}
      />
    </>
  );
}
