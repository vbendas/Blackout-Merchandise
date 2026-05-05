'use client';

import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useStudio } from '@/lib/StudioContext';
import { useViewportSize } from '@/hooks/useViewportSize';
import { STATIC_CATALOG, getColorsForSku, getEntry } from '@/data/stanley-stella-catalog';
import { cn } from '@/lib/utils';

const PRODUCT_TYPES = [
  { id: 'tshirt', name: 'T-Shirt', icon: 'solar:t-shirt-linear' },
  { id: 'hoodie', name: 'Hoodie', icon: 'solar:hoodie-linear' },
  { id: 'sweatshirt', name: 'Sweatshirt', icon: 'solar:sweatshirt-linear' },
  { id: 'longsleeve', name: 'Long Sleeve', icon: 'solar:long-sleeve-linear' },
  { id: 'tank', name: 'Tank', icon: 'solar:tank-top-linear' },
  { id: 'jacket', name: 'Jacket', icon: 'solar:jacket-linear' },
  { id: 'accessory', name: 'Accessory', icon: 'solar:bag-linear' },
];

const VIEWS = [
  { id: 'front', name: 'Front', icon: 'lucide:arrow-up' },
  { id: 'back', name: 'Back', icon: 'lucide:arrow-down' },
  { id: 'left', name: 'Left', icon: 'lucide:arrow-left' },
  { id: 'right', name: 'Right', icon: 'lucide:arrow-right' },
];

const PLACEMENTS = [
  { id: 'front', name: 'Front Chest', icon: 'lucide:square' },
  { id: 'back', name: 'Back Full', icon: 'lucide:square' },
  { id: 'left_sleeve', name: 'Left Sleeve', icon: 'lucide:move-left' },
  { id: 'right_sleeve', name: 'Right Sleeve', icon: 'lucide:move-right' },
  { id: 'inner_tag', name: 'Inner Tag', icon: 'lucide:tag' },
];

export function StudioToolbar() {
  const {
    selectedGarment,
    garmentColor,
    activeView,
    activePlacement,
    setSelectedGarment,
    setGarmentColor,
    setActiveView,
    setActivePlacement,
  } = useStudio();

  useViewportSize();

  const [showGarmentPicker, setShowGarmentPicker] = useState(false);
  const [selectedType, setSelectedType] = useState('tshirt');

  // Get available colors for selected garment
  const availableColors = selectedGarment
    ? getColorsForSku(STATIC_CATALOG, selectedGarment.sku)
    : [];

  // Filter products by type
  const filteredProducts = STATIC_CATALOG.filter(
    (p) => p.productType === selectedType && p.view === 'front'
  );

  // Get unique SKUs for filtered products
  const uniqueSkus = [...new Set(filteredProducts.map((p) => p.sku))];

  const handleSelectGarment = (sku: string, colorCode: string) => {
    const entry = getEntry(STATIC_CATALOG, sku, colorCode, activeView);
    if (entry) {
      setSelectedGarment(entry);
      setGarmentColor(entry.colorHex);
      setShowGarmentPicker(false);
    }
  };

  const handleColorChange = (colorCode: string, colorHex: string) => {
    if (selectedGarment) {
      const entry = getEntry(STATIC_CATALOG, selectedGarment.sku, colorCode, activeView);
      if (entry) {
        setSelectedGarment(entry);
        setGarmentColor(colorHex);
      }
    }
  };

  const handleViewChange = (view: string) => {
    setActiveView(view as any);
    if (selectedGarment) {
      const entry = getEntry(STATIC_CATALOG, selectedGarment.sku, selectedGarment.colorCode, view);
      if (entry) {
        setSelectedGarment(entry);
      }
    }
  };

  return (
    <div className="absolute left-2 right-2 top-2 z-20 flex flex-wrap items-center gap-1 md:left-4 md:right-auto md:top-4 md:gap-2">
      {/* Glass container */}
      <div className="flex flex-wrap items-center gap-1 md:gap-2 rounded-xl border border-white/10 bg-zinc-900/80 backdrop-blur-xl px-2 py-1.5 md:px-3 md:py-2 shadow-2xl max-w-[calc(100vw-80px)]">
        {/* Garment Selector */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowGarmentPicker(!showGarmentPicker)}
            className="flex items-center gap-2 rounded-lg bg-zinc-800/60 border border-white/10 px-3 py-2 text-sm text-white hover:bg-zinc-700/60 transition-colors"
          >
            <Icon icon="solar:t-shirt-linear" className="h-5 w-5" />
            <span>{selectedGarment ? selectedGarment.sku : 'Select Garment'}</span>
            <Icon icon="lucide:chevron-down" className="h-4 w-4" />
          </motion.button>

          <AnimatePresence>
            {showGarmentPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden"
              >
                {/* Product type tabs */}
                <div className="flex gap-1 p-2 border-b border-white/10 overflow-x-auto">
                  {PRODUCT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={cn(
                        'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap transition-colors',
                        selectedType === type.id
                          ? 'bg-white/10 text-white'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                      )}
                    >
                      <Icon icon={type.icon} className="h-4 w-4" />
                      {type.name}
                    </button>
                  ))}
                </div>

                {/* Products list */}
                <div className="max-h-60 overflow-y-auto p-2">
                  {uniqueSkus.map((sku) => {
                    const colors = getColorsForSku(STATIC_CATALOG, sku);
                    return (
                      <div
                        key={sku}
                        className="mb-2 rounded-lg bg-zinc-800/40 p-2 border border-white/5"
                      >
                        <div className="text-xs font-medium text-zinc-300 mb-1">
                          {sku}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {colors.map((color) => (
                            <motion.button
                              key={color.code}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleSelectGarment(sku, color.code)}
                              className={cn(
                                'w-6 h-6 rounded-full border-2 transition-all',
                                selectedGarment?.sku === sku &&
                                  selectedGarment?.colorCode === color.code
                                  ? 'border-white scale-110'
                                  : 'border-transparent hover:border-white/50'
                              )}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Color Picker */}
        {selectedGarment && availableColors.length > 0 && (
          <div className="flex items-center gap-1">
            {availableColors.slice(0, 6).map((color) => (
              <motion.button
                key={color.code}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleColorChange(color.code, color.hex)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all',
                  garmentColor === color.hex
                    ? 'border-white scale-110'
                    : 'border-transparent hover:border-white/50'
                )}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
            {availableColors.length > 6 && (
              <span className="text-xs text-zinc-500">+{availableColors.length - 6}</span>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="h-6 w-px bg-white/10" />

        {/* View Switcher */}
        <div className="flex items-center gap-1">
          {VIEWS.map((view) => (
            <motion.button
              key={view.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleViewChange(view.id)}
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                activeView === view.id
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              )}
            >
              <Icon icon={view.icon} className="h-3.5 w-3.5" />
              {view.name}
            </motion.button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-white/10" />

        {/* Placement Selector */}
        <div className="relative group">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-lg bg-zinc-800/60 border border-white/10 px-3 py-2 text-sm text-white hover:bg-zinc-700/60 transition-colors"
          >
            <Icon icon="lucide:move" className="h-4 w-4" />
            <span className="text-xs">
              {PLACEMENTS.find((p) => p.id === activePlacement)?.name || 'Placement'}
            </span>
          </motion.button>

          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-48 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl overflow-hidden z-30">
            {PLACEMENTS.map((placement) => (
              <button
                key={placement.id}
                onClick={() => setActivePlacement(placement.id as any)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors',
                  activePlacement === placement.id
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon icon={placement.icon} className="h-3.5 w-3.5" />
                {placement.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
