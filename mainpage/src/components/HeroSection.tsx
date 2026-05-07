'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { TypewriterText } from '@/components/TypewriterText';

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const topGradientOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);
  const bottomGradientOpacity = useTransform(scrollYProgress, [0.7, 1], [0, 1]);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-screen flex flex-col items-center justify-center z-10">

      {/* SVG threshold filter (same as MorphingText) */}
      <svg className="fixed h-0 w-0">
        <defs>
          <filter id="threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      {/* Top gradient - activates on scroll */}
      <motion.div
        className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-black via-black/80 to-transparent z-30 pointer-events-none"
        style={{ opacity: topGradientOpacity }}
      />

      {/* Hero Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center mx-auto">
          {/* Headlines with threshold filter */}
          <div className="font-sans text-[32pt] leading-none font-bold [filter:url(#threshold)_blur(0.6px)] md:text-[3.5rem] lg:text-[4.5rem] md:whitespace-nowrap">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="tracking-tighter leading-[1.05]"
            >
              <span className="text-white">YOUR FANS WEAR YOUR ART.</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, filter: 'blur(12px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.8, delay: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="tracking-tighter leading-[1.05] mt-2"
            >
              <span className="text-[#71717a]">WHY DRESS THEM IN GARBAGE?</span>
            </motion.div>
          </div>

          {/* Typewriter sub-line — outside the filter, fixed position */}
          <div
            className="mt-12 md:mt-16 min-h-[2.5em]"
            style={{
              fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)',
            }}
          >
            <TypewriterText
              text="We help artists, creators, and companies to design, source and sell premium merchandise."
              delay={3200}
              speed={35}
              className="text-zinc-500 font-light tracking-wide leading-relaxed max-w-2xl mx-auto"
            />
          </div>
        </div>
      </div>

      {/* Bottom gradient - activates on scroll */}
      <motion.div
        className="absolute bottom-0 left-0 w-full h-[20vh] bg-gradient-to-t from-black to-transparent z-30 pointer-events-none"
        style={{ opacity: bottomGradientOpacity }}
      />
    </section>
  );
}
