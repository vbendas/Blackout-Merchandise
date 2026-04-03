'use client';

import { motion } from 'framer-motion';

interface VoiceModeToggleProps {
  mode: 'text' | 'voice';
  onChange: (mode: 'text' | 'voice') => void;
}

export function VoiceModeToggle({ mode, onChange }: VoiceModeToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
      <button
        onClick={() => onChange('text')}
        className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
          mode === 'text'
            ? 'text-white'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        {mode === 'text' && (
          <motion.div
            layoutId="activeMode"
            className="absolute inset-0 bg-zinc-700 rounded-md"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Text
        </span>
      </button>

      <button
        onClick={() => onChange('voice')}
        className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
          mode === 'voice'
            ? 'text-white'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        {mode === 'voice' && (
          <motion.div
            layoutId="activeMode"
            className="absolute inset-0 bg-zinc-700 rounded-md"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
        
        <span className="relative z-10 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Voice
        </span>
      </button>
    </div>
  );
}
