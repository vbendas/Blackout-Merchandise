'use client';

import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface Step1WelcomeProps {
  onNext: () => void;
}

export function Step1Welcome({ onNext }: Step1WelcomeProps) {
  return (
    <div className="space-y-6 text-center">
      {/* Leopoldo Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-zinc-900 border-2 border-zinc-800 mb-4"
      >
        <Icon icon="lucide:user" className="w-12 h-12 text-zinc-400" />
      </motion.div>

      {/* Welcome Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h1 className="text-3xl font-bold text-white">Welcome to Blackout Merchandise</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          I'm Leopoldo, your personal guide. We're building a premium merchandise platform for artists who care about
          quality.
        </p>
        <p className="text-sm text-zinc-500">
          Join our exclusive waitlist for early access. The interview takes about 2 minutes.
        </p>
      </motion.div>

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6"
      >
        {[
          { icon: 'lucide:leaf', text: 'Eco-friendly materials' },
          { icon: 'lucide:zap', text: 'Expert-guided design' },
          { icon: 'lucide:shield-check', text: 'Premium quality' },
        ].map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800"
          >
            <Icon icon={item.icon} className="w-6 h-6 text-emerald-400" />
            <span className="text-xs text-zinc-300">{item.text}</span>
          </div>
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Button
          onClick={onNext}
          size="lg"
          className="w-full md:w-auto px-8 bg-white text-black hover:bg-zinc-200 transition-colors"
        >
          Start Interview
          <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
