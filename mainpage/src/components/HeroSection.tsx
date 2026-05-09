'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { TypewriterText } from '@/components/TypewriterText';
import { HeroModel } from '@/components/HeroModel';

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const topGradientOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);
  const bottomGradientOpacity = useTransform(scrollYProgress, [0.7, 1], [0, 1]);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-screen z-10 overflow-hidden">

      {/* Top gradient - activates on scroll */}
      <motion.div
        className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-black via-black/80 to-transparent z-40 pointer-events-none"
        style={{ opacity: topGradientOpacity }}
      />

      {/* Phrase 1 — solid, upper-left */}
      <div className="absolute left-[3vw] top-[18%] z-0 pointer-events-none select-none">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
        >
          <h1
            className="font-sans font-black uppercase leading-[0.88] tracking-tighter text-left"
            style={{
              fontSize: 'clamp(2.2rem, 5.5vw, 5.5rem)',
              color: 'rgba(255,255,255,0.82)',
            }}
          >
            <span className="block">YOUR FANS</span>
            <span className="block">WEAR YOUR ART.</span>
          </h1>
        </motion.div>
      </div>

      {/* Phrase 2 — outlined, lower-right */}
      <div className="absolute right-[3vw] bottom-[18%] z-0 pointer-events-none select-none">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.6 }}
        >
          <h2
            className="font-sans font-black uppercase leading-[0.88] tracking-tighter text-right"
            style={{
              fontSize: 'clamp(2.2rem, 5.5vw, 5.5rem)',
              WebkitTextStroke: '1.5px rgba(255,255,255,0.28)',
              color: 'transparent',
            }}
          >
            <span className="block">WHY DRESS THEM</span>
            <span className="block">IN GARBAGE?</span>
          </h2>
        </motion.div>
      </div>

      {/* Model Layer — anchored to bottom, fills from bottom up */}
      <HeroModel />

      {/* Typewriter sub-line — bottom, below model */}
      <div className="absolute bottom-8 left-0 right-0 z-20 min-h-[2em] text-center"
        style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}
      >
        <TypewriterText
          text="We help artists, creators, and companies to design, source and sell premium merchandise."
          delay={2800}
          speed={35}
          className="text-zinc-600 font-light tracking-wide leading-relaxed max-w-xl mx-auto"
        />
      </div>

      {/* Bottom gradient - activates on scroll */}
      <motion.div
        className="absolute bottom-0 left-0 w-full h-[20vh] bg-gradient-to-t from-black to-transparent z-30 pointer-events-none"
        style={{ opacity: bottomGradientOpacity }}
      />
    </section>
  );
}
