'use client';

import { motion } from 'framer-motion';
import { SocialProof } from '@/components/SocialProof';

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

      {/* Hero Content - Centered Typography */}
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-6 pointer-events-none">
        <div className="text-center max-w-5xl mx-auto flex flex-col items-center gap-8 pointer-events-auto">
          {/* Main Headline - DGB style: mixed weights */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-1"
          >
            <h1 className="text-4xl md:text-5xl lg:text-7xl tracking-tight leading-[1.05] text-balance">
              <span className="font-light text-zinc-300">We help </span>
              <span className="font-semibold text-white">artists, creators</span>
            </h1>
            <h1 className="text-4xl md:text-5xl lg:text-7xl tracking-tight leading-[1.05] text-balance">
              <span className="font-light text-zinc-300">and </span>
              <span className="font-semibold text-white">brands</span>
            </h1>
            <h1 className="text-4xl md:text-5xl lg:text-7xl tracking-tight leading-[1.05] text-balance">
              <span className="font-light text-zinc-300">design, source and sell</span>
            </h1>
            <h1 className="text-4xl md:text-5xl lg:text-7xl tracking-tight leading-[1.05] text-balance">
              <span className="font-semibold text-white">premium merchandise.</span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-base md:text-lg lg:text-xl text-zinc-500 max-w-xl leading-relaxed font-light"
          >
            Zero risk. You create, we handle everything else.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <a
              href="/waitlist"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-semibold uppercase tracking-wider text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(212,175,55,0.3)]"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F5E6A3 50%, #D4AF37 100%)',
              }}
            >
              Join the Waitlist
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </motion.div>
        </div>
      </div>

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[20vh] bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  );
}
