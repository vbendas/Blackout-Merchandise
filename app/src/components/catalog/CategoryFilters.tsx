'use client';

import { X } from 'lucide-react';
import { Button } from '../ui/button';

interface CategoryFiltersProps {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

/**
 * Category filter buttons
 * Allows filtering products by category
 * Part of Phase 3.5.5
 */
export function CategoryFilters({ categories, selectedCategory, onCategoryChange }: CategoryFiltersProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* All Button */}
      <Button
        onClick={() => onCategoryChange(null)}
        variant={selectedCategory === null ? 'default' : 'outline'}
        size="sm"
      >
        All Products
      </Button>

      {/* Category Buttons */}
      {categories.map((category) => (
        <Button
          key={category}
          onClick={() => onCategoryChange(category)}
          variant={selectedCategory === category ? 'default' : 'outline'}
          size="sm"
          className="capitalize"
        >
          {category}
          {selectedCategory === category && <X className="w-3 h-3 ml-1" />}
        </Button>
      ))}
    </div>
  );
}
