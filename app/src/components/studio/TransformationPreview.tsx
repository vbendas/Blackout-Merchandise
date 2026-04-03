/**
 * Transformation Preview Component
 * Shows before/after comparison of transformations
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buildTransformedUrl } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';
import type { Transformation } from '@/types/transformations';

interface TransformationPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  originalUrl: string;
  transformations: Transformation[];
  designName: string;
}

export function TransformationPreview({
  isOpen,
  onClose,
  onApply,
  originalUrl,
  transformations,
  designName,
}: TransformationPreviewProps) {
  const [transformedUrl, setTransformedUrl] = useState<string>(originalUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [showAfter, setShowAfter] = useState(true);

  useEffect(() => {
    if (isOpen && transformations.length > 0) {
      setIsLoading(true);
      const url = buildTransformedUrl(originalUrl, transformations);

      // Preload image
      const img = new Image();
      img.onload = () => {
        setTransformedUrl(url);
        setIsLoading(false);
      };
      img.onerror = () => {
        setIsLoading(false);
      };
      img.src = url;
    }
  }, [isOpen, originalUrl, transformations]);

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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl',
              'w-full max-w-4xl max-h-[90vh] z-50 overflow-hidden',
              'flex flex-col'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-700/50">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Transformation Preview</h3>
                <p className="text-sm text-zinc-500">{designName}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-auto p-6 bg-zinc-950/50">
              <div className="relative aspect-video bg-zinc-800/50 rounded-xl overflow-hidden">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Before Image */}
                    <img
                      src={originalUrl}
                      alt="Before"
                      className={cn(
                        'absolute inset-0 w-full h-full object-contain transition-opacity duration-300',
                        showAfter ? 'opacity-0' : 'opacity-100'
                      )}
                    />

                    {/* After Image */}
                    <img
                      src={transformedUrl}
                      alt="After"
                      className={cn(
                        'absolute inset-0 w-full h-full object-contain transition-opacity duration-300',
                        showAfter ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </>
                )}

                {/* Labels */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-xs font-medium text-white">Before</span>
                </div>
                <div className="absolute top-4 right-4 bg-blue-600/80 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-xs font-medium text-white">After</span>
                </div>
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={() => setShowAfter(false)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    !showAfter ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  Before
                </button>
                <button
                  onClick={() => setShowAfter(true)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    showAfter ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  After
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-zinc-700/50 bg-zinc-900">
              <div className="text-sm text-zinc-500">
                {transformations.length} transformation{transformations.length !== 1 ? 's' : ''} applied
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onApply}
                  disabled={isLoading}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium',
                    'bg-blue-600 hover:bg-blue-500 text-white transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Check className="w-4 h-4" />
                  Apply Transformations
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
