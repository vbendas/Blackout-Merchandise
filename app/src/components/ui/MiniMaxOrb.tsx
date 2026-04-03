'use client';

import { motion } from 'framer-motion';

interface MiniMaxOrbProps {
  status: 'idle' | 'listening' | 'processing' | 'speaking';
  agentColor: string;
}

export function MiniMaxOrb({ status, agentColor }: MiniMaxOrbProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'listening':
        return '#3b82f6';
      case 'processing':
        return '#f59e0b';
      case 'speaking':
        return '#22c55e';
      default:
        return agentColor;
    }
  };

  const color = getStatusColor();

  return (
    <div className="relative w-32 h-32">
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: status === 'listening' ? [1, 1.2, 1] : 1,
          opacity: status === 'idle' ? 0.3 : 0.6,
        }}
        transition={{
          duration: 2,
          repeat: status === 'listening' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        style={{
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        }}
      />

      <motion.div
        className="absolute inset-4 rounded-full border-2"
        animate={{
          rotate: status === 'processing' ? 360 : 0,
          scale: status === 'speaking' ? [1, 1.05, 1] : 1,
        }}
        transition={{
          rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
          scale: { duration: 0.5, repeat: status === 'speaking' ? Infinity : 0 },
        }}
        style={{ borderColor: `${color}60` }}
      />

      <motion.div
        className="absolute inset-8 rounded-full"
        animate={{
          scale: status !== 'idle' ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 1.5,
          repeat: status !== 'idle' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}, ${color}80)`,
          boxShadow: `0 0 40px ${color}60`,
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        {status === 'listening' && (
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </motion.div>
        )}

        {status === 'processing' && (
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {status === 'speaking' && (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-6 bg-white rounded-full"
                animate={{ height: [12, 24, 12] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
