/**
 * Hierarchical Transformation Menu
 * Shows categories first, then transformations within selected category
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Brain,
  ChevronLeft,
  ImageOff,
  Layers,
  Palette,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  TRANSFORMATION_CATEGORIES,
  TRANSFORMATION_LABELS,
  type TransformationCategory,
  type TransformationType,
} from '@/types/transformations';

interface TransformationMenuProps {
  onSelect: (type: TransformationType) => void;
  onClose: () => void;
  className?: string;
}

type MenuLevel = 'root' | 'category' | 'adjustment';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ImageOff,
  Wand2,
  SlidersHorizontal,
  Sparkles,
  RotateCw,
  Palette,
  Layers,
  Brain,
};

export function TransformationMenu({ onSelect, onClose, className }: TransformationMenuProps) {
  const [level, setLevel] = useState<MenuLevel>('root');
  const [selectedCategory, setSelectedCategory] = useState<TransformationCategory | null>(null);

  const handleCategorySelect = (category: TransformationCategory) => {
    if (category.id === 'adjustments') {
      setLevel('adjustment');
    } else {
      setLevel('category');
    }
    setSelectedCategory(category);
  };

  const handleBack = () => {
    if (level === 'category' || level === 'adjustment') {
      setLevel('root');
      setSelectedCategory(null);
    } else {
      onClose();
    }
  };

  const handleTransformationSelect = (type: TransformationType) => {
    onSelect(type);
    // Don't close - let user apply multiple transformations
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn(
        'bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-4 shadow-2xl',
        'min-w-[280px] max-w-[320px]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-700/50">
        <button onClick={handleBack} className="p-1.5 hover:bg-zinc-700/50 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-zinc-400" />
        </button>
        <span className="text-sm font-medium text-zinc-200">
          {level === 'root' && 'Transformations'}
          {level === 'category' && selectedCategory?.label}
          {level === 'adjustment' && 'Adjustments'}
        </span>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {level === 'root' && (
          <motion.div
            key="root"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-2 gap-2"
          >
            {TRANSFORMATION_CATEGORIES.map((category) => {
              const Icon = ICON_MAP[category.icon];
              return (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCategorySelect(category)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl',
                    'bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30',
                    'transition-all duration-200'
                  )}
                >
                  {Icon && <Icon className="w-5 h-5 text-zinc-400" />}
                  <span className="text-xs text-zinc-300 text-center">{category.label}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {(level === 'category' || level === 'adjustment') && selectedCategory && (
          <motion.div
            key="category"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-2"
          >
            {selectedCategory.transformations.map((type) => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleTransformationSelect(type)}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  'bg-zinc-800/30 hover:bg-zinc-700/50 border border-zinc-700/30',
                  'transition-all duration-200 text-left'
                )}
              >
                <span className="text-sm text-zinc-300">{TRANSFORMATION_LABELS[type]}</span>
                <ChevronLeft className="w-4 h-4 text-zinc-500 rotate-180" />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close button */}
      <div className="mt-4 pt-3 border-t border-zinc-700/50">
        <button onClick={onClose} className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Close Menu
        </button>
      </div>
    </motion.div>
  );
}
