'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface RetailPriceWarningModalProps {
  isOpen: boolean;
  baseCost: number;
  currentRetailPrice: number;
  onSetToMinimum: () => void;
  onUpdateManually: () => void;
}

export function RetailPriceWarningModal({
  isOpen,
  baseCost,
  currentRetailPrice,
  onSetToMinimum,
  onUpdateManually,
}: RetailPriceWarningModalProps) {
  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onUpdateManually();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onUpdateManually]);

  if (!isOpen) return null;

  const formattedBaseCost = `€${(baseCost / 100).toFixed(2)}`;
  const formattedRetailPrice = `€${(currentRetailPrice / 100).toFixed(2)}`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onUpdateManually}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">Price Adjustment Required</h3>
        </div>

        <p className="text-zinc-300 mb-4 leading-relaxed">
          Base cost increased to <span className="text-white font-semibold">{formattedBaseCost}</span> due to additional
          print options. Your current retail price of{' '}
          <span className="text-white font-semibold">{formattedRetailPrice}</span> is below cost.
        </p>

        <p className="text-zinc-400 text-sm mb-6">
          Please update your retail price to continue. You cannot sell below cost.
        </p>

        <div className="flex flex-col gap-3">
          <Button onClick={onSetToMinimum} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            Set to Minimum ({formattedBaseCost})
          </Button>
          <Button
            onClick={onUpdateManually}
            variant="outline"
            className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-800"
          >
            Update Manually
          </Button>
        </div>
      </div>
    </div>
  );
}
