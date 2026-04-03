'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface MinimalistFiltersProps {
  onFilterChange?: (filter: string) => void;
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'home', label: 'Home' },
  { id: 'lifestyle', label: 'Lifestyle' },
];

export function MinimalistFilters({ onFilterChange }: MinimalistFiltersProps) {
  const [activeFilter, setActiveFilter] = useState('all');

  const handleFilterClick = (filterId: string) => {
    setActiveFilter(filterId);
    onFilterChange?.(filterId);
  };

  return (
    <div className="sticky top-0 z-30">
      <div className="flex items-center justify-start gap-4 px-4 py-2 overflow-x-auto scrollbar-hide">
        {FILTERS.map((filter) => (
          <motion.button
            key={filter.id}
            onClick={() => handleFilterClick(filter.id)}
            whileTap={{ scale: 0.95 }}
            className={`relative whitespace-nowrap text-xs font-medium transition-colors ${
              activeFilter === filter.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {filter.label}

            {activeFilter === filter.id && (
              <motion.div
                layoutId="activeFilter"
                className="absolute -bottom-1 left-0 right-0 h-px bg-white"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
