'use client';

import { motion } from 'framer-motion';

interface RecordingButtonProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  color?: string;
}

export function RecordingButton({
  isRecording,
  onStart,
  onStop,
  disabled = false,
  color = '#e11d48',
}: RecordingButtonProps) {
  return (
    <div className="relative">
      {isRecording && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ backgroundColor: `${color}40` }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            style={{ backgroundColor: `${color}30` }}
          />
        </>
      )}

      <motion.button
        onClick={isRecording ? onStop : onStart}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all"
        style={{
          backgroundColor: isRecording ? color : '#27272a',
          border: isRecording ? 'none' : `2px solid ${color}60`,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {isRecording ? (
          <div className="w-6 h-6 bg-white rounded-sm" />
        ) : (
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
