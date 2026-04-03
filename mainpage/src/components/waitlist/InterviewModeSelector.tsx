'use client';

import { motion } from 'framer-motion';

interface InterviewModeSelectorProps {
  onSelect: (mode: 'text' | 'voice') => void;
}

export function InterviewModeSelector({ onSelect }: InterviewModeSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          How would you like to continue?
        </h2>
        <p className="text-zinc-400">
          Choose how you'd like to meet Leopoldo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {/* Text Mode Card */}
        <motion.button
          onClick={() => onSelect('text')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex flex-col items-center p-8 bg-zinc-900 border-2 border-zinc-700 rounded-2xl hover:border-rose-500 transition-colors group"
        >
          <div className="w-16 h-16 mb-4 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
            <svg className="w-8 h-8 text-zinc-400 group-hover:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Chat with Leopoldo</h3>
          <p className="text-zinc-400 text-sm text-center">
            Type your responses at your own pace
          </p>
        </motion.button>

        {/* Voice Mode Card */}
        <motion.button
          onClick={() => onSelect('voice')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex flex-col items-center p-8 bg-zinc-900 border-2 border-zinc-700 rounded-2xl hover:border-rose-500 transition-colors group"
        >
          <div className="w-16 h-16 mb-4 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
            <svg className="w-8 h-8 text-zinc-400 group-hover:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Talk with Leopoldo</h3>
          <p className="text-zinc-400 text-sm text-center">
            Have a natural voice conversation
          </p>
        </motion.button>
      </div>
    </div>
  );
}
