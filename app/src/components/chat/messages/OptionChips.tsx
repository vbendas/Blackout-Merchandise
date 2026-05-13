'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { StudioOption } from '@/types/chat';

interface OptionChipsProps {
  options: StudioOption[];
  onSelect: (option: StudioOption) => void;
}

export function OptionChips({ options, onSelect }: OptionChipsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (option: StudioOption) => {
    if (selectedId) return; // Prevent multiple selections
    setSelectedId(option.id);
    onSelect(option);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => (
        <motion.button
          key={option.id}
          whileHover={!selectedId ? { scale: 1.05 } : {}}
          whileTap={!selectedId ? { scale: 0.95 } : {}}
          onClick={() => handleSelect(option)}
          disabled={!!selectedId}
          className={`relative overflow-hidden rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
            selectedId === option.id
              ? 'border-purple-500/50 bg-purple-500/20 text-purple-300'
              : selectedId
                ? 'border-zinc-700/50 bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                : 'border-purple-500/30 bg-zinc-800/80 text-zinc-300 hover:border-purple-500/50 hover:bg-purple-500/10'
          }`}
        >
          {option.imageUrl && (
            <div className="mr-2 inline-block h-5 w-5 overflow-hidden rounded-full align-middle">
              <img src={option.imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          {option.label}
        </motion.button>
      ))}
    </motion.div>
  );
}
