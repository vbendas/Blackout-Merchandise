'use client';

import { Icon } from '@iconify/react';
import { X } from 'lucide-react';
import type React from 'react';

interface FilterDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

/**
 * Filter Dropdown Component
 *
 * Dark theme styling with responsive behavior:
 * - Mobile: Compact horizontal scroll container
 * - Desktop: Inline flex display
 *
 * Features dark mode filter chips with clear option
 *
 * Part of Phase 6 - Kimi Design Migration (Dark Mode)
 */
export function FilterDropdown({ label, options, value, onChange, onClear }: FilterDropdownProps): React.ReactElement {
  const isActive = value !== 'all' && value !== '';

  return (
    <div className="relative flex-shrink-0">
      <div
        className={`
          flex items-center gap-1 rounded-md border px-2 py-1 transition-all duration-200
          min-h-[32px] touch-manipulation
          ${
            isActive
              ? 'bg-zinc-800/80 text-white border-zinc-600 backdrop-blur-sm'
              : 'bg-zinc-900/40 text-zinc-300 border-zinc-800 hover:border-zinc-700'
          }
        `}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`
            appearance-none bg-transparent border-none outline-none text-xs font-medium
            cursor-pointer pr-4 min-w-[50px]
            ${isActive ? 'text-white' : 'text-zinc-300'}
          `}
          aria-label={`Filter by ${label}`}
        >
          <option value="all" className="text-zinc-300 bg-zinc-900">
            {label}
          </option>
          {options
            .filter((opt) => opt !== 'all')
            .map((opt) => (
              <option key={opt} value={opt} className="text-zinc-300 bg-zinc-900 capitalize">
                {opt}
              </option>
            ))}
        </select>

        <Icon
          icon="lucide:chevron-down"
          className={`
            absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none
            ${isActive ? 'text-white' : 'text-zinc-500'}
          `}
        />

        {isActive && onClear && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="ml-0.5 p-0.5 rounded-full hover:bg-zinc-700 transition-colors"
            aria-label={`Clear ${label} filter`}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

interface FilterBarProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
}

/**
 * Filter Bar Container
 *
 * Responsive layout:
 * - Mobile: Horizontal scroll with snap points
 * - Desktop: Inline flex layout
 *
 * Dark theme styling
 */
export function FilterBar({ children, onClearAll, hasActiveFilters = false }: FilterBarProps): React.ReactElement {
  return (
    <div className="relative">
      {/* Mobile: Horizontal scroll container */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory md:overflow-visible md:pb-0 md:flex-wrap">
        {children}

        {/* Clear All Button */}
        {hasActiveFilters && onClearAll && (
          <button
            onClick={onClearAll}
            className="
              flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg
              text-sm font-medium text-zinc-400 hover:text-white
              transition-colors snap-start
              min-h-[44px]
            "
          >
            <X className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>

      {/* Mobile scroll fade indicators */}
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none md:hidden" />
    </div>
  );
}

export default FilterDropdown;
