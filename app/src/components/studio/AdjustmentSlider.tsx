/**
 * Adjustment Slider Modal
 * For brightness, contrast, and saturation adjustments
 */

'use client';

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { TransformationType } from '@/types/transformations';

interface AdjustmentSliderProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (type: TransformationType, params: Record<string, number>) => void;
}

type AdjustmentType = 'brightness' | 'contrast' | 'saturation';

interface AdjustmentState {
  brightness: number;
  contrast: number;
  saturation: number;
}

const DEFAULT_VALUES: AdjustmentState = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

const LABELS: Record<AdjustmentType, string> = {
  brightness: 'Brightness',
  contrast: 'Contrast',
  saturation: 'Saturation',
};

export function AdjustmentSlider({ isOpen, onClose, onApply }: AdjustmentSliderProps) {
  const [values, setValues] = useState<AdjustmentState>(DEFAULT_VALUES);

  const handleChange = (type: AdjustmentType, value: number) => {
    setValues((prev) => ({ ...prev, [type]: value }));
  };

  const handleApply = () => {
    // Apply each non-zero adjustment
    if (values.brightness !== 0) {
      onApply('brightness', { value: values.brightness });
    }
    if (values.contrast !== 0) {
      onApply('contrast', { value: values.contrast });
    }
    if (values.saturation !== 0) {
      onApply('saturation', { value: values.saturation });
    }

    setValues(DEFAULT_VALUES);
    onClose();
  };

  const handleReset = () => {
    setValues(DEFAULT_VALUES);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'bg-zinc-900 border border-zinc-700/50 rounded-2xl p-6 shadow-2xl',
              'w-full max-w-md z-50'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-zinc-100">Adjustments</h3>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Sliders */}
            <div className="space-y-6">
              {(Object.keys(LABELS) as AdjustmentType[]).map((type) => (
                <div key={type} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`slider-${type}`} className="text-sm font-medium text-zinc-300">
                      {LABELS[type]}
                    </label>
                    <span className="text-sm text-zinc-500 font-mono">
                      {values[type] > 0 ? `+${values[type]}` : values[type]}
                    </span>
                  </div>

                  <input
                    id={`slider-${type}`}
                    type="range"
                    min={-100}
                    max={100}
                    value={values[type]}
                    onChange={(e) => handleChange(type, parseInt(e.target.value))}
                    className={cn(
                      'w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                      '[&::-webkit-slider-thumb]:appearance-none',
                      '[&::-webkit-slider-thumb]:w-4',
                      '[&::-webkit-slider-thumb]:h-4',
                      '[&::-webkit-slider-thumb]:bg-blue-500',
                      '[&::-webkit-slider-thumb]:rounded-full',
                      '[&::-webkit-slider-thumb]:cursor-pointer',
                      '[&::-webkit-slider-thumb]:transition-transform',
                      '[&::-webkit-slider-thumb]:hover:scale-110'
                    )}
                  />

                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>-100</span>
                    <span>0</span>
                    <span>+100</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-8 pt-4 border-t border-zinc-700/50">
              <button
                onClick={handleReset}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium',
                  'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
                  'transition-colors'
                )}
              >
                Reset
              </button>

              <button
                onClick={handleApply}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-lg text-sm font-medium',
                  'bg-blue-600 hover:bg-blue-500 text-white',
                  'transition-colors'
                )}
              >
                Apply
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
