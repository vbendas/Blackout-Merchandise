'use client';

import { motion } from 'framer-motion';
import { SocialProof } from '@/components/SocialProof';
import { DraggableProductGrid } from '@/components/DraggableProductGrid';

export function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center z-10">
      {/* Social Proof - Absolute Position - Desktop */}
      <div className="absolute top-[122px] md:top-[100px] lg:top-[122px] left-0 w-full z-[55] pointer-events-none hidden md:block">
        <div className="max-w-7xl mx-auto px-6">
          <div className="pointer-events-auto inline-block scale-90 md:scale-85 lg:scale-90 origin-left">
            <SocialProof />
          </div>
        </div>
      </div>

      {/* Mobile Social Proof - Centered */}
      <div className="absolute top-[110px] max-[389px]:top-[75px] left-1/2 -translate-x-1/2 z-[55] md:hidden scale-90 opacity-90 pointer-events-auto w-full flex justify-center">
        <SocialProof />
      </div>

      {/* Draggable Product Grid - The main hero element */}
      <DraggableProductGrid />

      {/* Small headline overlay - bottom left */}
      <motion.div
        className="absolute bottom-24 left-8 md:left-16 z-20 pointer-events-none"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-light text-zinc-400 tracking-tight leading-tight">
          <span className="text-white font-medium">Premium merchandise</span>
          <br />
          for artists who care
        </h1>
      </motion.div>

      {/* CTA - bottom right */}
      <motion.div
        className="absolute bottom-24 right-8 md:right-16 z-20"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 0.7 }}
      >
        <a
          href="/waitlist"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(212,175,55,0.3)]"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)',
          }}
        >
          Join Waitlist
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </motion.div>
    </section>
  );
}
