'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

interface FilterGroup {
  id: string;
  label: string;
  options: { value: string; label: string; count?: number }[];
}

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filterGroups: FilterGroup[];
  activeFilters: Record<string, string>;
  onApplyFilters: (filters: Record<string, string>) => void;
  onClearAll: () => void;
  totalResults: number;
}

/**
 * Mobile Filter Sheet Component
 *
 * Bottom sheet for mobile filters with:
 * - Accordion-style filter groups
 * - Apply/Clear buttons
 * - Scrollable content
 * - Result count display
 */
export function MobileFilterSheet({
  isOpen,
  onClose,
  filterGroups,
  activeFilters,
  onApplyFilters,
  onClearAll,
  totalResults,
}: MobileFilterSheetProps): React.ReactElement {
  const [tempFilters, setTempFilters] = useState<Record<string, string>>(activeFilters);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(filterGroups.map((g) => g.id));

  // Reset temp filters when sheet opens
  useState(() => {
    if (isOpen) {
      setTempFilters(activeFilters);
    }
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]));
  };

  const handleSelectOption = (groupId: string, value: string) => {
    setTempFilters((prev) => ({
      ...prev,
      [groupId]: prev[groupId] === value ? '' : value,
    }));
  };

  const handleApply = () => {
    onApplyFilters(tempFilters);
    onClose();
  };

  const handleClearAll = () => {
    setTempFilters({});
    onClearAll();
  };

  const activeFilterCount = Object.values(tempFilters).filter((v) => v && v !== 'all').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 md:hidden max-h-[85vh] flex flex-col"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[#e5e5e5] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#666666]" />
                <h2 className="text-lg font-semibold text-black">Filters</h2>
                {activeFilterCount > 0 && (
                  <span className="bg-black text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-[#f3f3f3] transition-colors"
                aria-label="Close filters"
              >
                <X className="w-5 h-5 text-[#666666]" />
              </button>
            </div>

            {/* Filter Groups */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {filterGroups.map((group) => (
                <div key={group.id} className="border-b border-[#e5e5e5] last:border-b-0">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between py-4"
                  >
                    <span className="font-medium text-black">{group.label}</span>
                    <div className="flex items-center gap-2">
                      {tempFilters[group.id] && tempFilters[group.id] !== 'all' && (
                        <span className="text-sm text-[#3b82f6]">
                          {group.options.find((o) => o.value === tempFilters[group.id])?.label}
                        </span>
                      )}
                      <motion.div
                        animate={{ rotate: expandedGroups.includes(group.id) ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-5 h-5 text-[#666666]" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Group Options */}
                  <AnimatePresence>
                    {expandedGroups.includes(group.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-4 space-y-1">
                          {group.options.map((option) => {
                            const isSelected = tempFilters[group.id] === option.value;
                            return (
                              <button
                                key={option.value}
                                onClick={() => handleSelectOption(group.id, option.value)}
                                className={`
                                  w-full flex items-center justify-between px-3 py-3 rounded-lg
                                  transition-colors min-h-[44px]
                                  ${isSelected ? 'bg-[#f3f3f3]' : 'hover:bg-[#f9f9f9]'}
                                `}
                              >
                                <span className={`text-sm ${isSelected ? 'font-medium text-black' : 'text-[#666666]'}`}>
                                  {option.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  {option.count !== undefined && (
                                    <span className="text-xs text-[#999999]">({option.count})</span>
                                  )}
                                  <div
                                    className={`
                                      w-5 h-5 rounded border flex items-center justify-center
                                      ${isSelected ? 'bg-black border-black' : 'border-[#d4d4d4] bg-white'}
                                    `}
                                  >
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-[#e5e5e5] px-4 py-4 space-y-3">
              <p className="text-center text-sm text-[#666666]">
                {totalResults} product{totalResults !== 1 ? 's' : ''} found
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleClearAll}
                  disabled={activeFilterCount === 0}
                  className="
                    flex-1 px-4 py-3 rounded-lg border border-[#e5e5e5]
                    text-sm font-medium text-black
                    disabled:opacity-40 disabled:cursor-not-allowed
                    hover:bg-[#f9f9f9] transition-colors
                    min-h-[48px]
                  "
                >
                  Clear All
                </button>
                <button
                  onClick={handleApply}
                  className="
                    flex-1 px-4 py-3 rounded-lg bg-black text-white
                    text-sm font-medium
                    hover:bg-[#333333] transition-colors
                    min-h-[48px]
                  "
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Mobile Filter Button
 *
 * Trigger button to open the filter sheet on mobile
 */
interface MobileFilterButtonProps {
  onClick: () => void;
  activeFilterCount: number;
}

export function MobileFilterButton({ onClick, activeFilterCount }: MobileFilterButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="
        flex items-center gap-2 px-4 py-2.5 rounded-lg
        bg-white border border-[#e5e5e5] text-black
        hover:border-[#d4d4d4] transition-colors
        min-h-[44px] md:hidden
      "
    >
      <SlidersHorizontal className="w-4 h-4" />
      <span className="text-sm font-medium">Filters</span>
      {activeFilterCount > 0 && (
        <span className="bg-black text-white text-xs font-medium px-2 py-0.5 rounded-full">{activeFilterCount}</span>
      )}
    </button>
  );
}
