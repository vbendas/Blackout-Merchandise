'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, Layers, ShoppingBag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ProductAddedToast } from '@/components/animations/ProductAddedToast';
import { cn } from '@/lib/utils';
import { useLightbox } from '../../lib/LightboxContext';
import { useProductList } from '../../lib/ProductListContext';
import { getPrintAreasForProduct } from '../../lib/printAreas';
import { Button } from '../ui/button';
import { DraggableImageCarousel } from './DraggableImageCarousel';
import { MobileImageViewer } from './MobileImageViewer';
import { RetailPriceWarningModal } from './RetailPriceWarningModal';

interface ProductColor {
  name: string;
  hex: string;
  imageUrls?: string[];
  available?: boolean;
}

interface ProductSize {
  size: string;
  minQuantity: number;
}

export function ProductDetailLightbox() {
  const { isOpen, selectedProduct, closeLightbox, selectedImageIndex, setSelectedImageIndex } = useLightbox();
  const { items, addToList } = useProductList();
  const [selectedColors, setSelectedColors] = useState<ProductColor[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedPrintAreas, setSelectedPrintAreas] = useState<string[]>(['front', 'back']);
  const [displayedImages, setDisplayedImages] = useState<string[]>([]);
  const [customRetailPrice, setCustomRetailPrice] = useState<number | null>(null);
  const [showRetailTooltip, setShowRetailTooltip] = useState(false);
  const [showPriceWarning, setShowPriceWarning] = useState(false);

  const [isMobileViewerOpen, setIsMobileViewerOpen] = useState(false);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const mobileImageRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [isScrolledTop, setIsScrolledTop] = useState(true);
  const [isScrolledBottom, setIsScrolledBottom] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      let colorsToSelect: ProductColor[] = [];
      if (selectedProduct.colors && selectedProduct.colors.length > 0) {
        const blackColor = selectedProduct.colors.find((c: ProductColor) => c.name.toLowerCase() === 'black');
        colorsToSelect = blackColor ? [blackColor] : [selectedProduct.colors[0]];
        setSelectedColors(colorsToSelect);
        setDisplayedImages(colorsToSelect[0]?.imageUrls || selectedProduct.imageUrls || []);
      } else {
        setDisplayedImages(selectedProduct.imageUrls || []);
      }

      const standardSizes = ['S', 'M', 'L', 'XL', 'XXL'];
      if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
        const availableSizes = selectedProduct.sizes.map((s: ProductSize) => s.size);
        const sizesToSelect = standardSizes.filter((size) => availableSizes.includes(size));
        setSelectedSizes(sizesToSelect);
      }

      setSelectedPrintAreas(['front', 'back']);
      setCustomRetailPrice(null);
    }
  }, [selectedProduct]);

  const calculateBaseCost = () => {
    if (!selectedProduct) return 0;
    let cost = selectedProduct.baseCost || 500;
    const sleeveCount = selectedPrintAreas.filter((area) => area === 'left_sleeve' || area === 'right_sleeve').length;
    cost += sleeveCount * 150;
    return cost;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        closeLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeLightbox]);

  useEffect(() => {
    if (!isOpen) {
      setIsMobileViewerOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedProduct) {
      const baseCost = calculateBaseCost();
      const retailPrice = customRetailPrice || selectedProduct.suggestedRetail || 2499;
      if (retailPrice < baseCost) {
        setShowPriceWarning(true);
      }
    }
  }, [selectedPrintAreas, selectedProduct, customRetailPrice]);

  const handleAddToList = () => {
    if (!selectedProduct || selectedColors.length === 0 || selectedSizes.length === 0) {
      alert('Select at least one color and one size');
      return;
    }

    const baseCost = calculateBaseCost();
    const retailPrice = customRetailPrice || selectedProduct.suggestedRetail || 2499;
    if (retailPrice < baseCost) {
      setShowPriceWarning(true);
      return;
    }

    addToList({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      category: selectedProduct.category,
      selectedColors: selectedColors,
      selectedSizes: selectedSizes,
      selectedPrintAreas: selectedPrintAreas,
      baseCost: calculateBaseCost(),
      suggestedRetail: customRetailPrice || selectedProduct.suggestedRetail || 2499,
      addedAt: new Date(),
      source: 'individual',
    });

    setShowAddedToast(true);
    closeLightbox();
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  };

  const togglePrintArea = (printAreaId: string) => {
    setSelectedPrintAreas((prev) =>
      prev.includes(printAreaId) ? prev.filter((id) => id !== printAreaId) : [...prev, printAreaId]
    );
  };

  const handleColorToggle = (color: ProductColor) => {
    setSelectedColors((prev) => {
      const exists = prev.find((c) => c.name === color.name);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c.name !== color.name);
      }
      return [...prev, color];
    });
    if (color.imageUrls && color.imageUrls.length > 0) {
      setDisplayedImages(color.imageUrls);
    }
    setSelectedImageIndex(0);
  };

  const formatPrice = (cents?: number) => {
    if (!cents) return 'N/A';
    return `€${(cents / 100).toFixed(2)}`;
  };

  const isCurrentProductSelected = items.some((p) => p.productId === selectedProduct?.id);

  if (!isOpen || !selectedProduct) return null;

  const { name, brand, category, colors, sizes, specs, suggestedRetail, sustainabilityBadges } = selectedProduct;
  const availablePrintAreas = getPrintAreasForProduct(category);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 md:left-16 z-[70] bg-zinc-950"
              style={{ bottom: '104px' }}
              onClick={closeLightbox}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 md:left-16 z-[70] flex items-center justify-center p-1 md:p-3"
              style={{ bottom: '114px' }}
              onClick={closeLightbox}
            >
              <div
                className="relative w-[90%] h-full max-h-[80vh] bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col mt-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Layers className="w-5 h-5" />
                      <span className="text-sm font-medium">Product Details</span>
                    </div>
                    <div className="h-4 w-px bg-zinc-700" />
                    <div className="text-sm text-zinc-500">
                      1 <span className="text-zinc-600">/</span> 1
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={closeLightbox}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
                  <div className="flex-1 flex flex-col md:flex-row min-h-0">
                    <div className="flex-1 h-[35vh] md:h-auto bg-zinc-950 relative flex items-center justify-center p-4 md:p-8 flex-shrink-0">
                      <div
                        ref={mobileImageRef}
                        className="relative w-full h-full cursor-pointer md:cursor-default"
                        onClick={() => setIsMobileViewerOpen(true)}
                      >
                        {displayedImages.length > 0 ? (
                          <>
                            <DraggableImageCarousel
                              images={displayedImages}
                              selectedIndex={selectedImageIndex}
                              onIndexChange={setSelectedImageIndex}
                              productName={name}
                              onImageClick={() => setIsMobileViewerOpen(true)}
                            />
                            <div className="md:hidden absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white/80 pointer-events-none whitespace-nowrap">
                              Tap to expand
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-zinc-500">No images available</span>
                          </div>
                        )}
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

                    <div className="relative w-full md:w-96 min-h-0 bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-800">
                      <div
                        ref={detailsRef}
                        className="h-full overflow-y-auto overscroll-y-contain p-6 scrollbar-hide-scrollbar"
                        onScroll={(e) => {
                          const target = e.target as HTMLDivElement;
                          const { scrollTop, scrollHeight, clientHeight } = target;
                          const isTop = scrollTop <= 5;
                          const isBottom = scrollTop + clientHeight >= scrollHeight - 10;
                          setIsScrolledTop(isTop);
                          setIsScrolledBottom(isBottom);
                        }}
                      >
                        <div className="space-y-6 pb-24">
                          <div>
                            {brand && <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{brand}</p>}
                            <h2 className="text-2xl font-semibold text-white mb-2">{name}</h2>
                            {category && (
                              <span className="inline-block px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">
                                {category}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-3 py-4 border-y border-zinc-800">
                            <div>
                              <p className="text-xs text-zinc-500 mb-2">Base Cost</p>
                              <p className="text-base font-mono font-semibold text-white">
                                {formatPrice(calculateBaseCost())}
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
                                  Suggested price: {formatPrice(suggestedRetail)}. You can edit it to set your own
                                  selling price. Delete the value and type your own.
                                </div>
                              )}
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-base">
                                  €
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  defaultValue={
                                    customRetailPrice !== null
                                      ? (customRetailPrice / 100).toFixed(2)
                                      : ((suggestedRetail || 2499) / 100).toFixed(2)
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || val === '€') return;
                                    const cleanVal = val.replace('€', '').trim();
                                    if (cleanVal === '' || cleanVal === '.' || /^\d*\.?\d*$/.test(cleanVal)) {
                                      const numVal = parseFloat(cleanVal);
                                      if (!isNaN(numVal) && numVal * 100 >= calculateBaseCost()) {
                                        setCustomRetailPrice(Math.round(numVal * 100));
                                      }
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const currentPrice =
                                      customRetailPrice !== null ? customRetailPrice : suggestedRetail || 2499;
                                    e.target.value = (currentPrice / 100).toFixed(2);
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-24 pl-6 pr-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-base font-mono font-semibold text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 mb-2">Profit per Unit</p>
                              <p className="text-base font-mono font-semibold text-emerald-400">
                                €
                                {(((customRetailPrice || suggestedRetail || 2499) - calculateBaseCost()) / 100).toFixed(
                                  2
                                )}
                              </p>
                              <p className="text-[10px] text-zinc-500 mt-1">
                                {(
                                  (((customRetailPrice || suggestedRetail || 2499) - calculateBaseCost()) /
                                    calculateBaseCost()) *
                                  100
                                ).toFixed(0)}
                                % margin
                              </p>
                            </div>
                          </div>

                          {colors && colors.length > 0 && (
                            <div>
                              <p className="text-sm text-zinc-400 mb-3">
                                Colors <span className="text-zinc-600">(select multiple)</span>:{' '}
                                <span className="text-white">{selectedColors.map((c) => c.name).join(', ')}</span>
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {colors.map((color) => (
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
                                    disabled={color.available === false}
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
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="text-white"
                                          >
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                        </span>
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {sizes && sizes.length > 0 && (
                            <div>
                              <p className="text-sm text-zinc-400 mb-3">
                                Sizes <span className="text-zinc-600">(select multiple)</span>
                              </p>
                              <div className="grid grid-cols-5 gap-2">
                                {sizes.map((size: ProductSize) => (
                                  <button
                                    key={size.size}
                                    onClick={() => toggleSize(size.size)}
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

                          {availablePrintAreas.length > 0 && (
                            <div>
                              <p className="text-sm text-zinc-400 mb-3">Print Areas</p>
                              <div className="flex flex-wrap gap-2">
                                {availablePrintAreas.map((area) => (
                                  <button
                                    key={area.id}
                                    onClick={() => togglePrintArea(area.id)}
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
                          )}

                          {(specs || (sustainabilityBadges && sustainabilityBadges.length > 0)) && (
                            <div className="space-y-4">
                              {specs && Object.keys(specs).length > 0 && (
                                <div>
                                  <p className="text-xs text-zinc-500 mb-2">Specifications</p>
                                  <div className="bg-zinc-900/50 rounded-lg p-4 space-y-2 text-sm">
                                    {Object.entries(specs).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-zinc-500 capitalize">{key}</span>
                                        <span className="text-zinc-200">{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {sustainabilityBadges && sustainabilityBadges.length > 0 && (
                                <div>
                                  <p className="text-xs text-zinc-500 mb-2">Sustainability</p>
                                  <div className="flex flex-wrap gap-2">
                                    {sustainabilityBadges.map((badge: string) => (
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

                          <div className="space-y-3 pt-4">
                            <Button
                              onClick={handleAddToList}
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
                          </div>
                        </div>
                        {!isScrolledTop && (
                          <div className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-30">
                            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/30 to-transparent" />
                          </div>
                        )}
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

      <RetailPriceWarningModal
        isOpen={showPriceWarning}
        baseCost={calculateBaseCost()}
        currentRetailPrice={customRetailPrice || selectedProduct?.suggestedRetail || 2499}
        onSetToMinimum={() => {
          setCustomRetailPrice(calculateBaseCost());
          setShowPriceWarning(false);
        }}
        onUpdateManually={() => {
          setShowPriceWarning(false);
        }}
      />

      <MobileImageViewer
        images={displayedImages}
        initialIndex={selectedImageIndex}
        productName={name}
        isOpen={isMobileViewerOpen}
        onClose={() => setIsMobileViewerOpen(false)}
        thumbnailRef={mobileImageRef}
      />

      <ProductAddedToast
        show={showAddedToast}
        productName={selectedProduct?.name || 'Product'}
        onComplete={() => setShowAddedToast(false)}
      />
    </>
  );
}
