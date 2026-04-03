'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface ProductCardProps {
  name: string;
  price?: number;
  imageUrl: string;
  category?: string;
  onViewCatalog?: () => void;
  onAddToStore?: () => void;
}

export function ProductCard({
  name,
  price,
  imageUrl,
  category,
  onViewCatalog,
  onAddToStore,
}: ProductCardProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-800 rounded-xl overflow-hidden max-w-[90%] border border-zinc-700"
    >
      {/* Image */}
      <div className="relative aspect-[4/3]">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
        />
        
        {/* Category badge */}
        {category && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
            {category}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-white font-medium mb-1">{name}</h4>
        
        {price && (
          <p className="text-rose-400 font-semibold mb-3">
            {formatPrice(price)}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {onViewCatalog && (
            <button
              onClick={onViewCatalog}
              className="flex-1 px-3 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors text-sm"
            >
              View in Catalog
            </button>
          )}
          {onAddToStore && (
            <button
              onClick={onAddToStore}
              className="flex-1 px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm"
            >
              Add to Store
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
