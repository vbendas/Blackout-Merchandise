'use client';

import { Button, Input } from '@heroui/react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

export function ManifestoCTA() {
  return (
    <section className="relative min-h-[80vh] bg-black flex flex-col items-center justify-center overflow-hidden px-6 py-24">
      {/* Background Grip/Texture (Reusing the Silkscreen Mesh for continuity) */}
      <div
        className="absolute inset-0 opacity-[0.2] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #333 1px, transparent 1px)`,
          backgroundSize: '4px 4px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
        }}
      />

      <div className="relative z-10 max-w-5xl w-full mx-auto flex flex-col items-center text-center space-y-12">
        {/* The Manifesto Headline */}
        <div className="space-y-2">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-[0.9] tracking-tighter uppercase"
          >
            We are not
            <br />
            <span className="text-zinc-600">for everyone.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg md:text-xl text-zinc-400 font-mono tracking-widest uppercase mt-8"
          >
            Accepting 100 Creators / Month
          </motion.p>
        </div>

        {/* Minimalist Input Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="w-full max-w-md relative group"
        >
          <div className="relative flex items-center border-b border-zinc-700 group-hover:border-white transition-colors duration-300 py-2">
            <input
              type="email"
              placeholder="ENTER YOUR EMAIL"
              className="w-full bg-transparent text-white text-xl md:text-2xl font-bold uppercase placeholder:text-zinc-700 outline-none pb-2"
            />
            <button className="ml-4 text-zinc-500 hover:text-white transition-colors">
              <Icon icon="lucide:arrow-right" width={32} />
            </button>
          </div>

          {/* Status Message */}
          <div className="absolute top-full left-0 mt-2 text-xs text-zinc-600 font-mono">
            {'>'} WAITING_LIST_STATUS: OPEN
          </div>
        </motion.div>
      </div>
    </section>
  );
}
