'use client';

import { motion } from 'framer-motion';
import { useStudio } from '@/lib/StudioContext';
import { STATIC_CATALOG, getEntry } from '@/data/stanley-stella-catalog';
import { cn } from '@/lib/utils';

// Featured products for carousel (unique SKUs with front view)
const CAROUSEL_PRODUCTS = [
  { sku: 'STSU177', type: 'tshirt', name: 'Creator T-Shirt' },
  { sku: 'STBU185', type: 'hoodie', name: 'Creator Hoodie' },
  { sku: 'STTW172', type: 'longsleeve', name: 'Creator Long Sleeve' },
  { sku: 'STSK180', type: 'tank', name: 'Creator Tank' },
  { sku: 'STSW212', type: 'sweatshirt', name: 'Creator Sweatshirt' },
  { sku: 'STJM188', type: 'jacket', name: 'Creator Jacket' },
  { sku: 'STAU760', type: 'accessory', name: 'Creator Tote' },
];

export function GarmentCarousel() {
  const { selectedGarment, activeView, setSelectedGarment } = useStudio();

  const handleSelect = (sku: string) => {
    const entry = getEntry(STATIC_CATALOG, sku, 'C002', activeView) ||
      STATIC_CATALOG.find((p) => p.sku === sku && p.view === 'front');
    if (entry) {
      setSelectedGarment(entry);
    }
  };

  return (
    <div className="absolute bottom-2 left-2 right-2 z-20 md:bottom-4 md:left-4 md:right-4">
      <div className="flex items-center justify-center gap-1.5 md:gap-2 overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/80 backdrop-blur-xl px-2 py-2 md:px-4 md:py-3 shadow-2xl">
        {CAROUSEL_PRODUCTS.map((product) => {
          const isActive = selectedGarment?.sku === product.sku;
          const entry = STATIC_CATALOG.find(
            (p) => p.sku === product.sku && p.view === 'front'
          );

          return (
            <motion.button
              key={product.sku}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(product.sku)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 md:px-3 md:py-2 transition-all min-w-[60px] md:min-w-[80px]',
                  isActive
                    ? 'bg-white/10 border border-white/20'
                    : 'border border-transparent hover:bg-white/5'
                )}
              >
                {entry ? (
                  <img
                    src={entry.imagePath}
                    alt={product.name}
                    className={cn(
                      'h-10 w-8 md:h-12 md:w-10 object-cover rounded',
                      isActive ? 'ring-2 ring-white' : ''
                    )}
                  />
                ) : (
                  <div className="h-10 w-8 md:h-12 md:w-10 rounded bg-zinc-800 flex items-center justify-center">
                    <span className="text-[10px] text-zinc-600">{product.type[0].toUpperCase()}</span>
                  </div>
                )}
                <span className="text-[9px] md:text-[10px] text-zinc-400 whitespace-nowrap">
                  {product.name}
                </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
