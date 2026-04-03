'use client';

import { motion } from 'framer-motion';

interface Step1WelcomeProps {
  onStart: () => void;
}

export function Step1Welcome({ onStart }: Step1WelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-6"
    >
      <motion.h1
        className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Ready to elevate your merch?
      </motion.h1>

      <motion.p
        className="text-zinc-400 text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Join artists who refuse to compromise on quality
      </motion.p>

      {/* Trust badges */}
      <motion.div
        className="flex flex-wrap justify-center gap-4 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {[
          'Zero upfront cost',
          'Premium quality',
          'AI-powered',
          'Ethical production',
        ].map((badge) => (
          <span
            key={badge}
            className="px-3 py-1 bg-zinc-800/50 rounded-full text-zinc-300 border border-zinc-700"
          >
            {badge}
          </span>
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="pt-4"
      >
        <button
          onClick={onStart}
          className="group relative px-8 py-4 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black font-semibold rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20"
        >
          <span className="relative z-10 flex items-center gap-2">
            Start Application
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </button>
      </motion.div>

      {/* Social proof */}
      <motion.p
        className="text-zinc-500 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Join 2,000+ artists on the waitlist
      </motion.p>
    </motion.div>
  );
}
