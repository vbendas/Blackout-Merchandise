'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterDropdown } from './FilterDropdown';

interface StickyHeaderProps {
  onNewChatClick?: () => void;
  onHistoryClick?: () => void;
  onNotificationsClick?: () => void;
  onListClick?: () => void;
  listItemCount?: number;
  // Search
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  // Sort
  sortBy?: string;
  onSortChange?: (value: string) => void;
  // Filter props
  showFilters?: boolean;
  selectedCategory?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedFit?: string;
  onCategoryChange?: (value: string) => void;
  onColorChange?: (value: string) => void;
  onSizeChange?: (value: string) => void;
  onFitChange?: (value: string) => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  // Showroom
  onShowroomClick?: () => void;
}

export function StickyHeader({
  onNewChatClick: _onNewChatClick,
  onHistoryClick: _onHistoryClick,
  onNotificationsClick: _onNotificationsClick,
  onListClick: _onListClick,
  listItemCount: _listItemCount = 0,
  searchQuery = '',
  onSearchChange,
  sortBy = 'default',
  onSortChange,
  showFilters = false,
  selectedCategory = 'all',
  selectedColor = 'all',
  selectedSize = 'all',
  selectedFit = 'all',
  onCategoryChange,
  onColorChange,
  onSizeChange,
  onFitChange,
  onClearFilters,
  hasActiveFilters,
  onShowroomClick,
}: StickyHeaderProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterCount = [
    selectedCategory !== 'all' ? 1 : 0,
    selectedColor !== 'all' ? 1 : 0,
    selectedSize !== 'all' ? 1 : 0,
    selectedFit !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <header className="fixed top-0 left-0 right-0 z-[60] overflow-visible transition-all duration-300 bg-zinc-900/70 backdrop-blur-xl border-b border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div className="h-[72px] w-full flex items-center justify-between overflow-visible px-4">
        {/* Left Side - Search + Filters (Desktop) */}
        {showFilters ? (
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-[7%]">
            {/* Search */}
            {onSearchChange && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-48 h-8 pl-8 pr-3 text-xs bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <FilterDropdown
                label="Category"
                options={['all', 'T-Shirts', 'Hoodies', 'Jackets', 'Accessories']}
                value={selectedCategory}
                onChange={onCategoryChange || (() => {})}
              />
              <FilterDropdown
                label="Color"
                options={['all', 'Black', 'White', 'Navy', 'Red', 'Green']}
                value={selectedColor}
                onChange={onColorChange || (() => {})}
              />
              <FilterDropdown
                label="Size"
                options={['all', 'S', 'M', 'L', 'XL', 'XXL']}
                value={selectedSize}
                onChange={onSizeChange || (() => {})}
              />
              <FilterDropdown
                label="Fit"
                options={['all', 'Regular', 'Oversized', 'Slim', 'Relaxed']}
                value={selectedFit}
                onChange={onFitChange || (() => {})}
              />

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-1 h-8 px-2"
                >
                  <X className="w-3 h-3" />
                  <span className="text-xs">Clear</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0" />
        )}

        {/* Center - Mobile Filter Button */}
        {showFilters && (
          <div className="flex md:hidden items-center justify-center flex-1">
            <Button
              variant="ghost"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="text-foreground hover:bg-transparent hover:opacity-70 flex items-center gap-2 h-8"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-white text-black text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px]">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        )}

        {/* Right Side - Sort + Showroom */}
        <div className="flex items-center gap-3 flex-shrink-0 mr-[2%]">
          {onSortChange && (
            <FilterDropdown
              label="Sort"
              options={['default', 'price-low', 'price-high', 'name-asc']}
              value={sortBy}
              onChange={onSortChange}
            />
          )}
          {onShowroomClick && (
            <button
              onClick={onShowroomClick}
              className="rounded-full border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
            >
              Showroom
            </button>
          )}
        </div>
      </div>

      {/* Mobile Filter Dropdown Panel */}
      {showFilters && mobileFiltersOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-6 py-4 z-50">
          <div className="flex flex-col gap-3">
            {/* Mobile Search */}
            {onSearchChange && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full h-9 pl-8 pr-8 text-sm bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <FilterDropdown
                label="Category"
                options={['all', 'T-Shirts', 'Hoodies', 'Jackets', 'Accessories']}
                value={selectedCategory}
                onChange={onCategoryChange || (() => {})}
              />
              <FilterDropdown
                label="Color"
                options={['all', 'Black', 'White', 'Navy', 'Red', 'Green']}
                value={selectedColor}
                onChange={onColorChange || (() => {})}
              />
              <FilterDropdown
                label="Size"
                options={['all', 'S', 'M', 'L', 'XL', 'XXL']}
                value={selectedSize}
                onChange={onSizeChange || (() => {})}
              />
              <FilterDropdown
                label="Fit"
                options={['all', 'Regular', 'Oversized', 'Slim', 'Relaxed']}
                value={selectedFit}
                onChange={onFitChange || (() => {})}
              />
              {onSortChange && (
                <FilterDropdown
                  label="Sort"
                  options={['default', 'price-low', 'price-high', 'name-asc']}
                  value={sortBy}
                  onChange={onSortChange}
                />
              )}

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span className="text-xs">Clear</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
